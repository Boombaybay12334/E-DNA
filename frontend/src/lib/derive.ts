// Everything the UI displays is derived here from the report + its stated thresholds,
// so table, tree, summary and charts can never disagree with each other.

import type { Asv, Report, ReportMethods } from '../types';

export type ConfidenceBand = 'high' | 'moderate' | 'low' | 'unsupported';
export type DivergenceBand = 'low' | 'medium' | 'high';
export type Resolution = 'species' | 'partial' | 'unresolved';

export const CONFIDENCE_LABEL: Record<ConfidenceBand, string> = {
  high: 'High', moderate: 'Moderate', low: 'Low', unsupported: 'Unsupported',
};
export const DIVERGENCE_LABEL: Record<DivergenceBand, string> = {
  low: 'Low', medium: 'Medium', high: 'High',
};

export interface AsvView {
  asv: Asv;
  /** Index of the deepest supported rank; -1 when nothing is supported. */
  deepest: number;
  deepestRank: string; // rank name or 'None'
  /** Supported part of the lineage only. */
  lineage: string[];
  name: string; // deepest supported name, or 'Unresolved'
  /** Confidence at the deepest supported rank (or at the top rank when unresolved). */
  confidence: number;
  band: ConfidenceBand;
  bestIdentity: number;
  bestCoverage: number;
  divergence: DivergenceBand;
  resolution: Resolution;
  /** Placed somewhere in the tree, but far from every reference. NOT a claim of novelty. */
  possiblyUnrepresented: boolean;
  contaminant: boolean;
  readsPct: number;
}

export function confidenceBand(c: number, m: ReportMethods): ConfidenceBand {
  if (c < m.supportCutoff) return 'unsupported';
  if (c >= m.confidenceBands.high) return 'high';
  if (c >= m.confidenceBands.moderate) return 'moderate';
  return 'low';
}

export function divergenceBand(identity: number, m: ReportMethods): DivergenceBand {
  if (identity >= m.divergenceBands.lowMinIdentity) return 'low';
  if (identity >= m.divergenceBands.mediumMinIdentity) return 'medium';
  return 'high';
}

export function deriveViews(report: Report): AsvView[] {
  const m = report.methods;
  const total = report.asvs.reduce((s, a) => s + a.reads, 0);
  const speciesIdx = m.ranks.length - 1;
  return report.asvs.map((asv) => {
    let deepest = -1;
    for (let k = 0; k < asv.calls.length; k++) {
      if (asv.calls[k].confidence >= m.supportCutoff) deepest = k;
      else break;
    }
    const lineage = asv.calls.slice(0, deepest + 1).map((c) => c.name);
    const confidence = asv.calls[Math.max(deepest, 0)].confidence;
    const best = asv.topHits[0];
    const divergence = divergenceBand(best?.identity ?? 0, m);
    const resolution: Resolution = deepest === speciesIdx ? 'species' : deepest < 0 ? 'unresolved' : 'partial';
    const contaminant = asv.flags.includes('LIKELY_CONTAMINANT');
    return {
      asv,
      deepest,
      deepestRank: deepest >= 0 ? m.ranks[deepest] : 'None',
      lineage,
      name: deepest >= 0 ? lineage[deepest] : 'Unresolved',
      confidence,
      band: confidenceBand(confidence, m),
      bestIdentity: best?.identity ?? 0,
      bestCoverage: best?.coverage ?? 0,
      divergence,
      resolution,
      possiblyUnrepresented: resolution === 'partial' && divergence === 'high' && !contaminant,
      contaminant,
      readsPct: total ? (asv.reads / total) * 100 : 0,
    };
  });
}

// ---------- Presets & filters ----------

export type PresetId = 'all' | 'hc-species' | 'review' | 'unrepresented' | 'unresolved';

export const PRESETS: { id: PresetId; label: string; hint: string; test: (v: AsvView) => boolean }[] = [
  { id: 'all', label: 'All', hint: 'No preset', test: () => true },
  {
    id: 'hc-species', label: 'High-confidence species',
    hint: 'Resolved to species with High confidence, not flagged as contaminant',
    test: (v) => v.resolution === 'species' && v.band === 'high' && !v.contaminant,
  },
  {
    id: 'review', label: 'Needs review',
    hint: 'Low confidence at the deepest rank, or any flag',
    test: (v) => v.band === 'low' || v.asv.flags.length > 0,
  },
  {
    id: 'unrepresented', label: 'Possibly unrepresented',
    hint: 'Placed above species, and High reference divergence',
    test: (v) => v.possiblyUnrepresented,
  },
  {
    id: 'unresolved', label: 'Unresolved',
    hint: 'No rank supported, not even Domain',
    test: (v) => v.resolution === 'unresolved',
  },
];

export interface Filters {
  q: string;
  preset: PresetId;
  ranks: string[]; // deepest rank names, incl. 'None'
  conf: ConfidenceBand[];
  div: DivergenceBand[];
  phyla: string[];
  /** Taxon path from the tree, e.g. ['Eukaryota','Metazoa','Mollusca']. */
  taxon: string[] | null;
  /** When true, only ASVs that stop exactly at `taxon` (not resolved below it). */
  taxonExact: boolean;
  minReads: number;
  hideContaminants: boolean;
}

export function defaultFilters(m: ReportMethods): Filters {
  return {
    q: '', preset: 'all', ranks: [], conf: [], div: [], phyla: [],
    taxon: null, taxonExact: false, minReads: m.minReadsDefault, hideContaminants: false,
  };
}

