import { useState } from 'react';
import type { Report } from '../types';
import type { AsvView, Filters } from '../lib/derive';
import type { WorkspaceState } from '../lib/urlState';
import { ReportHeader } from './ReportHeader';
import { Summary } from './Summary';
import { Composition } from './Composition';
import { UnresolvedCallout } from './UnresolvedCallout';
import { ResultsWorkspace } from './ResultsWorkspace';
import { Reliability } from './Reliability';

interface Props {
  report: Report;
  views: AsvView[];
  rows: AsvView[];
  state: WorkspaceState;
  defaults: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  update: (patch: Partial<WorkspaceState>) => void;
  onOpenAsv: (id: string) => void;
  onDrill: (patch: Partial<Filters>) => void;
  onSampleType: (t: any) => void;
  onBackToSamples?: () => void;
}

export type ResultsLayer = 'level1' | 'level2' | 'level3' | 'all';

export function LayeredResultsView({
  report,
  views,
  rows,
  state,
  defaults,
  setFilters,
  update,
  onOpenAsv,
  onDrill,
  onSampleType,
  onBackToSamples,
}: Props) {
  const [activeLayer, setActiveLayer] = useState<ResultsLayer>('level1');

  return (
    <div className="layered-results-container">
      {/* Top Breadcrumb & Return to Stations */}
      <div className="results-nav-strip">
        <div className="crumb-group">
          {onBackToSamples && (
            <button type="button" className="back-link-btn" onClick={onBackToSamples}>
              ← Back to Samples
            </button>
          )}
          <span className="crumb-sep">/</span>
          <span className="crumb-text">{report.sample.project}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-active mono">{report.sample.sampleId}</span>
        </div>

        {/* LAYER SWITCHER TABS: LEVEL 1, LEVEL 2, LEVEL 3 */}
        <div className="results-layer-tabs" role="tablist" aria-label="Analysis Detail Level">
          <button
            type="button"
            role="tab"
            aria-selected={activeLayer === 'level1'}
            className={`layer-tab ${activeLayer === 'level1' ? 'active' : ''}`}
            onClick={() => setActiveLayer('level1')}
          >
            <span className="tab-num">L1</span>
            <span className="tab-title">Executive Summary</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeLayer === 'level2'}
            className={`layer-tab ${activeLayer === 'level2' ? 'active' : ''}`}
            onClick={() => setActiveLayer('level2')}
          >
            <span className="tab-num">L2</span>
            <span className="tab-title">Biodiversity Insights</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeLayer === 'level3'}
            className={`layer-tab ${activeLayer === 'level3' ? 'active' : ''}`}
            onClick={() => setActiveLayer('level3')}
          >
            <span className="tab-num">L3</span>
            <span className="tab-title">Scientific Details</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeLayer === 'all'}
            className={`layer-tab all-tab ${activeLayer === 'all' ? 'active' : ''}`}
            onClick={() => setActiveLayer('all')}
          >
            All Levels
          </button>
        </div>
      </div>

      {/* Header Context is shown across all views */}
      <ReportHeader report={report} onSampleType={onSampleType} />

      {/* =========================================================
          LEVEL 1: EXECUTIVE SUMMARY
          Show only the most important information:
          - Total detected taxa
          - Species identified
          - Samples successfully processed
          - Taxonomic identification coverage
          - Unresolved sequences
          - Biodiversity observations
          ========================================================= */}
      {(activeLayer === 'level1' || activeLayer === 'all') && (
        <div className="layer-block level1-block">
          {activeLayer === 'all' && (
            <div className="level-divider">
              <span className="level-tag">LEVEL 1</span>
              <h3>Executive Summary &amp; High-Level Findings</h3>
            </div>
          )}
          <Summary report={report} views={views} onDrill={(patch) => {
            onDrill(patch);
            if (activeLayer === 'level1') setActiveLayer('level3');
          }} />
        </div>
      )}

      {/* =========================================================
          LEVEL 2: BIODIVERSITY INSIGHTS
          Present:
          - Species composition
          - Taxonomic distribution
          - Biodiversity comparisons between sites
          - Rarefaction saturation curves
          ========================================================= */}
      {(activeLayer === 'level2' || activeLayer === 'all') && (
        <div className="layer-block level2-block">
          {activeLayer === 'all' && (
            <div className="level-divider">
              <span className="level-tag">LEVEL 2</span>
              <h3>Biodiversity Insights &amp; Taxonomic Structure</h3>
            </div>
          )}
          <Composition
            views={views}
            ranks={report.methods.ranks}
            initialRank="Phylum"
            onDrill={(patch) => {
              onDrill(patch);
              if (activeLayer === 'level2') setActiveLayer('level3');
            }}
          />
        </div>
      )}

      {/* =========================================================
          LEVEL 3: SCIENTIFIC DETAILS
          Allow advanced users to explore:
          - Kingdom, phylum, class, order, family, genus, species
          - Taxonomic assignments & confidence scores
          - Reference database matches & unmatched sequences
          - Expert-review flags & 2x2 reliability matrix
          ========================================================= */}
      {(activeLayer === 'level3' || activeLayer === 'all') && (
        <div className="layer-block level3-block">
          {activeLayer === 'all' && (
            <div className="level-divider">
              <span className="level-tag">LEVEL 3</span>
              <h3>Bioinformatic Results, ASVs &amp; Evidence Audit</h3>
            </div>
          )}
          <UnresolvedCallout views={views} methods={report.methods} onDrill={onDrill} />
          <ResultsWorkspace
            views={views}
            rows={rows}
            methods={report.methods}
            sampleId={report.sample.sampleId}
            state={state}
            defaults={defaults}
            setFilters={setFilters}
            update={update}
            onOpen={onOpenAsv}
          />
          <Reliability report={report} views={views} onDrill={onDrill} />
        </div>
      )}
    </div>
  );
}

