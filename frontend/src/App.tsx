import { useState, useMemo, useEffect, useRef } from 'react';
import type { AppView, ClassificationResult, SequenceRecord } from './types/contract';
import { EXAMPLE_RUN } from './data/mock/runs';
import {
  fetchSyntheticFixture,
  fetchRunsList,
  fetchRunDetail,
  fetchRunSequences,
  fetchRunClassificationResult,
  reapplyThresholdToResult,
  deleteAnalysisRun,
  createUnclassifiedResultFromRun,
} from './lib/api';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { ResultsTable } from './components/results/ResultsTable';
import { UploadView } from './components/upload/UploadView';
import { CommunityInsightsView } from './components/insights/CommunityInsightsView';
import { SequenceDetailDrawer } from './components/results/SequenceDetailDrawer';
import { RunMetadataModal } from './components/metadata/RunMetadataModal';
import { MethodGuideModal } from './components/common/MethodGuideModal';
import { IconAlertTriangle, IconRefreshCw } from './components/common/icons';

export function App() {
  // Available runs in workspace (defaults to synthetic fixture while loading)
  const [runs, setRuns] = useState<ClassificationResult[]>([
    {
      ...EXAMPLE_RUN,
      is_synthetic: true,
      disclaimer:
        'SYNTHETIC/FIXTURE DATA ONLY: Illustrative Contract v1.0 reference for development and testing; not actual scientific predictions.',
    },
  ]);

  // Selected run ID
  const [activeRunId, setActiveRunId] = useState<string>(EXAMPLE_RUN.run.run_id);

  // Active view state
  const [currentView, setCurrentView] = useState<AppView>('results');

  // Active threshold tau
  const [tau, setTau] = useState<number>(0.60);

  // Loading and error states
  const [isLoadingRuns, setIsLoadingRuns] = useState<boolean>(true);
  const [isReapplyingThreshold, setIsReapplyingThreshold] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Selected sequence for detail drawer
  const [selectedSequence, setSelectedSequence] = useState<SequenceRecord | null>(null);

  // Modal states
  const [isMetadataOpen, setIsMetadataOpen] = useState<boolean>(false);
  const [isMethodGuideOpen, setIsMethodGuideOpen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Load backend classification results and runs on mount
  useEffect(() => {
    let isMounted = true;

    async function loadBackendData() {
      setIsLoadingRuns(true);
      setApiError(null);

      try {
        // 1. Fetch synthetic fixture from backend (official Contract v1.0 fixture)
        const fixture = await fetchSyntheticFixture();

        // 2. Fetch list of persistent runs from backend database
        const loadedRuns: ClassificationResult[] = [fixture];
        try {
          const runList = await fetchRunsList(50, 0);
          for (const item of runList.items) {
            // Avoid duplicate entry if database contains the fixture
            if (item.run_id === fixture.run.run_id) continue;

            if (item.classification_status === 'completed') {
              try {
                const attached = await fetchRunClassificationResult(item.run_id);
                loadedRuns.push(attached);
              } catch {
                // Skip runs without completed results
              }
            } else {
              // Unclassified run in persistent database: fetch details & sequence records
              try {
                const detail = await fetchRunDetail(item.run_id);
                const seqs = await fetchRunSequences(item.run_id, 200, 0);
                const unclassified = createUnclassifiedResultFromRun(
                  detail,
                  seqs.sequences || seqs.items || []
                );
                loadedRuns.push(unclassified);
              } catch (detailErr) {
                console.warn(`Could not load unclassified run '${item.run_id}':`, detailErr);
              }
            }
          }
        } catch (listErr) {
          console.warn('Could not query persistent database runs:', listErr);
        }

        if (isMounted) {
          setRuns(loadedRuns);
          setActiveRunId(loadedRuns[0].run.run_id);
          setTau(loadedRuns[0].run.threshold.tau);
        }
      } catch (err: unknown) {
        console.error('Failed to load results from backend:', err);
        if (isMounted) {
          const fallback: ClassificationResult = {
            ...EXAMPLE_RUN,
            is_synthetic: true,
            disclaimer:
              'SYNTHETIC/FIXTURE DATA ONLY: Illustrative Contract v1.0 reference for development and testing; not actual scientific predictions.',
          };
          setRuns([fallback]);
          setActiveRunId(fallback.run.run_id);
          setTau(fallback.run.threshold.tau);
          setApiError(
            err instanceof Error
              ? `Backend notice: ${err.message}. Using synthetic fixture.`
              : 'Backend unreachable. Using synthetic fixture.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingRuns(false);
        }
      }
    }

    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Request sequence ref to prevent threshold race conditions / stale overwrites
  const thresholdReqSeqRef = useRef<number>(0);

  // Retrieve base run from runs array
  const activeRun = useMemo(() => {
    return runs.find((r) => r.run.run_id === activeRunId) || runs[0];
  }, [runs, activeRunId]);

  // Keep selectedSequence in sync with current run
  const activeSelectedSequence = useMemo(() => {
    if (!selectedSequence) return null;
    return activeRun.sequences.find((s: SequenceRecord) => s.id === selectedSequence.id) || selectedSequence;
  }, [activeRun.sequences, selectedSequence]);

  const handleSelectRun = (runId: string) => {
    // Invalidate any in-flight threshold reapplication requests from previous run
    thresholdReqSeqRef.current++;
    setIsReapplyingThreshold(false);
    setActiveRunId(runId);
    setSelectedSequence(null);
    const chosen = runs.find((r) => r.run.run_id === runId);
    if (chosen) {
      setTau(chosen.run.threshold.tau);
    }
  };

  const handleRunCreated = (newRun: ClassificationResult) => {
    setRuns((prev) => [newRun, ...prev.filter((r) => r.run.run_id !== newRun.run.run_id)]);
    setActiveRunId(newRun.run.run_id);
    setTau(newRun.run.threshold.tau);
    setCurrentView('results');
  };

  // Reapply threshold strictly through backend API with race condition protection
  const handleThresholdChange = async (newTau: number) => {
    setTau(newTau);
    if (!activeRun) return;

    const reqId = ++thresholdReqSeqRef.current;
    setIsReapplyingThreshold(true);
    setApiError(null);

    try {
      const updatedRun = await reapplyThresholdToResult(activeRun, newTau, activeRunId);
      if (reqId === thresholdReqSeqRef.current) {
        setRuns((prev) =>
          prev.map((r) => (r.run.run_id === activeRunId ? updatedRun : r))
        );
      }
    } catch (err: unknown) {
      if (reqId === thresholdReqSeqRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setApiError(`Failed to reapply threshold via backend API: ${msg}`);
      }
    } finally {
      if (reqId === thresholdReqSeqRef.current) {
        setIsReapplyingThreshold(false);
      }
    }
  };

  // Delete persistent run and switch to remaining run
  const handleDeleteRun = async (runId: string) => {
    const target = runs.find((r) => r.run.run_id === runId);
    if (!target) return;
    if (target.is_synthetic || runId === '18s-example-run-001' || runId === 'example-run-0001') {
      setApiError('The reference synthetic fixture cannot be deleted.');
      return;
    }

    try {
      await deleteAnalysisRun(runId);
      setRuns((prev) => {
        const remaining = prev.filter((r) => r.run.run_id !== runId);
        if (activeRunId === runId && remaining.length > 0) {
          setActiveRunId(remaining[0].run.run_id);
          setTau(remaining[0].run.threshold.tau);
          setSelectedSequence(null);
        }
        return remaining;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setApiError(`Failed to delete run '${runId}': ${msg}`);
    }
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased overflow-hidden">
      {/* Top Application Header */}
      <AppHeader
        currentRun={activeRun}
        allRuns={runs}
        onSelectRun={handleSelectRun}
        onOpenMetadata={() => setIsMetadataOpen(true)}
        onOpenMethodGuide={() => setIsMethodGuideOpen(true)}
        tau={tau}
        onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar */}
        <AppSidebar
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            setSelectedSequence(null);
            setIsMobileNavOpen(false);
          }}
          run={activeRun.run}
          isOpenMobile={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Content View Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* API Warning / Error banner if any */}
            {apiError && (
              <div
                role="alert"
                className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <IconAlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{apiError}</span>
                </div>
                <button
                  onClick={() => setApiError(null)}
                  className="text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {isLoadingRuns ? (
              <div className="py-24 text-center space-y-3">
                <IconRefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Loading classification results from backend...
                </p>
                <p className="text-xs text-slate-400">Connecting to eDNA Explorer FastAPI service</p>
              </div>
            ) : (
              <>
                {currentView === 'overview' && (
                  <OverviewDashboard
                    result={activeRun}
                    allRuns={runs}
                    onSelectRun={handleSelectRun}
                    onNavigateToUpload={() => setCurrentView('upload')}
                    onNavigateToResults={() => setCurrentView('results')}
                    tau={tau}
                  />
                )}

                {currentView === 'results' && (
                  <ResultsTable
                    result={activeRun}
                    tau={tau}
                    onThresholdChange={handleThresholdChange}
                    onSelectSequence={setSelectedSequence}
                    selectedSequenceId={activeSelectedSequence?.id}
                    isReapplyingThreshold={isReapplyingThreshold}
                  />
                )}

                {currentView === 'upload' && (
                  <UploadView
                    onRunCreated={handleRunCreated}
                    defaultTau={tau}
                  />
                )}

                {currentView === 'insights' && (
                  <CommunityInsightsView
                    result={activeRun}
                    tau={tau}
                    isReapplyingThreshold={isReapplyingThreshold}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Sequence Detail Slide-out Drawer */}
      <SequenceDetailDrawer
        sequence={activeSelectedSequence}
        run={activeRun.run}
        tau={tau}
        onClose={() => setSelectedSequence(null)}
      />

      {/* Run Audit / Metadata Modal */}
      <RunMetadataModal
        isOpen={isMetadataOpen}
        onClose={() => setIsMetadataOpen(false)}
        run={activeRun.run}
        isSynthetic={activeRun.is_synthetic}
        onDeleteRun={handleDeleteRun}
      />

      {/* Method & Scientific EIA Guide Modal */}
      <MethodGuideModal
        isOpen={isMethodGuideOpen}
        onClose={() => setIsMethodGuideOpen(false)}
      />
    </div>
  );
}

export default App;
