import { useEffect } from 'react';
import type { Report } from '../types';
import type { AsvView } from '../lib/derive';
import { exportCsv, exportFasta, exportReportJson } from '../lib/export';
import { fmtInt } from '../lib/derive';
import { IconChart, IconDna, IconPrinter, IconReport, IconSettings } from './icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  views: AsvView[];
  matchedRows: AsvView[];
}

export function ExportModal({ isOpen, onClose, report, views, matchedRows }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sampleId = report.sample.sampleId;
  const ranks = report.methods.ranks;

  const handlePrint = () => {
    onClose();
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="export-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="guide-modal-head">
          <div className="guide-title-wrap">
            <span className="guide-badge">Data Deliverables</span>
            <h2>Export eDNA Biodiversity Dataset</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close export dialog">
            ✕
          </button>
        </header>

        <div className="export-options-list">
          {/* CSV Filtered */}
          <div className="export-card">
            <div className="export-card-icon"><IconChart size={18} /></div>
            <div className="export-card-info">
              <h4>CSV: Filtered Results ({fmtInt(matchedRows.length)} ASVs)</h4>
              <p className="muted small">
                Taxonomic calls, ecological common names, IUCN status, read depths, reference identities and quality flags.
              </p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => {
                exportCsv(matchedRows, ranks, `${sampleId}_filtered`);
                onClose();
              }}
            >
              Download CSV
            </button>
          </div>

          {/* CSV All */}
          <div className="export-card">
            <div className="export-card-icon"><IconReport size={18} /></div>
            <div className="export-card-info">
              <h4>CSV: Complete Dataset ({fmtInt(views.length)} ASVs)</h4>
              <p className="muted small">
                The entire sample library with all supported ranks and pipeline diagnostic codes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                exportCsv(views, ranks, `${sampleId}_complete`);
                onClose();
              }}
            >
              Export All
            </button>
          </div>

          {/* FASTA */}
          <div className="export-card">
            <div className="export-card-icon"><IconDna size={18} /></div>
            <div className="export-card-info">
              <h4>FASTA Sequences ({fmtInt(matchedRows.length)} ASVs)</h4>
              <p className="muted small">
                Bioinformatic sequence headers with read counts, deepest taxonomic assignment, and raw DNA strings.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                exportFasta(matchedRows, sampleId);
                onClose();
              }}
            >
              Download FASTA
            </button>
          </div>

          {/* JSON Full Report */}
          <div className="export-card">
            <div className="export-card-icon"><IconSettings size={18} /></div>
            <div className="export-card-info">
              <h4>JSON: Machine-Readable Pipeline Report</h4>
              <p className="muted small">
                Full metadata, sample context, QC retention stages, negative controls, and raw ASV objects.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                exportReportJson(report);
                onClose();
              }}
            >
              Download JSON
            </button>
          </div>

          {/* Print / PDF Report */}
          <div className="export-card highlight">
            <div className="export-card-icon"><IconPrinter size={18} /></div>
            <div className="export-card-info">
              <h4>Executive Summary PDF / Print Report</h4>
              <p className="muted small">
                Formatted clean 2-page print layout suitable for stakeholder briefing, ESG filings, and archive.
              </p>
            </div>
            <button type="button" className="print-btn" onClick={handlePrint}>
              Print / Save PDF
            </button>
          </div>
        </div>

        <footer className="guide-modal-foot">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}

