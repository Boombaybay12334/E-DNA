import type { ClassificationResult, ClassificationStatus, SequenceRecord } from '../types/contract';

export interface ExportResultOutcome {
  success: boolean;
  count: number;
  filename: string;
  error?: string;
}

export interface CommunityInsightsExportData {
  summaryMetrics: {
    totalSequences: number;
    validSequences: number;
    overallRateAll: number; // % (Denominator: totalSequences)
    overallRateValid: number; // % (Denominator: validSequences)
    countFull: number;
    fullyAssignedRate: number; // % (Denominator: totalSequences)
    countPartial: number;
    partiallyAssignedRate: number; // % (Denominator: totalSequences)
    countUnassigned: number;
    unassignedRate: number; // % (Denominator: totalSequences)
    countInvalid: number;
    invalidRate: number; // % (Denominator: totalSequences)
    countWithWarnings: number;
    meanDepth: number;
  };
  statusDistribution: Array<{
    status: ClassificationStatus;
    name: string;
    count: number;
    percentage: number;
  }>;
  depthDistribution: Array<{
    depth: number;
    label: string;
    rankName: string;
    count: number;
    pct: number;
  }>;
  composition: {
    rank: string;
    scope: 'ALL' | 'ASSIGNED_ONLY';
    scopeTotal: number;
    taxa: Array<{
      taxon: string;
      count: number;
      percentage: number;
      isUnassigned: boolean;
    }>;
  };
  candidateSimulation?: {
    candidateTau: number;
    currentTau: number;
    candidateMetrics: {
      countFull: number;
      countPartial: number;
      countUnassigned: number;
      meanDepth: number;
    };
    delta: {
      fullDelta: number;
      partialDelta: number;
      unassignedDelta: number;
      meanDepthDelta: number;
    };
  } | null;
}

/**
 * Escapes a single CSV value, properly quoting strings containing commas, quotes,
 * line breaks, or leading formula symbols (=, @, +, -) to prevent CSV injection (CWE-1236).
 * Preserves legitimate numeric numbers and negative numeric values without corrupting them.
 */
export function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '';

  // Pure numbers are safe from formula injection and must retain numeric formatting
  if (typeof val === 'number') {
    return String(val);
  }

  let str = String(val);

  // Neutralize formula injection (CWE-1236) on strings starting with =, @, or \t
  if (str.startsWith('=') || str.startsWith('@') || str.startsWith('\t')) {
    str = `'${str}`;
  } else if ((str.startsWith('+') || str.startsWith('-')) && isNaN(Number(str))) {
    // Only prefix with ' if it is NOT a legitimate number (e.g. "+cmd|..." vs "-1.5")
    str = `'${str}`;
  }

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Constructs a strict Contract v1.0 sequence object, explicitly stripping
 * UI-only internal properties (like raw sequence_str) to prevent raw DNA leakage
 * and preserving all contract-defined fields and null values.
 */
export function sanitizeSequenceForContract(seq: SequenceRecord): SequenceRecord {
  const clean: SequenceRecord = {
    id: seq.id,
    length: seq.length ?? null,
    status: seq.status,
    assigned_depth: seq.assigned_depth,
    deepest_rank: seq.deepest_rank ?? null,
    deepest_taxon: seq.deepest_taxon ?? null,
    lineage: (seq.lineage || []).map((l) => ({
      rank: l.rank,
      taxon: l.taxon ?? null,
      confidence: l.confidence ?? null,
      assigned: Boolean(l.assigned),
    })),
    warnings: seq.warnings ? [...seq.warnings] : [],
    ...(seq.extras ? { extras: seq.extras } : {}),
  };
  return clean;
}

/**
 * Builds sequence-level CSV text content for a ClassificationResult.
 */
