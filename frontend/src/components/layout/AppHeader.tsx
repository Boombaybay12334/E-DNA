import type { FC } from 'react';
import type { ClassificationResult } from '../../types/contract';
import { IconDna, IconSliders, IconInfo, IconBook } from '../common/icons';

interface AppHeaderProps {
  currentRun: ClassificationResult;
  allRuns: ClassificationResult[];
  onSelectRun: (runId: string) => void;
  onOpenMetadata: () => void;
  onOpenMethodGuide: () => void;
  tau: number;
}

export const AppHeader: FC<AppHeaderProps> = ({
  currentRun,
  allRuns,
  onSelectRun,
  onOpenMetadata,
  onOpenMethodGuide,
  tau,
}) => {
  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-500/20">
            <IconDna className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base font-sans">
                eDNA Explorer
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80 px-1.5 py-0.5 rounded-md font-mono shadow-2xs">
                18S V4
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Taxonomic Classification Platform
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Model A Calibrated</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Active Run Selector & Threshold */}
      <div className="flex items-center gap-3">
        {/* Run Selector */}
        <div className="relative">
          <label htmlFor="run-selector" className="sr-only">Select Analysis Run</label>
          <div className="flex items-center gap-2 bg-slate-50/90 border border-slate-200 rounded-lg px-3 py-1.5 hover:border-slate-300 transition-colors shadow-2xs">
            <span className="text-xs text-slate-500 font-medium hidden md:inline">Run:</span>
            <select
              id="run-selector"
              value={currentRun.run.run_id}
              onChange={(e) => onSelectRun(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-3 font-mono"
            >
              {allRuns.map((r) => (
                <option key={r.run.run_id} value={r.run.run_id}>
                  {r.run.run_id} ({r.sequences.length} seqs)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Operating Threshold Indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 text-xs bg-teal-50 border border-teal-200 text-teal-900 px-2.5 py-1.5 rounded-lg shadow-2xs"
          title="Current global confidence threshold applied to leading rank ladder"
        >
          <IconSliders className="w-3.5 h-3.5 text-teal-700" />
          <span className="font-medium text-slate-600">&tau; =</span>
          <span className="font-mono font-bold text-teal-800">{tau.toFixed(2)}</span>
        </div>

        {/* Method Guide Button */}
        <button
          onClick={onOpenMethodGuide}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          title="Learn how 18S V4 classification, threshold tau, and PR2 reference work"
        >
          <IconBook className="w-3.5 h-3.5 text-teal-600" />
          <span className="hidden lg:inline">Method Guide</span>
        </button>

        {/* Run Audit / Metadata Button */}
        <button
          onClick={onOpenMetadata}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          title="View full model, reference, and training lineage metadata"
        >
          <IconInfo className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Run Audit</span>
        </button>
      </div>

      {/* Right: User Profile */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs shadow-2xs">
            EV
          </div>
          <div className="text-left hidden lg:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight">Dr. E. Vance</div>
            <div className="text-[10px] text-slate-400">Project Ecologist</div>
          </div>
        </div>
      </div>
    </header>
  );
};
