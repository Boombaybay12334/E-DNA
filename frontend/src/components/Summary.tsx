import { useMemo, useState, type ReactNode } from 'react';
import type { Report } from '../types';
import { fmtCompact, fmtInt, fmtPct, resolutionProfile, summarize, type AsvView, type Filters } from '../lib/derive';
import { BarRow, Section, Toggle } from './bits';

interface Props {
  report: Report;
  views: AsvView[];
  onDrill: (patch: Partial<Filters>) => void;
}

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);
const TILE_ICONS = {
  taxa: svg(<><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" /><path d="M8 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8M13 12h3" /></>),
  species: svg(<><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>),
  higher: svg(<path d="M5 20V10M12 20V4M19 20v-7" />),
  unrep: svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M11 8v3M11 14h.01" /></>),
  unresolved: svg(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01" /></>),
};

export function Summary({ report, views, onDrill }: Props) {
  const ranks = report.methods.ranks;
  const s = summarize(views, ranks);
  const profile = resolutionProfile(views, ranks);
  const [measure, setMeasure] = useState<'asvs' | 'reads'>('asvs');
  const total = measure === 'asvs' ? s.asvs : s.reads;
  const max = Math.max(...profile.map((r) => r[measure]));
  const genusIdx = ranks.indexOf('Genus');
  const flaggedControls = report.controls.length;

  const diversityStats = useMemo(() => {
    const activeAsvs = report.asvs.filter((a) => a.reads > 0);
    const totalReads = activeAsvs.reduce((sum, a) => sum + a.reads, 0);
    const richness = activeAsvs.length;

    if (totalReads === 0 || richness === 0) {
      return {
        richness: 0,
        shannon: 0,
        simpson: 0,
        giniSimpson: 0,
        evenness: 1,
      };
    }

    const p = activeAsvs.map((a) => a.reads / totalReads);
    const shannon = -p.reduce((acc, pi) => acc + (pi > 0 ? pi * Math.log(pi) : 0), 0);
    const simpson = p.reduce((acc, pi) => acc + pi * pi, 0);
    const giniSimpson = 1 - simpson;
    const evenness = richness > 1 ? shannon / Math.log(richness) : 1.0;

    return {
      richness,
      shannon,
      simpson,
      giniSimpson,
      evenness,
    };
  }, [report.asvs]);

  // Tiles are counts with a click-through. Nothing here is decorative.
  const tiles: { value: string; label: string; hint: string; patch: Partial<Filters>; tone: string; icon: ReactNode }[] = [
    {
      value: fmtInt(s.taxa), label: 'taxa at their deepest supported rank',
      hint: 'Each ASV counted once, at the deepest rank its evidence supports',
      patch: {}, tone: 'teal', icon: TILE_ICONS.taxa,
    },
    {
      value: fmtInt(s.hcSpecies), label: 'species with high confidence',
      hint: 'Distinct species names, High confidence, contaminants excluded',
      patch: { preset: 'hc-species' }, tone: 'good', icon: TILE_ICONS.species,
    },
    {
      value: fmtInt(s.aboveGenus), label: 'ASVs resolved only above genus',
      hint: 'Deepest supported rank is Family or higher',
      patch: { ranks: ranks.slice(0, genusIdx) }, tone: 'info', icon: TILE_ICONS.higher,
    },
    {
      value: fmtInt(s.unrepresented), label: 'ASVs possibly unrepresented in the reference DB',
      hint: 'High reference divergence. Not evidence of new species.',
      patch: { preset: 'unrepresented' }, tone: 'div', icon: TILE_ICONS.unrep,
    },
    {
      value: fmtInt(s.unresolved), label: 'ASVs unresolved',
      hint: 'No rank supported, not even Domain',
      patch: { preset: 'unresolved' }, tone: 'bad', icon: TILE_ICONS.unresolved,
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
          <button key={t.label} type="button" className={`tile tone-${t.tone}`} onClick={() => onDrill({ ...t.patch, minReads: 0 })} title={t.hint}>
            <span className="tile-icon">{t.icon}</span>
            <span className="tile-value mono">{t.value}</span>
            <span className="tile-label">{t.label}</span>
            <span className="tile-cta">View in results →</span>
          </button>
        ))}
      </div>

      <div className="subsection">
        <div className="subsection-head">
          <h3>Ecological Diversity Indices</h3>
        </div>
        <p className="muted small">
          Alpha diversity metrics calculated across active amplicon sequence variants (reads &gt; 0).
        </p>
        <div className="diversity-grid">
          <div className="diversity-card tone-teal">
            <span className="diversity-card-title">Species Richness (S)</span>
            <span className="diversity-card-value mono">{fmtInt(diversityStats.richness)}</span>
            <span className="diversity-card-sublabel">Total variants with reads &gt; 0</span>
          </div>

          <div className="diversity-card tone-info">
            <span className="diversity-card-title">Shannon-Wiener Index (H')</span>
            <span className="diversity-card-value mono">{diversityStats.shannon.toFixed(3)}</span>
            <span className="diversity-card-sublabel">Diversity &amp; entropy: −∑(pᵢ · ln pᵢ)</span>
          </div>

          <div className="diversity-card tone-mid">
            <span className="diversity-card-title">Simpson's Dominance (D)</span>
            <span className="diversity-card-value mono">{diversityStats.simpson.toFixed(3)}</span>
            <span className="diversity-card-sublabel">
              Gini-Simpson (1 − D): <strong className="mono">{diversityStats.giniSimpson.toFixed(3)}</strong>
            </span>
          </div>

          <div className="diversity-card tone-good">
            <span className="diversity-card-title">Pielou's Evenness (J')</span>
            <span className="diversity-card-value mono">{diversityStats.evenness.toFixed(3)}</span>
            <span className="diversity-card-sublabel">Equitability: H' / ln(S)</span>
          </div>
        </div>
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
        <span><span className="qs-ok">✓ QC completed:</span> {fmtInt(report.qc[report.qc.length - 1].reads)} of {fmtInt(report.qc[0].reads)} reads retained</span>
        {flaggedControls > 0 && (
          <span className="qs-warn">⚠ {flaggedControls} taxa also detected in negative controls</span>
        )}
        <a href="#reliability">See reliability &amp; methods →</a>
      </div>
    </Section>
  );
}
