import type { ClassificationResult, SequenceRecord } from '../types/contract';

/**
 * Exports classification results as CSV matching Section 10 of project requirements.
 */
export function exportResultsCsv(result: ClassificationResult, filenamePrefix: string = 'edna_classification'): void {
  const ranks = result.run.ranks;
  
  // Build header row
  const headers = [
    'Sequence ID',
    'Length (bp)',
    'Status',
    'Assigned Depth',
    'Deepest Rank',
    'Deepest Taxon',
    ...ranks.flatMap(r => [`${r.charAt(0).toUpperCase() + r.slice(1)} Taxon`, `${r.charAt(0).toUpperCase() + r.slice(1)} Confidence`]),
    'Warnings',
  ];

  const rows = result.sequences.map((seq: SequenceRecord) => {
    const rankData = ranks.flatMap(r => {
      const entry = seq.lineage.find(l => l.rank.toLowerCase() === r.toLowerCase());
      const taxon = entry?.taxon ?? '';
      const conf = entry?.confidence !== null && entry?.confidence !== undefined ? entry.confidence.toFixed(3) : '';
      return [taxon, conf];
    });

    return [
      seq.id,
      seq.length ?? '',
      seq.status,
      seq.assigned_depth,
      seq.deepest_rank ?? '',
      seq.deepest_taxon ?? '',
      ...rankData,
      seq.warnings.join('; '),
    ];
  });

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(',')),
  ].join('\r\n');

  downloadFile(csvContent, `${filenamePrefix}_${result.run.run_id}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exports complete classification contract JSON.
 */
export function exportResultsJson(result: ClassificationResult, filenamePrefix: string = 'edna_classification'): void {
  const jsonContent = JSON.stringify(result, null, 2);
  downloadFile(jsonContent, `${filenamePrefix}_${result.run.run_id}.json`, 'application/json;charset=utf-8;');
}

// Aliases
export const exportToCsv = exportResultsCsv;
export const exportToJson = exportResultsJson;

// Legacy compatibility stubs for old files
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

function escapeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
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
