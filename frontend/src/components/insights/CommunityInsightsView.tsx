import React, { useMemo } from 'react';
import type { ClassificationResult } from '../../types/contract';
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
  AreaChart,
  Area,
} from 'recharts';
import { recalculateClassificationResult } from '../../lib/threshold';
import {
  IconSliders,
  IconShieldAlert,
  IconInfo,
  IconPieChart,
  IconArrowDown,
} from '../common/icons';

interface CommunityInsightsViewProps {
  result: ClassificationResult;
  tau: number;
  onThresholdChange: (newTau: number) => void;
}

export const CommunityInsightsView: React.FC<CommunityInsightsViewProps> = ({
  result,
  tau,
  onThresholdChange,
}) => {
  const { summary, run, sequences } = result;
  const total = summary.n_sequences || 1;

  // 1. Status Donut Data
  const statusData = [
    { name: 'Fully Assigned', value: summary.n_by_status.assigned_full ?? 0, color: '#059669' },
    { name: 'Partially Assigned', value: summary.n_by_status.assigned_partial ?? 0, color: '#d97706' },
    { name: 'Unassigned', value: summary.n_by_status.unassigned ?? 0, color: '#64748b' },
    { name: 'Invalid Input', value: summary.n_by_status.invalid_input ?? 0, color: '#e11d48' },
  ].filter((d) => d.value > 0);

  // 2. Deepest Rank Distribution Data
  const rankOrder = [...run.ranks, 'unassigned'];
  const rankData = rankOrder.map((rank) => ({
    rank: rank.charAt(0).toUpperCase() + rank.slice(1),
    count: summary.n_by_deepest_rank[rank] ?? 0,
  }));

  // 3. Top Observed Taxa (at deepest assigned rank)
  const topTaxaData = useMemo(() => {
    const counts: Record<string, { taxon: string; rank: string; count: number }> = {};
    for (const seq of sequences) {
      if (seq.deepest_taxon) {
        if (!counts[seq.deepest_taxon]) {
          counts[seq.deepest_taxon] = {
            taxon: seq.deepest_taxon,
            rank: seq.deepest_rank ?? 'unknown',
            count: 0,
          };
        }
        counts[seq.deepest_taxon].count++;
      }
    }

    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [sequences]);

  // 4. Threshold Sensitivity Simulation Curve (0.30 to 0.95 with step 0.05)
  const sensitivityData = useMemo(() => {
    const tauSteps = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95];
    return tauSteps.map((stepTau) => {
      const simRun = recalculateClassificationResult(result, stepTau);
      return {
        tau: stepTau.toFixed(2),
        full: simRun.summary.n_by_status.assigned_full ?? 0,
        partial: simRun.summary.n_by_status.assigned_partial ?? 0,
        unassigned: simRun.summary.n_by_status.unassigned ?? 0,
      };
    });
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Community Taxonomic Insights</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Taxonomic distribution and confidence trade-offs across {total} sequences. Evaluated on 18S V4 eukaryotic amplicons.
          </p>
        </div>

        {/* Global Threshold Slider */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <IconSliders className="w-4 h-4 text-teal-600" />
            <span>&tau; Threshold:</span>
            <span className="font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {tau.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.99"
            step="0.01"
            value={tau}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            title="Adjust threshold"
          />
        </div>
      </div>

      {/* Advisory Alert */}
      <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex items-start gap-3">
        <IconInfo className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-950 space-y-1">
          <p className="font-semibold">Important Scientific Notice on Abundance & Resolution:</p>
          <p className="text-teal-900 leading-relaxed">
            These summaries represent <strong>unique representative sequence counts (ASV/OTU level)</strong>, unweighted by biological abundance (read counts). If your dataset includes an ASV count table, abundance weighting can be applied at the software aggregation layer. Classifications are capped at genus level; species-level distinctions are neither evaluated nor claimed.
          </p>
        </div>
      </div>

      {/* Two-Column Grid: Status Donut & Rank Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Donut */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Classification Status Proportions</h3>
              <p className="text-xs text-slate-500">Distribution at &tau; = {tau.toFixed(2)}</p>
            </div>
            <IconPieChart className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const pct = ((data.value / total) * 100).toFixed(1);
                      return (
                        <div className="bg-slate-900 text-white p-2 rounded shadow-lg text-xs">
                          <span className="font-semibold">{data.name}: </span>
                          <span className="font-mono text-teal-300">{data.value} ({pct}%)</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded bg-slate-50">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-mono font-medium text-slate-900">
                  {item.value} ({((item.value / total) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Deepest Rank Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Deepest Supported Taxonomic Rank</h3>
              <p className="text-xs text-slate-500">Root-to-leaf ladder stopping point</p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {run.ranks.length} Ranks
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="rank"
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
                      const pct = ((data.count / total) * 100).toFixed(1);
                      return (
                        <div className="bg-slate-900 text-white p-2 rounded shadow-lg text-xs">
                          <p className="font-semibold">{data.rank}</p>
                          <p className="font-mono text-teal-300">Count: {data.count} ({pct}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Consecutive leading ranks meeting &tau;. High-level drop-offs reflect PR2 reference gaps or non-resolvable clades.
          </div>
        </div>
      </div>

      {/* Threshold Sensitivity Simulation (Trade-off Curve) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <IconArrowDown className="w-4 h-4 text-teal-600" />
              <span>Operating Threshold (&tau;) Sensitivity Analysis</span>
            </h3>
            <p className="text-xs text-slate-500">
              Simulated impact of varying &tau; on assignment depth across current sequence library
            </p>
          </div>
          <span className="text-xs font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            Handoff Section 10 Model Trade-Off
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sensitivityData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="tau" tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Confidence Threshold (\u03c4)', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#94a3b8' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded shadow-lg text-xs space-y-1">
                        <p className="font-semibold text-teal-300">Threshold &tau; = {label}</p>
                        {payload.map((p) => (
                          <p key={p.name} className="flex justify-between gap-4 font-mono">
                            <span style={{ color: p.color }}>{p.name}:</span>
                            <span>{p.value} seqs</span>
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="full" name="Fully Assigned" stackId="1" stroke="#059669" fill="#059669" fillOpacity={0.8} />
              <Area type="monotone" dataKey="partial" name="Partially Assigned" stackId="1" stroke="#d97706" fill="#d97706" fillOpacity={0.7} />
              <Area type="monotone" dataKey="unassigned" name="Unassigned" stackId="1" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <IconShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p>
            <strong>Scientific Insight:</strong> Raising &tau; (e.g. from 0.60 to 0.85) reduces incorrect classifications on novel clades (as evidenced in benchmark holdouts), at the cost of stopping higher up in the taxonomy.
          </p>
        </div>
      </div>

      {/* Top Taxa Section */}
      {topTaxaData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Top Assigned Taxa (Deepest Supported Level)
          </h3>
          <p className="text-xs text-slate-500">
            Most frequent taxonomic calls among assigned sequences at &tau; = {tau.toFixed(2)}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {topTaxaData.map((item) => (
              <div key={item.taxon} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
                  <span>{item.rank}</span>
                  <span className="font-semibold text-teal-700">{item.count} ASVs</span>
                </div>
                <div className="font-semibold text-slate-900 truncate" title={item.taxon}>
                  {item.taxon}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