export function applyFilters(views: AsvView[], f: Filters): AsvView[] {
  const preset = PRESETS.find((p) => p.id === f.preset) ?? PRESETS[0];
  const q = f.q.trim().toLowerCase();
  return views.filter((v) => {
    if (!preset.test(v)) return false;
    if (v.asv.reads < f.minReads) return false;
    if (f.hideContaminants && v.contaminant) return false;
    if (f.ranks.length && !f.ranks.includes(v.deepestRank)) return false;
    if (f.conf.length && !f.conf.includes(v.band)) return false;
    if (f.div.length && !f.div.includes(v.divergence)) return false;
    if (f.phyla.length && !f.phyla.includes(v.lineage[2] ?? '')) return false;
    if (f.taxon) {
      for (let k = 0; k < f.taxon.length; k++) if (v.lineage[k] !== f.taxon[k]) return false;
      if (f.taxonExact && v.lineage.length !== f.taxon.length) return false;
    }
    if (q) {
      // Matches ASV ID or any *supported* name, so "Gastropoda" returns everything within it.
      if (!v.asv.id.toLowerCase().includes(q) && !v.lineage.some((n) => n.toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

// ---------- Summary metrics ----------

export function summarize(views: AsvView[], ranks: string[]) {
  const reads = views.reduce((s, v) => s + v.asv.reads, 0);
  const taxa = new Set(views.filter((v) => v.deepest >= 0).map((v) => v.lineage.join('|')));
  const hcSpecies = new Set(
    views.filter((v) => v.resolution === 'species' && v.band === 'high' && !v.contaminant).map((v) => v.name),
  );
  const genusIdx = ranks.indexOf('Genus');
  const aboveGenus = views.filter((v) => v.deepest >= 0 && v.deepest < genusIdx).length;
  const unrepresented = views.filter((v) => v.possiblyUnrepresented).length;
  const unresolved = views.filter((v) => v.resolution === 'unresolved').length;
  return { asvs: views.length, reads, taxa: taxa.size, hcSpecies: hcSpecies.size, aboveGenus, unrepresented, unresolved };
}

/** ASV count and reads by deepest supported rank, deepest first, ending with 'None'. */
export function resolutionProfile(views: AsvView[], ranks: string[]) {
  const rows = [...ranks].reverse().concat('None').map((rank) => ({ rank, asvs: 0, reads: 0 }));
  const byRank = new Map(rows.map((r) => [r.rank, r]));
  for (const v of views) {
    const r = byRank.get(v.deepestRank)!;
    r.asvs++;
    r.reads += v.asv.reads;
  }
  return rows;
}

export const UNASSIGNED = 'Unassigned at this rank';

export function composition(views: AsvView[], rankIdx: number) {
  const groups = new Map<string, { name: string; asvs: number; reads: number }>();
  for (const v of views) {
    const name = v.deepest >= rankIdx ? v.lineage[rankIdx] : UNASSIGNED;
    const g = groups.get(name) ?? { name, asvs: 0, reads: 0 };
    g.asvs++;
    g.reads += v.asv.reads;
    groups.set(name, g);
  }
  return [...groups.values()];
}

export function richnessByRank(views: AsvView[], ranks: string[]) {
  return ranks.map((rank, k) => ({
    rank,
    count: new Set(views.filter((v) => v.deepest >= k).map((v) => v.lineage.slice(0, k + 1).join('|'))).size,
  }));
}

// ---------- Rarefaction (Hurlbert expected ASV richness) ----------

function lgamma(x: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const lnChoose = (n: number, k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

export function rarefaction(counts: number[], points = 24) {
  const N = counts.reduce((s, c) => s + c, 0);
  const out: { depth: number; richness: number }[] = [{ depth: 0, richness: 0 }];
  for (let p = 1; p <= points; p++) {
    const n = Math.round((N * p) / points);
    const lnTotal = lnChoose(N, n);
    let s = 0;
    for (const c of counts) s += N - c < n ? 1 : 1 - Math.exp(lnChoose(N - c, n) - lnTotal);
    out.push({ depth: n, richness: s });
  }
  return out;
}

// ---------- Taxonomy tree ----------

export interface TreeNode {
  key: string;
  name: string;
  rankIdx: number;
  path: string[];
  asvs: number;
  reads: number;
  /** ASVs whose deepest supported rank is exactly this node. */
  stopsHere: AsvView[];
  children: TreeNode[];
}

export function buildTree(views: AsvView[]): { roots: TreeNode[]; unresolved: AsvView[] } {
  const root: TreeNode = { key: '', name: '', rankIdx: -1, path: [], asvs: 0, reads: 0, stopsHere: [], children: [] };
  const index = new Map<string, TreeNode>([['', root]]);
  const unresolved: AsvView[] = [];
  for (const v of views) {
    if (v.deepest < 0) {
      unresolved.push(v);
      continue;
    }
    let parent = root;
    for (let k = 0; k <= v.deepest; k++) {
      const path = v.lineage.slice(0, k + 1);
      const key = path.join('|');
      let node = index.get(key);
      if (!node) {
        node = { key, name: v.lineage[k], rankIdx: k, path, asvs: 0, reads: 0, stopsHere: [], children: [] };
        index.set(key, node);
        parent.children.push(node);
      }
      node.asvs++;
      node.reads += v.asv.reads;
      parent = node;
    }
    parent.stopsHere.push(v);
  }
  const sort = (n: TreeNode) => {
    n.children.sort((a, b) => b.reads - a.reads);
    n.children.forEach(sort);
  };
  sort(root);
  return { roots: root.children, unresolved };
}

// ---------- Formatting ----------

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtPct = (n: number, dp = 1) => `${n.toFixed(dp)}%`;
export const fmtCompact = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e4 ? `${(n / 1e3).toFixed(0)} k` : fmtInt(n);
