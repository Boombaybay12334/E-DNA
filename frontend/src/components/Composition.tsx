import { useMemo, useState } from 'react';
import {
  composition, fmtCompact, fmtInt, fmtPct, rarefaction, richnessByRank, UNASSIGNED, type AsvView, type Filters,
} from '../lib/derive';
import { BarRow, Section, Toggle } from './bits';

interface Props {
  views: AsvView[];
  ranks: string[];
  /** Rank shown first; falls back to the top rank if the reference taxonomy doesn't have it. */
  initialRank: string;
  onDrill: (patch: Partial<Filters>) => void;
}

const TOP_N = 8;

export function Composition({ views, ranks, initialRank, onDrill }: Props) {
  const [rankIdx, setRankIdx] = useState(Math.max(0, ranks.indexOf(initialRank)));
  const [measure, setMeasure] = useState<'asvs' | 'reads'>('reads');
  const [showAll, setShowAll] = useState(false);

  const groups = useMemo(() => composition(views, rankIdx), [views, rankIdx]);
  const assigned = groups.filter((g) => g.name !== UNASSIGNED).sort((a, b) => b[measure] - a[measure]);
  const unassigned = groups.find((g) => g.name === UNASSIGNED);
  const total = groups.reduce((s, g) => s + g[measure], 0);
  const max = Math.max(...groups.map((g) => g[measure]));
  const shown = showAll ? assigned : assigned.slice(0, TOP_N);

  const richness = useMemo(() => richnessByRank(views, ranks), [views, ranks]);
  const curve = useMemo(() => rarefaction(views.map((v) => v.asv.reads)), [views]);

  const drill = (name: string) => {
    if (name === UNASSIGNED) return onDrill({ ranks: ['None', ...ranks.slice(0, rankIdx)], minReads: 0 });
    const v = views.find((x) => x.deepest >= rankIdx && x.lineage[rankIdx] === name);
    onDrill({ taxon: v ? v.lineage.slice(0, rankIdx + 1) : null, minReads: 0 });
  };

  return (
    <Section id="composition" title="Composition">
      <div className="subsection-head">
        <label className="inline-control">
          Rank{' '}
          <select value={rankIdx} onChange={(e) => setRankIdx(Number(e.target.value))}>
            {ranks.map((r, i) => <option key={r} value={i}>{r}</option>)}
          </select>
        </label>
        <Toggle label="Measure" value={measure} onChange={setMeasure}
          options={[{ value: 'reads', label: 'Read share' }, { value: 'asvs', label: 'ASV count' }]} />
      </div>

      <div className="bars">
        {shown.map((g) => (
          <BarRow key={g.name} label={g.name} value={g[measure]} max={max}
            display={`${measure === 'asvs' ? fmtInt(g.asvs) : fmtCompact(g.reads)} · ${fmtPct((g[measure] / total) * 100)}`}
            onClick={() => drill(g.name)} title={`${fmtInt(g.asvs)} ASVs, ${fmtInt(g.reads)} reads`} />
        ))}
        {assigned.length > TOP_N && (
          <button type="button" className="link" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show top 8' : `… ${assigned.length - TOP_N} more ${ranks[rankIdx].toLowerCase()} groups`}
          </button>
        )}
        {unassigned && (
          <BarRow label={UNASSIGNED} value={unassigned[measure]} max={max} emphasis="unassigned"
            display={`${measure === 'asvs' ? fmtInt(unassigned.asvs) : fmtCompact(unassigned.reads)} · ${fmtPct((unassigned[measure] / total) * 100)}`}
            onClick={() => drill(UNASSIGNED)} title="ASVs whose evidence does not reach this rank. Always shown." />
        )}
      </div>
      {measure === 'reads' && (
        <p className="caveat">ⓘ Read share reflects amplified DNA, not abundance or biomass. PCR bias and copy number distort it.</p>
      )}

      <div className="two-col">
        <div className="subsection">
          <h3>Richness by rank</h3>
          <p className="muted small">Distinct supported names at each rank.</p>
          <table className="mini-table">
            <tbody>
              {richness.map((r) => (
                <tr key={r.rank}><th scope="row">{r.rank}</th><td className="mono num">{fmtInt(r.count)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="subsection">
          <h3>Rarefaction (ASV richness vs. sequencing depth)</h3>
          <p className="muted small">If the curve is still rising, more sequencing would likely detect more ASVs.</p>
          <RarefactionChart points={curve} />
        </div>
      </div>
    </Section>
  );
}

/** Round step (1, 2, 2.5 or 5 × 10^n) giving at most `count` intervals up to `max`. */
function niceStep(max: number, count: number) {
  const raw = max / count || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
}
const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(v);
  return out;
};

function RarefactionChart({ points }: { points: { depth: number; richness: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 420, H = 180, L = 48, B = 28, T = 8, R = 12;
  const maxX = points[points.length - 1]?.depth || 1;
  const yStep = niceStep(Math.max(...points.map((p) => p.richness)), 4);
  const maxY = Math.ceil(Math.max(...points.map((p) => p.richness)) / yStep) * yStep || 1; // top gridline = a label
  const xStep = niceStep(maxX, 4);
  const x = (d: number) => L + (d / maxX) * (W - L - R);
  const y = (r: number) => T + (1 - r / maxY) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.depth).toFixed(1)},${y(p.richness).toFixed(1)}`).join(' ');
  const yTicks = range(0, maxY, yStep);
  const xTicks = range(0, maxX, xStep);
  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img"
        aria-label={`Rarefaction curve reaching ${fmtInt(points[points.length - 1]?.richness ?? 0)} ASVs at ${fmtInt(maxX)} reads`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0;
          points.forEach((p, i) => { if (Math.abs(x(p.depth) - px) < Math.abs(x(points[best].depth) - px)) best = i; });
          setHover(best);
        }}>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" />
            <text x={L - 6} y={y(t) + 4} className="tick" textAnchor="end">{fmtCompact(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={H - 8} className="tick" textAnchor="middle">{fmtCompact(t)}</text>
        ))}
        <path d={path} className="line" />
        {hp && (
          <g>
            <line x1={x(hp.depth)} x2={x(hp.depth)} y1={T} y2={H - B} className="crosshair" />
            <circle cx={x(hp.depth)} cy={y(hp.richness)} r="4" className="dot" />
          </g>
        )}
      </svg>
      <div className="chart-readout mono small">
        {hp ? `${fmtInt(hp.depth)} reads → ${fmtInt(hp.richness)} expected ASVs` : 'Hover the curve for values'}
      </div>
    </div>
  );
}
