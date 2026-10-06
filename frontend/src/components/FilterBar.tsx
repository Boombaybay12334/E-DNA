import { useMemo } from 'react';
import type { ReportMethods } from '../types';
import {
  applyFilters, CONFIDENCE_LABEL, DIVERGENCE_LABEL, fmtInt, PRESETS,
  type AsvView, type ConfidenceBand, type DivergenceBand, type Filters,
} from '../lib/derive';
import { MultiSelect } from './bits';

interface Props {
  views: AsvView[];
  filters: Filters;
  defaults: Filters;
  methods: ReportMethods;
  matched: number;
  setFilters: (patch: Partial<Filters>) => void;
}

/** Count per option with every *other* filter applied, so counts predict the result. */
function facetCounts<T extends string>(views: AsvView[], f: Filters, clear: Partial<Filters>, key: (v: AsvView) => T) {
  const counts = new Map<T, number>();
  for (const v of applyFilters(views, { ...f, ...clear })) counts.set(key(v), (counts.get(key(v)) ?? 0) + 1);
  return counts;
}

export function FilterBar({ views, filters: f, defaults, methods, matched, setFilters }: Props) {
  const rankOpts = [...methods.ranks, 'None'];
  const counts = useMemo(() => ({
    rank: facetCounts(views, f, { ranks: [] }, (v) => v.deepestRank),
    conf: facetCounts(views, f, { conf: [] }, (v) => v.band),
    div: facetCounts(views, f, { div: [] }, (v) => v.divergence),
    phylum: facetCounts(views, f, { phyla: [] }, (v) => v.lineage[2] ?? ''),
  }), [views, f]);
  const phyla = useMemo(
    () => [...new Set(views.map((v) => v.lineage[2]).filter((p): p is string => !!p))].sort(),
    [views],
  );

  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (f.q) chips.push({ label: `Search: "${f.q}"`, clear: { q: '' } });
  if (f.taxon) chips.push({ label: `Taxon: ${f.taxon.join(' › ')}${f.taxonExact ? ' (not resolved below)' : ''}`, clear: { taxon: null, taxonExact: false } });
  if (f.ranks.length) chips.push({ label: `Deepest rank: ${f.ranks.join(', ')}`, clear: { ranks: [] } });
  if (f.conf.length) chips.push({ label: `Confidence: ${f.conf.map((c) => CONFIDENCE_LABEL[c]).join(', ')}`, clear: { conf: [] } });
  if (f.div.length) chips.push({ label: `Divergence: ${f.div.map((d) => DIVERGENCE_LABEL[d]).join(', ')}`, clear: { div: [] } });
  if (f.phyla.length) chips.push({ label: `Phylum: ${f.phyla.join(', ')}`, clear: { phyla: [] } });
  if (f.hideContaminants) chips.push({ label: 'Contaminants hidden', clear: { hideContaminants: false } });

  return (
    <div className="filterbar">
      <input
        type="search"
        className="search"
        placeholder="Search ASV ID or any taxon (e.g. Gastropoda)"
        value={f.q}
        onChange={(e) => setFilters({ q: e.target.value })}
        aria-label="Search ASV ID or taxon"
      />

      <div className="presets" role="group" aria-label="Presets">
        <span className="muted small">Presets:</span>
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="chip" aria-pressed={f.preset === p.id}
            title={p.hint} onClick={() => setFilters({ preset: p.id })}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="facets">
        <MultiSelect label="Deepest rank" selected={f.ranks} onChange={(ranks) => setFilters({ ranks })}
          options={rankOpts.map((r) => ({ value: r, label: r, count: counts.rank.get(r) ?? 0 }))} />
        <MultiSelect<ConfidenceBand> label="Confidence" selected={f.conf} onChange={(conf) => setFilters({ conf })}
          options={(['high', 'moderate', 'low', 'unsupported'] as ConfidenceBand[]).map((b) => ({
            value: b, label: CONFIDENCE_LABEL[b], count: counts.conf.get(b) ?? 0,
          }))} />
        <MultiSelect<DivergenceBand> label="Ref. divergence" selected={f.div} onChange={(div) => setFilters({ div })}
          options={(['low', 'medium', 'high'] as DivergenceBand[]).map((b) => ({
            value: b, label: DIVERGENCE_LABEL[b], count: counts.div.get(b) ?? 0,
          }))} />
        <MultiSelect label="Phylum" selected={f.phyla} onChange={(phyla) => setFilters({ phyla })}
          options={phyla.map((p) => ({ value: p, label: p, count: counts.phylum.get(p) ?? 0 }))} />
        <label className="inline-control">
          Reads ≥{' '}
          <input type="number" min={0} value={f.minReads} className="num-input"
            onChange={(e) => setFilters({ minReads: Math.max(0, Number(e.target.value) || 0) })} />
        </label>
        <label className="inline-control">
          <input type="checkbox" checked={f.hideContaminants}
            onChange={(e) => setFilters({ hideContaminants: e.target.checked })} />
          Hide likely contaminants
        </label>
      </div>

      <div className="active-filters">
        <span className="result-count">
          <span className="mono">{fmtInt(views.length)}</span> → <strong className="mono">{fmtInt(matched)}</strong> ASVs
        </span>
        {f.minReads > 0 && <span className="muted small">(hiding ASVs with &lt; {f.minReads} reads)</span>}
        {chips.map((c) => (
          <button key={c.label} type="button" className="chip removable" onClick={() => setFilters(c.clear)}>
            {c.label} ✕
          </button>
        ))}
        {(chips.length > 0 || f.preset !== 'all' || f.minReads !== defaults.minReads) && (
          <button type="button" className="link" onClick={() => setFilters(defaults)}>Reset all</button>
        )}
      </div>
    </div>
  );
}
