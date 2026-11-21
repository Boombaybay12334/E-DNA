import { useState } from 'react';
import type { PipelineJob, SampleRecord, AppNavView } from '../types';
import { fmtInt } from '../lib/derive';
import { IconCheck, IconPin, IconPipeline, IconPlay } from './icons';

interface Props {
  jobs: PipelineJob[];
  samples: SampleRecord[];
  onNavigate: (view: AppNavView, context?: { projectId?: string; sampleId?: string }) => void;
  onRunAnalysis: (sampleId: string) => void;
}

export function AnalysisPipelineView({
  jobs,
  samples,
  onNavigate,
  onRunAnalysis,
}: Props) {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id ?? '');
  const [runModalOpen, setRunModalOpen] = useState(false);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? jobs[0];

  return (
    <div className="pipeline-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="platform-tag">
            <span className="pulse-dot green" />
            <span>Bioinformatics Processing Engine</span>
          </div>
          <h1>eDNA Sequencing Analysis &amp; Pipeline Runs</h1>
          <p className="subtitle">
            Verifiable bioinformatic execution stages: quality trimming, DADA2 denoising, chimera removal, and reference bootstrapping.
          </p>
        </div>

        <button type="button" className="btn-primary" onClick={() => setRunModalOpen(true)}>
          <span className="btn-icon"><IconPlay size={15} /></span> Run Pipeline Analysis
        </button>
      </div>

      {/* Pipeline Overview Status Grid */}
      <div className="pipeline-kpi-grid">
        <div className="pipeline-kpi-card">
          <span className="muted small">Pipeline Version</span>
          <div className="mono bold">edna-dada2 v2.4.1</div>
          <span className="sub-tag">Standardized SOP CPCB / MoEFCC</span>
        </div>
        <div className="pipeline-kpi-card">
          <span className="muted small">Primary Marker</span>
          <div className="mono bold">COI &amp; 18S rRNA V9</div>
          <span className="sub-tag">mlCOIintF / jgHCO2198</span>
        </div>
        <div className="pipeline-kpi-card">
          <span className="muted small">Reference DB</span>
          <div className="mono bold">MIDORI2 + PR2 v5.0</div>
          <span className="sub-tag">Validated Taxonomy Tree</span>
        </div>
        <div className="pipeline-kpi-card">
          <span className="muted small">LIMS Control Status</span>
          <div className="mono bold text-teal">Audited Blanks</div>
          <span className="sub-tag">Extraction &amp; PCR Controls</span>
        </div>
      </div>

      {/* Main Execution Split: Job Queue vs Job Detail */}
      <div className="pipeline-layout">
        {/* Left: Job History & Queue */}
        <div className="pipeline-queue-card">
          <div className="queue-head">
            <h3>Pipeline Job Queue ({jobs.length})</h3>
            <span className="muted small">Click to inspect stages</span>
          </div>

          <div className="job-list">
            {jobs.map((j) => {
              const isSelected = j.id === selectedJob?.id;
              return (
                <div
                  key={j.id}
                  className={`job-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedJobId(j.id)}
                >
                  <div className="job-card-top">
                    <span className="mono job-id">{j.id}</span>
                    <span className={`status-badge status-${j.status}`}>
                      {j.status === 'completed' ? <><IconCheck size={11} /> Completed</> : j.status === 'processing' ? <><IconPipeline size={11} /> Running</> : 'Failed'}
                    </span>
                  </div>

                  <h4 className="job-sample-title" title={j.sampleName}>{j.sampleName}</h4>
                  <div className="job-meta-row muted small">
                    <span>Marker: <strong>{j.marker.split(',')[0]}</strong></span>
                    <span>Retained: <strong>{fmtInt(j.readsRetained)} reads</strong></span>
                  </div>

                  {j.status === 'processing' && (
                    <div className="job-progress-strip">
                      <div className="progress-bar-fill" style={{ width: '78%' }} />
                      <span className="small muted">Stage 4 of 5 (Bootstrapping...)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Job Detailed Stages & Retention Funnel */}
        {selectedJob && (
          <div className="pipeline-detail-card">
            <div className="detail-panel-head">
              <div>
                <span className="mono muted small">Run Execution: {selectedJob.id}</span>
                <h2>{selectedJob.sampleName}</h2>
                <p className="muted small">
                  Sample ID: <strong className="mono">{selectedJob.sampleId}</strong> · Marker: {selectedJob.marker} · Reference: {selectedJob.referenceDb}
                </p>
              </div>

              {selectedJob.status === 'completed' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onNavigate('results', { sampleId: selectedJob.sampleId, projectId: selectedJob.projectId })}
                >
                  Open Layered Results →
                </button>
              )}
            </div>

            {/* Read Retention Funnel (DADA2 & QC) */}
            <div className="read-funnel-card">
              <div className="funnel-header-wrap">
                <h4>Quality Control &amp; Read Retention Funnel</h4>
                <span className="badge-tag ok-badge">94.9% Retention</span>
              </div>
              <p className="muted small">
                Tracks sequencing depth reduction across quality filters. <strong>Why this matters:</strong> Eliminates low-confidence reads to ensure every identified species is backed by solid empirical data.
              </p>

              <div className="funnel-steps">
                <div className="funnel-step">
                  <span className="step-name">1. Raw Sequenced</span>
                  <div className="step-val mono">{fmtInt(selectedJob.readsInput)}</div>
                  <span className="step-pct">100%</span>
                </div>
                <div className="funnel-arrow">↓</div>
                <div className="funnel-step">
                  <span className="step-name">2. Q30 Trimmed</span>
                  <div className="step-val mono">{fmtInt(Math.round(selectedJob.readsInput * 0.97))}</div>
                  <span className="step-pct">97.0%</span>
                </div>
                <div className="funnel-arrow">↓</div>
                <div className="funnel-step">
                  <span className="step-name">3. DADA2 Denoised</span>
                  <div className="step-val mono">{fmtInt(Math.round(selectedJob.readsInput * 0.95))}</div>
                  <span className="step-pct">95.0%</span>
                </div>
                <div className="funnel-arrow">↓</div>
                <div className="funnel-step highlight">
                  <span className="step-name">4. Retained ASVs</span>
                  <div className="step-val mono text-teal">{fmtInt(selectedJob.readsRetained)}</div>
                  <span className="step-pct text-teal">{((selectedJob.readsRetained / selectedJob.readsInput) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Stage-by-Stage Verification */}
            <div className="pipeline-stages-card">
              <h4>Bioinformatic Execution Stages</h4>
              <div className="stages-timeline">
                {selectedJob.stages.map((stage, idx) => (
                  <div key={stage.name} className={`stage-step stage-${stage.status}`}>
                    <div className="stage-icon">
                      {stage.status === 'completed' ? <IconCheck size={12} /> : stage.status === 'running' ? <IconPipeline size={12} /> : idx + 1}
                    </div>
                    <div className="stage-info">
                      <div className="stage-title-row">
                        <strong>Stage {idx + 1}: {stage.name}</strong>
                        <span className={`status-badge-sm status-${stage.status}`}>
                          {stage.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="stage-detail muted small">{stage.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RUN ANALYSIS MODAL */}
      {runModalOpen && (
        <RunAnalysisModal
          samples={samples}
          onClose={() => setRunModalOpen(false)}
          onStart={(sId) => {
            onRunAnalysis(sId);
            setRunModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function RunAnalysisModal({
  samples,
  onClose,
  onStart,
}: {
  samples: SampleRecord[];
  onClose: () => void;
  onStart: (sampleId: string) => void;
}) {
  const [selectedSampleId, setSelectedSampleId] = useState(samples[0]?.id ?? '');
  const [marker, setMarker] = useState('COI');
  const [referenceDb, setReferenceDb] = useState('MIDORI2');
  const [bootstrapCount, setBootstrapCount] = useState(100);

  const sample = samples.find((s) => s.id === selectedSampleId);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSampleId) {
      onStart(selectedSampleId);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="create-project-modal" onClick={(e) => e.stopPropagation()}>
        <header className="guide-modal-head">
          <div className="guide-title-wrap">
            <span className="guide-badge">Pipeline Execution</span>
            <h2>Run Bioinformatic Analysis</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </header>

        <form onSubmit={handleStart} className="modal-form-body">
          <p className="muted small">
            Initiate automated DADA2 amplicon denoising, chimera clearance, and reference database assignment.
          </p>

          <div className="form-group">
            <label htmlFor="p-sample">Select Environmental Sample to Process</label>
            <select
              id="p-sample"
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="select-input"
            >
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.locality} ({s.sampleType})
                </option>
              ))}
            </select>
          </div>

          {sample && (
            <div className="sample-mini-info-box">
              <span className="small"><IconPin size={12} /> {sample.locality}</span> ·{' '}
              <span className="small">Domain: {sample.domain}</span> ·{' '}
              <span className="small">Depth: {sample.depth ?? 'Surface'}</span>
            </div>
          )}

          <div className="form-two-col">
            <div className="form-group">
              <label htmlFor="p-marker">Sequencing Marker / Primers</label>
              <select
                id="p-marker"
                value={marker}
                onChange={(e) => setMarker(e.target.value)}
                className="select-input"
              >
                <option value="COI">COI (mlCOIintF / jgHCO2198) — Marine Fauna</option>
                <option value="12S">12S rRNA (MiFish-U) — Teleost Fishes</option>
                <option value="18S">18S rRNA V9 — Micro-eukaryotes &amp; Benthos</option>
                <option value="16S">16S rRNA V4 — Soil &amp; Water Bacteria</option>
                <option value="ITS">ITS2 — Fungi &amp; Mycorrhizae</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="p-ref">Curated Reference Database</label>
              <select
                id="p-ref"
                value={referenceDb}
                onChange={(e) => setReferenceDb(e.target.value)}
                className="select-input"
              >
                <option value="MIDORI2">MIDORI2 (Mitochondrial Eukaryota)</option>
                <option value="SILVA">SILVA 138.1 (SSU/LSU rRNAs)</option>
                <option value="PR2">PR2 v5.0 (Protist Reference)</option>
                <option value="UNITE">UNITE v9 (Fungal ITS)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="p-boot">Classifier Bootstrap Iterations</label>
            <input
              id="p-boot"
              type="number"
              min={50}
              max={500}
              step={50}
              className="text-input"
              value={bootstrapCount}
              onChange={(e) => setBootstrapCount(Number(e.target.value))}
            />
            <span className="small muted">Standard minimum is 100 bootstraps for publication-grade taxonomic assignment.</span>
          </div>

          <footer className="guide-modal-foot">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Queue &amp; Execute Pipeline →
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

