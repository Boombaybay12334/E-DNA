import React, { useState, useMemo } from 'react';
import type { ClassificationResult, ClassificationStatus, SequenceRecord } from '../../types/contract';
import { StatusBadge } from '../common/StatusBadge';
import { exportResultsCsv, exportResultsJson } from '../../lib/export';
import {
  IconSearch,
  IconFilter,
  IconSliders,
  IconFileSpreadsheet,
  IconFileCode,
  IconChevronLeft,
  IconChevronRight,
  IconArrowUpDown,
  IconArrowUp,
  IconArrowDown,
  IconAlertTriangle,
  IconInfo,
  IconX,
  IconCheck,
} from '../common/icons';

interface ResultsTableProps {
  result: ClassificationResult;
  tau: number;
  onThresholdChange: (newTau: number) => void;
  onSelectSequence: (seq: SequenceRecord) => void;
  selectedSequenceId?: string;
}

type SortField = 'id' | 'length' | 'status' | 'deepest_rank' | 'deepest_taxon' | 'confidence';
type SortOrder = 'asc' | 'desc';

export const ResultsTable: React.FC<ResultsTableProps> = ({
  result,
  tau,
  onThresholdChange,
  onSelectSequence,
  selectedSequenceId,
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ClassificationStatus | 'ALL'>('ALL');
  const [selectedRank, setSelectedRank] = useState<string>('ALL');
  const [warningOnly, setWarningOnly] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Row selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Deepest confidence helper
  const getDeepestConfidence = (seq: SequenceRecord): number | null => {
    if (!seq.deepest_rank || seq.assigned_depth === 0) return null;
    const item = seq.lineage.find(l => l.rank === seq.deepest_rank);
    return item?.confidence ?? null;
  };

  // Check if any filter is actively narrowing results
  const isFiltered = searchTerm !== '' || selectedStatus !== 'ALL' || selectedRank !== 'ALL' || warningOnly;

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('ALL');
    setSelectedRank('ALL');
    setWarningOnly(false);
    setCurrentPage(1);
  };

  // Filter sequences
  const filteredSequences = useMemo(() => {
    return result.sequences.filter((seq) => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesId = seq.id.toLowerCase().includes(term);
        const matchesTaxon = seq.deepest_taxon?.toLowerCase().includes(term);
        const matchesAnyLineage = seq.lineage.some(l => l.taxon?.toLowerCase().includes(term));
        if (!matchesId && !matchesTaxon && !matchesAnyLineage) return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && seq.status !== selectedStatus) {
        return false;
      }

      // Deepest rank filter
      if (selectedRank !== 'ALL') {
        if (selectedRank === 'unassigned' && seq.status !== 'unassigned') return false;
        if (selectedRank !== 'unassigned' && seq.deepest_rank !== selectedRank) return false;
      }

      // Warning filter
      if (warningOnly && (!seq.warnings || seq.warnings.length === 0)) {
        return false;
      }

      return true;
    });
  }, [result.sequences, searchTerm, selectedStatus, selectedRank, warningOnly]);

  // Sort sequences
  const sortedSequences = useMemo(() => {
    return [...filteredSequences].sort((a, b) => {
      let valA: string | number | null = null;
      let valB: string | number | null = null;

      switch (sortField) {
        case 'id':
          valA = a.id;
          valB = b.id;
          break;
        case 'length':
          valA = a.length ?? 0;
          valB = b.length ?? 0;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'deepest_rank':
          valA = a.deepest_rank ?? '';
          valB = b.deepest_rank ?? '';
          break;
        case 'deepest_taxon':
          valA = a.deepest_taxon ?? '';
          valB = b.deepest_taxon ?? '';
          break;
        case 'confidence':
          valA = getDeepestConfidence(a) ?? -1;
          valB = getDeepestConfidence(b) ?? -1;
          break;
      }

      if (valA === valB) return 0;
      if (valA === null || valA === '') return 1;
      if (valB === null || valB === '') return -1;

      const comp = valA < valB ? -1 : 1;
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredSequences, sortField, sortOrder]);

  // Paginated sequences
  const totalPages = Math.max(1, Math.ceil(sortedSequences.length / pageSize));
  const paginatedSequences = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSequences.slice(start, start + pageSize);
  }, [sortedSequences, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedSequences.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSequences.map(s => s.id)));
    }
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <IconArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />;
    }
    return sortOrder === 'asc' ? (
      <IconArrowUp className="w-3.5 h-3.5 text-teal-600" />
    ) : (
      <IconArrowDown className="w-3.5 h-3.5 text-teal-600" />
    );
  };

  // Status counts for current dataset at active tau
  const countFull = result.sequences.filter(s => s.status === 'assigned_full').length;
  const countPartial = result.sequences.filter(s => s.status === 'assigned_partial').length;
  const countUnassigned = result.sequences.filter(s => s.status === 'unassigned').length;
  const countInvalid = result.sequences.filter(s => s.status === 'invalid_input').length;

  return (
    <div className="space-y-4">
      {/* Top Threshold & Interactive Benchmark Control Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Threshold slider and presets */}
          <div className="flex items-center gap-4 flex-1 min-w-[320px] max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg border border-teal-200/60">
                <IconSliders className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">Operating Cutoff:</span>
                  <span
                    className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 cursor-help"
                    title="Operating threshold \u03c4: classifications halt at the first rank failing this cutoff"
                  >
                    &tau; = {tau.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center gap-2.5">
              <span className="text-[11px] text-slate-400 font-mono">0.10</span>
              <input
                type="range"
                min="0.10"
                max="0.99"
                step="0.01"
                value={tau}
                onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                title="Slide to dynamically recalculate assignment depths across all sequences"
              />
              <span className="text-[11px] text-slate-400 font-mono">0.99</span>
            </div>

            {/* Presets clearly identified as user-configurable guidelines */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onThresholdChange(0.85)}
                className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all ${
                  Math.abs(tau - 0.85) < 0.01
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Configurable Preset: Strict (0.85) — High precision cutoff, suppresses over-classification on novel clades"
              >
                Strict (0.85)
              </button>
              <button
                onClick={() => onThresholdChange(0.60)}
                className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all ${
                  Math.abs(tau - 0.60) < 0.01
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Configurable Preset: Balanced (0.60) — Standard project default matching Contract v1.0 baseline"
              >
                Balanced (0.60)
              </button>
              <button
                onClick={() => onThresholdChange(0.50)}
                className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all ${
                  Math.abs(tau - 0.50) < 0.01
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Configurable Preset: Exploratory (0.50) — Permissive cutoff, maximizes taxonomic resolution depth"
              >
                Exploratory (0.50)
              </button>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportResultsCsv(result)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
              title="Download CSV export with sequence IDs, statuses, deepest ranks, and confidence scores"
            >
              <IconFileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => exportResultsJson(result)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
              title="Download complete Contract JSON v1.0 artifact"
            >
              <IconFileCode className="w-3.5 h-3.5 text-indigo-600" />
              <span>Contract JSON</span>
            </button>
          </div>
        </div>

        {/* Live Resolution Context Pill & Rule Explanation */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>
              At current <span className="font-mono font-semibold text-slate-800">&tau; = {tau.toFixed(2)}</span>:
            </span>
            <span className="font-semibold text-slate-900">
              {countFull} of {result.sequences.length} sequences reach Genus ({((countFull / (result.sequences.length || 1)) * 100).toFixed(0)}%)
            </span>
            <span>•</span>
            <span className="text-amber-700 font-medium">{countPartial} partially assigned</span>
            <span>•</span>
            <span className="text-slate-500">{countUnassigned} unassigned</span>
            {countInvalid > 0 && (
              <>
                <span>•</span>
                <span className="text-rose-600 font-medium">{countInvalid} QC rejected</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-400 italic">
            Threshold &tau; filters accepted classifications; it does not alter underlying model predictions.
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Sequence ID, Taxon name, or Lineage..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Deepest Rank Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <IconFilter className="w-3.5 h-3.5 text-slate-400" />
                <span>Rank:</span>
              </label>
              <select
                value={selectedRank}
                onChange={(e) => {
                  setSelectedRank(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">All Ranks ({result.sequences.length})</option>
                {result.run.ranks.map((rank) => (
                  <option key={rank} value={rank}>
                    {rank.charAt(0).toUpperCase() + rank.slice(1)}
                  </option>
                ))}
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            {/* Warnings only toggle */}
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={warningOnly}
                onChange={(e) => {
                  setWarningOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="flex items-center gap-1">
                <IconAlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>QC Flags only</span>
              </span>
            </label>

            {/* Clear Filters Button */}
            {isFiltered && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Reset all filters and search query"
              >
                <IconX className="w-3 h-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-400 mr-1">Filter Status:</span>
          {[
            { id: 'ALL' as const, label: 'All Sequences', count: result.sequences.length },
            { id: 'assigned_full' as const, label: 'Fully Assigned (Genus)', count: countFull },
            { id: 'assigned_partial' as const, label: 'Partially Assigned', count: countPartial },
            { id: 'unassigned' as const, label: 'Unassigned', count: countUnassigned },
            { id: 'invalid_input' as const, label: 'QC Rejected', count: countInvalid },
          ].map((tab) => {
            const isSelected = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white font-medium shadow-2xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedSequences.length > 0 && selectedIds.size === paginatedSequences.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    aria-label="Select all on current page"
                  />
                </th>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Sequence ID</span>
                    {renderSortIcon('id')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('length')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Length</span>
                    {renderSortIcon('length')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Classification Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('deepest_rank')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Deepest Rank</span>
                    {renderSortIcon('deepest_rank')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('deepest_taxon')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors group select-none min-w-[200px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Deepest Taxon & Lineage</span>
                    {renderSortIcon('deepest_taxon')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('confidence')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors group select-none min-w-[130px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Confidence</span>
                    {renderSortIcon('confidence')}
                  </div>
                </th>
                <th className="py-3 px-3 text-slate-500">QC Flags</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedSequences.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <IconInfo className="w-8 h-8 text-slate-400" />
                      <p className="font-semibold text-sm text-slate-800">No matching sequences found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Try adjusting your search criteria, clearing status filters, or lowering threshold &tau;.
                      </p>
                      {isFiltered && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-2 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSequences.map((seq) => {
                  const conf = getDeepestConfidence(seq);
                  const isSelected = selectedSequenceId === seq.id;
                  const isChecked = selectedIds.has(seq.id);

                  // Extract leading assigned lineage path for quick visual scanning
                  const leadingTaxa = seq.lineage
                    .filter(l => l.assigned && l.taxon)
                    .map(l => l.taxon);

                  return (
                    <tr
                      key={seq.id}
                      onClick={() => onSelectSequence(seq)}
                      className={`hover:bg-slate-50/90 cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/60 ring-1 ring-inset ring-teal-500/80' : isChecked ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onClick={(e) => handleToggleSelectOne(seq.id, e)}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                          aria-label={`Select sequence ${seq.id}`}
                        />
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                        {seq.id}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600">
                        {seq.length ? `${seq.length} bp` : '—'}
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge status={seq.status} size="sm" />
                      </td>

                      <td className="py-3 px-3">
                        {seq.deepest_rank ? (
                          <span className="font-mono text-teal-800 uppercase text-[10px] bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md font-semibold">
                            {seq.deepest_rank}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {seq.deepest_taxon ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-xs">
                              {seq.deepest_taxon}
                            </div>
                            {leadingTaxa.length > 1 && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[240px]" title={leadingTaxa.join(' \u203A ')}>
                                {leadingTaxa.slice(0, -1).join(' \u203A ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned at &tau; = {tau.toFixed(2)}</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {conf !== null ? (
                          <div className="flex items-center gap-2" title={`Model calibrated accuracy estimate at deepest rank: ${conf.toFixed(3)}`}>
                            <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  conf >= 0.8
                                    ? 'bg-teal-500'
                                    : conf >= 0.6
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.round(conf * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-slate-800 font-semibold text-xs">
                              {conf.toFixed(3)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {seq.warnings && seq.warnings.length > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                            title={seq.warnings.join(', ')}
                          >
                            <IconAlertTriangle className="w-3 h-3 text-amber-600" />
                            {seq.warnings[0]}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <IconCheck className="w-3 h-3 text-emerald-500" /> Pass
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSequence(seq);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors border border-transparent hover:border-teal-200"
                        >
                          View Ladder &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Batch Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <div>
              <span>Showing</span>{' '}
              <span className="font-semibold text-slate-900">
                {filteredSequences.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              <span>to</span>{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(currentPage * pageSize, filteredSequences.length)}
              </span>{' '}
              <span>of</span>{' '}
              <span className="font-semibold text-slate-900">{filteredSequences.length}</span>{' '}
              <span>sequences</span>
            </div>

            {selectedIds.size > 0 && (
              <span className="bg-teal-50 text-teal-800 font-semibold px-2.5 py-0.5 rounded-full border border-teal-200">
                {selectedIds.size} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
