import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { ClassificationResult, ClassificationStatus } from '../../types/contract';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { reapplyThresholdToResult } from '../../lib/api';
import {
  exportCommunityInsightsCsv,
  exportCommunityInsightsJson,
  type CommunityInsightsExportData,
} from '../../lib/export';
import {
  IconSliders,
  IconShieldAlert,
  IconInfo,
  IconPieChart,
  IconBarChart,
  IconAlertTriangle,
  IconRefreshCw,
  IconArrowDown,
  IconFilter,
  IconX,
  IconFileSpreadsheet,
  IconFileCode,
  IconCheck,
} from '../common/icons';

interface CommunityInsightsViewProps {
  result: ClassificationResult;
  tau: number;
  isReapplyingThreshold?: boolean;
}

// Fixed semantic colors for Contract v1.0 statuses
const STATUS_COLORS: Record<ClassificationStatus, string> = {
  assigned_full: '#059669', // Emerald
  assigned_partial: '#d97706', // Amber
  unassigned: '#64748b', // Slate
  invalid_input: '#e11d48', // Rose
};

const STATUS_LABELS: Record<ClassificationStatus, string> = {
  assigned_full: 'Fully Assigned',
  assigned_partial: 'Partially Assigned',
  unassigned: 'Unassigned',
  invalid_input: 'Invalid / QC Rejected',
};

const STATUS_DESCRIPTIONS: Record<ClassificationStatus, string> = {
  assigned_full: 'All evaluated ranks meet operating cutoff \u03c4',
  assigned_partial: 'Resolved to intermediate ranks; deeper ranks fell below cutoff \u03c4',
  unassigned: 'Root rank confidence fell below cutoff \u03c4',
  invalid_input: 'Rejected during sequence QC prior to taxonomic classification',
};

