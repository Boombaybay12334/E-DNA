import type { ReactNode } from 'react';
import type { AppNavView } from '../types';
import {
  IconBook,
  IconChart,
  IconFolder,
  IconLogo,
  IconMoon,
  IconOverview,
  IconPipeline,
  IconReport,
  IconSample,
  IconSettings,
  IconSun,
} from './icons';

export const APP_NAME = 'EcoDNA';

const NAV_GROUPS: { label: string; items: { id: AppNavView; label: string; icon: ReactNode }[] }[] = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview', label: 'Overview', icon: <IconOverview /> },
      { id: 'projects', label: 'Projects', icon: <IconFolder /> },
      { id: 'samples', label: 'Samples', icon: <IconSample /> },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { id: 'analysis', label: 'Pipeline Runs', icon: <IconPipeline /> },
      { id: 'insights', label: 'Biodiversity Insights', icon: <IconChart /> },
    ],
  },
  {
    label: 'Deliverables',
    items: [
      { id: 'reports', label: 'Report Builder', icon: <IconReport /> },
      { id: 'documentation', label: 'Documentation', icon: <IconBook /> },
    ],
  },
  {
    label: 'Platform',
    items: [{ id: 'settings', label: 'Settings', icon: <IconSettings /> }],
  },
];

interface Props {
  currentView: AppNavView;
  activeProjectName: string;
  open: boolean;
  onClose: () => void;
  onNavigate: (view: AppNavView) => void;
  onOpenGuide?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function AppSidebar({
  currentView,
  activeProjectName,
  open,
  onClose,
  onNavigate,
  onOpenGuide,
  theme,
  onToggleTheme,
}: Props) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`app-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <div
          className="brand"
          onClick={() => {
            onNavigate('overview');
            onClose();
          }}
        >
          <div className="brand-logo-wrap">
            <IconLogo size={26} />
          </div>
          <div className="brand-text">
            <span className="brand-name">{APP_NAME}</span>
            <span className="brand-sub">Biodiversity Intelligence</span>
          </div>
        </div>

        <nav className="app-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="app-nav-group">
              <span className="app-nav-label">{group.label}</span>
              <ul className="app-nav-items">
                {group.items.map((item) => {
                  const isActive =
                    currentView === item.id || (item.id === 'analysis' && currentView === 'results');
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`app-nav-item-btn ${isActive ? 'active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          onNavigate(item.id);
                          onClose();
                        }}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom-actions">
          {onOpenGuide && (
            <button type="button" className="sidebar-action-btn" onClick={onOpenGuide}>
              <span className="act-icon"><IconBook size={16} /></span>
              <span>eDNA Guide &amp; SOP</span>
            </button>
          )}

          {onToggleTheme && (
            <button type="button" className="sidebar-action-btn" onClick={onToggleTheme}>
              <span className="act-icon">
                {theme === 'light' ? <IconMoon size={16} /> : <IconSun size={16} />}
              </span>
              <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
          )}

          <div
            className="project-switcher"
            title="Active environmental assessment project"
            onClick={() => onNavigate('projects')}
          >
            <span className="project-switcher-text">
              <span className="project-switcher-label">Active Project</span>
              <span className="project-switcher-name" title={activeProjectName}>{activeProjectName}</span>
            </span>
            <span className="pulse-dot green" />
          </div>
        </div>
      </aside>
    </>
  );
}
