import React from 'react';
import {
  IconX,
  IconDna,
  IconShieldCheck,
  IconSliders,
  IconAlertTriangle,
} from './icons';

interface MethodGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodGuideModal: React.FC<MethodGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs">
              <IconDna className="w-5 h-5" />
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
            aria-label="Close guide"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Section 1: 18S V4 Marker Scope */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-800 font-semibold text-sm">
              <IconDna className="w-4 h-4 text-teal-600" />
              <h3>1. Marker & Reference Database (PR2 v5.0.0)</h3>
            </div>
            <p className="text-xs text-slate-600">
              This platform classifies <strong>eukaryotic environmental DNA (eDNA) amplicons</strong> targeted by the 18S rRNA V4 region (approx. 380–450 bp). All classifications are matched against the curated <strong>Protist Ribosomal Reference database (PR2 v5.0.0)</strong>, clustered at 99% similarity.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-medium text-slate-800">Capped at Genus Rank:</p>
              <p className="text-slate-600">
                18S V4 does not have adequate sequence divergence to reliably distinguish individual species. Therefore, taxonomic assignments are capped at the <strong>genus level</strong>. Species-level distinctions are neither evaluated nor claimed.
              </p>
            </div>
          </div>

          {/* Section 2: Consecutive Leading Assignment Rule */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-800 font-semibold text-sm">
              <IconShieldCheck className="w-4 h-4 text-teal-600" />
              <h3>2. The Consecutive Assignment Rule</h3>
            </div>
            <p className="text-xs text-slate-600">
              Taxonomy forms an unbroken tree from root to leaf:
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
            <p className="text-xs text-slate-600">
              Assignment depth is defined as the <strong>number of consecutive leading ranks from root where model confidence &ge; &tau;</strong>. The moment confidence falls below &tau; at an intermediate rank (e.g. family), classification halts at the preceding rank (e.g. order), and all deeper ranks are left unassigned.
            </p>
          </div>

          {/* Section 3: How to Choose Tau */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-800 font-semibold text-sm">
              <IconSliders className="w-4 h-4 text-teal-600" />
              <h3>3. Selecting Operating Threshold (&tau;)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl space-y-1">
                <span className="font-bold text-teal-900 font-mono text-sm">&tau; = 0.85 (Strict)</span>
                <p className="font-semibold text-teal-950 text-[11px]">Regulatory EIA Standard</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Minimizes false positives (2.2% error on known sequences; 2.3% on novel holdout clades). Recommended when high legal certainty is required.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-900 font-mono text-sm">&tau; = 0.70 (Balanced)</span>
                <p className="font-semibold text-slate-900 text-[11px]">Recommended Baseline</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Optimal trade-off between taxonomic depth and error suppression for coastal and marine biomonitoring surveys.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                <span className="font-bold text-amber-900 font-mono text-sm">&tau; = 0.50 (Exploratory)</span>
                <p className="font-semibold text-amber-950 text-[11px]">Academic & Biodiversity Survey</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Higher genus resolution rate for exploratory surveys, but with higher probability of over-classification on novel clades.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: What Partial Assignment Means */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-900">
              <IconAlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Crucial Regulatory Notice: Partial Classifications are Not Novel Species</span>
            </div>
            <p className="text-amber-950/80 leading-relaxed">
              When a sequence is classified as <code>assigned_partial</code> (e.g. resolved to Family but not Genus), it means deeper levels are <strong>not supported by the reference database or marker resolution</strong>. It must <strong>NEVER</strong> be labeled as a "new species discovered" in client or EIA assessment reports.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50">
          <span className="text-xs text-slate-400">PR2 Reference v5.0.0 • Model A Calibration Spec</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Got it, close guide
          </button>
        </div>
      </div>
    </div>
  );
};
