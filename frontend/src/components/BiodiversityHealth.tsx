import { useState } from 'react';
import type { AsvView, Filters } from '../lib/derive';
import { calculateBiodiversityIndices, fmtInt } from '../lib/derive';
import { IconAlert, IconCheck, IconInfo, IconLeaf, IconShield } from './icons';

interface Props {
  views: AsvView[];
  onDrill: (patch: Partial<Filters>) => void;
}

export function BiodiversityHealth({ views, onDrill }: Props) {
  const bio = calculateBiodiversityIndices(views);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Plain-English interpretations based on standard ecological thresholds
  const shannonInterpretation =
    bio.shannon >= 3.0
      ? 'High biodiversity across multiple trophic levels'
      : bio.shannon >= 2.0
      ? 'Moderate ecological richness'
      : 'Low diversity (disturbed or specialized habitat)';

  const simpsonInterpretation =
    bio.simpson >= 0.8
      ? 'Low dominance — no single species monopolizes site'
      : bio.simpson >= 0.5
      ? 'Moderate dominance by dominant taxa'
      : 'High single-species monopolization';

  const evennessInterpretation =
    bio.evenness >= 0.75
      ? 'Well-balanced community distribution'
      : bio.evenness >= 0.5
      ? 'Moderate distribution across taxa'
      : 'Skewed toward few abundant taxa';

  return (
    <div className="biodiversity-health-panel">
      {/* 1. Header with plain-English finding summary */}
      <div className="bio-health-header">
        <div>
          <div className="bio-badge">
            <span className="pulse-dot" />
            Ecological Assessment · TNFD &amp; MoEFCC Aligned
          </div>
          <h3>Biodiversity &amp; Ecosystem Health Summary</h3>
          <p className="summary-lede">
            <strong>What did the analysis find? </strong>
            This sampling station exhibits <strong>{shannonInterpretation.toLowerCase()}</strong> with{' '}
            <strong>{evennessInterpretation.toLowerCase()}</strong>. A total of{' '}
            <strong className="text-teal">{fmtInt(bio.speciesRichness)} confirmed species</strong> were verified against reference databases.
          </p>
        </div>

        {/* Environmental Sentinel Pills */}
        <div className="bio-status-strip">
          {bio.threatenedCount > 0 ? (
            <button
              type="button"
              className="status-pill status-warn"
              onClick={() => onDrill({ preset: 'threatened', minReads: 0 })}
              title="Click to view IUCN Red List species in Results"
            >
              <span className="pill-icon"><IconShield size={13} /></span>
              <span><strong>{bio.threatenedCount}</strong> IUCN Threatened Taxa</span>
            </button>
          ) : (
            <span className="status-pill status-ok" title="No IUCN threatened species detected">
              <span className="pill-icon"><IconCheck size={13} /></span>
              <span>0 Threatened Taxa</span>
            </span>
          )}

          {bio.bioindicatorCount > 0 && (
            <button
              type="button"
              className="status-pill status-info"
              onClick={() => onDrill({ preset: 'bioindicator', minReads: 0 })}
              title="Click to inspect sentinel bioindicator species"
            >
              <span className="pill-icon"><IconLeaf size={13} /></span>
              <span><strong>{bio.bioindicatorCount}</strong> Bioindicators</span>
            </button>
          )}

          {bio.invasiveAlertCount > 0 ? (
            <button
              type="button"
              className="status-pill status-alert"
              onClick={() => onDrill({ preset: 'invasive', minReads: 0 })}
              title="Click to inspect detected biosecurity watch or invasive organisms"
            >
              <span className="pill-icon"><IconAlert size={13} /></span>
              <span><strong>{bio.invasiveAlertCount}</strong> Biosecurity Alert</span>
            </button>
          ) : (
            <span className="status-pill status-ok" title="Zero known high-risk biosecurity threats detected">
              <span className="pill-icon"><IconCheck size={13} /></span>
              <span>Biosecurity Clear</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Four Structured Metric Cards: Plain-English headline first, technical metric as supporting info */}
      <div className="bio-metrics-grid">
        {/* Card 1: Species Richness */}
        <div
          className="bio-metric-card clickable"
          onClick={() => onDrill({ preset: 'hc-species', minReads: 0 })}
          title="Click to view all high-confidence resolved species"
          role="button"
          tabIndex={0}
        >
          <div className="metric-top">
            <span className="metric-title">Confirmed Species</span>
            <span className="metric-tag-badge">Taxa (S)</span>
          </div>
          <div className="metric-value mono text-teal">{fmtInt(bio.speciesRichness)}</div>
          <div className="metric-sub bold">
            {bio.speciesRichness >= 25 ? 'High taxonomic richness' : 'Moderate species count'}
          </div>
          <p className="metric-plain-desc">
            Direct reference barcode matches passing &ge;97% bootstrap support across {fmtInt(bio.asvs)} genetic variants.
          </p>
          <span className="kpi-link">View confirmed species list →</span>
        </div>

        {/* Card 2: Community Diversity (Shannon H') */}
        <div
          className={`bio-metric-card ${activeTooltip === 'shannon' ? 'active' : ''}`}
          onClick={() => setActiveTooltip(activeTooltip === 'shannon' ? null : 'shannon')}
          role="button"
          tabIndex={0}
        >
          <div className="metric-top">
            <span className="metric-title">Community Diversity</span>
            <span className="info-icon" title="Toggle scientific details"><IconInfo size={13} /></span>
          </div>
          <div className="metric-value mono">{bio.shannon.toFixed(2)}</div>
          <div className="metric-sub bold">
            {bio.shannon >= 3.0 ? 'Diverse ecosystem' : 'Moderate diversity'}
          </div>
          <p className="metric-plain-desc">
            {shannonInterpretation}. Represents approx. {Math.round(bio.effectiveSpecies)} equally common species.
          </p>
          <div className="metric-tech-footnote muted small">
            Supporting Metric: Shannon-Wiener Index (H′) = {bio.shannon.toFixed(2)}
          </div>
          {activeTooltip === 'shannon' && (
            <div className="metric-explanation">
              <strong>Why this matters:</strong> Shannon-Wiener index quantifies uncertainty in community composition.
              Values &gt;3.0 indicate high ecological health and resilience.
            </div>
          )}
        </div>

        {/* Card 3: Ecosystem Dominance (Simpson 1-D) */}
        <div
          className={`bio-metric-card ${activeTooltip === 'simpson' ? 'active' : ''}`}
          onClick={() => setActiveTooltip(activeTooltip === 'simpson' ? null : 'simpson')}
          role="button"
          tabIndex={0}
        >
          <div className="metric-top">
            <span className="metric-title">Species Dominance</span>
            <span className="info-icon" title="Toggle scientific details"><IconInfo size={13} /></span>
          </div>
          <div className="metric-value mono">{bio.simpson.toFixed(3)}</div>
          <div className="metric-sub bold">
            {bio.simpson >= 0.8 ? 'Low dominance (Healthy)' : 'Moderate dominance'}
          </div>
          <p className="metric-plain-desc">
            {simpsonInterpretation}. {(bio.simpson * 100).toFixed(0)}% probability that two random reads belong to distinct taxa.
          </p>
          <div className="metric-tech-footnote muted small">
            Supporting Metric: Simpson Complement (1 − D) = {bio.simpson.toFixed(3)}
          </div>
          {activeTooltip === 'simpson' && (
            <div className="metric-explanation">
              <strong>Why this matters:</strong> A high Simpson complement (&gt;0.8) indicates that the environment is
              not dominated by a monoculture or nuisance bloom.
            </div>
          )}
        </div>

        {/* Card 4: Community Evenness (Pielou J') */}
        <div
          className={`bio-metric-card ${activeTooltip === 'evenness' ? 'active' : ''}`}
          onClick={() => setActiveTooltip(activeTooltip === 'evenness' ? null : 'evenness')}
          role="button"
          tabIndex={0}
        >
          <div className="metric-top">
            <span className="metric-title">Community Balance</span>
            <span className="info-icon" title="Toggle scientific details"><IconInfo size={13} /></span>
          </div>
          <div className="metric-value mono">{bio.evenness.toFixed(2)}</div>
          <div className="metric-sub bold">
            {bio.evenness >= 0.7 ? 'Equitable balance' : 'Skewed distribution'}
          </div>
          <p className="metric-plain-desc">
            {evennessInterpretation}. Sequencing reads are spread proportionally across identified organisms.
          </p>
          <div className="metric-tech-footnote muted small">
            Supporting Metric: Pielou's Evenness (J′) = {bio.evenness.toFixed(2)}
          </div>
          {activeTooltip === 'evenness' && (
            <div className="metric-explanation">
              <strong>Why this matters:</strong> Pielou’s evenness (0.0 to 1.0) checks whether a few species dominate
              all reads. Values near 1.0 reflect a well-equilibrated community.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
