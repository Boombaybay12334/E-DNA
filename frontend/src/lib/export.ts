import type { AsvView } from './derive';

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCsv(rows: AsvView[], ranks: string[], sampleId: string) {
  const header = [
    'asv_id', 'reads', 'reads_pct', 'deepest_rank', ...ranks.map((r) => r.toLowerCase()),
    'confidence_at_deepest', 'confidence_band', 'best_identity', 'best_coverage', 'divergence_band',
    'possibly_unrepresented', 'top_hit_accession', 'top_hit_taxon', 'flags', 'reasons',
  ];
  const lines = rows.map((v) => [
    v.asv.id, v.asv.reads, v.readsPct.toFixed(4), v.deepestRank,
    ...ranks.map((_, k) => v.lineage[k] ?? ''),
    v.confidence.toFixed(2), v.band, v.bestIdentity, v.bestCoverage, v.divergence,
    v.possiblyUnrepresented ? 'yes' : 'no',
    v.asv.topHits[0]?.accession ?? '', v.asv.topHits[0]?.taxon ?? '',
    v.asv.flags.join(';'), v.asv.reasons.map((r) => r.code).join(';'),
  ].map(csvCell).join(','));
  download(`${sampleId}_asvs.csv`, [header.join(','), ...lines].join('\n'), 'text/csv');
}

export function toFasta(v: AsvView) {
  const header = `>${v.asv.id} reads=${v.asv.reads} deepest=${v.deepestRank} taxon=${v.name.replace(/\s/g, '_')}`;
  return `${header}\n${v.asv.sequence.match(/.{1,60}/g)?.join('\n') ?? ''}`;
}

export function exportFasta(rows: AsvView[], sampleId: string) {
  download(`${sampleId}_asvs.fasta`, rows.map(toFasta).join('\n') + '\n', 'text/plain');
}
