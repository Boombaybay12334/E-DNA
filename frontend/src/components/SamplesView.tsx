import { useState } from 'react';
import type { SampleRecord, ProjectRecord, AppNavView, SampleType, EnvironmentalDomain } from '../types';
import { fmtInt } from '../lib/derive';
import { IconAlert, IconCheck, IconDroplet, IconLeaf, IconPlus, IconSearch, IconSediment } from './icons';

interface Props {
  samples: SampleRecord[];
  projects: ProjectRecord[];
  onNavigate: (view: AppNavView, context?: { projectId?: string; sampleId?: string }) => void;
  onAddSample: (sample: SampleRecord) => void;
  selectedProjectId?: string;
}

export function SamplesView({
  samples,
  projects,
  onNavigate,
  onAddSample,
  selectedProjectId,
}: Props) {
  const [projectFilter, setProjectFilter] = useState<string>(selectedProjectId ?? 'all');
  const [typeFilter, setTypeFilter] = useState<'all' | SampleType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = samples.filter((s) => {
    if (projectFilter !== 'all' && s.projectId !== projectFilter) return false;
    if (typeFilter !== 'all' && s.sampleType !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.id.toLowerCase().includes(q) ||
        s.locality.toLowerCase().includes(q) ||
        s.projectName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="samples-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="platform-tag">
            <span>Sampling Station Management · Field Inventory</span>
          </div>
          <h1>Environmental Samples &amp; Field Stations</h1>
          <p className="subtitle">
            Catalog of aquatic water, estuarine sediment, and terrestrial soil samples collected across monitoring campaigns.
          </p>
        </div>

        <div className="overview-actions">
          <button type="button" className="btn-secondary" onClick={() => onNavigate('insights')}>
            Compare Stations in Insights →
          </button>
          <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
            <span className="btn-icon"><IconPlus size={16} /></span> Log Environmental Sample
          </button>
        </div>
      </div>

      {/* Sampling Inventory Overview Strip */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <span className="kpi-label">Total Field Stations</span>
          <div className="kpi-value mono">{samples.length}</div>
          <div className="kpi-sub muted">Goa, Karwar &amp; Western Ghats</div>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Aquatic Water Samples</span>
          <div className="kpi-value mono text-teal">{samples.filter((s) => s.sampleType === 'water').length}</div>
          <div className="kpi-sub muted">Sterivex 0.22µm membrane filtration</div>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Sediment &amp; Soil Cores</span>
          <div className="kpi-value mono">{samples.filter((s) => s.sampleType !== 'water').length}</div>
          <div className="kpi-sub muted">Benthic grabs &amp; spoil heap cores</div>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Confirmed Species</span>
          <div className="kpi-value mono text-accent">
            {samples.reduce((acc, s) => acc + s.identifiedSpecies, 0)}
          </div>
          <div className="kpi-sub muted">&ge;97% bootstrap barcode matches</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="portfolio-filter-bar">
        <div className="search-wrap" style={{ maxWidth: 360 }}>
          <span className="search-icon"><IconSearch size={15} /></span>
          <input
            type="search"
            className="search"
            placeholder="Search by sample ID, station, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-select-group">
          <label className="inline-control">
            <span className="small muted">Project:</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="select-input-sm"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.length > 35 ? `${p.name.substring(0, 35)}…` : p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-control">
            <span className="small muted">Sample Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | SampleType)}
              className="select-input-sm"
            >
              <option value="all">All Types</option>
              <option value="water">Water (Marine/Estuary)</option>
              <option value="sediment">Sediment</option>
              <option value="soil">Soil</option>
            </select>
          </label>
        </div>
      </div>

      {/* Samples Table */}
      <div className="table-card">
        <table className="modern-table">
          <thead>
            <tr>
              <th scope="col">Sample Identifier</th>
              <th scope="col">Associated Assessment Project</th>
              <th scope="col">Collection Locality &amp; GPS</th>
              <th scope="col">Type &amp; Depth</th>
              <th scope="col" className="num">Quality Reads</th>
              <th scope="col" className="num">Confirmed Species</th>
              <th scope="col">QC Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} onClick={() => onNavigate('results', { sampleId: s.id, projectId: s.projectId })}>
                <td>
                  <span className="sample-id-badge mono">{s.id}</span>
                </td>
                <td>
                  <span className="proj-link" title={s.projectName}>
                    {s.projectName}
                  </span>
                </td>
                <td>
                  <div className="station-locality-cell">
                    <strong>{s.locality}</strong>
                    <span className="mono muted small">
                      {s.latitude.toFixed(4)}° N, {s.longitude.toFixed(4)}° E
                    </span>
                  </div>
                </td>
                <td>
                  <div className="sample-type-cell">
                    <span className={`type-tag type-${s.sampleType}`}>
                      {s.sampleType === 'water' ? <><IconDroplet size={12} /> Water</> : s.sampleType === 'sediment' ? <><IconSediment size={12} /> Sediment</> : <><IconLeaf size={12} /> Soil</>}
                    </span>
                    {s.depth && <span className="depth-tag small muted">{s.depth}</span>}
                  </div>
                </td>
                <td className="num mono">
                  {fmtInt(s.readCount)}
                </td>
                <td className="num mono bold text-teal">
                  {s.identifiedSpecies}
                </td>
                <td>
                  <span className={`status-badge status-${s.qcStatus}`}>
                    {s.qcStatus === 'passed' ? <><IconCheck size={11} /> Passed</> : <><IconAlert size={11} /> Review</>}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="table-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('results', { sampleId: s.id, projectId: s.projectId });
                    }}
                  >
                    View Results →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-state">
            <p>No environmental samples match the selected filters.</p>
          </div>
        )}
      </div>

      {/* ADD SAMPLE MODAL */}
      {modalOpen && (
        <AddSampleModal
          projects={projects}
          defaultProjectId={projectFilter !== 'all' ? projectFilter : projects[0]?.id}
          onClose={() => setModalOpen(false)}
          onAdd={(sample) => {
            onAddSample(sample);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// STEP 2 USER JOURNEY: ADD SAMPLE WIZARD
// Collects:
// - Sample ID
// - Collection location
// - Sample type (Water, Soil, Sediment)
// - Collection date
// - Environmental domain
// - Optional metadata (Depth, temperature, pH, etc.)
// -------------------------------------------------------------
function AddSampleModal({
  projects,
  defaultProjectId,
  onClose,
  onAdd,
}: {
  projects: ProjectRecord[];
  defaultProjectId?: string;
  onClose: () => void;
  onAdd: (s: SampleRecord) => void;
}) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? '');
  const [sampleId, setSampleId] = useState(`SMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
  const [locality, setLocality] = useState('');
  const [latitude, setLatitude] = useState('15.4124');
  const [longitude, setLongitude] = useState('73.7915');
  const [sampleType, setSampleType] = useState<SampleType>('water');
  const [domain, setDomain] = useState<EnvironmentalDomain>('aquatic');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [depth, setDepth] = useState('5.0 m (Subsurface)');
  const [temperature, setTemperature] = useState('28.2 °C');
  const [pH, setPH] = useState('8.0');
  const [error, setError] = useState('');

  const selectedProj = projects.find((p) => p.id === projectId);

  // Quick preset helper for Goa / Coastal Karnataka stations
  const applyStationPreset = (name: string, lat: string, lon: string, type: SampleType, dep: string) => {
    setLocality(name);
    setLatitude(lat);
    setLongitude(lon);
    setSampleType(type);
    setDepth(dep);
    if (type === 'soil') setDomain('terrestrial');
    else setDomain('aquatic');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locality.trim()) {
      setError('Please provide a sampling locality name.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lonNum)) {
      setError('Please enter valid numeric latitude and longitude coordinates.');
      return;
    }

    const newSample: SampleRecord = {
      id: sampleId.trim() || `SMP-${Date.now().toString().slice(-4)}`,
      projectId,
      projectName: selectedProj?.name ?? 'Environmental Monitoring Project',
      locality: locality.trim(),
      latitude: latNum,
      longitude: lonNum,
      sampleType,
      domain,
      collectionDate,
      depth: depth.trim() || undefined,
      qcStatus: 'passed',
      readCount: 135000,
      asvCount: 3600,
      identifiedSpecies: 64,
      shannonIndex: 3.12,
      pipelineJobId: `JOB-${Date.now()}`,
      parameters: {
        Temperature: temperature,
        pH,
      },
    };

    onAdd(newSample);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="create-project-modal" onClick={(e) => e.stopPropagation()}>
        <header className="guide-modal-head">
          <div className="guide-title-wrap">
            <span className="guide-badge">Step 2 — Add Environmental Sample</span>
            <h2>Log Environmental eDNA Sample</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-form-body">
          {/* Presets Strip */}
          <div className="preset-selector-row">
            <span className="small muted">Station Presets:</span>
            <button
              type="button"
              className="chip"
              onClick={() => applyStationPreset('Mormugao Port Outer Berth', '15.4150', '73.7930', 'water', '12.0 m')}
            >
              Mormugao Berth
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => applyStationPreset('Zuari Mangrove Edge (Chicalim)', '15.3450', '73.9140', 'water', '3.0 m')}
            >
              Zuari Mangrove
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => applyStationPreset('Karwar Port Dredging Silt', '14.8380', '74.1250', 'sediment', '16.5 m Seabed')}
            >
              Karwar Sediment
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => applyStationPreset('North Goa Reclaimed Spoil Plot', '15.5880', '73.9460', 'soil', '0-10 cm Topsoil')}
            >
              Mining Soil Core
            </button>
          </div>

          {error && <div className="form-error-banner">{error}</div>}

          {/* Associated Project */}
          <div className="form-group">
            <label htmlFor="s-proj">Associated Environmental Assessment Project <span className="required">*</span></label>
            <select
              id="s-proj"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="select-input"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.location})
                </option>
              ))}
            </select>
          </div>

          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="s-id">Sample Identifier <span className="required">*</span></label>
              <input
                id="s-id"
                type="text"
                className="text-input mono"
                placeholder="e.g. SMP-GOA-MB04"
                value={sampleId}
                onChange={(e) => setSampleId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="s-date">Collection Date <span className="required">*</span></label>
              <input
                id="s-date"
                type="date"
                className="text-input"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="s-loc">Sampling Station &amp; Locality Name <span className="required">*</span></label>
            <input
              id="s-loc"
              type="text"
              className="text-input"
              placeholder="e.g. Station MB-04 (Mormugao Port Breakwater Outer Patch)"
              value={locality}
              onChange={(e) => { setLocality(e.target.value); setError(''); }}
              required
            />
          </div>

          {/* Coordinates */}
          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="s-lat">Latitude (° N) <span className="required">*</span></label>
              <input
                id="s-lat"
                type="text"
                className="text-input mono"
                placeholder="15.4124"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="s-lon">Longitude (° E) <span className="required">*</span></label>
              <input
                id="s-lon"
                type="text"
                className="text-input mono"
                placeholder="73.7915"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Type & Domain */}
          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="s-type">Sample Type <span className="required">*</span></label>
              <select
                id="s-type"
                value={sampleType}
                onChange={(e) => {
                  const t = e.target.value as SampleType;
                  setSampleType(t);
                  if (t === 'soil') setDomain('terrestrial');
                  else setDomain('aquatic');
                }}
                className="select-input"
              >
                <option value="water">Water (Marine / Estuary / Freshwater)</option>
                <option value="sediment">Aquatic Sediment (Benthic / Mudflat)</option>
                <option value="soil">Terrestrial Soil (Topsoil / Spoil Dump)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="s-depth">Sampling Depth / Horizon</label>
              <input
                id="s-depth"
                type="text"
                className="text-input"
                placeholder="e.g. 5.0 m (Subsurface) or 0-10 cm"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
              />
            </div>
          </div>

          {/* Optional In-situ Parameters */}
          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="s-temp">In-situ Temperature</label>
              <input
                id="s-temp"
                type="text"
                className="text-input"
                placeholder="e.g. 28.2 °C"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="s-ph">In-situ pH</label>
              <input
                id="s-ph"
                type="text"
                className="text-input"
                placeholder="e.g. 8.1"
                value={pH}
                onChange={(e) => setPH(e.target.value)}
              />
            </div>
          </div>

          <footer className="guide-modal-foot">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Log Sample &amp; Queue for Analysis →
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

