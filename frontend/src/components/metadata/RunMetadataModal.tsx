import React, { useState } from 'react';
import type { RunMetadata } from '../../types/contract';
import {
  IconX,
  IconCpu,
  IconDna,
  IconSliders,
  IconShieldAlert,
  IconGitCommit,
  IconCalendar,
  IconFileCode,
  IconCheck,
} from '../common/icons';

interface RunMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: RunMetadata;
}

export const RunMetadataModal: React.FC<RunMetadataModalProps> = ({ isOpen, onClose, run }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(run, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
              <IconCpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Run Audit & Scientific Metadata</h2>
              <p className="text-xs text-slate-500 font-mono">Contract v1.0 • ID: {run.run_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Close modal"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Key metadata grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                <IconCalendar className="w-3.5 h-3.5" />
                <span>Timestamp (UTC)</span>
              </div>
              <div className="font-mono text-slate-800 text-sm">
                {new Date(run.created_utc).toUTCString()}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                <IconDna className="w-3.5 h-3.5 text-teal-600" />
                <span>Target Amplicon Marker</span>
              </div>
              <div className="font-medium text-slate-900">
                {run.marker.gene} ({run.marker.region} region)
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Strictly validated for eukaryotic 18S V4</div>
            </div>
          </div>

          {/* Model & Reference details */}
          <div className="space-y-4">
            <div className="p-4 border border-slate-200 rounded-lg bg-white">
              <div className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
                <IconCpu className="w-4 h-4 text-teal-600" />
                <span>Inference Architecture</span>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Model Name</dt>
                  <dd className="font-mono font-medium text-slate-800 mt-0.5">{run.model.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Version</dt>
                  <dd className="font-mono font-medium text-slate-800 mt-0.5">{run.model.version}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 flex items-center gap-1">
                    <IconGitCommit className="w-3 h-3" /> Commit
                  </dt>
                  <dd className="font-mono font-medium text-slate-800 mt-0.5">
                    {run.model.code_commit ?? 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg bg-white">
              <div className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
                <IconDna className="w-4 h-4 text-indigo-600" />
                <span>Taxonomic Reference Database</span>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Database</dt>
                  <dd className="font-medium text-slate-800 mt-0.5">{run.reference.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Version</dt>
                  <dd className="font-mono font-medium text-slate-800 mt-0.5">{run.reference.version}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Subset / Clustering</dt>
                  <dd className="font-medium text-slate-800 mt-0.5">{run.reference.subset ?? 'Full release'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Threshold & Rank rules */}
          <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold text-teal-950">
              <IconSliders className="w-4 h-4 text-teal-700" />
              <span>Threshold & Assignment Semantics</span>
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <p>
                <span className="font-semibold text-slate-800">Operating threshold (&tau;):</span>{' '}
                <span className="font-mono font-bold text-teal-800">{run.threshold.tau}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-800">Rule:</span>{' '}
                <span className="font-mono text-slate-600">{run.threshold.rule}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-800">Taxonomic Ranks ({run.ranks.length}):</span>{' '}
                <span className="font-mono text-slate-600">{run.ranks.join(' \u2192 ')}</span>
              </p>
            </div>
          </div>

          {/* Scientific Disclaimer */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <IconShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold">Confidence Semantics Disclosure:</span>{' '}
              {run.confidence_semantics}. Model confidence scores are not interchangeable between different neural or bootstrap models.
              Partially assigned sequences reflect lack of reference coverage or marker resolution, not verified novel taxa.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {copied ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconFileCode className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Run JSON'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