export const CommunityInsightsView: React.FC<CommunityInsightsViewProps> = ({
  result,
  tau,
  isReapplyingThreshold = false,
}) => {
  const { run, sequences = [] } = result;
  const totalSequences = sequences.length;
  const dynamicRanks = run.ranks || [];
  const terminalRank = dynamicRanks[dynamicRanks.length - 1] || 'leaf';

  // -------------------------------------------------------------
  // Composition Explorer State
  // -------------------------------------------------------------
  const [selectedRank, setSelectedRank] = useState<string>(
    dynamicRanks[dynamicRanks.length - 1] || 'genus'
  );
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'ASSIGNED_ONLY'>('ALL');
  const [selectedTaxon, setSelectedTaxon] = useState<string | null>(null);

  // Sync selected rank if dynamic ranks change across runs
  useEffect(() => {
    if (dynamicRanks.length > 0 && !dynamicRanks.includes(selectedRank)) {
      setSelectedRank(dynamicRanks[dynamicRanks.length - 1]);
    }
    setSelectedTaxon(null);
  }, [result.run.run_id, dynamicRanks, selectedRank]);

  // -------------------------------------------------------------
  // Threshold Sensitivity State (Backend-Delegated & Non-Destructive)
  // -------------------------------------------------------------
  const [candidateTau, setCandidateTau] = useState<number>(tau);
  const [candidateResult, setCandidateResult] = useState<ClassificationResult | null>(null);
  const [isEvaluatingCandidate, setIsEvaluatingCandidate] = useState<boolean>(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const activeReqRef = useRef<number>(0);

  // Invalidate in-flight simulations and reset sensitivity state when run or operating tau changes
  useEffect(() => {
    activeReqRef.current++;
    setCandidateTau(tau);
    setCandidateResult(null);
    setEvalError(null);
    setIsEvaluatingCandidate(false);
  }, [result.run.run_id, tau]);

  // Export Feedback Notification State
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Community Insights Export Data Generator
  // -------------------------------------------------------------
  const getInsightsExportData = (): CommunityInsightsExportData => {
    return {
      summaryMetrics: metrics,
      statusDistribution: statusData.map((s) => ({
        status: s.status,
        name: s.name,
        count: s.count,
        percentage: s.percentage,
      })),
      depthDistribution: depthData,
      composition: {
        rank: selectedRank,
        scope: scopeFilter,
        scopeTotal: compositionData.scopeTotal,
        taxa: compositionData.taxa,
      },
      candidateSimulation: candidateResult && candidateMetrics ? {
        candidateTau,
        currentTau: tau,
        candidateMetrics,
        delta: {
          fullDelta: candidateMetrics.countFull - metrics.countFull,
          partialDelta: candidateMetrics.countPartial - metrics.countPartial,
          unassignedDelta: candidateMetrics.countUnassigned - metrics.countUnassigned,
          meanDepthDelta: candidateMetrics.meanDepth - metrics.meanDepth,
        },
      } : null,
    };
  };

  const handleExportInsightsCsv = () => {
    const outcome = exportCommunityInsightsCsv(result, getInsightsExportData());
    if (outcome.success) {
      setExportFeedback(`Exported Insights CSV to ${outcome.filename}`);
      setTimeout(() => setExportFeedback(null), 4000);
    } else {
      setExportFeedback(`Export failed: ${outcome.error}`);
    }
  };

  const handleExportInsightsJson = () => {
    const outcome = exportCommunityInsightsJson(result, getInsightsExportData());
    if (outcome.success) {
      setExportFeedback(`Exported Insights JSON to ${outcome.filename}`);
      setTimeout(() => setExportFeedback(null), 4000);
    } else {
      setExportFeedback(`Export failed: ${outcome.error}`);
    }
  };

  // -------------------------------------------------------------
  // 1. Dashboard Summary Metrics (Mathematically Precise Counts & Rates)
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    let countFull = 0;
    let countPartial = 0;
    let countUnassigned = 0;
    let countInvalid = 0;
    let countWithWarnings = 0;
    let sumAssignedDepth = 0;

    for (const seq of sequences) {
      if (seq.status === 'assigned_full') countFull++;
      else if (seq.status === 'assigned_partial') countPartial++;
      else if (seq.status === 'unassigned') countUnassigned++;
      else if (seq.status === 'invalid_input') countInvalid++;

      if (seq.warnings && seq.warnings.length > 0) {
        countWithWarnings++;
      }
      sumAssignedDepth += seq.assigned_depth || 0;
    }

    const assignedCount = countFull + countPartial;
    const validCount = totalSequences - countInvalid;

    // Denominators explicitly defined
    const overallRateAll = totalSequences > 0 ? (assignedCount / totalSequences) * 100 : 0;
    const overallRateValid = validCount > 0 ? (assignedCount / validCount) * 100 : 0;
    const fullyAssignedRate = totalSequences > 0 ? (countFull / totalSequences) * 100 : 0;
    const partiallyAssignedRate = totalSequences > 0 ? (countPartial / totalSequences) * 100 : 0;
    const unassignedRate = totalSequences > 0 ? (countUnassigned / totalSequences) * 100 : 0;
    const invalidRate = totalSequences > 0 ? (countInvalid / totalSequences) * 100 : 0;
    const meanDepth = totalSequences > 0 ? sumAssignedDepth / totalSequences : 0;

    return {
      totalSequences,
      validSequences: validCount,
      countFull,
      countPartial,
      countUnassigned,
      countInvalid,
      countWithWarnings,
      assignedCount,
      validCount,
      overallRateAll,
      overallRateValid,
      fullyAssignedRate,
      partiallyAssignedRate,
      unassignedRate,
      invalidRate,
      meanDepth,
    };
  }, [sequences, totalSequences]);

  // -------------------------------------------------------------
  // 2. Assignment Status Distribution Data
  // -------------------------------------------------------------
  const statusData = useMemo(() => {
    const raw: Array<{
      status: ClassificationStatus;
      name: string;
      count: number;
      percentage: number;
      color: string;
      desc: string;
    }> = [
      {
        status: 'assigned_full',
        name: `${STATUS_LABELS.assigned_full} (${terminalRank})`,
        count: metrics.countFull,
        percentage: metrics.fullyAssignedRate,
        color: STATUS_COLORS.assigned_full,
        desc: STATUS_DESCRIPTIONS.assigned_full,
      },
      {
        status: 'assigned_partial',
        name: STATUS_LABELS.assigned_partial,
        count: metrics.countPartial,
        percentage: metrics.partiallyAssignedRate,
        color: STATUS_COLORS.assigned_partial,
        desc: STATUS_DESCRIPTIONS.assigned_partial,
      },
      {
        status: 'unassigned',
        name: STATUS_LABELS.unassigned,
        count: metrics.countUnassigned,
        percentage: metrics.unassignedRate,
        color: STATUS_COLORS.unassigned,
        desc: STATUS_DESCRIPTIONS.unassigned,
      },
      {
        status: 'invalid_input',
        name: STATUS_LABELS.invalid_input,
        count: metrics.countInvalid,
        percentage: metrics.invalidRate,
        color: STATUS_COLORS.invalid_input,
        desc: STATUS_DESCRIPTIONS.invalid_input,
      },
    ];

    return raw;
  }, [metrics, terminalRank]);

  // Only non-zero statuses for donut rendering
  const activeStatusDonutData = useMemo(() => {
    return statusData.filter((d) => d.count > 0);
  }, [statusData]);

  // -------------------------------------------------------------
  // 3. Taxonomic Assignment Depth Data (Dynamic Ranks)
  // -------------------------------------------------------------
  const depthData = useMemo(() => {
    const counts = new Array(dynamicRanks.length + 1).fill(0);

    for (const seq of sequences) {
      const d = Math.min(Math.max(0, seq.assigned_depth || 0), dynamicRanks.length);
      counts[d]++;
    }

    const items = [
      {
        depth: 0,
        label: 'Depth 0',
        rankName: 'Unassigned at Root',
        count: counts[0],
        pct: totalSequences > 0 ? (counts[0] / totalSequences) * 100 : 0,
        isUnassigned: true,
      },
      ...dynamicRanks.map((rank, idx) => {
        const d = idx + 1;
        const count = counts[d] || 0;
        return {
          depth: d,
          label: `Depth ${d}`,
          rankName: rank.charAt(0).toUpperCase() + rank.slice(1),
          count,
          pct: totalSequences > 0 ? (count / totalSequences) * 100 : 0,
          isUnassigned: false,
        };
      }),
    ];

    return items;
  }, [sequences, dynamicRanks, totalSequences]);

  // -------------------------------------------------------------
  // 4. Taxonomic Composition Explorer Data
  // -------------------------------------------------------------
  const compositionData = useMemo(() => {
    // Determine sequences in active scope
    const scopedSequences = sequences.filter((seq) => {
      if (scopeFilter === 'ASSIGNED_ONLY') {
        return seq.status === 'assigned_full' || seq.status === 'assigned_partial';
      }
      return true;
    });

    const scopeTotal = scopedSequences.length;
    const taxonMap = new Map<string, { count: number; sequenceIds: string[]; isUnassigned: boolean }>();

    for (const seq of scopedSequences) {
      const lineageEntry = seq.lineage?.find((l) => l.rank === selectedRank);
      let taxonName: string;
      let isUnassigned = false;

      if (lineageEntry && lineageEntry.assigned && lineageEntry.taxon) {
        taxonName = lineageEntry.taxon;
      } else {
        taxonName = `(Unassigned at ${selectedRank})`;
        isUnassigned = true;
      }

      const existing = taxonMap.get(taxonName);
      if (existing) {
        existing.count++;
        if (existing.sequenceIds.length < 8) {
          existing.sequenceIds.push(seq.id);
        }
      } else {
        taxonMap.set(taxonName, {
          count: 1,
          sequenceIds: [seq.id],
          isUnassigned,
        });
      }
    }

    // Convert to sorted array
    const sorted = Array.from(taxonMap.entries())
      .map(([name, data]) => ({
        taxon: name,
        count: data.count,
        percentage: scopeTotal > 0 ? (data.count / scopeTotal) * 100 : 0,
        sequenceIds: data.sequenceIds,
        isUnassigned: data.isUnassigned,
      }))
      .sort((a, b) => {
        // Keep unassigned at the bottom if desired, or sort strictly by count
        if (a.isUnassigned && !b.isUnassigned) return 1;
        if (!a.isUnassigned && b.isUnassigned) return -1;
        return b.count - a.count;
      });

    return {
      scopeTotal,
      taxa: sorted,
    };
  }, [sequences, selectedRank, scopeFilter]);

  // Selected taxon details
  const selectedTaxonDetail = useMemo(() => {
    if (!selectedTaxon) return null;
    return compositionData.taxa.find((t) => t.taxon === selectedTaxon) || null;
  }, [selectedTaxon, compositionData.taxa]);

  // -------------------------------------------------------------
  // 5. Threshold Sensitivity Evaluator (Backend API Call - Non-Destructive)
  // -------------------------------------------------------------
  const handleEvaluateCandidate = useCallback(
    async (targetTau: number) => {
      if (targetTau < 0 || targetTau > 1) return;
      const reqId = ++activeReqRef.current;
      const targetRunId = result.run.run_id;

      setIsEvaluatingCandidate(true);
      setEvalError(null);
      setCandidateTau(targetTau);

      try {
        // Calling backend API statelessly (without runId) to avoid mutating persistent run
        const recalculated = await reapplyThresholdToResult(result, targetTau);
        if (reqId !== activeReqRef.current) {
          // Stale response from previous request; discard
          return;
        }
        if (recalculated.run.run_id !== targetRunId) {
          // Run switched while request was in-flight; discard
          return;
        }
        setCandidateResult(recalculated);
      } catch (err: unknown) {
        if (reqId !== activeReqRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setEvalError(`Backend threshold simulation failed: ${msg}`);
      } finally {
        if (reqId === activeReqRef.current) {
          setIsEvaluatingCandidate(false);
        }
      }
    },
    [result]
  );

  // Compute metrics for candidate result when available
  const candidateMetrics = useMemo(() => {
    if (!candidateResult) return null;
    const seqs = candidateResult.sequences || [];
    const countFull = seqs.filter((s) => s.status === 'assigned_full').length;
    const countPartial = seqs.filter((s) => s.status === 'assigned_partial').length;
    const countUnassigned = seqs.filter((s) => s.status === 'unassigned').length;
    const countInvalid = seqs.filter((s) => s.status === 'invalid_input').length;
    const sumDepth = seqs.reduce((acc, s) => acc + (s.assigned_depth || 0), 0);
    const meanDepth = seqs.length > 0 ? sumDepth / seqs.length : 0;

    return {
      countFull,
      countPartial,
      countUnassigned,
      countInvalid,
      meanDepth,
    };
  }, [candidateResult]);

  // -------------------------------------------------------------
  // Render: Safe Empty State
  // -------------------------------------------------------------
  if (totalSequences === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <IconBarChart className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">No Sequence Records Available</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            Analysis Run <code className="font-mono text-slate-700 font-semibold">{run.run_id}</code> does not contain any classification results. Upload and validate a FASTA file to explore community insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Persistent Synthetic / Fixture Warning Banner */}
      {result.is_synthetic && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 shadow-xs flex items-start gap-3.5 text-xs text-amber-950 animate-in fade-in"
        >
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
            <IconAlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] bg-amber-200/80 px-2 py-0.5 rounded font-mono">
                SYNTHETIC / FIXTURE DATASET ACTIVE
              </span>
              <span className="font-mono text-amber-800 text-[11px]">
                Contract v{result.contract_version} • Run: {run.run_id}
              </span>
            </div>
            <p className="leading-relaxed text-amber-900">
              {result.disclaimer ||
                'SYNTHETIC/FIXTURE DATA ONLY: Metrics and taxonomic distributions are derived from an illustrative demonstration fixture according to Contract v1.0. No machine learning inference has been performed. Species-level classification has not been evaluated.'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Persistent Unclassified Run Warning Banner */}
      {!result.is_synthetic && (run.model.name.toLowerCase().includes('pending') || Boolean(result.disclaimer?.includes('UNCLASSIFIED'))) && (
        <div
          role="alert"
          className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-xs flex items-start gap-3.5 text-xs text-blue-950 animate-in fade-in"
        >
          <div className="p-2 bg-blue-100 text-blue-800 rounded-xl shrink-0 mt-0.5">
            <IconInfo className="w-5 h-5 text-blue-700" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px] bg-blue-200/80 px-2 py-0.5 rounded font-mono">
                ANALYSIS RUN CREATED — CLASSIFIER INFERENCE PENDING
              </span>
              <span className="font-mono text-blue-800 text-[11px]">
                Contract v{result.contract_version} • Run: {run.run_id}
              </span>
            </div>
            <p className="leading-relaxed text-blue-900">
              Sequence quality intake completed and persisted in SQLite. Machine learning classifier inference is pending integration. Sequence records reflect intake quality status only, NOT an ecological absence of taxa.
            </p>
          </div>
        </div>
      )}

      {/* 2. Top Header & Operating Context Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">Community Taxonomic Insights</h1>
            <span className="font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
              Run: {run.run_id}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Aggregate taxonomic distributions, resolution depth, and sensitivity metrics across{' '}
            <strong className="text-slate-800 font-semibold">{totalSequences} sequences</strong>. Calibrated against{' '}
            <span className="font-medium text-slate-700">{run.reference.name} v{run.reference.version}</span> for {run.marker.gene} {run.marker.region} amplicons.
          </p>
        </div>

        {/* Operating Cutoff Indicator & Export Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <IconSliders className="w-4 h-4 text-teal-600" />
            <span>Operating Cutoff:</span>
            <span
              className="font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-bold"
              title="Operating threshold \u03c4: classifications halt at the first rank failing this cutoff"
            >
              &tau; = {tau.toFixed(2)}
            </span>
            {isReapplyingThreshold && (
              <span className="inline-flex items-center gap-1 text-[11px] text-teal-600 animate-pulse font-medium ml-1">
                <IconRefreshCw className="w-3 h-3 animate-spin" />
                <span>Updating via backend...</span>
              </span>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportInsightsCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Download structured CSV report of community summary metrics, status, depth, and composition"
            >
              <IconFileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportInsightsJson}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Download structured JSON report of community summary metrics and composition"
            >
              <IconFileCode className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export JSON</span>
            </button>
          </div>

          {exportFeedback && (
            <div className="w-full text-right animate-in fade-in">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
                <IconCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>{exportFeedback}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scientific Counting & Abundance Disclaimer Notice */}
      <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex items-start gap-3">
        <IconInfo className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-950 space-y-1">
          <p className="font-semibold">Counting Methodology & Biological Scope Notice:</p>
          <p className="text-teal-900 leading-relaxed">
            Metrics reflect <strong>unique representative sequence counts (ASV/query level)</strong>, unweighted by biological read abundance. Species-level classification has not been evaluated in this marker model; assignments represent consecutive prefix resolution down to the terminal reference rank ({terminalRank}). Unassigned deeper ranks do not imply novel organism discovery.
          </p>
        </div>
      </div>

      {/* 3. Section A: Dashboard Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sequences */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Sequences</span>
            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">N</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalSequences.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics.validCount} passed validation • {metrics.countInvalid} QC rejected
          </p>
        </div>

        {/* Card 2: Overall Assignment Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Overall Assignment Rate</span>
            <span className="font-mono text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.2 rounded border border-teal-200">
              &ge; 1 Rank
            </span>
          </div>
          <div className="text-2xl font-bold text-teal-700 font-mono">
            {metrics.overallRateAll.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics.assignedCount} of {totalSequences} assigned (Denominator: N = {totalSequences})
          </p>
          {metrics.countInvalid > 0 && (
            <p className="text-[10px] text-slate-500 pt-0.5">
              Among valid sequences: {metrics.overallRateValid.toFixed(1)}% (N = {metrics.validCount})
            </p>
          )}
        </div>

        {/* Card 3: Fully Assigned Sequences */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Fully Assigned ({terminalRank})</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {metrics.countFull.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics.fullyAssignedRate.toFixed(1)}% of total (Denominator: N = {totalSequences})
          </p>
        </div>

        {/* Card 4: Partially Assigned Sequences */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Partially Assigned</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono">
            {metrics.countPartial.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics.partiallyAssignedRate.toFixed(1)}% of total (Denominator: N = {totalSequences})
          </p>
        </div>
      </div>

      {/* 4. Two-Column Grid: Section B (Assignment Status) & Section C (Assignment Depth) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section B: Assignment Status Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <IconPieChart className="w-4 h-4 text-slate-500" />
                <span>Assignment Status Distribution</span>
              </h3>
              <p className="text-xs text-slate-500">Contract v1.0 classification resolution at &tau; = {tau.toFixed(2)}</p>
            </div>
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              Reconciled: 100%
            </span>
          </div>

          {/* Donut Chart */}
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeStatusDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {activeStatusDonutData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs space-y-0.5">
                          <p className="font-semibold text-slate-200">{data.name}</p>
                          <p className="font-mono text-teal-300 font-bold">
                            {data.count} sequences ({data.percentage.toFixed(1)}%)
                          </p>
                          <p className="text-[10px] text-slate-400">Denominator: N = {totalSequences}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Reconciliation Table for All 4 Contract v1.0 Statuses */}
          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
            {statusData.map((item) => (
              <div key={item.status} className="p-2.5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <div>
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span className="text-[10px] text-slate-400 block">{item.desc}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900">{item.count}</span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {item.percentage.toFixed(1)}% (N = {totalSequences})
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 text-center italic">
            Counts mathematically reconcile to exactly {totalSequences} sequences ({metrics.countFull} full + {metrics.countPartial} partial + {metrics.countUnassigned} unassigned + {metrics.countInvalid} invalid).
          </p>
        </div>

        {/* Section C: Taxonomic Assignment Depth */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <IconBarChart className="w-4 h-4 text-teal-600" />
                <span>Taxonomic Assignment Depth</span>
              </h3>
              <p className="text-xs text-slate-500">
                Number of sequences reaching each consecutive rank prefix at &tau; = {tau.toFixed(2)}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {dynamicRanks.length} Ranks
            </span>
          </div>

          {/* Depth Bar Chart */}
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depthData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="rankName"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs space-y-0.5">
                          <p className="font-semibold text-teal-300">
                            {data.label}: {data.rankName}
                          </p>
                          <p className="font-mono text-white">
                            Count: {data.count} ({data.pct.toFixed(1)}%)
                          </p>
                          <p className="text-[10px] text-slate-400">Denominator: N = {totalSequences}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {depthData.map((entry, index) => (
                    <Cell
                      key={`depth-cell-${index}`}
                      fill={entry.isUnassigned ? '#94a3b8' : '#0d9488'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Explanatory Depth Context */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between font-medium">
              <span>Mean Assignment Depth:</span>
              <span className="font-mono font-bold text-slate-800">
                {metrics.meanDepth.toFixed(2)} / {dynamicRanks.length} ranks
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1 border-t border-slate-200/60">
              Assignment depth reflects the consecutive prefix of taxonomic ranks whose confidence meets cutoff &tau;. Reaching deeper ranks denotes higher taxonomic resolution under current operating rules, not necessarily higher biological certainty.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Section D: Taxonomic Composition Explorer */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IconFilter className="w-4 h-4 text-teal-600" />
              <span>Taxonomic Composition Explorer</span>
            </h3>
            <p className="text-xs text-slate-500">
              Observed taxonomic groups at selected rank across current sequences
            </p>
          </div>

          {/* Interactive Rank & Scope Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Dynamic Rank Selector */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="comp-rank-select" className="text-xs font-semibold text-slate-600">
                Rank:
              </label>
              <select
                id="comp-rank-select"
                value={selectedRank}
                onChange={(e) => {
                  setSelectedRank(e.target.value);
                  setSelectedTaxon(null);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
              >
                {dynamicRanks.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="comp-scope-select" className="text-xs font-semibold text-slate-600">
                Scope:
              </label>
              <select
                id="comp-scope-select"
                value={scopeFilter}
                onChange={(e) => {
                  setScopeFilter(e.target.value as 'ALL' | 'ASSIGNED_ONLY');
                  setSelectedTaxon(null);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">All Sequences (N = {totalSequences})</option>
                <option value="ASSIGNED_ONLY">Assigned Only (N = {metrics.assignedCount})</option>
              </select>
            </div>

            {/* Reset Taxon Selection */}
            {selectedTaxon && (
              <button
                onClick={() => setSelectedTaxon(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Reset taxon focus"
              >
                <IconX className="w-3.5 h-3.5" />
                <span>Reset Taxon Selection</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Taxon Inspector Card if active */}
        {selectedTaxonDetail && (
          <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-teal-950 text-sm">{selectedTaxonDetail.taxon}</span>
                <span className="font-mono text-[10px] uppercase bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-semibold">
                  {selectedRank}
                </span>
              </div>
              <p className="text-teal-900">
                {selectedTaxonDetail.count} sequence records ({selectedTaxonDetail.percentage.toFixed(1)}% of active scope; Denominator: N = {compositionData.scopeTotal})
              </p>
              <p className="text-[11px] text-teal-800 font-mono">
                Sample Sequence IDs: {selectedTaxonDetail.sequenceIds.slice(0, 5).join(', ')}
                {selectedTaxonDetail.sequenceIds.length > 5 ? '...' : ''}
              </p>
            </div>
            <button
              onClick={() => setSelectedTaxon(null)}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold px-2 py-1 bg-white rounded border border-teal-200 hover:bg-teal-50 transition-colors"
            >
              Clear Focus
            </button>
          </div>
        )}

        {/* Composition Bar Chart of Top Taxa */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={compositionData.taxa.slice(0, 10)}
              margin={{ top: 10, right: 10, left: -20, bottom: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="taxon"
                tick={{ fontSize: 10, fill: '#64748b' }}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs space-y-0.5">
                        <p className="font-semibold text-teal-300">{data.taxon}</p>
                        <p className="font-mono text-white">
                          Count: {data.count} ({data.percentage.toFixed(1)}%)
                        </p>
                        <p className="text-[10px] text-slate-400">Denominator: N = {compositionData.scopeTotal}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                onClick={(entry) => setSelectedTaxon(entry.taxon)}
                className="cursor-pointer"
              >
                {compositionData.taxa.slice(0, 10).map((entry) => (
                  <Cell
                    key={entry.taxon}
                    fill={
                      entry.isUnassigned
                        ? '#94a3b8'
                        : selectedTaxon === entry.taxon
                        ? '#0f766e'
                        : '#0d9488'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Taxonomic Breakdown List (Grid of Top Taxa) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
          {compositionData.taxa.slice(0, 8).map((t) => {
            const isSelected = selectedTaxon === t.taxon;
            return (
              <button
                key={t.taxon}
                onClick={() => setSelectedTaxon(isSelected ? null : t.taxon)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-500/20'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-slate-400">
                  <span className="uppercase">{selectedRank}</span>
                  <span className="font-semibold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                    {t.count} ({t.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="font-semibold text-xs text-slate-900 truncate" title={t.taxon}>
                  {t.taxon}
                </div>
              </button>
            );
          })}
        </div>

        {/* Scientific Boundary Notice */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
          <IconInfo className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            Taxa are resolved down to marker rank <strong className="text-slate-700">{selectedRank}</strong>. Species-level classification has not been evaluated in this model and is neither assigned nor claimed. Missing taxa at this rank are explicitly tallied to prevent distorted proportions.
          </p>
        </div>
      </div>

      {/* 6. Section E: Threshold Sensitivity Explorer (Backend-Delegated Simulation) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IconSliders className="w-4 h-4 text-teal-600" />
              <span>Threshold (&tau;) Sensitivity Simulation</span>
            </h3>
            <p className="text-xs text-slate-500">
              Evaluate how changing the prefix confidence cutoff influences assignment resolution without altering persistent database records
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
            Backend Reapplication API
          </span>
        </div>

        {/* Sensitivity Control Bar */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <span className="text-xs font-semibold text-slate-700">Candidate Cutoff:</span>
              <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                &tau; = {candidateTau.toFixed(2)}
              </span>
              <input
                type="range"
                min="0.10"
                max="0.99"
                step="0.01"
                value={candidateTau}
                onChange={(e) => setCandidateTau(parseFloat(e.target.value))}
                disabled={isEvaluatingCandidate || isReapplyingThreshold}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 disabled:opacity-50"
              />
            </div>

            {/* Quick Benchmark Preset Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
              {[0.50, 0.60, 0.70, 0.80, 0.90].map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setCandidateTau(preset);
                    handleEvaluateCandidate(preset);
                  }}
                  disabled={isEvaluatingCandidate || isReapplyingThreshold}
                  className={`text-[11px] font-mono px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    candidateTau === preset
                      ? 'bg-teal-700 text-white font-bold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset.toFixed(2)}
                </button>
              ))}
            </div>

            {/* Trigger Button */}
            <button
              onClick={() => handleEvaluateCandidate(candidateTau)}
              disabled={isEvaluatingCandidate || isReapplyingThreshold}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isEvaluatingCandidate ? (
                <>
                  <IconRefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating via Backend...</span>
                </>
              ) : (
                <>
                  <IconArrowDown className="w-3.5 h-3.5" />
                  <span>Simulate &tau; = {candidateTau.toFixed(2)}</span>
                </>
              )}
            </button>
          </div>

          {evalError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
              <span>{evalError}</span>
              <button onClick={() => setEvalError(null)} className="font-semibold text-rose-900">
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Side-by-Side Comparison: Current Operating Cutoff vs Candidate Cutoff */}
        {candidateResult && candidateMetrics && (
          <div className="border border-teal-200 bg-teal-50/30 rounded-xl p-4 space-y-3 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                  Comparison Summary:
                </span>
                <span className="font-mono text-xs font-semibold text-slate-600">
                  Current (&tau; = {tau.toFixed(2)}) &rarr; Candidate (&tau; = {candidateTau.toFixed(2)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Non-Destructive Simulation Only
                </span>
                <button
                  onClick={() => setCandidateResult(null)}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Dismiss Simulation
                </button>
              </div>
            </div>

            {/* Delta Comparison Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Fully Assigned Delta */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium block">Fully Assigned:</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-slate-400 line-through">{metrics.countFull}</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {candidateMetrics.countFull}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-semibold ${
                      candidateMetrics.countFull >= metrics.countFull
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    ({candidateMetrics.countFull - metrics.countFull >= 0 ? '+' : ''}
                    {candidateMetrics.countFull - metrics.countFull})
                  </span>
                </div>
              </div>

              {/* Partially Assigned Delta */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium block">Partially Assigned:</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-slate-400 line-through">{metrics.countPartial}</span>
                  <span className="font-mono font-bold text-amber-700 text-sm">
                    {candidateMetrics.countPartial}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-slate-500">
                    ({candidateMetrics.countPartial - metrics.countPartial >= 0 ? '+' : ''}
                    {candidateMetrics.countPartial - metrics.countPartial})
                  </span>
                </div>
              </div>

              {/* Unassigned Delta */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium block">Unassigned:</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-slate-400 line-through">{metrics.countUnassigned}</span>
                  <span className="font-mono font-bold text-slate-700 text-sm">
                    {candidateMetrics.countUnassigned}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-slate-500">
                    ({candidateMetrics.countUnassigned - metrics.countUnassigned >= 0 ? '+' : ''}
                    {candidateMetrics.countUnassigned - metrics.countUnassigned})
                  </span>
                </div>
              </div>

              {/* Mean Depth Delta */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium block">Mean Depth:</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-slate-400 line-through">
                    {metrics.meanDepth.toFixed(1)}
                  </span>
                  <span className="font-mono font-bold text-teal-800 text-sm">
                    {candidateMetrics.meanDepth.toFixed(1)}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-slate-500">
                    ({(candidateMetrics.meanDepth - metrics.meanDepth >= 0 ? '+' : '')}
                    {(candidateMetrics.meanDepth - metrics.meanDepth).toFixed(2)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scientific Sensitivity Limitations Notice */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <IconShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">Scientific Sensitivity Guidelines:</p>
            <p className="leading-relaxed text-slate-600">
              Modifying &tau; alters consecutive prefix stopping depth, not the underlying raw neural prediction confidences. Raw confidences represent uncalibrated classifier score outputs, not verified posterior probabilities. Stricter cutoffs (e.g. 0.80) minimize false assignments on divergent holdout sequences at the cost of stopping at shallower ranks. The default operating cutoff has not been scientifically finalized.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