export function buildResultsCsvContent(
  result: ClassificationResult,
  sequenceIds?: Set<string>
): { content: string; count: number } {
  const ranks = result.run.ranks || [];
  const targetSequences = sequenceIds && sequenceIds.size > 0
    ? result.sequences.filter((s) => sequenceIds.has(s.id))
    : result.sequences;

  // CSV Headers: fixed metadata + dynamic rank columns + QC
  const headers = [
    'Sequence ID',
    'Length (bp)',
    'Assignment Status',
    'Assigned Depth',
    'Deepest Assigned Rank',
    'Deepest Assigned Taxon',
    'Deepest Confidence',
    ...ranks.flatMap((r) => [
      `${r.charAt(0).toUpperCase() + r.slice(1)} Taxon`,
      `${r.charAt(0).toUpperCase() + r.slice(1)} Confidence`,
      `${r.charAt(0).toUpperCase() + r.slice(1)} Assigned`,
    ]),
    'QC Warnings',
  ];

  const rows = targetSequences.map((seq) => {
    // Deepest confidence lookup
    let deepestConf = '';
    if (seq.deepest_rank && seq.assigned_depth > 0) {
      const match = seq.lineage?.find((l) => l.rank.toLowerCase() === seq.deepest_rank?.toLowerCase());
      if (match?.confidence !== null && match?.confidence !== undefined) {
        deepestConf = match.confidence.toFixed(3);
      }
    }

    // Dynamic rank columns
    const rankCells = ranks.flatMap((r) => {
      const entry = seq.lineage?.find((l) => l.rank.toLowerCase() === r.toLowerCase());
      const taxon = entry?.taxon ?? '';
      const conf = entry?.confidence !== null && entry?.confidence !== undefined
        ? entry.confidence.toFixed(3)
        : '';
      const assigned = entry ? (entry.assigned ? 'TRUE' : 'FALSE') : 'FALSE';
      return [taxon, conf, assigned];
    });

    const warnings = seq.warnings && seq.warnings.length > 0 ? seq.warnings.join('; ') : '';

    return [
      seq.id,
      seq.length ?? '',
      seq.status,
      seq.assigned_depth,
      seq.deepest_rank ?? '',
      seq.deepest_taxon ?? '',
      deepestConf,
      ...rankCells,
      warnings,
    ];
  });

  // Include UTF-8 BOM (\uFEFF) for automated Excel character encoding recognition
  const csvBody = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\r\n');

  return {
    content: `\uFEFF${csvBody}`,
    count: targetSequences.length,
  };
}

/**
 * Exports sequence-level results as a formatted CSV file.
 */
export function exportResultsCsv(
  result: ClassificationResult,
  options: { sequenceIds?: Set<string>; filenamePrefix?: string } = {}
): ExportResultOutcome {
  try {
    const { content, count } = buildResultsCsvContent(result, options.sequenceIds);
    const prefix = options.filenamePrefix || 'edna_classification';
    const tag = options.sequenceIds && options.sequenceIds.size > 0 ? '_selected' : '';
    const filename = `${prefix}_${result.run.run_id}${tag}.csv`;

    downloadFile(content, filename, 'text/csv;charset=utf-8;');
    return { success: true, count, filename };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, filename: '', error: msg };
  }
}

/**
 * Builds valid Contract v1.0 JSON representation, preserving all dynamic ranks and nulls.
 * For subset exports, recalculates summary counts to maintain mathematical reconciliation.
 */
