import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// -------------------------------------------------------------
// Pure Export Logic Functions (Direct Mirror of src/lib/export.ts)
// -------------------------------------------------------------

function escapeCsvValue(val) {
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

function sanitizeSequenceForContract(seq) {
  const clean = {
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

function buildResultsCsvContent(result, sequenceIds) {
  const ranks = result.run.ranks || [];
  const targetSequences = sequenceIds && sequenceIds.size > 0
    ? result.sequences.filter((s) => sequenceIds.has(s.id))
    : result.sequences;

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
    let deepestConf = '';
    if (seq.deepest_rank && seq.assigned_depth > 0) {
      const match = seq.lineage?.find((l) => l.rank.toLowerCase() === seq.deepest_rank?.toLowerCase());
      if (match?.confidence !== null && match?.confidence !== undefined) {
        deepestConf = match.confidence.toFixed(3);
      }
    }

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

  const csvBody = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\r\n');

  return {
    content: `\uFEFF${csvBody}`,
    count: targetSequences.length,
  };
}

function buildContractJsonContent(result, sequenceIds) {
  const isSubset = Boolean(sequenceIds && sequenceIds.size > 0);
  const targetSequences = isSubset
    ? result.sequences.filter((s) => sequenceIds.has(s.id))
    : result.sequences;

  const cleanSequences = targetSequences.map(sanitizeSequenceForContract);

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
      }, {}),
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

function buildCommunityInsightsJsonContent(result, insightsData) {
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

function buildCommunityInsightsCsvContent(result, insightsData) {
  const lines = [];
  const sm = insightsData.summaryMetrics;

  lines.push('=== EDNA EXPLORER COMMUNITY INSIGHTS REPORT ===');
  lines.push(`Run ID,${escapeCsvValue(result.run.run_id)}`);
  lines.push(`Marker,${escapeCsvValue(`${result.run.marker.gene} ${result.run.marker.region}`)}`);
  lines.push(`Reference,${escapeCsvValue(`${result.run.reference.name} v${result.run.reference.version}`)}`);
  lines.push(`Operating Threshold (tau),${result.run.threshold?.tau ?? 0.60}`);
  lines.push(`Exported UTC,${escapeCsvValue(new Date().toISOString())}`);
  lines.push(`Synthetic Fixture,${result.is_synthetic ? 'YES (SYNTHETIC DEMO)' : 'NO'}`);
  lines.push('');

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

  lines.push('--- ASSIGNMENT STATUS DISTRIBUTION ---');
  lines.push('Status Code,Status Label,Count,Percentage (Denominator: N = ' + sm.totalSequences + ')');
  for (const st of insightsData.statusDistribution) {
    lines.push(`${escapeCsvValue(st.status)},${escapeCsvValue(st.name)},${st.count},${st.percentage.toFixed(1)}%`);
  }
  lines.push('');

  lines.push('--- ASSIGNMENT DEPTH DISTRIBUTION ---');
  lines.push('Depth,Rank Name,Sequence Count,Percentage (Denominator: N = ' + sm.totalSequences + ')');
  for (const d of insightsData.depthDistribution) {
    lines.push(`${d.depth},${escapeCsvValue(d.rankName)},${d.count},${d.pct.toFixed(1)}%`);
  }
  lines.push('');

  lines.push(`--- TAXONOMIC COMPOSITION (RANK: ${insightsData.composition.rank.toUpperCase()}) ---`);
  lines.push(`Scope,${escapeCsvValue(insightsData.composition.scope === 'ASSIGNED_ONLY' ? 'Assigned Sequences Only' : 'All Sequences')}`);
  lines.push(`Scope Total Sequences (Denominator),${insightsData.composition.scopeTotal}`);
  lines.push('Taxon,Count,Percentage,Is Unassigned at Rank');
  for (const t of insightsData.composition.taxa) {
    lines.push(`${escapeCsvValue(t.taxon)},${t.count},${t.percentage.toFixed(1)}%,${t.isUnassigned ? 'YES' : 'NO'}`);
  }
  lines.push('');

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

// -------------------------------------------------------------
// Test Datasets
// -------------------------------------------------------------

const sampleRunPR2 = {
  contract_version: "1.0",
  run: {
    run_id: "run-pr2-101",
    created_utc: "2026-11-22T10:00:00Z",
    model: { name: "modelA_reg_ens5", version: "1.0.0", code_commit: "commit123" },
    reference: { name: "PR2", version: "5.0.0", subset: "18S V4, 99% clustered" },
    marker: { gene: "18S rRNA", region: "V4" },
    ranks: ["domain", "supergroup", "division", "subdivision", "class", "order", "family", "genus"],
    threshold: { tau: 0.60, rule: "consecutive_leading_ranks" },
    confidence_semantics: "posterior_probability"
  },
  sequences: [
    {
      id: "SEQ_01",
      length: 380,
      status: "assigned_full",
      assigned_depth: 8,
      deepest_rank: "genus",
      deepest_taxon: "Thalassiosira",
      warnings: [],
      sequence_str: "ATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGC",
      lineage: [
        { rank: "domain", taxon: "Eukaryota", confidence: 0.99, assigned: true },
        { rank: "supergroup", taxon: "Stramenopiles", confidence: 0.98, assigned: true },
        { rank: "division", taxon: "Ochrophyta", confidence: 0.97, assigned: true },
        { rank: "subdivision", taxon: "Bacillariophytina", confidence: 0.96, assigned: true },
        { rank: "class", taxon: "Bacillariophyceae", confidence: 0.95, assigned: true },
        { rank: "order", taxon: "Thalassiosirales", confidence: 0.92, assigned: true },
        { rank: "family", taxon: "Thalassiosiraceae", confidence: 0.89, assigned: true },
        { rank: "genus", taxon: "Thalassiosira", confidence: 0.84, assigned: true }
      ]
    },
    {
      id: "=MALICIOUS_FORMULA_ID",
      length: 410,
      status: "assigned_partial",
      assigned_depth: 3,
      deepest_rank: "division",
      deepest_taxon: "Dinoflagellata, Dinophyceae",
      warnings: ["LOW_CONFIDENCE_WARNING", "AMBIGUOUS_MATCH"],
      lineage: [
        { rank: "domain", taxon: "Eukaryota", confidence: 0.99, assigned: true },
        { rank: "supergroup", taxon: "Alveolata", confidence: 0.95, assigned: true },
        { rank: "division", taxon: "Dinoflagellata, Dinophyceae", confidence: 0.88, assigned: true },
        { rank: "subdivision", taxon: "Syndiniales", confidence: 0.45, assigned: false },
        { rank: "class", taxon: null, confidence: 0.30, assigned: false },
        { rank: "order", taxon: null, confidence: null, assigned: false },
        { rank: "family", taxon: null, confidence: null, assigned: false },
        { rank: "genus", taxon: null, confidence: null, assigned: false }
      ]
    },
    {
      id: "SEQ_03_UNASSIGNED",
      length: 350,
      status: "unassigned",
      assigned_depth: 0,
      deepest_rank: null,
      deepest_taxon: null,
      warnings: [],
      lineage: [
        { rank: "domain", taxon: "Eukaryota", confidence: 0.40, assigned: false },
        { rank: "supergroup", taxon: null, confidence: 0.20, assigned: false },
        { rank: "division", taxon: null, confidence: null, assigned: false },
        { rank: "subdivision", taxon: null, confidence: null, assigned: false },
        { rank: "class", taxon: null, confidence: null, assigned: false },
        { rank: "order", taxon: null, confidence: null, assigned: false },
        { rank: "family", taxon: null, confidence: null, assigned: false },
        { rank: "genus", taxon: null, confidence: null, assigned: false }
      ]
    },
    {
      id: "SEQ_04_INVALID",
      length: 110,
      status: "invalid_input",
      assigned_depth: 0,
      deepest_rank: null,
      deepest_taxon: null,
      warnings: ["SEQUENCE_TOO_SHORT", "NON_ACGT_CHARACTERS"],
      lineage: []
    }
  ],
  is_synthetic: true,
  disclaimer: "SYNTHETIC FIXTURE DATASET: Strictly for testing and interface verification."
};

const sampleRunCustom4 = {
  contract_version: "1.0",
  run: {
    run_id: "run-custom-202",
    created_utc: "2026-11-22T10:00:00Z",
    model: { name: "model-4rank", version: "1.0.0", code_commit: null },
    reference: { name: "CUSTOM_DB", version: "1.0", subset: null },
    marker: { gene: "CustomGene", region: "R1" },
    ranks: ["domain", "phylum", "class", "order"],
    threshold: { tau: 0.70, rule: "consecutive_leading_ranks" },
  },
  sequences: [
    {
      id: "SEQ_CUST_1",
      length: 300,
      status: "assigned_full",
      assigned_depth: 4,
      deepest_rank: "order",
      deepest_taxon: "TestOrder",
      warnings: [],
      lineage: [
        { rank: "domain", taxon: "Bacteria", confidence: 0.99, assigned: true },
        { rank: "phylum", taxon: "Firmicutes", confidence: 0.95, assigned: true },
        { rank: "class", taxon: "Bacilli", confidence: 0.92, assigned: true },
        { rank: "order", taxon: "TestOrder", confidence: 0.85, assigned: true }
      ]
    }
  ]
};

const sampleInsightsData = {
  summaryMetrics: {
    totalSequences: 4,
    validSequences: 3,
    overallRateAll: 50.0,
    overallRateValid: 66.7,
    countFull: 1,
    fullyAssignedRate: 25.0,
    countPartial: 1,
    partiallyAssignedRate: 25.0,
    countUnassigned: 1,
    unassignedRate: 25.0,
    countInvalid: 1,
    invalidRate: 25.0,
    countWithWarnings: 2,
    meanDepth: 2.75,
  },
  statusDistribution: [
    { status: 'assigned_full', name: 'Fully Assigned', count: 1, percentage: 25.0 },
    { status: 'assigned_partial', name: 'Partially Assigned', count: 1, percentage: 25.0 },
    { status: 'unassigned', name: 'Unassigned', count: 1, percentage: 25.0 },
    { status: 'invalid_input', name: 'Invalid / QC Rejected', count: 1, percentage: 25.0 },
  ],
  depthDistribution: [
    { depth: 0, label: 'Depth 0', rankName: 'Unassigned at Root', count: 2, pct: 50.0 },
    { depth: 3, label: 'Depth 3', rankName: 'Division', count: 1, pct: 25.0 },
    { depth: 8, label: 'Depth 8', rankName: 'Genus', count: 1, pct: 25.0 },
  ],
  composition: {
    rank: 'division',
    scope: 'ALL',
    scopeTotal: 4,
    taxa: [
      { taxon: 'Ochrophyta', count: 1, percentage: 25.0, isUnassigned: false },
      { taxon: 'Dinoflagellata, Dinophyceae', count: 1, percentage: 25.0, isUnassigned: false },
      { taxon: '(Unassigned at division)', count: 2, percentage: 50.0, isUnassigned: true },
    ],
  },
  candidateSimulation: {
    candidateTau: 0.85,
    currentTau: 0.60,
    candidateMetrics: {
      countFull: 0,
      countPartial: 2,
      countUnassigned: 1,
      meanDepth: 2.0,
    },
    delta: {
      fullDelta: -1,
      partialDelta: +1,
      unassignedDelta: 0,
      meanDepthDelta: -0.75,
    },
  },
};

// -------------------------------------------------------------
// Test Assertions
// -------------------------------------------------------------

describe('Phase 7: CSV & JSON Export System Tests', () => {

  describe('1. CSV Escaping & Security (Formula Injection Prevention)', () => {
    it('handles null and undefined values safely as empty string', () => {
      assert.equal(escapeCsvValue(null), '');
      assert.equal(escapeCsvValue(undefined), '');
    });

    it('quotes strings containing commas, quotes, and newlines', () => {
      assert.equal(escapeCsvValue('Dinoflagellata, Dinophyceae'), '"Dinoflagellata, Dinophyceae"');
      assert.equal(escapeCsvValue('Taxon "Quote"'), '"Taxon ""Quote"""');
      assert.equal(escapeCsvValue("Line1\nLine2"), '"Line1\nLine2"');
    });

    it('neutralizes spreadsheet formula injection (CWE-1236) without corrupting numbers', () => {
      assert.equal(escapeCsvValue('=1+1'), "'=1+1");
      assert.equal(escapeCsvValue('+cmd|'), "'+cmd|");
      assert.equal(escapeCsvValue('-cmd|calc'), "'-cmd|calc");
      assert.equal(escapeCsvValue('@SUM(A1:A10)'), "'@SUM(A1:A10)");
      assert.equal(escapeCsvValue('\t123'), "'\t123");
      // Legitimate negative and signed numbers preserved without prepended apostrophe
      assert.equal(escapeCsvValue('-100'), '-100');
      assert.equal(escapeCsvValue(-15.5), '-15.5');
      assert.equal(escapeCsvValue('-0.75'), '-0.75');
    });
  });

  describe('2. Contract v1.0 JSON Export', () => {
    it('produces valid, parseable JSON conforming to Contract v1.0 schema', () => {
      const { content, count } = buildContractJsonContent(sampleRunPR2);
      assert.equal(count, 4);

      const parsed = JSON.parse(content);
      assert.equal(parsed.contract_version, '1.0');
      assert.equal(parsed.run.run_id, 'run-pr2-101');
      assert.equal(parsed.run.ranks.length, 8);
      assert.equal(parsed.sequences.length, 4);
      assert.equal(parsed.is_synthetic, true);
      assert.ok(parsed.disclaimer.includes('SYNTHETIC FIXTURE'));
    });

    it('strips UI-only raw DNA sequence strings to protect sensitive sequence data', () => {
      const { content } = buildContractJsonContent(sampleRunPR2);
      const parsed = JSON.parse(content);

      assert.equal(parsed.sequences[0].sequence_str, undefined);
      assert.equal(parsed.sequences[0].id, 'SEQ_01');
      assert.equal(parsed.sequences[0].length, 380);
      assert.equal(parsed.sequences[0].status, 'assigned_full');
    });

    it('preserves null values without omitting them', () => {
      const { content } = buildContractJsonContent(sampleRunPR2);
      const parsed = JSON.parse(content);

      const partialSeq = parsed.sequences[1];
      assert.equal(partialSeq.lineage[4].taxon, null);
      assert.equal(partialSeq.lineage[5].confidence, null);

      const unassignedSeq = parsed.sequences[2];
      assert.equal(unassignedSeq.deepest_rank, null);
      assert.equal(unassignedSeq.deepest_taxon, null);
    });

    it('exports only selected sequences when sequenceIds set is provided', () => {
      const selected = new Set(['SEQ_01', 'SEQ_04_INVALID']);
      const { content, count } = buildContractJsonContent(sampleRunPR2, selected);
      assert.equal(count, 2);

      const parsed = JSON.parse(content);
      assert.equal(parsed.sequences.length, 2);
      assert.equal(parsed.sequences[0].id, 'SEQ_01');
      assert.equal(parsed.sequences[1].id, 'SEQ_04_INVALID');
      assert.equal(parsed.run.run_id, 'run-pr2-101');
    });
  });

  describe('3. Sequence-Level CSV Export', () => {
    it('builds CSV with UTF-8 BOM, fixed metadata, and dynamic rank columns', () => {
      const { content, count } = buildResultsCsvContent(sampleRunPR2);
      assert.equal(count, 4);

      assert.ok(content.startsWith('\uFEFF'));

      const lines = content.slice(1).split('\r\n');
      const headerLine = lines[0];

      assert.ok(headerLine.includes('Sequence ID'));
      assert.ok(headerLine.includes('Assignment Status'));
      assert.ok(headerLine.includes('Assigned Depth'));
      assert.ok(headerLine.includes('Deepest Assigned Rank'));
      assert.ok(headerLine.includes('Deepest Assigned Taxon'));
      assert.ok(headerLine.includes('Deepest Confidence'));
      assert.ok(headerLine.includes('QC Warnings'));

      assert.ok(headerLine.includes('Domain Taxon,Domain Confidence,Domain Assigned'));
      assert.ok(headerLine.includes('Genus Taxon,Genus Confidence,Genus Assigned'));

      const row1 = lines[1];
      assert.ok(row1.includes('SEQ_01'));
      assert.ok(row1.includes('assigned_full'));
      assert.ok(row1.includes('Thalassiosira'));
      assert.ok(row1.includes('0.840'));
      assert.ok(row1.includes('TRUE'));

      const row2 = lines[2];
      assert.ok(row2.includes("''=MALICIOUS_FORMULA_ID") || row2.includes("'=MALICIOUS_FORMULA_ID"));
      assert.ok(row2.includes('"Dinoflagellata, Dinophyceae"'));
      assert.ok(row2.includes('LOW_CONFIDENCE_WARNING; AMBIGUOUS_MATCH'));
    });

    it('adapts dynamically to a custom 4-rank ladder without assuming 8 ranks', () => {
      const { content, count } = buildResultsCsvContent(sampleRunCustom4);
      assert.equal(count, 1);

      const lines = content.slice(1).split('\r\n');
      const headerLine = lines[0];

      assert.ok(headerLine.includes('Domain Taxon'));
      assert.ok(headerLine.includes('Phylum Taxon'));
      assert.ok(headerLine.includes('Class Taxon'));
      assert.ok(headerLine.includes('Order Taxon'));
      assert.ok(!headerLine.includes('Genus Taxon'));
    });

    it('exports selected sequences only when sequenceIds option is supplied', () => {
      const selected = new Set(['SEQ_03_UNASSIGNED']);
      const { content, count } = buildResultsCsvContent(sampleRunPR2, selected);
      assert.equal(count, 1);

      const lines = content.slice(1).split('\r\n');
      assert.equal(lines.length, 2);
      assert.ok(lines[1].includes('SEQ_03_UNASSIGNED'));
    });
  });

  describe('4. Community Insights Export (JSON & CSV)', () => {
    it('exports Community Insights JSON with explicit denominators, scope, and non-destructive notice', () => {
      const content = buildCommunityInsightsJsonContent(sampleRunPR2, sampleInsightsData);
      const parsed = JSON.parse(content);

      assert.equal(parsed.report_type, 'Community Insights Taxonomic Summary');
      assert.equal(parsed.run.run_id, 'run-pr2-101');
      assert.equal(parsed.is_synthetic, true);

      assert.equal(parsed.summary_metrics.total_sequences, 4);
      assert.equal(parsed.summary_metrics.valid_sequences, 3);
      assert.equal(parsed.summary_metrics.overall_assignment_rate_total_pct, 50);
      assert.equal(parsed.summary_metrics.overall_assignment_rate_total_denominator, 'Total Sequences (N = 4)');
      assert.equal(parsed.summary_metrics.overall_assignment_rate_valid_denominator, 'Valid Sequences (N = 3)');

      assert.equal(parsed.taxonomic_composition.evaluated_rank, 'division');
      assert.equal(parsed.taxonomic_composition.scope, 'ALL');
      assert.equal(parsed.taxonomic_composition.scope_total_sequences, 4);

      assert.ok(parsed.candidate_threshold_simulation);
      assert.equal(parsed.candidate_threshold_simulation.current_tau, 0.60);
      assert.equal(parsed.candidate_threshold_simulation.candidate_tau, 0.85);
      assert.equal(parsed.candidate_threshold_simulation.delta_vs_current.fullDelta, -1);
      assert.ok(parsed.candidate_threshold_simulation.scientific_notice.includes('Cutoff changes alter consecutive prefix stopping depth'));
    });

    it('omits candidate simulation block when no simulation was run', () => {
      const dataWithoutSim = { ...sampleInsightsData, candidateSimulation: null };
      const content = buildCommunityInsightsJsonContent(sampleRunPR2, dataWithoutSim);
      const parsed = JSON.parse(content);
      assert.equal(parsed.candidate_threshold_simulation, undefined);
    });

    it('exports Community Insights CSV with structured sections and denominators', () => {
      const content = buildCommunityInsightsCsvContent(sampleRunPR2, sampleInsightsData);

      assert.ok(content.startsWith('\uFEFF'));
      assert.ok(content.includes('=== EDNA EXPLORER COMMUNITY INSIGHTS REPORT ==='));
      assert.ok(content.includes('--- SUMMARY METRICS ---'));
      assert.ok(content.includes('Total Sequences,4,100.0%,Total sequences in selected run (N = 4)'));
      assert.ok(content.includes('--- ASSIGNMENT STATUS DISTRIBUTION ---'));
      assert.ok(content.includes('--- ASSIGNMENT DEPTH DISTRIBUTION ---'));
      assert.ok(content.includes('--- TAXONOMIC COMPOSITION (RANK: DIVISION) ---'));
      assert.ok(content.includes('Scope Total Sequences (Denominator),4'));
      assert.ok(content.includes('"Dinoflagellata, Dinophyceae"'));
      assert.ok(content.includes('--- NON-DESTRUCTIVE THRESHOLD SIMULATION ---'));
      assert.ok(content.includes('Candidate simulation is non-destructive and does not alter stored run records.'));
    });
  });

  describe('5. Export Outcome Return Contracts & Edge Cases', () => {
    it('handles empty sequences array without throwing errors', () => {
      const emptyRun = { ...sampleRunPR2, sequences: [] };
      const csvOutcome = buildResultsCsvContent(emptyRun);
      assert.equal(csvOutcome.count, 0);
      assert.ok(csvOutcome.content.includes('Sequence ID'));

      const jsonOutcome = buildContractJsonContent(emptyRun);
      assert.equal(jsonOutcome.count, 0);
      const parsed = JSON.parse(jsonOutcome.content);
      assert.equal(parsed.sequences.length, 0);
    });
  });
});
