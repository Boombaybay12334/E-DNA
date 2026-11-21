import type { FC } from 'react';
import type { AppView, RunMetadata } from '../../types/contract';
import {
  IconDashboard,
  IconTable,
  IconUploadCloud,
  IconBarChart,
  IconShieldCheck,
  IconX,
} from '../common/icons';

interface AppSidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  run: RunMetadata;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const AppSidebar: FC<AppSidebarProps> = ({
  currentView,
  onNavigate,
  run,
  isOpenMobile = false,
  onCloseMobile,
}) => {
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
      description: 'Taxonomic ladder & dynamic \u03c4',
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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Mobile Header */}
      <div className="p-4 flex items-center justify-between md:hidden border-b border-slate-800">
        <span className="font-bold text-white text-sm">Navigation Menu</span>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close navigation menu"
          >
            <IconX className="w-5 h-5" />
          </button>
        )}
      </div>

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
              onClick={() => {
                onNavigate(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
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
          Species-level assignments are not supported by the current marker/classifier configuration.
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-slate-800 h-full overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
