import React from 'react';
import type { ClassificationResult } from '../../types/contract';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  IconDna,
  IconCheckCircle,
  IconAlertCircle,
  IconHelpCircle,
  IconXCircle,
  IconUploadCloud,
  IconArrowRight,
  IconShieldAlert,
  IconChevronRight,
} from '../common/icons';

interface OverviewDashboardProps {
  result: ClassificationResult;
  allRuns: ClassificationResult[];
  onSelectRun: (runId: string) => void;
  onNavigateToUpload: () => void;
  onNavigateToResults: () => void;
  tau: number;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  result,
  allRuns,
  onSelectRun,
  onNavigateToUpload,
  onNavigateToResults,
  tau,
}) => {
  const { summary, run } = result;
  const total = summary.n_sequences || 1;

  const nFull = summary.n_by_status.assigned_full ?? 0;
  const nPartial = summary.n_by_status.assigned_partial ?? 0;
  const nUnassigned = summary.n_by_status.unassigned ?? 0;
  const nInvalid = summary.n_by_status.invalid_input ?? 0;

  const pctFull = ((nFull / total) * 100).toFixed(1);
  const pctPartial = ((nPartial / total) * 100).toFixed(1);
  const pctUnassigned = ((nUnassigned / total) * 100).toFixed(1);
  const pctInvalid = ((nInvalid / total) * 100).toFixed(1);

  // Deepest Rank Distribution Chart Data
  const rankOrder = [...run.ranks, 'unassigned'];
  const rankChartData = rankOrder.map((rank) => ({
    rank: rank.charAt(0).toUpperCase() + rank.slice(1),
    count: summary.n_by_deepest_rank[rank] ?? 0,
  }));

  // Status Donut Chart Data
  const statusPieData = [
    { name: 'Fully Assigned (Genus)', value: nFull, color: '#059669' }, // emerald-600
    { name: 'Partially Assigned', value: nPartial, color: '#d97706' }, // amber-600
    { name: 'Unassigned at Root', value: nUnassigned, color: '#64748b' }, // slate-500
    { name: 'QC Rejected', value: nInvalid, color: '#e11d48' }, // rose-600
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Hero / Context Banner */}
      <div className="bg-gradient-to-r from-white via-white to-teal-50/30 rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md shadow-2xs font-mono">
              Active Analysis Run
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {run.run_id}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500">
              Evaluated {new Date(run.created_utc).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            18S V4 Amplicon Biodiversity Intelligence
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Neural calibration on <strong>PR2 v{run.reference.version}</strong> (99% clustered). Classifications resolved from domain down to genus rank at confidence cutoff <span className="font-mono font-semibold text-slate-700">&tau; = {tau.toFixed(2)}</span>.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">Amplicon: 18S V4</span>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">Model: {run.model.name}</span>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">Reference: PR2</span>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">Resolution: Genus (Capped)</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateToUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-all shadow-xs hover:shadow-sm"
          >
            <IconUploadCloud className="w-4 h-4" />
            <span>Upload New FASTA</span>
          </button>
          <button
            onClick={onNavigateToResults}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <span>Explore Lineages</span>
            <IconArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sequences */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Sequences</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <IconDna className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono">{summary.n_sequences}</span>
            <span className="text-xs text-slate-400 font-medium">ASVs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Evaluated 18S V4 library</p>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-slate-700 w-full" />
          </div>
        </div>

        {/* Fully Assigned (Genus) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Genus Resolved</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <IconCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-700 font-mono">{nFull}</span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded font-mono">
              {pctFull}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Fully assigned to genus rank</p>
          <div className="w-full bg-emerald-50 h-1 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pctFull}%` }} />
          </div>
        </div>

        {/* Partially Assigned */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Intermediate Rank</span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <IconAlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-700 font-mono">{nPartial}</span>
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded font-mono">
              {pctPartial}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Halted at family, order, or class</p>
          <div className="w-full bg-amber-50 h-1 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pctPartial}%` }} />
          </div>
        </div>

        {/* Unassigned */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Unassigned at Root</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <IconHelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-700 font-mono">{nUnassigned}</span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
              {pctUnassigned}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Domain confidence &lt; &tau;</p>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-slate-400 rounded-full" style={{ width: `${pctUnassigned}%` }} />
          </div>
        </div>

        {/* QC Rejected */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>QC Rejected</span>
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <IconXCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-700 font-mono">{nInvalid}</span>
            <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded font-mono">
              {pctInvalid}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">&lt;200 bp or non-ACGT</p>
          <div className="w-full bg-rose-50 h-1 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pctInvalid}%` }} />
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deepest Rank Distribution Bar Chart (2 cols) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Taxonomic Resolution Depth Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Number of sequences reaching each rank before falling below threshold &tau; = {tau.toFixed(2)}
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg shadow-2xs">
              {run.ranks.length} Ranks Monitored
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="rank"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const pct = ((data.count / total) * 100).toFixed(1);
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-teal-300">{data.rank} Rank</p>
                          <p className="font-mono">
                            Sequences: <span className="font-bold">{data.count}</span> ({pct}% of library)
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Deepest supported level at &tau; = {tau.toFixed(2)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#0d9488"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Classification Status Proportion Donut (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Classification Composition
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown across {total} evaluated sequences
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const pct = ((data.value / total) * 100).toFixed(1);
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs">
                          <span className="font-bold">{data.name}: </span>
                          <span className="font-mono text-teal-300">
                            {data.value} ({pct}%)
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 truncate max-w-[150px]">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-900">
                  {item.value} ({((item.value / total) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Available Runs Catalog & Scientific Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analysis Runs List (2 cols) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Available Analysis Runs</h3>
              <p className="text-xs text-slate-500">Benchmark fixtures and user-uploaded datasets</p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              {allRuns.length} Runs Available
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs shadow-2xs">
            {allRuns.map((r) => {
              const isCurrent = r.run.run_id === run.run_id;

              return (
                <div
                  key={r.run.run_id}
                  className={`p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors ${
                    isCurrent ? 'bg-teal-50/40 border-l-4 border-l-teal-600' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        {r.run.run_id}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                          Active Dataset
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                      <span>Model: <span className="font-mono text-slate-700">{r.run.model.name}</span></span>
                      <span>•</span>
                      <span>Sequences: <span className="font-mono font-semibold text-slate-800">{r.sequences.length}</span></span>
                      <span>•</span>
                      <span>Ref: {r.run.reference.name} v{r.run.reference.version}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectRun(r.run.run_id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{isCurrent ? 'Current' : 'Select'}</span>
                    <IconChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scientific Integrity Advisory (1 col) */}
        <div className="bg-amber-50/70 rounded-2xl border border-amber-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <IconShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Scientific Integrity Advisory</span>
          </div>

          <div className="text-xs text-amber-950/85 space-y-2.5 leading-relaxed">
            <p>
              <strong>18S V4 Amplicon Scope:</strong> Evaluated strictly for eukaryotic environmental sequences. Species-level identification is not supported. All taxonomic assignments are capped at the genus level.
            </p>
            <p>
              <strong>Partial Classifications:</strong> Sequences stopping above genus reflect gaps in the reference database or limits in marker resolution. They must never be classified as newly discovered organisms.
            </p>
            <p>
              <strong>Calibrated Confidence:</strong> Probabilities reflect trained accuracy over PR2 holdout clades and are not cross-comparable to bootstrap values from other classifiers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