export function buildContractJsonContent(
  result: ClassificationResult,
  sequenceIds?: Set<string>
): { content: string; count: number } {
  const isSubset = Boolean(sequenceIds && sequenceIds.size > 0);
  const targetSequences = isSubset
    ? result.sequences.filter((s) => sequenceIds!.has(s.id))
    : result.sequences;

  const cleanSequences = targetSequences.map(sanitizeSequenceForContract);

  // Calculate summary matching the exact exported sequence records
  let summary = result.summary;
  if (isSubset) {
    summary = {
      n_sequences: cleanSequences.length,
      n_by_status: {
        assigned_full: cleanSequences.filter((s) => s.status === 'assigned_full').length,
        assigned_partial: cleanSequences.filter((s) => s.status === 'assigned_partial').length,
        unassigned: cleanSequences.filter((s) => s.status === 'unassigned').length,
        invalid_input: cleanSequences.filter((s) => s.status === 'invalid_input').length,
      },
      n_by_deepest_rank: cleanSequences.reduce((acc, s) => {
        const r = s.deepest_rank ?? 'unassigned';
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  const contractPayload = {
    contract_version: result.contract_version || '1.0',
    run: result.run,
    sequences: cleanSequences,
    ...(summary ? { summary } : {}),
    ...(isSubset ? {
      subset_export: {
        is_subset: true,
        selected_count: cleanSequences.length,
        total_run_sequences: result.sequences.length,
      }
    } : {}),
    ...(result.is_synthetic !== undefined ? { is_synthetic: result.is_synthetic } : {}),
    ...(result.disclaimer ? { disclaimer: result.disclaimer } : {}),
  };

  return {
    content: JSON.stringify(contractPayload, null, 2),
    count: cleanSequences.length,
  };
}

/**
 * Exports the complete Contract v1.0 JSON artifact.
 */
export function exportResultsJson(
  result: ClassificationResult,
  options: { sequenceIds?: Set<string>; filenamePrefix?: string } = {}
): ExportResultOutcome {
  try {
    const { content, count } = buildContractJsonContent(result, options.sequenceIds);
    const prefix = options.filenamePrefix || 'edna_contract';
    const tag = options.sequenceIds && options.sequenceIds.size > 0 ? '_selected' : '';
    const filename = `${prefix}_${result.run.run_id}${tag}.json`;

    downloadFile(content, filename, 'application/json;charset=utf-8;');
    return { success: true, count, filename };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, filename: '', error: msg };
  }
}

/**
 * Builds Community Insights Summary JSON object.
 */
export function buildCommunityInsightsJsonContent(
  result: ClassificationResult,
  insightsData: CommunityInsightsExportData
): string {
  const payload = {
    report_type: 'Community Insights Taxonomic Summary',
    contract_version: result.contract_version || '1.0',
    exported_at_utc: new Date().toISOString(),
    run: {
      run_id: result.run.run_id,
      marker: result.run.marker,
      reference: result.run.reference,
      operating_threshold_tau: result.run.threshold?.tau ?? 0.60,
      ranks: result.run.ranks,
    },
    is_synthetic: result.is_synthetic ?? false,
    disclaimer: result.disclaimer || null,
    summary_metrics: {
      total_sequences: insightsData.summaryMetrics.totalSequences,
      valid_sequences: insightsData.summaryMetrics.validSequences,
      overall_assignment_rate_total_pct: Number(insightsData.summaryMetrics.overallRateAll.toFixed(2)),
      overall_assignment_rate_total_denominator: `Total Sequences (N = ${insightsData.summaryMetrics.totalSequences})`,
      overall_assignment_rate_valid_pct: Number(insightsData.summaryMetrics.overallRateValid.toFixed(2)),
      overall_assignment_rate_valid_denominator: `Valid Sequences (N = ${insightsData.summaryMetrics.validSequences})`,
      fully_assigned_count: insightsData.summaryMetrics.countFull,
      fully_assigned_pct: Number(insightsData.summaryMetrics.fullyAssignedRate.toFixed(2)),
      partially_assigned_count: insightsData.summaryMetrics.countPartial,
      partially_assigned_pct: Number(insightsData.summaryMetrics.partiallyAssignedRate.toFixed(2)),
      unassigned_count: insightsData.summaryMetrics.countUnassigned,
      unassigned_pct: Number(insightsData.summaryMetrics.unassignedRate.toFixed(2)),
      invalid_input_count: insightsData.summaryMetrics.countInvalid,
      invalid_input_pct: Number(insightsData.summaryMetrics.invalidRate.toFixed(2)),
      sequences_with_qc_warnings: insightsData.summaryMetrics.countWithWarnings,
      mean_assigned_depth: Number(insightsData.summaryMetrics.meanDepth.toFixed(2)),
    },
    assignment_status_distribution: insightsData.statusDistribution,
    assignment_depth_distribution: insightsData.depthDistribution,
    taxonomic_composition: {
      evaluated_rank: insightsData.composition.rank,
      scope: insightsData.composition.scope,
      scope_total_sequences: insightsData.composition.scopeTotal,
      scope_description: insightsData.composition.scope === 'ASSIGNED_ONLY'
        ? `Assigned sequences only (N = ${insightsData.composition.scopeTotal})`
        : `All sequences (N = ${insightsData.composition.scopeTotal})`,
      taxa: insightsData.composition.taxa,
    },
    ...(insightsData.candidateSimulation ? {
      candidate_threshold_simulation: {
        simulation_type: 'Stateless non-destructive comparison',
        current_tau: insightsData.candidateSimulation.currentTau,
        candidate_tau: insightsData.candidateSimulation.candidateTau,
        candidate_metrics: insightsData.candidateSimulation.candidateMetrics,
        delta_vs_current: insightsData.candidateSimulation.delta,
        scientific_notice: 'Cutoff changes alter consecutive prefix stopping depth, not underlying model accuracy or probability calibration.',
      }
    } : {}),
    scientific_guidelines: {
      resolution: 'Species-level classification has not been evaluated in this marker model. Unassigned deeper ranks reflect cutoff thresholds, not novel species discovery.',
      counting_basis: 'Sequence counts represent unique representative queries (ASV variants), unweighted by biological abundance.',
    }
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Exports Community Insights data as structured JSON.
 */
export function exportCommunityInsightsJson(
  result: ClassificationResult,
  insightsData: CommunityInsightsExportData,
  filenamePrefix: string = 'edna_community_insights'
): ExportResultOutcome {
  try {
    const content = buildCommunityInsightsJsonContent(result, insightsData);
    const filename = `${filenamePrefix}_${result.run.run_id}.json`;
    downloadFile(content, filename, 'application/json;charset=utf-8;');
    return { success: true, count: insightsData.summaryMetrics.totalSequences, filename };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, filename: '', error: msg };
  }
}

/**
 * Builds Community Insights Summary CSV text content with explicit sections and denominators.
 */
export function buildCommunityInsightsCsvContent(
  result: ClassificationResult,
  insightsData: CommunityInsightsExportData
): string {
  const lines: string[] = [];
  const sm = insightsData.summaryMetrics;

  lines.push('=== EDNA EXPLORER COMMUNITY INSIGHTS REPORT ===');
  lines.push(`Run ID,${escapeCsvValue(result.run.run_id)}`);
  lines.push(`Marker,${escapeCsvValue(`${result.run.marker.gene} ${result.run.marker.region}`)}`);
  lines.push(`Reference,${escapeCsvValue(`${result.run.reference.name} v${result.run.reference.version}`)}`);
  lines.push(`Operating Threshold (tau),${result.run.threshold?.tau ?? 0.60}`);
  lines.push(`Exported UTC,${escapeCsvValue(new Date().toISOString())}`);
  lines.push(`Synthetic Fixture,${result.is_synthetic ? 'YES (SYNTHETIC DEMO)' : 'NO'}`);
  lines.push('');

  // 1. Summary Metrics
  lines.push('--- SUMMARY METRICS ---');
  lines.push('Metric,Count,Percentage,Denominator Definition');
  lines.push(`Total Sequences,${sm.totalSequences},100.0%,Total sequences in selected run (N = ${sm.totalSequences})`);
  lines.push(`Valid Sequences,${sm.validSequences},${sm.totalSequences > 0 ? ((sm.validSequences / sm.totalSequences) * 100).toFixed(1) : 0}%,Sequences passing input validation (N = ${sm.totalSequences})`);
  lines.push(`Overall Assigned (Total Denominator),${sm.countFull + sm.countPartial},${sm.overallRateAll.toFixed(1)}%,Total sequences (N = ${sm.totalSequences})`);
  lines.push(`Overall Assigned (Valid Denominator),${sm.countFull + sm.countPartial},${sm.overallRateValid.toFixed(1)}%,Valid sequences (N = ${sm.validSequences})`);
  lines.push(`Fully Assigned,${sm.countFull},${sm.fullyAssignedRate.toFixed(1)}%,Total sequences (N = ${sm.totalSequences})`);
  lines.push(`Partially Assigned,${sm.countPartial},${sm.partiallyAssignedRate.toFixed(1)}%,Total sequences (N = ${sm.totalSequences})`);
  lines.push(`Unassigned at Root,${sm.countUnassigned},${sm.unassignedRate.toFixed(1)}%,Total sequences (N = ${sm.totalSequences})`);
  lines.push(`Invalid / QC Rejected,${sm.countInvalid},${sm.invalidRate.toFixed(1)}%,Total sequences (N = ${sm.totalSequences})`);
  lines.push(`Sequences with QC Warnings,${sm.countWithWarnings},${sm.totalSequences > 0 ? ((sm.countWithWarnings / sm.totalSequences) * 100).toFixed(1) : 0}%,Total sequences (N = ${sm.totalSequences})`);
  lines.push(`Mean Assigned Depth,${sm.meanDepth.toFixed(2)},-,Ranks (Max = ${result.run.ranks.length})`);
  lines.push('');

  // 2. Status Distribution
  lines.push('--- ASSIGNMENT STATUS DISTRIBUTION ---');
  lines.push('Status Code,Status Label,Count,Percentage (Denominator: N = ' + sm.totalSequences + ')');
  for (const st of insightsData.statusDistribution) {
    lines.push(`${escapeCsvValue(st.status)},${escapeCsvValue(st.name)},${st.count},${st.percentage.toFixed(1)}%`);
  }
  lines.push('');

  // 3. Assignment Depth Distribution
  lines.push('--- ASSIGNMENT DEPTH DISTRIBUTION ---');
  lines.push('Depth,Rank Name,Sequence Count,Percentage (Denominator: N = ' + sm.totalSequences + ')');
  for (const d of insightsData.depthDistribution) {
    lines.push(`${d.depth},${escapeCsvValue(d.rankName)},${d.count},${d.pct.toFixed(1)}%`);
  }
  lines.push('');

  // 4. Taxonomic Composition at Selected Rank
  lines.push(`--- TAXONOMIC COMPOSITION (RANK: ${insightsData.composition.rank.toUpperCase()}) ---`);
  lines.push(`Scope,${escapeCsvValue(insightsData.composition.scope === 'ASSIGNED_ONLY' ? 'Assigned Sequences Only' : 'All Sequences')}`);
  lines.push(`Scope Total Sequences (Denominator),${insightsData.composition.scopeTotal}`);
  lines.push('Taxon,Count,Percentage,Is Unassigned at Rank');
  for (const t of insightsData.composition.taxa) {
    lines.push(`${escapeCsvValue(t.taxon)},${t.count},${t.percentage.toFixed(1)}%,${t.isUnassigned ? 'YES' : 'NO'}`);
  }
  lines.push('');

  // 5. Candidate Threshold Simulation (if evaluated)
  if (insightsData.candidateSimulation) {
    const cs = insightsData.candidateSimulation;
    lines.push('--- NON-DESTRUCTIVE THRESHOLD SIMULATION ---');
    lines.push(`Current Operating Cutoff (tau),${cs.currentTau}`);
    lines.push(`Candidate Cutoff (tau),${cs.candidateTau}`);
    lines.push('Metric,Current Count,Candidate Count,Delta');
    lines.push(`Fully Assigned,${sm.countFull},${cs.candidateMetrics.countFull},${cs.delta.fullDelta >= 0 ? '+' : ''}${cs.delta.fullDelta}`);
    lines.push(`Partially Assigned,${sm.countPartial},${cs.candidateMetrics.countPartial},${cs.delta.partialDelta >= 0 ? '+' : ''}${cs.delta.partialDelta}`);
    lines.push(`Unassigned,${sm.countUnassigned},${cs.candidateMetrics.countUnassigned},${cs.delta.unassignedDelta >= 0 ? '+' : ''}${cs.delta.unassignedDelta}`);
    lines.push(`Mean Depth,${sm.meanDepth.toFixed(2)},${cs.candidateMetrics.meanDepth.toFixed(2)},${cs.delta.meanDepthDelta >= 0 ? '+' : ''}${cs.delta.meanDepthDelta.toFixed(2)}`);
    lines.push('Notice,Candidate simulation is non-destructive and does not alter stored run records.');
    lines.push('');
  }

  lines.push('--- SCIENTIFIC GUIDELINES ---');
  lines.push('Resolution Notice,"Species-level classification has not been evaluated in this marker model."');
  lines.push('Abundance Notice,"Counts reflect unique ASV queries, unweighted by biological abundance."');

  return `\uFEFF${lines.join('\r\n')}`;
}

/**
 * Exports Community Insights data as structured CSV.
 */
export function exportCommunityInsightsCsv(
  result: ClassificationResult,
  insightsData: CommunityInsightsExportData,
  filenamePrefix: string = 'edna_community_insights'
): ExportResultOutcome {
  try {
    const content = buildCommunityInsightsCsvContent(result, insightsData);
    const filename = `${filenamePrefix}_${result.run.run_id}.csv`;
    downloadFile(content, filename, 'text/csv;charset=utf-8;');
    return { success: true, count: insightsData.summaryMetrics.totalSequences, filename };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, count: 0, filename: '', error: msg };
  }
}

/**
 * Universal browser file download helper. Safe in Node.js test environments.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    // Headless / test environment: skip DOM manipulation
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Aliases
export const exportToCsv = exportResultsCsv;
export const exportToJson = exportResultsJson;

// Legacy compatibility stubs for older components
export function exportCsv(data: unknown, _ranks?: unknown, filenamePrefix?: string) {
  const name = filenamePrefix ? `${filenamePrefix}.csv` : 'export.csv';
  downloadFile(String(data), name, 'text/csv;charset=utf-8;');
}

export function exportFasta(data: unknown, filenamePrefix?: string) {
  const name = filenamePrefix ? `${filenamePrefix}.fasta` : 'sequences.fasta';
  downloadFile(String(data), name, 'text/plain;charset=utf-8;');
}

export function exportReportJson(data: unknown, filenamePrefix?: string) {
  const name = filenamePrefix ? `${filenamePrefix}.json` : 'report.json';
  downloadFile(JSON.stringify(data, null, 2), name, 'application/json;charset=utf-8;');
}

export function toFasta(asvOrView: any) {
  const id = asvOrView?.id || asvOrView?.asv?.id || 'SEQ';
  const seq = asvOrView?.sequence || asvOrView?.asv?.sequence || 'ATCG';
  return `>${id}\n${seq}`;
}
