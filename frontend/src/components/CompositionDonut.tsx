import { useState } from 'react';
import { fmtCompact, fmtInt, fmtPct, UNASSIGNED } from '../lib/derive';

interface GroupData {
  name: string;
  asvs: number;
  reads: number;
}

interface Props {
  groups: GroupData[];
  measure: 'reads' | 'asvs';
  total: number;
  rankLabel: string;
  onSelect: (name: string) => void;
}

// Biological palette with high-contrast, accessible hues
const PALETTE = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#dc2626', // Red
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#ca8a04', // Yellow
  '#475569', // Slate
  '#16a34a', // Green
  '#9333ea', // Violet
  '#ea580c', // Orange
];

export function CompositionDonut({ groups, measure, total, rankLabel, onSelect }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Take top 7 groups and bundle the rest into "Other"
  const assigned = groups.filter((g) => g.name !== UNASSIGNED).sort((a, b) => b[measure] - a[measure]);
  const unassigned = groups.find((g) => g.name === UNASSIGNED);

  const topSlices: GroupData[] = assigned.slice(0, 7);
  const remainder = assigned.slice(7);
  if (remainder.length > 0) {
    const otherSum = remainder.reduce(
      (acc, g) => ({ name: `Other (${remainder.length} taxa)`, asvs: acc.asvs + g.asvs, reads: acc.reads + g.reads }),
      { name: '', asvs: 0, reads: 0 },
    );
    topSlices.push(otherSum);
  }
  if (unassigned) {
    topSlices.push(unassigned);
  }

  // Calculate slice angles for SVG donut
  const radius = 80;
  const strokeWidth = 32;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const slices = topSlices.map((group, idx) => {
    const value = group[measure];
    const fraction = total > 0 ? value / total : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += fraction;

    const isUnassigned = group.name === UNASSIGNED;
    const color = isUnassigned ? '#94a3b8' : PALETTE[idx % PALETTE.length];

    return {
      group,
      fraction,
      strokeDasharray,
      strokeDashoffset,
      color,
      isUnassigned,
    };
  });

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="donut-viz-card">
      <div className="donut-chart-wrap">
        <svg viewBox="0 0 240 240" className="donut-svg" role="img" aria-label={`Taxonomic composition at ${rankLabel}`}>
          <g transform="translate(120, 120) rotate(-90)">
            {/* Background track */}
            <circle cx="0" cy="0" r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />

            {/* Slices */}
            {slices.map((s, idx) => (
              <circle
                key={`${s.group.name}-${idx}`}
                cx="0"
                cy="0"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={s.strokeDasharray}
                strokeDashoffset={s.strokeDashoffset}
                className={`donut-slice ${hoveredIdx === idx ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelect(s.group.name)}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
              />
            ))}
          </g>

          {/* Donut Center Display */}
          <foreignObject x="50" y="50" width="140" height="140" className="donut-center-obj">
            <div className="donut-center-content">
              {activeSlice ? (
                <>
                  <div className="donut-center-pct mono">
                    {fmtPct(activeSlice.fraction * 100, 1)}
                  </div>
                  <div className="donut-center-name" title={activeSlice.group.name}>
                    {activeSlice.group.name}
                  </div>
                  <div className="donut-center-val muted small">
                    {measure === 'asvs' ? fmtInt(activeSlice.group.asvs) : fmtCompact(activeSlice.group.reads)}{' '}
                    {measure === 'asvs' ? 'ASVs' : 'reads'}
                  </div>
                </>
              ) : (
                <>
                  <div className="donut-center-title muted small">{rankLabel} Level</div>
                  <div className="donut-center-main mono">{fmtInt(assigned.length)}</div>
                  <div className="donut-center-sub muted small">Taxa Detected</div>
                </>
              )}
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* Legend Column */}
      <div className="donut-legend">
        <div className="donut-legend-header">
          <span className="small muted">Taxon ({rankLabel})</span>
          <span className="small muted num">{measure === 'asvs' ? 'ASVs' : 'Read Share'}</span>
        </div>
        <div className="donut-legend-list">
          {slices.map((s, idx) => (
            <button
              key={`${s.group.name}-${idx}`}
              type="button"
              className={`donut-legend-item ${hoveredIdx === idx ? 'active' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelect(s.group.name)}
            >
              <span className="legend-indicator" style={{ backgroundColor: s.color }} />
              <span className="legend-name" title={s.group.name}>
                {s.group.name}
              </span>
              <span className="legend-pct mono">
                {fmtPct(s.fraction * 100, 1)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
