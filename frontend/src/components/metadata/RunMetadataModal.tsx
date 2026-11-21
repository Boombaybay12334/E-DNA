import React, { useState } from 'react';
import type { RunMetadata } from '../../types/contract';
import {
  IconX,
  IconCpu,
  IconDna,
  IconSliders,
  IconGitCommit,
  IconCalendar,
  IconCheck,
  IconCopy,
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
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
              <IconCpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Run Audit & Scientific Metadata</h2>
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
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <IconCalendar className="w-3.5 h-3.5" />
                <span>Timestamp (UTC)</span>
              </div>
              <div className="font-mono text-slate-900 text-xs font-semibold">
                {run.created_utc ? new Date(run.created_utc).toUTCString() : 'Not available'}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <IconDna className="w-3.5 h-3.5 text-teal-600" />
                <span>Target Amplicon Marker</span>
              </div>
              <div className="font-semibold text-slate-900 text-xs">
                {run.marker?.gene ?? 'Not available'} ({run.marker?.region ?? 'Not available'} region)
              </div>
              <div className="text-[11px] text-slate-500">Validated for eukaryotic 18S V4 amplicons</div>
            </div>
          </div>

          {/* Model & Reference details */}
          <div className="space-y-4">
            <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
                <IconCpu className="w-4 h-4 text-teal-600" />
                <span>Inference Architecture</span>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Model Name</dt>
                  <dd className="font-mono font-semibold text-slate-800 mt-0.5">{run.model?.name ?? 'Not available'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Version</dt>
                  <dd className="font-mono font-semibold text-slate-800 mt-0.5">{run.model?.version ?? 'Not available'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 flex items-center gap-1">
                    <IconGitCommit className="w-3 h-3" /> Commit
                  </dt>
                  <dd className="font-mono font-semibold text-slate-800 mt-0.5">
                    {run.model?.code_commit ?? 'Not available'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
                <IconDna className="w-4 h-4 text-indigo-600" />
                <span>Taxonomic Reference Database</span>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Database</dt>
                  <dd className="font-semibold text-slate-800 mt-0.5">{run.reference?.name ?? 'Not available'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Version</dt>
                  <dd className="font-mono font-semibold text-slate-800 mt-0.5">{run.reference?.version ?? 'Not available'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Subset</dt>
                  <dd className="font-medium text-slate-800 mt-0.5">{run.reference?.subset ?? 'Not available'}</dd>
                </div>
              </dl>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
                <IconSliders className="w-4 h-4 text-teal-600" />
                <span>Threshold Calibration & Rule</span>
              </div>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-slate-500">Baseline Threshold (&tau;): </span>
                  <span className="font-mono font-bold text-teal-800">{run.threshold?.tau ?? 'Not available'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Consecutive Rule: </span>
                  <span className="font-mono text-slate-800">{run.threshold?.rule ?? 'Not available'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Confidence Semantics: </span>
                  <span className="text-slate-700 italic">{run.confidence_semantics ?? 'Not available'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
          >
            {copied ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconCopy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Audit JSON'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
