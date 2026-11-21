import { useState } from 'react';

export function SettingsView() {
  const [supportCutoff, setSupportCutoff] = useState('0.70');
  const [highConfBand, setHighConfBand] = useState('0.90');
  const [modConfBand, setModConfBand] = useState('0.80');
  const [minIdentity, setMinIdentity] = useState('97.0');
  const [orgName, setOrgName] = useState('Envisage Ecology & Coastal Environmental Advisory');
  const [labId, setLabId] = useState('NABL-ISO17025-EDNA-GOA-08');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="platform-tag">
            <span>System Configuration</span>
          </div>
          <h1>Platform Settings &amp; Reference Parameters</h1>
          <p className="subtitle">
            Configure reference taxonomic libraries, quality cut-offs, bioinformatic thresholds, and organization accreditation.
          </p>
        </div>

        {saved && <span className="save-toast-banner">✓ Configuration Saved</span>}
      </div>

      <form onSubmit={handleSave} className="settings-form">
        {/* Organization & Lab Profile */}
        <div className="settings-card">
          <h3>Organization Profile &amp; Accreditation</h3>
          <p className="muted small">
            These credentials are automatically embedded in generated Environmental Assessment Deliverables and audit certificates.
          </p>

          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="set-org">Lead Environmental Consultancy / Institute</label>
              <input
                id="set-org"
                type="text"
                className="text-input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="set-lab">Accreditation Identifier (NABL / ISO 17025)</label>
              <input
                id="set-lab"
                type="text"
                className="text-input mono"
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bioinformatic Confidence Thresholds */}
        <div className="settings-card">
          <h3>Taxonomic Classifier Thresholds</h3>
          <p className="muted small">
            Rigorous cut-offs ensuring the platform never overstates species-level classifications without empirical bootstrap support.
          </p>

          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="set-cut">Classifier Support Cut-off (0.0 – 1.0)</label>
              <input
                id="set-cut"
                type="number"
                step="0.05"
                min="0.5"
                max="0.95"
                className="text-input mono"
                value={supportCutoff}
                onChange={(e) => setSupportCutoff(e.target.value)}
              />
              <span className="small muted">Assignments below this cut-off stop at the preceding supported rank.</span>
            </div>

            <div className="form-group">
              <label htmlFor="set-id">Species Identity Cut-off (%)</label>
              <input
                id="set-id"
                type="number"
                step="0.1"
                min="94.0"
                max="99.5"
                className="text-input mono"
                value={minIdentity}
                onChange={(e) => setMinIdentity(e.target.value)}
              />
              <span className="small muted">Minimum reference homology required for species assignment (default: 97.0%).</span>
            </div>
          </div>

          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="set-hi">High Confidence Lower Bound</label>
              <input
                id="set-hi"
                type="number"
                step="0.05"
                min="0.8"
                max="0.99"
                className="text-input mono"
                value={highConfBand}
                onChange={(e) => setHighConfBand(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="set-mod">Moderate Confidence Lower Bound</label>
              <input
                id="set-mod"
                type="number"
                step="0.05"
                min="0.6"
                max="0.85"
                className="text-input mono"
                value={modConfBand}
                onChange={(e) => setModConfBand(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Reference Databases */}
        <div className="settings-card">
          <h3>Curated Reference Taxonomy Libraries</h3>
          <div className="ref-db-list">
            <div className="ref-db-item">
              <div className="db-check-col">
                <input type="checkbox" defaultChecked disabled />
              </div>
              <div className="db-info">
                <strong>MIDORI2 Marine &amp; Metazoan Reference</strong>
                <p className="muted small">Release 2026.04 · 840,000 verified COI records · WoRMS aligned</p>
              </div>
              <span className="doc-badge-ok">Active Primary</span>
            </div>

            <div className="ref-db-item">
              <div className="db-check-col">
                <input type="checkbox" defaultChecked disabled />
              </div>
              <div className="db-info">
                <strong>PR2 v5.0 (Protist Ribosomal Reference)</strong>
                <p className="muted small">18S rRNA V9 curated micro-eukaryote database · 210,000 verified sequences</p>
              </div>
              <span className="doc-badge-ok">Active Primary</span>
            </div>

            <div className="ref-db-item">
              <div className="db-check-col">
                <input type="checkbox" defaultChecked disabled />
              </div>
              <div className="db-info">
                <strong>SILVA 138.1 SSU &amp; UNITE v9</strong>
                <p className="muted small">Bacterial 16S and Fungal ITS databases for soil and sediment microbial profiling</p>
              </div>
              <span className="doc-badge-ok">Active Primary</span>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button type="submit" className="btn-primary">
            Save Settings &amp; Update Defaults
          </button>
        </div>
      </form>
    </div>
  );
}

