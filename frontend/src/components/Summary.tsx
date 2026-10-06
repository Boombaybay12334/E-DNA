import { useState } from 'react';
import type { Report } from '../types';
import { fmtCompact, fmtInt, fmtPct, resolutionProfile, summarize, type AsvView, type Filters } from '../lib/derive';
import { BarRow, Section, Toggle } from './bits';

interface Props {
  report: Report;
  views: AsvView[];
  onDrill: (patch: Partial<Filters>) => void;
}

export function Summary({ report, views, onDrill }: Props) {
  const ranks = report.methods.ranks;
  const s = summarize(views, ranks);
  const profile = resolutionProfile(views, ranks);
  const [measure, setMeasure] = useState<'asvs' | 'reads'>('asvs');
  const total = measure === 'asvs' ? s.asvs : s.reads;
  const max = Math.max(...profile.map((r) => r[measure]));
  const genusIdx = ranks.indexOf('Genus');
  const flaggedControls = report.controls.length;

  // Tiles are counts with a click-through. Nothing here is decorative.
  const tiles: { value: string; label: string; hint: string; patch: Partial<Filters> }[] = [
    {
      value: fmtInt(s.taxa), label: 'taxa at their deepest supported rank',
      hint: 'Each ASV counted once, at the deepest rank its evidence supports',
      patch: {},
    },
    {
      value: fmtInt(s.hcSpecies), label: 'species with high confidence',
      hint: 'Distinct species names, High confidence, contaminants excluded',
      patch: { preset: 'hc-species' },
    },
    {
      value: fmtInt(s.aboveGenus), label: 'ASVs resolved only above genus',
      hint: 'Deepest supported rank is Family or higher',
      patch: { ranks: ranks.slice(0, genusIdx) },
    },
    {
      value: fmtInt(s.unrepresented), label: 'ASVs possibly unrepresented in the reference DB',
      hint: 'High reference divergence. Not evidence of new species.',
      patch: { preset: 'unrepresented' },
    },
    {
      value: fmtInt(s.unresolved), label: 'ASVs unresolved',
      hint: 'No rank supported, not even Domain',
      patch: { preset: 'unresolved' },
    },
  ];

  return (
    <Section id="summary" title="Summary">
      <p className="lede">
        <strong className="mono">{fmtInt(s.asvs)}</strong> ASVs (unique sequence variants) from{' '}
        <strong className="mono">{fmtInt(s.reads)}</strong> reads after QC.
      </p>

      <div className="tiles">
        {tiles.map((t) => (
          <button key={t.label} type="button" className="tile" onClick={() => onDrill({ ...t.patch, minReads: 0 })} title={t.hint}>
            <span className="tile-value mono">{t.value}</span>
            <span className="tile-label">{t.label}</span>
            <span className="tile-cta">View in results →</span>
          </button>
        ))}
      </div>

      <div className="subsection">
        <div className="subsection-head">
          <h3>How deep could ASVs be classified?</h3>
          <Toggle label="Measure" value={measure} onChange={setMeasure}
            options={[{ value: 'asvs', label: 'by ASVs' }, { value: 'reads', label: 'by reads' }]} />
        </div>
        <p className="muted small">
          Deepest rank with confidence ≥ {report.methods.supportCutoff.toFixed(2)}. Click a row to see those ASVs.
        </p>
        <div className="bars">
          {profile.map((r) => (
            <BarRow
              key={r.rank}
              label={r.rank === 'None' ? 'None (unresolved)' : r.rank}
              value={r[measure]}
              max={max}
              display={`${measure === 'asvs' ? fmtInt(r.asvs) : fmtCompact(r.reads)} · ${fmtPct(total ? (r[measure] / total) * 100 : 0, 0)}`}
              emphasis={r.rank === 'None' ? 'unassigned' : undefined}
              onClick={() => onDrill({ ranks: [r.rank], minReads: 0 })}
              title={`${fmtInt(r.asvs)} ASVs, ${fmtInt(r.reads)} reads`}
            />
          ))}
        </div>
      </div>

      <div className="quality-strip" role="status">
        <span>✓ QC completed: {fmtInt(report.qc[report.qc.length - 1].reads)} of {fmtInt(report.qc[0].reads)} reads retained</span>
        {flaggedControls > 0 && (
          <span>⚠ {flaggedControls} taxa also detected in negative controls</span>
        )}
        <a href="#reliability">See reliability &amp; methods →</a>
      </div>
    </Section>
  );
}
