import React from 'react';
import {
  IconX,
  IconBook,
} from './icons';

interface MethodGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodGuideModal: React.FC<MethodGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const sections = [
    {
      id: 'marker',
      title: '1. Environmental DNA & 18S rRNA V4 Amplicon Scope',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            <strong>Environmental DNA (eDNA)</strong> refers to genetic material shed by organisms into aquatic or terrestrial environments (water, sediment, soil). By extracting total eDNA and amplifying specific barcode markers with polymerase chain reaction (PCR), researchers can survey biodiversity without isolating the organisms directly.
          </p>
          <p>
            This platform targets eukaryotic microbial and macrobial diversity using the <strong>18S ribosomal RNA V4 hypervariable region</strong> (approx. 380–450 bp). 18S V4 provides broad taxonomic coverage across major eukaryotic divisions (e.g. Alveolata, Stramenopiles, Rhizaria, Opisthokonta, Amoebozoa, and Archaeplastida).
          </p>
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-amber-950 space-y-1">
            <span className="font-bold text-[11px] uppercase tracking-wide text-amber-900 block">
              Resolution Boundary: Capped at Genus Rank
            </span>
            <p>
              The 18S V4 marker does not possess adequate sequence divergence to reliably distinguish individual species. Consequently, all taxonomic assignments on this platform are strictly capped at the <strong>genus level</strong>. Species-level assignments are unsupported and never reported.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'pr2',
      title: '2. Curated Reference Database: PR2 v5.0.0',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            The platform matches sequences against the <strong>Protist Ribosomal Reference database (PR2 v5.0.0)</strong>, clustered at 99% similarity. PR2 is the global scientific standard for eukaryotic ribosomal RNA taxonomy, featuring curated eight-rank lineages:
          </p>
          <div className="flex flex-wrap items-center gap-1.5 py-1 text-[11px] font-mono text-slate-700">
            <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-900 rounded-md font-semibold">Domain</span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-900 rounded-md font-semibold">Supergroup</span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-900 rounded-md font-semibold">Division</span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-900 rounded-md font-semibold">Subdivision</span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-900 rounded-md font-semibold">Class</span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-900 rounded-md font-semibold">Order</span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-900 rounded-md font-semibold">Family</span>
            <span>&rarr;</span>
            <span className="px-2 py-0.5 bg-teal-100 border border-teal-300 text-teal-950 rounded-md font-bold">Genus</span>
          </div>
        </div>
      ),
    },
    {
      id: 'consecutive',
      title: '3. The Consecutive Leading Assignment Rule',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Taxonomic lineages form an unbroken tree from root to leaf. To preserve biological integrity:
          </p>
          <blockquote className="p-3 bg-slate-50 border-l-4 border-teal-600 rounded-r-xl font-mono text-[11px] text-slate-800">
            assigned_depth = number of consecutive leading ranks from root (without a gap) whose confidence &ge; &tau;
          </blockquote>
          <p>
            The moment model confidence falls below threshold &tau; at any intermediate rank (for example, family), classification immediately halts at the preceding rank (order). All subordinate ranks (family and genus) remain unassigned, even if a downstream rank exhibits a numerically higher score.
          </p>
        </div>
      ),
    },
    {
      id: 'confidence',
      title: '4. Understanding Confidence Semantics',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Confidence scores represent <strong>calibrated accuracy estimates trained on simulated PR2 holdout clades</strong>.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-700">
            <li>A confidence of 0.85 indicates that on benchmark evaluation clades, predictions at this threshold achieved approximately 85% empirical precision.</li>
            <li><strong>Not Calibrated Probabilities:</strong> Confidence scores must not be interpreted as standard posterior probabilities or certainty percentages (e.g. "99% certainty").</li>
            <li><strong>Not Comparable Across Models:</strong> A score of 0.80 from Model A cannot be equated to a 0.80 bootstrap support value from BLAST, RDP Classifier, or DADA2.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'thresholds',
      title: '5. Operating Threshold (\u03c4) Selection & Presets',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            The threshold &tau; controls how confident a classification must be before it is accepted. Changing &tau; interactively filters accepted classifications without re-running or altering underlying predictions:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1">
              <span className="font-bold text-teal-900 font-mono text-xs">&tau; = 0.85 (Strict)</span>
              <p className="font-semibold text-teal-950 text-[11px]">High Precision Mode</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Minimizes false positives (approx. 2.2% error on known references; 2.3% on holdouts). Recommended when strict regulatory certainty is required.
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 font-mono text-xs">&tau; = 0.60 (Balanced)</span>
              <p className="font-semibold text-slate-900 text-[11px]">Standard Default Baseline</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Balanced trade-off between taxonomic resolution depth and error suppression for general biodiversity surveys.
              </p>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
              <span className="font-bold text-amber-900 font-mono text-xs">&tau; = 0.50 (Exploratory)</span>
              <p className="font-semibold text-amber-950 text-[11px]">Exploratory Mode</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Increases genus resolution depth for exploratory biodiversity discovery, with higher tolerance for partial clade uncertainty.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic pt-1">
            Note: Presets are user-configurable guidelines; they are not rigid legal mandates.
          </p>
        </div>
      ),
    },
    {
      id: 'qc',
      title: '6. Quality Control (QC) & Sequence Validation',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Before sequences undergo classification, automated quality control criteria are evaluated:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-700">
            <li><strong>Length verification:</strong> Sequences must meet minimum length requirements (&ge;200 bp). Sequences below 200 bp are flagged as truncated and rejected.</li>
            <li><strong>Sequence chemistry:</strong> Nucleotide strings must consist strictly of ACGT bases. Degenerate or ambiguous bases (such as N) are flagged.</li>
            <li><strong>QC Rejection:</strong> Sequences flagged as <span className="font-mono text-rose-700 bg-rose-50 px-1 rounded">invalid_input</span> are excluded from taxonomic assignment. They are never counted as classified or unassigned organisms.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'abundance',
      title: '7. ASV Sequence Counts vs Organism Abundance',
      content: (
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            FASTA files contain <strong>unique representative sequences (ASVs / OTUs)</strong>. The raw count of sequences assigned to a taxon represents sequence diversity, <em>not</em> the biological biomass or numerical abundance of that organism in the sampled ecosystem.
          </p>
          <p>
            To estimate organism abundance, read count frequency tables from the bioinformatic preprocessing pipeline (e.g. DADA2 or QIIME2) must be integrated at the aggregation layer.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs">
              <IconBook className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">18S Classifier Method & User Guide</h2>
              <p className="text-xs text-slate-500">
                Scientific principles, threshold calibration & regulatory EIA reporting guidance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Close method guide"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                <span>{section.title}</span>
              </h3>
              {section.content}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">18S eDNA Classification Platform • Contract v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
