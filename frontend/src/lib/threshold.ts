import type { ClassificationResult, ClassificationStatus, LineageEntry, SequenceRecord } from '../types/contract';

/**
 * Calculates assigned depth based on the strict rule in Team Handoff 4.2.4:
 * `assigned_depth` = number of consecutive leading ranks from the root (without a gap)
 * whose confidence is >= tau.
 * Ranks after the first failure are NOT assigned, even if a later rank's confidence is higher.
 */
export function calculateAssignedDepth(lineage: LineageEntry[], tau: number): number {
  let depth = 0;
  for (const entry of lineage) {
    if (entry.taxon === null || entry.confidence === null || entry.confidence < tau) {
      break;
    }
    depth++;
  }
  return depth;
}

/**
 * Recalculates assignment for an individual sequence.
 */
export function recalculateSequence(
  seq: SequenceRecord,
  ranks: string[],
  tau: number
): SequenceRecord {
  // Invalid input sequences were rejected before classification and cannot be assigned
  if (seq.status === 'invalid_input' || (seq.warnings && seq.warnings.some(w => w.startsWith('length_below') || w.includes('non_acgt')))) {
    return {
      ...seq,
      status: 'invalid_input',
      assigned_depth: 0,
      deepest_rank: null,
      deepest_taxon: null,
      lineage: seq.lineage.map(l => ({ ...l, assigned: false })),
    };
  }

  const depth = calculateAssignedDepth(seq.lineage, tau);
  const updatedLineage: LineageEntry[] = seq.lineage.map((entry, idx) => ({
    ...entry,
    assigned: idx < depth,
  }));

  const deepestRank = depth > 0 ? (ranks[depth - 1] ?? updatedLineage[depth - 1].rank) : null;
  const deepestTaxon = depth > 0 ? updatedLineage[depth - 1].taxon : null;

  let status: ClassificationStatus = 'unassigned';
  if (depth === ranks.length && depth > 0) {
    status = 'assigned_full';
  } else if (depth > 0) {
    status = 'assigned_partial';
  } else {
    status = 'unassigned';
  }

  return {
    ...seq,
    status,
    assigned_depth: depth,
    deepest_rank: deepestRank,
    deepest_taxon: deepestTaxon,
    lineage: updatedLineage,
  };
}

/**
 * Pure client-side recalculation of an entire classification result for a new threshold tau.
 * Recomputes sequence lineages, statuses, and summary counters without re-running inference.
 */
export function recalculateClassificationResult(
  result: ClassificationResult,
  tau: number
): ClassificationResult {
  const ranks = result.run.ranks;
  const updatedSequences = result.sequences.map(seq => recalculateSequence(seq, ranks, tau));

  const n_by_status: Record<string, number> = {
    assigned_full: 0,
    assigned_partial: 0,
    unassigned: 0,
    invalid_input: 0,
  };

  const n_by_deepest_rank: Record<string, number> = {
    none: 0,
  };
  ranks.forEach(r => {
    n_by_deepest_rank[r] = 0;
  });

  for (const seq of updatedSequences) {
    n_by_status[seq.status] = (n_by_status[seq.status] || 0) + 1;
    const rankKey = seq.deepest_rank || 'none';
    n_by_deepest_rank[rankKey] = (n_by_deepest_rank[rankKey] || 0) + 1;
  }

  return {
    ...result,
    run: {
      ...result.run,
      threshold: {
        ...result.run.threshold,
        tau,
      },
    },
    sequences: updatedSequences,
    summary: {
      n_sequences: updatedSequences.length,
      n_by_status,
      n_by_deepest_rank,
    },
  };
}

// Alias for convenience
export const recalculateRun = recalculateClassificationResult;

/**
 * User-friendly status meta
 */
export const STATUS_META: Record<
  ClassificationStatus,
  { label: string; badgeClass: string; description: string; color: string }
> = {
  assigned_full: {
    label: 'Fully assigned',
    badgeClass: 'status-full',
    description: 'Supported down to genus level by the reference database.',
    color: '#059669', // Emerald
  },
  assigned_partial: {
    label: 'Partially assigned',
    badgeClass: 'status-partial',
    description: 'Supported to intermediate rank. Deeper ranks are not supported by the reference database.',
    color: '#0284c7', // Sky Blue
  },
  unassigned: {
    label: 'Unassigned',
    badgeClass: 'status-unassigned',
    description: 'Confidence fell below threshold at the top taxonomic rank (no reliable assignment).',
    color: '#64748b', // Slate
  },
  invalid_input: {
    label: 'Invalid input',
    badgeClass: 'status-invalid',
    description: 'Rejected prior to model classification (e.g. length < 200 bp or non-ACGT characters).',
    color: '#e11d48', // Rose
  },
};

export function formatConfidence(conf: number | null): string {
  if (conf === null || conf === undefined) return '—';
  return (conf * 100).toFixed(1) + '%';
}
