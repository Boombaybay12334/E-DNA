import type { FC } from 'react';
import type { AppView, RunMetadata } from '../../types/contract';
import {
  IconDashboard,
  IconTable,
  IconUploadCloud,
  IconBarChart,
  IconShieldCheck,
} from '../common/icons';

interface AppSidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  run: RunMetadata;
}

export const AppSidebar: FC<AppSidebarProps> = ({ currentView, onNavigate, run }) => {
  const navItems = [
    {
      id: 'overview' as AppView,
      label: 'Overview',
      description: 'Run metrics & rank distribution',
      icon: IconDashboard,
    },
    {
      id: 'results' as AppView,
      label: 'Classification Results',
      description: 'Taxonomic ladder & dynamic tau',
      icon: IconTable,
    },
    {
      id: 'upload' as AppView,
      label: 'Upload & Analyze',
      description: 'FASTA validator & submission',
      icon: IconUploadCloud,
    },
    {
      id: 'insights' as AppView,
      label: 'Community Insights',
      description: 'Composition & sensitivity curves',
      icon: IconBarChart,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-full overflow-y-auto">
      {/* Navigation menu */}
      <div className="p-4 space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-2">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-teal-600 text-white font-medium shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium leading-tight">{item.label}</div>
                <div
                  className={`text-[11px] truncate mt-0.5 ${
                    isActive ? 'text-teal-100' : 'text-slate-500'
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Model & Reference Specification Box */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-2.5">
        <div className="flex items-center gap-2 text-teal-400 font-semibold text-[11px] uppercase tracking-wider">
          <IconShieldCheck className="w-3.5 h-3.5" />
          <span>Active Classifier Spec</span>
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-400">
          <div className="flex justify-between">
            <span className="text-slate-400">Marker:</span>
            <span className="font-mono text-slate-200">{run.marker.gene} {run.marker.region}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Reference:</span>
            <span className="font-medium text-slate-200">{run.reference.name} v{run.reference.version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Model:</span>
            <span className="font-mono text-slate-200 truncate max-w-[110px]" title={run.model.name}>
              {run.model.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Resolution:</span>
            <span className="text-slate-200">Genus (Capped)</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 leading-snug">
          Species-level assignments are not supported by the 18S V4 marker.
        </div>
      </div>
    </aside>
  );
};
