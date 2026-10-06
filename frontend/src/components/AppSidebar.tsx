import type { ReactNode } from 'react';
import type { NavItem } from './SectionNav';

/** Product name in one place so it's easy to change. */
export const APP_NAME = 'EcoDNA';

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

const ICONS: Record<string, ReactNode> = {
  dashboard: <Icon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icon>,
  reports: <Icon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></Icon>,
  samples: <Icon><path d="M9 3h6" /><path d="M10 3v13a2 2 0 0 0 4 0V3" /><path d="M10 11h4" /></Icon>,
  taxonomy: <Icon><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" /><path d="M8 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8M13 12h3" /></Icon>,
  map: <Icon><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></Icon>,
  settings: <Icon><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Icon>,
};

const APP_NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'reports', label: 'Reports' },
  { id: 'samples', label: 'Samples' },
  { id: 'taxonomy', label: 'Taxonomy Explorer' },
  { id: 'map', label: 'Map View' },
  { id: 'settings', label: 'Settings' },
];

interface Props {
  sections: NavItem[];
  activeSection: string;
  project: string;
  open: boolean;
  onClose: () => void;
}

/** App-level navigation. Only Reports exists in this skeleton; the report's sections nest under it. */
export function AppSidebar({ sections, activeSection, project, open, onClose }: Props) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`app-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <a className="brand" href="#header" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" aria-hidden>
            <path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0" />
          </svg>
          <span>{APP_NAME}</span>
        </a>

        <nav className="app-nav">
          <ul>
            {APP_NAV.map((item) => {
              const current = item.id === 'reports';
              return (
                <li key={item.id}>
                  {current ? (
                    <a className="app-nav-item" href="#header" aria-current="page" onClick={onClose}>
                      {ICONS[item.id]}<span>{item.label}</span>
                    </a>
                  ) : (
                    <span className="app-nav-item disabled" aria-disabled="true" title="Not built yet in this skeleton">
                      {ICONS[item.id]}<span>{item.label}</span>
                    </span>
                  )}
                  {current && (
                    <ul className="app-subnav" aria-label="On this page">
                      {sections.map((s) => (
                        <li key={s.id}>
                          <a href={`#${s.id}`} onClick={onClose}
                            aria-current={activeSection === s.id ? 'location' : undefined}>{s.label}</a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <button type="button" className="project-switcher" disabled title="Project switching: once multiple projects exist">
          <span className="project-switcher-text">
            <span className="project-switcher-label">Project</span>
            <span className="project-switcher-name">{project}</span>
          </span>
          <span aria-hidden>›</span>
        </button>
      </aside>
    </>
  );
}
