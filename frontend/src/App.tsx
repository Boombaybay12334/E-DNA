import { useCallback, useMemo, useState } from 'react';
import type { Report, SampleType } from './types';
import { DEFAULT_SAMPLE_TYPE, readSampleType, sampleTypeInfo } from './lib/sampleTypes';
import { buildMockReport } from './data/mockReport';
import { applyFilters, defaultFilters, deriveViews, type AsvView, type Filters } from './lib/derive';
import { useWorkspaceState, type WorkspaceState } from './lib/urlState';
import { exportCsv } from './lib/export';
import { useActiveSection, useCssHeightVar } from './lib/layout';
import { ReportHeader } from './components/ReportHeader';
import { Summary } from './components/Summary';
import { Composition } from './components/Composition';
import { UnresolvedCallout } from './components/UnresolvedCallout';
import { ResultsWorkspace } from './components/ResultsWorkspace';
import { Reliability } from './components/Reliability';
import { SequenceDrawer } from './components/SequenceDrawer';
import { SectionNav, type NavItem } from './components/SectionNav';
import { AppSidebar } from './components/AppSidebar';

// TODO: replace with a fetch of the pipeline's report JSON (same shape as `Report`).
// Built lazily, once per sample type, so switching back is instant.
interface Bundle {
  report: Report;
  views: AsvView[];
  defaults: WorkspaceState;
  byId: Map<string, AsvView>;
}
const bundles: Partial<Record<SampleType, Bundle>> = {};
function getBundle(type: SampleType): Bundle {
  let b = bundles[type];
  if (!b) {
    const report = buildMockReport(type);
    const views = deriveViews(report);
    b = bundles[type] = {
      report,
      views,
      byId: new Map(views.map((v) => [v.asv.id, v])),
      defaults: {
        filters: defaultFilters(report.methods),
        view: 'table',
        groupBy: 'asv',
        sort: { key: 'reads', dir: 'desc' },
        page: 0,
        asv: null,
      },
    };
  }
  return b;
}

const NAV: NavItem[] = [
  { id: 'header', label: 'Sample' },
  { id: 'summary', label: 'Summary' },
  { id: 'composition', label: 'Composition' },
  { id: 'unresolved', label: 'Unresolved & unrepresented' },
  { id: 'results', label: 'Results' },
  { id: 'reliability', label: 'Reliability & methods' },
];
const NAV_IDS = NAV.map((n) => n.id);

function sortViews(rows: AsvView[], key: WorkspaceState['sort']['key'], dir: 'asc' | 'desc') {
  const value = (v: AsvView): number | string => {
    switch (key) {
      case 'id': return v.asv.id;
      case 'name': return v.name;
      case 'rank': return v.deepest;
      case 'confidence': return v.confidence;
      case 'divergence': return -v.bestIdentity; // higher divergence = lower identity
      case 'identity': return v.bestIdentity;
      case 'reads': return v.asv.reads;
    }
  };
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a), y = value(b);
    return (x < y ? -1 : x > y ? 1 : 0) * sign;
  });
}

/**
 * The sample type chooses which report is shown. The page below is the same component tree for every type,
 * keyed by type so filters, view and the open ASV reset (they refer to ASVs of the other sample).
 */
export function App() {
  const [type, setType] = useState<SampleType>(readSampleType);
  const changeType = useCallback((next: SampleType) => {
    const qs = next === DEFAULT_SAMPLE_TYPE ? '' : `?type=${next}`;
    window.history.replaceState(null, '', `${window.location.pathname}${qs}`);
    setType(next);
    window.scrollTo({ top: 0 });
  }, []);
  return <ReportPage key={type} type={type} onSampleType={changeType} />;
}

function ReportPage({ type, onSampleType }: { type: SampleType; onSampleType: (t: SampleType) => void }) {
  const { report, views, byId, defaults: DEFAULTS } = getBundle(type);
  const { state, setFilters, update, setState } = useWorkspaceState(DEFAULTS);

  const rows = useMemo(
    () => sortViews(applyFilters(views, state.filters), state.sort.key, state.sort.dir),
    [views, state.filters, state.sort],
  );
  const open = state.asv ? byId.get(state.asv) ?? null : null;
  const index = open ? rows.indexOf(open) : -1;

  /** Entry point from summary tiles, charts and callouts: fresh filters + scroll to results. */
  const drill = useCallback((patch: Partial<Filters>) => {
    setState((s) => ({ ...s, filters: { ...DEFAULTS.filters, ...patch }, view: 'table', groupBy: 'asv', page: 0 }));
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [setState, DEFAULTS]);

  const openAsv = useCallback((id: string) => update({ asv: id }), [update]);
  const step = useCallback((delta: number) => {
    if (index < 0) return;
    const next = rows[index + delta];
    if (next) update({ asv: next.asv.id });
  }, [index, rows, update]);
  const onPrev = useCallback(() => step(-1), [step]);
  const onNext = useCallback(() => step(1), [step]);
  const onClose = useCallback(() => update({ asv: null }), [update]);

  const topbarRef = useCssHeightVar<HTMLElement>('--topbar-h');
  const navRef = useCssHeightVar<HTMLElement>('--navstrip-h');
  const active = useActiveSection(NAV_IDS);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile only
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="app">
      <AppSidebar sections={NAV} activeSection={active} project={report.sample.project}
        open={sidebarOpen} onClose={closeSidebar} />

      <div className="app-main">
        {report.isDemoData && (
          <div className="demo-banner" role="note">
            Demo data: synthetic results for layout testing. Not real observations.
          </div>
        )}
        <header className="topbar" ref={topbarRef} data-sticky>
          <div className="topbar-inner">
            <button type="button" className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">☰</button>
            <span className="crumb">Reports</span>
            <span className="muted">›</span>
            <label className="inline-control">
              <span className="visually-hidden">Sample</span>
              <select value={report.sample.sampleId} disabled title="Sample switching: once multiple samples exist">
                <option>{report.sample.sampleId}</option>
              </select>
            </label>
            <span className="spacer" />
            <button type="button" className="primary" onClick={() => exportCsv(views, report.methods.ranks, report.sample.sampleId)}>Export all (CSV)</button>
            <a className="button" href="#reliability">Methods</a>
          </div>
        </header>
  
        <div className="layout">
          <SectionNav items={NAV} active={active} navRef={navRef} />
  
          <main>
            <ReportHeader report={report} onSampleType={onSampleType} />
            <Summary report={report} views={views} onDrill={drill} />
            <Composition views={views} ranks={report.methods.ranks} initialRank={sampleTypeInfo(type).compositionRank}
              onDrill={drill} />
            <UnresolvedCallout views={views} methods={report.methods} onDrill={drill} />
            <ResultsWorkspace views={views} rows={rows} methods={report.methods} sampleId={report.sample.sampleId}
              state={state} defaults={DEFAULTS.filters} setFilters={setFilters} update={update} onOpen={openAsv} />
            <Reliability report={report} views={views} onDrill={drill} />
          </main>
        </div>
      </div>

      {open && (
        <SequenceDrawer view={open} methods={report.methods} isDemoData={report.isDemoData}
          position={index >= 0 ? { index, total: rows.length } : null}
          onPrev={onPrev} onNext={onNext} onClose={onClose} />
      )}
    </div>
  );
}
