import { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function EdnaGuideModal({ isOpen, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="guide-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="guide-modal-head">
          <div className="guide-title-wrap">
            <span className="guide-badge">Industry Reference</span>
            <h2>How to Interpret Environmental DNA (eDNA) Reports</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close guide">
            ✕
          </button>
        </header>

        <div className="guide-body">
          <section className="guide-section">
            <h3>1. ASVs vs. Traditional Species</h3>
            <p>
              An <strong>Amplicon Sequence Variant (ASV)</strong> is an exact unique biological sequence inferred after
              bioinformatic error correction. Unlike older 97% OTUs (Operational Taxonomic Units), ASVs discriminate down
              to single-nucleotide differences. A single biological species may possess multiple ASVs due to natural
              intraspecific allelic variation or mitochondrial heteroplasmy.
            </p>
          </section>

          <section className="guide-section">
            <h3>2. Read Counts ≠ Absolute Biomass (PCR Bias)</h3>
            <p>
              High-throughput sequencing provides <em>relative read counts</em>, which represent amplified DNA molecules.
              Read abundance correlates broadly with organismal presence, but does <strong>not</strong> directly equate to
              biomass or population count due to PCR primer binding efficiency differences and variable mitochondrial copy
              numbers per cell across different phyla.
            </p>
          </section>

          <section className="guide-section">
            <h3>3. Confidence vs. Reference Divergence Matrix</h3>
            <div className="guide-matrix-explainer">
              <div className="guide-grid-2x2">
                <div className="g-cell g-solid">
                  <strong>Solid Assignment</strong>
                  <p>High confidence &amp; ≥94% match. Confirmed presence of known reference taxon.</p>
                </div>
                <div className="g-cell g-unrep">
                  <strong>Possibly Unrepresented</strong>
                  <p>High confidence placement in higher clade, but &lt;90% match. Gaps in reference DB or novel lineage.</p>
                </div>
                <div className="g-cell g-ambig">
                  <strong>Ambiguous / Relative Split</strong>
                  <p>Close match, but top reference hits disagree at lower ranks. Marker unable to split close sibling species.</p>
                </div>
                <div className="g-cell g-caution">
                  <strong>Low Support &amp; Distant</strong>
                  <p>Low bootstrap support and high sequence divergence. Treat with scientific caution.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="guide-section">
            <h3>4. Quality Control &amp; Negative Controls</h3>
            <p>
              Field blanks, extraction blanks, and PCR negative controls monitor cross-contamination. Any taxon detected
              in negative controls is flagged with a <span className="flag flag-IN_NEGATIVE_CONTROL">CTRL</span> badge,
              permitting transparent audit trails required by ISO 17025 and environmental reporting standards.
            </p>
          </section>

          <section className="guide-section">
            <h3>5. ESG &amp; TNFD Reporting Integration</h3>
            <p>
              eDNA data feeds directly into the <strong>Taskforce on Nature-related Financial Disclosures (TNFD)</strong>{' '}
              and GRI 304 biodiversity metrics by providing non-invasive, verifiable evidence of species presence,
              endangered species tracking, and biosecurity surveillance over longitudinal sampling campaigns.
            </p>
          </section>
        </div>

        <footer className="guide-modal-foot">
          <button type="button" className="primary" onClick={onClose}>
            Got it, return to report
          </button>
        </footer>
      </div>
    </div>
  );
}

