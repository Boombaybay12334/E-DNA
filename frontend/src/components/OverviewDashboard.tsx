import { useState } from 'react';
import type { ProjectRecord, SampleRecord, PipelineJob, AppNavView } from '../types';
import { fmtInt } from '../lib/derive';
import { IconAlert, IconDroplet, IconFolder, IconLeaf, IconPin, IconPipeline, IconPlus, IconShield } from './icons';

interface Props {
  projects: ProjectRecord[];
  samples: SampleRecord[];
  jobs: PipelineJob[];
  onNavigate: (view: AppNavView, context?: { projectId?: string; sampleId?: string }) => void;
  onOpenCreateProject: () => void;
  onOpenAddSample: () => void;
}

export function OverviewDashboard({
  projects,
  samples,
  jobs,
  onNavigate,
  onOpenCreateProject,
  onOpenAddSample,
}: Props) {
  const [selectedDomain, setSelectedDomain] = useState<'all' | 'aquatic' | 'terrestrial'>('all');

  const filteredProjects = selectedDomain === 'all'
    ? projects
    : projects.filter((p) => p.domain === selectedDomain);

  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const totalSamples = samples.length;
  const totalReads = samples.reduce((acc, s) => acc + s.readCount, 0);
  const totalConfirmedSpecies = samples.reduce((acc, s) => acc + s.identifiedSpecies, 0);
  const activeJob = jobs.find((j) => j.status === 'processing');

  return (
    <div className="overview-container">
      {/* 1. FIRST: What am I looking at? */}
      <div className="overview-header">
        <div>
          <div className="platform-tag">
            <span className="pulse-dot green" />
            Environmental Intelligence Platform · Goa &amp; Coastal Karnataka
          </div>
          <h1>Environmental Assessment &amp; eDNA Intelligence</h1>
          <p className="subtitle">
            Executive oversight of environmental impact assessments, coastal infrastructure monitoring, and ecosystem biodiversity.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="overview-actions">
          <button type="button" className="btn-secondary" onClick={onOpenAddSample}>
            <span className="btn-icon"><IconPlus size={16} /></span> Log Samples
          </button>
          <button type="button" className="btn-primary" onClick={onOpenCreateProject}>
            <span className="btn-icon"><IconFolder size={16} /></span> New Assessment Project
          </button>
        </div>
      </div>

      {/* 2. SECOND: What did the analysis find? Plain-English Executive Findings Panel */}
      <div className="executive-finding-card">
        <div className="finding-lead-row">
          <span className="finding-pill observation-pill">Executive Finding</span>
          <h3>Biodiversity Health &amp; Regulatory Highlights</h3>
        </div>
        <p className="finding-explanation">
          Across <strong>{projects.length} environmental assessment projects</strong> and <strong>{totalSamples} field stations</strong>,
          sequencing has identified <strong className="text-teal">{totalConfirmedSpecies} confirmed species</strong>.
          Marine water, estuarine sediment, and post-mining restoration plots show stable community equitability with zero unmanaged invasive biofouling threats.
        </p>

        <div className="finding-bullet-grid">
          <div className="finding-bullet-item">
            <div className="bullet-icon text-teal">✓</div>
            <div>
              <strong>High Species Richness Confirmed</strong>
              <p className="muted small">32 confirmed marine taxa cataloged at Mormugao Port berths; 28 taxa in Zuari mangroves.</p>
            </div>
          </div>

          <div className="finding-bullet-item">
            <div className="bullet-icon text-amber">🛡️</div>
            <div>
              <strong>Sentinel IUCN Coral Detected</strong>
              <p className="muted small">Deep-water Lophelia coral (<em>Desmophyllum pertusum</em>) verified in Arabian Sea bathypelagic station.</p>
            </div>
          </div>

          <div className="finding-bullet-item">
            <div className="bullet-icon text-accent">🧪</div>
            <div>
              <strong>Rigorous Clean-Room Validation</strong>
              <p className="muted small">{(totalReads / 1e6).toFixed(2)}M reads filtered at Q30 baseline; 1 field blank flagged for ecologist sign-off.</p>
            </div>
          </div>

          <div className="finding-bullet-item">
            <div className="bullet-icon text-teal">📋</div>
            <div>
              <strong>Regulatory Deliverables Ready</strong>
              <p className="muted small">MoEFCC EIA 2006 and CRZ 2019 compliance chapters can be generated directly for all active sites.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Portfolio Status KPI Cards with Plain-English Explanations */}
      <section className="dashboard-section" aria-labelledby="kpi-heading">
        <div className="section-title-wrap">
          <h2 id="kpi-heading" className="section-title">Portfolio Scope &amp; Ecological Footprint</h2>
          <div className="domain-pill-filter">
            <button
              type="button"
              className={`pill-btn ${selectedDomain === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedDomain('all')}
            >
              All Domains ({projects.length})
            </button>
            <button
              type="button"
              className={`pill-btn ${selectedDomain === 'aquatic' ? 'active' : ''}`}
              onClick={() => setSelectedDomain('aquatic')}
            >
              <IconDroplet size={14} /> Aquatic eDNA ({projects.filter((p) => p.domain === 'aquatic').length})
            </button>
            <button
              type="button"
              className={`pill-btn ${selectedDomain === 'terrestrial' ? 'active' : ''}`}
              onClick={() => setSelectedDomain('terrestrial')}
            >
              <IconLeaf size={14} /> Terrestrial Soil ({projects.filter((p) => p.domain === 'terrestrial').length})
            </button>
          </div>
        </div>

        <div className="kpi-grid">
          {/* Card 1: Active Projects */}
          <div className="kpi-card" onClick={() => onNavigate('projects')} role="button" tabIndex={0}>
            <div className="kpi-meta">
              <span className="kpi-label">Active Assessments</span>
              <span className="kpi-badge active-badge">{activeProjectsCount} In Progress</span>
            </div>
            <div className="kpi-value mono">{projects.length}</div>
            <div className="kpi-sub bold">
              Environmental monitoring projects
            </div>
            <p className="metric-plain-desc">
              Covering port dredging, estuarine mangroves, and Western Ghats mine overburden.
            </p>
            <span className="kpi-link">Manage projects portfolio →</span>
          </div>

          {/* Card 2: Monitored Stations */}
          <div className="kpi-card" onClick={() => onNavigate('samples')} role="button" tabIndex={0}>
            <div className="kpi-meta">
              <span className="kpi-label">Sampling Stations</span>
              <span className="kpi-badge ok-badge">100% Geo-Audited</span>
            </div>
            <div className="kpi-value mono">{totalSamples}</div>
            <div className="kpi-sub bold">
              Field sampling locations
            </div>
            <p className="metric-plain-desc">
              Water column, benthic sediment grab, and soil core stations with GPS coordinates.
            </p>
            <span className="kpi-link">Inspect sample inventory →</span>
          </div>

          {/* Card 3: Quality Sequencing Depth */}
          <div className="kpi-card" onClick={() => onNavigate('analysis')} role="button" tabIndex={0}>
            <div className="kpi-meta">
              <span className="kpi-label">Sequencing Depth (Q30)</span>
              <span className="kpi-badge info-badge">Q30 Validated</span>
            </div>
            <div className="kpi-value mono">{(totalReads / 1e6).toFixed(2)} M</div>
            <div className="kpi-sub bold">
              Validated biological reads
            </div>
            <p className="metric-plain-desc">
              Average {fmtInt(Math.round(totalReads / (totalSamples || 1)))} reads/sample ensuring high sensitivity for rare taxa.
            </p>
            <span className="kpi-link">Monitor pipeline execution →</span>
          </div>

          {/* Card 4: Conservation & Biosecurity Sentinel */}
          <div className="kpi-card alert-card" onClick={() => onNavigate('insights')} role="button" tabIndex={0}>
            <div className="kpi-meta">
              <span className="kpi-label">Sentinel &amp; Biosecurity</span>
              <span className="kpi-badge warn-badge">2 Flags</span>
            </div>
            <div className="kpi-value mono text-amber">4 Taxa</div>
            <div className="kpi-sub bold text-amber">
              Special review required
            </div>
            <p className="metric-plain-desc">
              2 IUCN Vulnerable, 1 bioindicator sentinel, and 1 field blank requiring sign-off.
            </p>
            <span className="kpi-link text-amber">Review sentinel taxa →</span>
          </div>
        </div>
      </section>

      {/* 4. Priority Attention Queue & Next Step Quick Actions */}
      <div className="dashboard-two-col">
        {/* Left Column: Action & Attention Queue */}
        <section className="dashboard-section attention-section">
          <div className="section-title-wrap">
            <h2 className="section-title">Priority Attention Queue</h2>
            <span className="tag-counter">3 Action Items</span>
          </div>

          <div className="attention-list">
            {/* Attention Item 1: Control Blank */}
            <div className="attention-item warn-border">
              <div className="attention-icon"><IconAlert size={16} /></div>
              <div className="attention-content">
                <div className="attention-top">
                  <strong>Control Cross-Check Needed</strong>
                  <span className="badge-tag">Station: SMP-GOA-03</span>
                </div>
                <p>
                  Chicalim Bay Estuarine Mouth detected <em>Oikopleura dioica</em> sequences in field blank negative control. LIMS requires ecologist review before EIA sign-off.
                </p>
                <div className="attention-action">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => onNavigate('results', { sampleId: 'SMP-GOA-03' })}
                  >
                    Open Sample Diagnostic →
                  </button>
                </div>
              </div>
            </div>

            {/* Attention Item 2: Threatened Species Confirmation */}
            <div className="attention-item info-border">
              <div className="attention-icon"><IconShield size={16} /></div>
              <div className="attention-content">
                <div className="attention-top">
                  <strong>IUCN Vulnerable Coral Verification</strong>
                  <span className="badge-tag">Project: PRJ-GOA-01</span>
                </div>
                <p>
                  Confirmed sequence detection of <em>Desmophyllum pertusum</em> (Lophelia coral) in deeper channel boundaries. Ready for inclusion in regulatory EIA deliverable.
                </p>
                <div className="attention-action">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => onNavigate('reports', { projectId: 'PRJ-GOA-01' })}
                  >
                    Generate EIA Report Section →
                  </button>
                </div>
              </div>
            </div>

            {/* Attention Item 3: Pipeline Running */}
            {activeJob && (
              <div className="attention-item progress-border">
                <div className="attention-icon"><IconPipeline size={16} /></div>
                <div className="attention-content">
                  <div className="attention-top">
                    <strong>Pipeline Analysis Running</strong>
                    <span className="badge-tag active-badge">Stage 4 of 5</span>
                  </div>
                  <p>
                    Processing sample <strong>{activeJob.sampleName}</strong>: {activeJob.stages[3].detail}
                  </p>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: '78%' }} />
                  </div>
                  <div className="attention-action">
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => onNavigate('analysis')}
                    >
                      View Real-Time Pipeline Progress →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Workflow Steps */}
        <section className="dashboard-section workflow-section">
          <div className="section-title-wrap">
            <h2 className="section-title">Recommended Next Actions</h2>
            <span className="muted small">4-Step Environmental Workflow</span>
          </div>

          <div className="workflow-tiles">
            <div className="workflow-card" onClick={onOpenCreateProject}>
              <div className="workflow-card-head">
                <span className="w-icon">1</span>
                <h4>Create Environmental Assessment</h4>
              </div>
              <p>Initialize a new project with client metadata, CRZ / CPCB compliance scope, and environmental domain.</p>
              <span className="card-cta">Start Wizard →</span>
            </div>

            <div className="workflow-card" onClick={onOpenAddSample}>
              <div className="workflow-card-head">
                <span className="w-icon">2</span>
                <h4>Log Environmental Samples</h4>
              </div>
              <p>Add marine water, estuarine sediment, or soil cores with GPS coordinates, depths, and field parameters.</p>
              <span className="card-cta">Add Sample Record →</span>
            </div>

            <div className="workflow-card" onClick={() => onNavigate('insights')}>
              <div className="workflow-card-head">
                <span className="w-icon">3</span>
                <h4>Compare Sampling Sites</h4>
              </div>
              <p>Contrast impact stations against baseline reference controls with community dissimilarity metrics.</p>
              <span className="card-cta">Explore Comparative Insights →</span>
            </div>

            <div className="workflow-card" onClick={() => onNavigate('reports')}>
              <div className="workflow-card-head">
                <span className="w-icon">4</span>
                <h4>Generate Client EIA Deliverable</h4>
              </div>
              <p>Export a formatted, audit-ready biodiversity assessment briefing with method notes and uncertainty bounds.</p>
              <span className="card-cta">Open Report Generator →</span>
            </div>
          </div>
        </section>
      </div>

      {/* 5. Active Environmental Projects Table */}
      <section className="dashboard-section">
        <div className="section-title-wrap">
          <div>
            <h2 className="section-title">Active Environmental Assessment Projects</h2>
            <p className="muted small">
              Focus region: Goa coastal shelf, Mormugao port, Zuari mangroves &amp; Western Ghats restoration.
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => onNavigate('projects')}>
            View All Projects ({projects.length})
          </button>
        </div>

        <div className="table-card">
          <table className="modern-table">
            <thead>
              <tr>
                <th scope="col">Project Identifier &amp; Name</th>
                <th scope="col">Domain</th>
                <th scope="col">Location &amp; Client</th>
                <th scope="col">Stations</th>
                <th scope="col">Key Ecological Finding</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr key={p.id} onClick={() => onNavigate('projects', { projectId: p.id })}>
                  <td>
                    <div className="project-cell-name">
                      <strong>{p.name}</strong>
                      <span className="mono muted small">{p.id}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`domain-badge domain-${p.domain}`}>
                      {p.domain === 'aquatic' ? <><IconDroplet size={13} /> Aquatic</> : <><IconLeaf size={13} /> Terrestrial</>}
                      <span className="sub-tag">({p.subtype.replace('_', ' ')})</span>
                    </span>
                  </td>
                  <td className="location-cell">
                    <IconPin size={13} /> {p.location}
                    <span className="muted small">Client: {p.organization}</span>
                  </td>
                  <td className="mono num">
                    {p.sampleIds.length} stations
                  </td>
                  <td className="findings-cell" title={p.keyObservation}>
                    {p.keyObservation ?? 'Analysis completed'}
                  </td>
                  <td>
                    <span className={`status-badge status-${p.status}`}>
                      {p.status === 'active' ? '● Active' : p.status === 'completed' ? '✓ Completed' : '◐ Review'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('projects', { projectId: p.id });
                      }}
                    >
                      Open Project →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
