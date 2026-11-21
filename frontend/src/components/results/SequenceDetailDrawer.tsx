import React, { useState, useEffect } from 'react';
import type { SequenceRecord, RunMetadata } from '../../types/contract';
import { StatusBadge } from '../common/StatusBadge';
import {
  IconX,
  IconCopy,
  IconCheck,
  IconDna,
  IconInfo,
  IconAlertTriangle,
  IconSparkles,
  IconShieldCheck,
} from '../common/icons';

interface SequenceDetailDrawerProps {
  sequence: SequenceRecord | null;
  run: RunMetadata;
  tau: number;
  onClose: () => void;
}

export const SequenceDetailDrawer: React.FC<SequenceDetailDrawerProps> = ({
  sequence,
  tau,
  onClose,
}) => {
  const [copiedSeq, setCopiedSeq] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (sequence) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sequence, onClose]);

  if (!sequence) return null;

  const handleCopySeq = () => {
    if (sequence.sequence_str) {
      navigator.clipboard.writeText(sequence.sequence_str);
      setCopiedSeq(true);
      setTimeout(() => setCopiedSeq(false), 2000);
    }
  };

  // Plain-language interpretation
  const getInterpretationText = () => {
    switch (sequence.status) {
      case 'assigned_full':
        return `Identified to genus: ${sequence.deepest_taxon ?? 'Unknown'}. All 8 taxonomic ranks meet or exceed confidence threshold \u03c4 = ${tau.toFixed(2)}.`;
      case 'assigned_partial':
        return `Supported down to ${sequence.deepest_rank ?? 'rank'}: ${sequence.deepest_taxon ?? 'Unknown'}. Deeper taxonomic levels are not supported by the reference database at \u03c4 = ${tau.toFixed(2)}.`;
      case 'unassigned':
        return `No reliable taxonomic assignment. The initial classification confidence at the domain root fell below threshold \u03c4 = ${tau.toFixed(2)}.`;
      case 'invalid_input':
        return `Sequence failed quality validation and was rejected prior to classification: ${sequence.warnings.join(', ')}.`;
      default:
        return '';
    }
  };

  // Base counts
  const calcBaseCounts = (seqStr?: string) => {
    if (!seqStr) return null;
    const clean = seqStr.toUpperCase();
    const a = (clean.match(/A/g) || []).length;
    const c = (clean.match(/C/g) || []).length;
    const g = (clean.match(/G/g) || []).length;
    const t = (clean.match(/T/g) || []).length;
    const gc = clean.length > 0 ? (((g + c) / clean.length) * 100).toFixed(1) : '0';
    return { a, c, g, t, gc, len: clean.length };
  };

  const baseStats = calcBaseCounts(sequence.sequence_str);

  // Format sequence into numbered blocks (60 bases per row, 10 bases per chunk)
  const formatSequenceBlocks = (seqStr?: string) => {
    if (!seqStr) return null;
    const clean = seqStr.toUpperCase();
    const rows: Array<{ index: number; chunks: string[] }> = [];

    for (let i = 0; i < clean.length; i += 60) {
      const slice = clean.slice(i, i + 60);
      const chunks: string[] = [];
      for (let j = 0; j < slice.length; j += 10) {
        chunks.push(slice.slice(j, j + 10));
      }
      rows.push({ index: i + 1, chunks });
    }
    return rows;
  };

  const formattedRows = formatSequenceBlocks(sequence.sequence_str);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs">
              <IconDna className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight">{sequence.id}</h2>
                <StatusBadge status={sequence.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Length: {sequence.length ? `${sequence.length} bp` : 'Unknown'} • Active Threshold &tau; = {tau.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label="Close sequence drawer"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Interpretation banner */}
          <div className={`p-4 rounded-xl border text-xs leading-relaxed shadow-2xs ${
            sequence.status === 'assigned_full'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : sequence.status === 'assigned_partial'
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : sequence.status === 'invalid_input'
              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
              : 'bg-slate-100/80 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-start gap-2.5">
              <IconInfo className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5 uppercase text-[10px] tracking-wider text-slate-600">
                  Scientific Interpretation
                </p>
                <p className="font-medium">{getInterpretationText()}</p>
                {sequence.status === 'assigned_partial' && (
                  <p className="text-[11px] text-amber-800 mt-1 italic">
                    Note: Stopping above genus indicates reference database gap or marker resolution limit. Do not report as novel species.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Warnings callout if present */}
          {sequence.warnings && sequence.warnings.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                <IconAlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Sequence Quality Warnings</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                {sequence.warnings.map((w, i) => (
                  <li key={i} className="font-mono">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dynamic Taxonomic Rank Ladder with Vertical Lineage Track */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Taxonomic Rank Ladder ({sequence.lineage.length} Ranks)
              </h3>
              <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                &tau; = {tau.toFixed(2)}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs divide-y divide-slate-100">
              {sequence.lineage.map((item, idx) => {
                const conf = item.confidence ?? 0;
                const isAssigned = item.assigned;
                const percent = Math.round(conf * 100);
                const isFirstUnassigned = !isAssigned && (idx === 0 || sequence.lineage[idx - 1].assigned);

                return (
                  <React.Fragment key={item.rank}>
                    {/* Visual threshold boundary divider */}
                    {isFirstUnassigned && (
                      <div className="bg-amber-50/90 border-y border-amber-200 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-amber-900 font-medium">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Assignment Halt Boundary (&tau; = {tau.toFixed(2)})</span>
                        </span>
                        <span className="text-[10px] text-amber-700">
                          Confidence &lt; {tau.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div
                      className={`p-3.5 transition-colors ${
                        isAssigned ? 'bg-white hover:bg-slate-50/50' : 'bg-slate-50/70 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 bg-slate-100 text-slate-600">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-slate-400 uppercase text-[10px] w-20">
                            {item.rank}
                          </span>
                          <span className={`font-semibold ${isAssigned ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                            {item.taxon ?? 'None'}
                          </span>
                          {!isAssigned && item.taxon && (
                            <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.2 rounded font-sans">
                              below &tau;
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs font-semibold ${isAssigned ? 'text-slate-800' : 'text-slate-400'}`}>
                            {item.confidence !== null ? conf.toFixed(3) : '—'}
                          </span>
                          {isAssigned ? (
                            <IconShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                          ) : (
                            <span className="w-4 h-4 block" />
                          )}
                        </div>
                      </div>

                      {/* Confidence Bar with tau marker */}
                      {item.confidence !== null && (
                        <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          {/* Bar fill */}
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isAssigned
                                ? conf >= 0.8
                                  ? 'bg-gradient-to-r from-teal-600 to-teal-500'
                                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                          {/* Vertical tau indicator line */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-700 z-10"
                            style={{ left: `${Math.round(tau * 100)}%` }}
                            title={`Threshold \u03c4 = ${tau.toFixed(2)}`}
                          />
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Consecutive leading rule: assignment halts at the first rank failing &tau; = {tau.toFixed(2)}. Subordinate ranks are unassigned regardless of individual confidence score.
            </p>
          </div>

          {/* Nucleotide Sequence Viewer */}
          {sequence.sequence_str && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nucleotide Sequence & Composition
                </h3>
                <button
                  onClick={handleCopySeq}
                  className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 font-semibold px-2.5 py-1 rounded bg-teal-50 border border-teal-200/80 hover:bg-teal-100 transition-colors"
                >
                  {copiedSeq ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconCopy className="w-3.5 h-3.5" />}
                  <span>{copiedSeq ? 'Copied FASTA' : 'Copy FASTA'}</span>
                </button>
              </div>

              {/* Composition Stats */}
              {baseStats && (
                <div className="grid grid-cols-5 gap-2 text-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Length</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{baseStats.len} bp</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">GC%</span>
                    <span className="font-bold text-teal-700 font-mono text-sm">{baseStats.gc}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">A count</span>
                    <span className="font-mono text-rose-700 font-semibold">{baseStats.a}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">C count</span>
                    <span className="font-mono text-sky-700 font-semibold">{baseStats.c}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">G / T</span>
                    <span className="font-mono text-amber-700 font-semibold">{baseStats.g}</span> / <span className="font-mono text-emerald-700 font-semibold">{baseStats.t}</span>
                  </div>
                </div>
              )}

              {/* Formatted Sequence Blocks */}
              {formattedRows && (
                <div className="p-3.5 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl overflow-x-auto max-h-48 leading-relaxed shadow-inner space-y-1 select-all">
                  {formattedRows.map((row) => (
                    <div key={row.index} className="flex items-center gap-4">
                      <span className="text-slate-600 select-none w-10 text-right text-[11px]">
                        {row.index}
                      </span>
                      <div className="flex items-center gap-3">
                        {row.chunks.map((chunk, cIdx) => (
                          <span key={cIdx} className="tracking-widest">
                            {chunk.split('').map((base, bIdx) => (
                              <span
                                key={bIdx}
                                className={
                                  base === 'A'
                                    ? 'text-rose-400'
                                    : base === 'C'
                                    ? 'text-sky-400'
                                    : base === 'G'
                                    ? 'text-amber-400'
                                    : base === 'T'
                                    ? 'text-emerald-400'
                                    : 'text-purple-400'
                                }
                              >
                                {base}
                              </span>
                            ))}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reserved Contract Slots: Extras (Novelty & Nearest References) */}
          {sequence.extras?.novelty && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-950 text-xs">
                <IconSparkles className="w-4 h-4 text-purple-600" />
                <span>Candidate Novelty Indicator (Experimental Model Slot)</span>
              </div>
              <div className="text-xs text-purple-900 space-y-0.5">
                <p>Score: <span className="font-mono font-bold">{sequence.extras.novelty.score}</span></p>
                <p>Method: <span className="font-mono">{sequence.extras.novelty.method}</span></p>
              </div>
            </div>
          )}

          {sequence.extras?.nearest_references && sequence.extras.nearest_references.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nearest PR2 Reference Alignments
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Reference ID</th>
                      <th className="p-2.5 text-right">Distance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sequence.extras.nearest_references.map((ref, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-mono text-slate-800 font-medium">{ref.reference_id}</td>
                        <td className="p-2.5 text-right font-mono text-slate-600">{ref.distance.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">Contract v1.0 • 18S V4</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close Panel
          </button>
        </div>
      </div>
    </>
  );
};
