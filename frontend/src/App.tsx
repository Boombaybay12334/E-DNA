import { useState, useMemo } from 'react';
import type { AppView, ClassificationResult, SequenceRecord } from './types/contract';
import { EXAMPLE_RUN, TARA_OCEANS_RUN } from './data/mock/runs';
import { recalculateClassificationResult } from './lib/threshold';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { ResultsTable } from './components/results/ResultsTable';
import { UploadView } from './components/upload/UploadView';
import { CommunityInsightsView } from './components/insights/CommunityInsightsView';
import { SequenceDetailDrawer } from './components/results/SequenceDetailDrawer';
import { RunMetadataModal } from './components/metadata/RunMetadataModal';
import { MethodGuideModal } from './components/common/MethodGuideModal';

export function App() {
  // Available runs in workspace
  const [runs, setRuns] = useState<ClassificationResult[]>([
    EXAMPLE_RUN,
    TARA_OCEANS_RUN,
  ]);

  // Selected run ID
  const [activeRunId, setActiveRunId] = useState<string>(EXAMPLE_RUN.run.run_id);

  // Active view state
  const [currentView, setCurrentView] = useState<AppView>('overview');

  // Active threshold tau
  const [tau, setTau] = useState<number>(0.60);

  // Selected sequence for detail drawer
  const [selectedSequence, setSelectedSequence] = useState<SequenceRecord | null>(null);

  // Modal states
  const [isMetadataOpen, setIsMetadataOpen] = useState<boolean>(false);
  const [isMethodGuideOpen, setIsMethodGuideOpen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Retrieve base run from runs array
  const baseRun = useMemo(() => {
    return runs.find((r) => r.run.run_id === activeRunId) || runs[0];
  }, [runs, activeRunId]);

  // Dynamically recalculate run assignments based on active tau
  const activeRun = useMemo(() => {
    return recalculateClassificationResult(baseRun, tau);
  }, [baseRun, tau]);

  // Keep selectedSequence in sync with recalculated run
  const activeSelectedSequence = useMemo(() => {
    if (!selectedSequence) return null;
    return activeRun.sequences.find((s: SequenceRecord) => s.id === selectedSequence.id) || selectedSequence;
  }, [activeRun.sequences, selectedSequence]);

  const handleSelectRun = (runId: string) => {
    setActiveRunId(runId);
    setSelectedSequence(null);
    const chosen = runs.find((r) => r.run.run_id === runId);
    if (chosen) {
      setTau(chosen.run.threshold.tau);
    }
  };

  const handleRunCreated = (newRun: ClassificationResult) => {
    setRuns((prev) => [newRun, ...prev]);
    setActiveRunId(newRun.run.run_id);
    setTau(newRun.run.threshold.tau);
    setCurrentView('results');
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
          <div className="max-w-7xl mx-auto">
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
                onThresholdChange={setTau}
                onSelectSequence={setSelectedSequence}
                selectedSequenceId={activeSelectedSequence?.id}
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
                onThresholdChange={setTau}
              />
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
