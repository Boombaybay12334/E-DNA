import { useState } from 'react';
import type { ProjectRecord, SampleRecord, AppNavView, EnvironmentalDomain, EcosystemSubtype } from '../types';
import { IconAlert, IconCheck, IconDroplet, IconFolder, IconLeaf, IconPin, IconReport, IconSearch, IconShield } from './icons';

interface Props {
  projects: ProjectRecord[];
  samples: SampleRecord[];
  onNavigate: (view: AppNavView, context?: { projectId?: string; sampleId?: string }) => void;
  onCreateProject: (project: ProjectRecord) => void;
  selectedProjectId?: string;
}

export function ProjectsView({
  projects,
  samples,
  onNavigate,
  onCreateProject,
  selectedProjectId,
}: Props) {
  const [domainFilter, setDomainFilter] = useState<'all' | EnvironmentalDomain>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProject, setActiveProject] = useState<string | null>(selectedProjectId ?? projects[0]?.id ?? null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filtered projects
  const filtered = projects.filter((p) => {
    if (domainFilter !== 'all' && p.domain !== domainFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || p.organization.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedProj = projects.find((p) => p.id === activeProject) ?? filtered[0] ?? null;
  const projectSamples = selectedProj
    ? samples.filter((s) => s.projectId === selectedProj.id)
    : [];

  return (
    <div className="projects-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="platform-tag">
            <span>Portfolio Management</span>
          </div>
          <h1>Environmental Assessment Projects</h1>
          <p className="subtitle">
            Manage biodiversity monitoring campaigns, environmental impact assessments, and regulatory audit records.
          </p>
        </div>

        <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
          <span className="btn-icon"><IconFolder size={16} /></span> New Environmental Project
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="portfolio-filter-bar">
        <div className="search-wrap" style={{ maxWidth: 360 }}>
          <span className="search-icon"><IconSearch size={15} /></span>
          <input
            type="search"
            className="search"
            placeholder="Search projects by name, location or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="domain-pill-filter">
          <button
            type="button"
            className={`pill-btn ${domainFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDomainFilter('all')}
          >
            All Projects ({projects.length})
          </button>
          <button
            type="button"
            className={`pill-btn ${domainFilter === 'aquatic' ? 'active' : ''}`}
            onClick={() => setDomainFilter('aquatic')}
          >
            <IconDroplet size={14} /> Aquatic Domain ({projects.filter((p) => p.domain === 'aquatic').length})
          </button>
          <button
            type="button"
            className={`pill-btn ${domainFilter === 'terrestrial' ? 'active' : ''}`}
            onClick={() => setDomainFilter('terrestrial')}
          >
            <IconLeaf size={14} /> Terrestrial Domain ({projects.filter((p) => p.domain === 'terrestrial').length})
          </button>
        </div>
      </div>

      {/* Projects Grid + Selected Project Detail */}
      <div className="projects-layout">
        {/* Project List */}
        <div className="projects-list">
          {filtered.map((p) => {
            const isSelected = selectedProj?.id === p.id;
            return (
              <div
                key={p.id}
                className={`project-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setActiveProject(p.id)}
              >
                <div className="proj-card-top">
                  <span className={`domain-badge domain-${p.domain}`}>
                    {p.domain === 'aquatic' ? <><IconDroplet size={13} /> Aquatic</> : <><IconLeaf size={13} /> Terrestrial</>}
                  </span>
                  <span className={`status-badge status-${p.status}`}>
                    {p.status === 'active' ? 'Active' : p.status === 'completed' ? 'Completed' : 'Review'}
                  </span>
                </div>

                <h3 className="proj-title">{p.name}</h3>
                <p className="proj-org muted small">{p.organization}</p>
                <p className="proj-location small"><IconPin size={13} /> {p.location}</p>

                <div className="proj-card-foot">
                  <span className="sample-counter mono">{p.sampleIds.length} Sampling Stations</span>
                  <span className="proj-date muted small">Sampling: {p.samplingDate}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Project Full Details & Station Manager */}
        {selectedProj && (
          <div className="project-detail-panel">
            <div className="detail-panel-head">
              <div>
                <span className="mono muted small">{selectedProj.id}</span>
                <h2>{selectedProj.name}</h2>
                <p className="location-heading"><IconPin size={13} /> {selectedProj.location} · <strong>{selectedProj.organization}</strong></p>
              </div>

              <div className="detail-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onNavigate('insights', { projectId: selectedProj.id })}
                >
                  Compare Project Stations →
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onNavigate('reports', { projectId: selectedProj.id })}
                >
                  <IconReport size={15} /> Generate EIA Report
                </button>
              </div>
            </div>

            {/* Project Objective and Regulatory Framework */}
            <div className="project-objective-card">
              <h4>Assessment Scope &amp; Regulatory Objective</h4>
              <p>{selectedProj.objective}</p>
              {selectedProj.complianceStandard && (
                <div className="compliance-row">
                  <span className="compliance-badge"><IconShield size={12} /> Compliance Baseline</span>
                  <span className="compliance-text">{selectedProj.complianceStandard}</span>
                </div>
              )}
            </div>

            {/* Key Observations */}
            {selectedProj.keyObservation && (
              <div className="project-observation-card">
                <h4>Key Ecological Findings &amp; Observations</h4>
                <p>{selectedProj.keyObservation}</p>
              </div>
            )}

            {/* Sampling Stations in this Project */}
            <div className="project-stations-section">
              <div className="stations-head">
                <h3>Monitored Sampling Stations ({projectSamples.length})</h3>
                <button
                  type="button"
                  className="table-action-btn"
                  onClick={() => onNavigate('samples', { projectId: selectedProj.id })}
                >
                  Manage All Samples →
                </button>
              </div>

              <div className="stations-grid">
                {projectSamples.map((s) => (
                  <div key={s.id} className="station-mini-card">
                    <div className="station-mini-top">
                      <span className="station-id mono">{s.id}</span>
                      <span className={`status-tag status-${s.qcStatus}`}>
                        {s.qcStatus === 'passed' ? <><IconCheck size={11} /> QC Validated</> : <><IconAlert size={11} /> QC Review</>}
                      </span>
                    </div>

                    <div className="station-locality-name" title={s.locality}>
                      {s.locality}
                    </div>

                    <div className="station-meta-row muted small">
                      <span>Type: <strong>{s.sampleType}</strong></span>
                      {s.depth && <span>Depth: <strong>{s.depth}</strong></span>}
                    </div>

                    <div className="station-kpi-row">
                      <div title="Unique biological amplicon sequence variants detected">
                        <span className="muted small">Genetic Variants</span>
                        <div className="mono bold">{s.asvCount} ASVs</div>
                      </div>
                      <div title="Taxa confirmed by reference barcode matches">
                        <span className="muted small">Confirmed Species</span>
                        <div className="mono bold text-teal">{s.identifiedSpecies} taxa</div>
                      </div>
                      <div title="Shannon-Wiener diversity index quantifying community balance">
                        <span className="muted small">Diversity</span>
                        <div className="mono bold">{s.shannonIndex >= 3.0 ? 'High' : 'Moderate'} ({s.shannonIndex.toFixed(2)})</div>
                      </div>
                    </div>

                    <div className="station-card-actions">
                      <button
                        type="button"
                        className="btn-primary-small"
                        onClick={() => onNavigate('results', { sampleId: s.id, projectId: selectedProj.id })}
                      >
                        Inspect Layered Results →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE PROJECT MODAL */}
      {modalOpen && (
        <CreateProjectModal
          onClose={() => setModalOpen(false)}
          onCreate={(p) => {
            onCreateProject(p);
            setActiveProject(p.id);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// STEP 1 USER JOURNEY: CREATE PROJECT WIZARD
// Collects ONLY essential information:
// - Project name
// - Organisation
// - Project location
// - Environmental domain (Aquatic or Terrestrial)
// - Project objective
// - Sampling date
// -------------------------------------------------------------
function CreateProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: ProjectRecord) => void;
}) {
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [domain, setDomain] = useState<EnvironmentalDomain>('aquatic');
  const [subtype, setSubtype] = useState<EcosystemSubtype>('marine');
  const [objective, setObjective] = useState('');
  const [samplingDate, setSamplingDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  // Quick presets for Goa / Coastal Karnataka / Western Ghats
  const applyPreset = (preset: 'goa_port' | 'karwar_reef' | 'zuari_mangrove' | 'mining_soil') => {
    if (preset === 'goa_port') {
      setName('Goa Coastal Infrastructure Marine Assessment');
      setOrganization('Goa Port Authority & Ecological Advisory');
      setLocation('Mormugao Bay, Goa (15.41° N, 73.79° E)');
      setDomain('aquatic');
      setSubtype('marine');
      setObjective('Pre-dredging baseline survey and non-indigenous biofouling monitoring under CRZ regulations.');
    } else if (preset === 'karwar_reef') {
      setName('Karwar Coastal & Demersal Sanctuary Survey');
      setOrganization('Coastal Karnataka Environmental Consulting');
      setLocation('Karwar Harbor & Netrani Shelf (14.84° N, 74.12° E)');
      setDomain('aquatic');
      setSubtype('marine');
      setObjective('Coral and reef-associated fish biodiversity baseline monitoring for port expansion clearance.');
    } else if (preset === 'zuari_mangrove') {
      setName('Zuari Estuarine Mangrove Ecosystem Assessment');
      setOrganization('Goa Forest Department / Coastal Ecology Unit');
      setLocation('Zuari Estuary, Goa (15.34° N, 73.91° E)');
      setDomain('aquatic');
      setSubtype('estuarine');
      setObjective('Monitoring seasonal estuarine biodiversity shifts and mangrove benthic health indicators.');
    } else if (preset === 'mining_soil') {
      setName('North Goa Iron Ore Overburden Revegetation');
      setOrganization('Mine Rehabilitation Board / Envisage Ecology');
      setLocation('Bicholim Mining Spoil Heap, Goa (15.58° N, 73.94° E)');
      setDomain('terrestrial');
      setSubtype('mine_reclamation');
      setObjective('Soil microbial and mycorrhizal reactivation assessment on post-mining reclaimed spoil dumps.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a project name.');
      return;
    }
    if (!location.trim()) {
      setError('Please specify a project location.');
      return;
    }

    const newProject: ProjectRecord = {
      id: `PRJ-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: name.trim(),
      organization: organization.trim() || 'Environmental Ecological Consultancy',
      location: location.trim(),
      domain,
      subtype,
      objective: objective.trim() || 'Baseline eDNA biodiversity monitoring and environmental impact assessment.',
      samplingDate,
      status: 'active',
      sampleIds: [],
      keyObservation: 'New assessment initialized. Pending environmental sample collection.',
      complianceStandard: 'MoEFCC Environmental Impact Assessment (EIA) Guidelines',
    };

    onCreate(newProject);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="create-project-modal" onClick={(e) => e.stopPropagation()}>
        <header className="guide-modal-head">
          <div className="guide-title-wrap">
            <span className="guide-badge">Step 1 — Create Project</span>
            <h2>Create Environmental Assessment Project</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form-body">
          {/* Presets Strip */}
          <div className="preset-selector-row">
            <span className="small muted">Regional Presets:</span>
            <button type="button" className="chip" onClick={() => applyPreset('goa_port')}>Goa Port Marine</button>
            <button type="button" className="chip" onClick={() => applyPreset('karwar_reef')}>Karwar Harbor</button>
            <button type="button" className="chip" onClick={() => applyPreset('zuari_mangrove')}>Zuari Mangroves</button>
            <button type="button" className="chip" onClick={() => applyPreset('mining_soil')}>Goa Mine Reclamation</button>
          </div>

          {error && <div className="form-error-banner">{error}</div>}

          {/* Form Fields: Only essential fields */}
          <div className="form-group">
            <label htmlFor="p-name">Project Name <span className="required">*</span></label>
            <input
              id="p-name"
              type="text"
              className="text-input"
              placeholder="e.g. Mormugao Coastal Infrastructure Biodiversity Assessment"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="p-org">Client / Organisation</label>
              <input
                id="p-org"
                type="text"
                className="text-input"
                placeholder="e.g. Goa State Biodiversity Board / Port Trust"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="p-loc">Project Location <span className="required">*</span></label>
              <input
                id="p-loc"
                type="text"
                className="text-input"
                placeholder="e.g. Mormugao Bay, Goa (Lat 15.41° N, Long 73.79° E)"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setError(''); }}
                required
              />
            </div>
          </div>

          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="p-domain">Environmental Domain <span className="required">*</span></label>
              <select
                id="p-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value as EnvironmentalDomain)}
                className="select-input"
              >
                <option value="aquatic">Aquatic eDNA (Marine, Deep-sea, Freshwater, Sediment)</option>
                <option value="terrestrial">Terrestrial eDNA (Soil, Microbial, Restoration)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="p-date">Sampling Campaign Date</label>
              <input
                id="p-date"
                type="date"
                className="text-input"
                value={samplingDate}
                onChange={(e) => setSamplingDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="p-obj">Project Objective &amp; Regulatory Purpose</label>
            <textarea
              id="p-obj"
              rows={3}
              className="textarea-input"
              placeholder="State the primary ecological objective (e.g. Pre-dredging baseline survey and invasive ballast-water taxa surveillance under MoEFCC guidelines)..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>

          <footer className="guide-modal-foot">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Project →
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

