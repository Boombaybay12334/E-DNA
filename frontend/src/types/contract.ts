/**
 * TypeScript types strictly matching `contract/result_schema.json` v1.0
 * for the 18S eDNA Taxonomic Classification platform.
 */

export type ContractVersion = '1.0' | string;

export type ClassificationStatus =
  | 'assigned_full'
  | 'assigned_partial'
  | 'unassigned'
  | 'invalid_input';

export interface ModelMetadata {
  name: string;
  version: string;
  code_commit: string | null;
}

export interface ReferenceMetadata {
  name: string;
  version: string;
  subset: string | null;
}

export interface MarkerMetadata {
  gene: string;
  region: string;
}

export interface ThresholdConfig {
  tau: number;
  rule: string;
}

export interface RunMetadata {
  run_id: string;
  created_utc: string;
  model: ModelMetadata;
  reference: ReferenceMetadata;
  marker: MarkerMetadata;
  ranks: string[]; // e.g. ["domain", "supergroup", "division", "subdivision", "class", "order", "family", "genus"]
  threshold: ThresholdConfig;
  confidence_semantics: string;
}

export interface LineageEntry {
  rank: string;
  taxon: string | null;
  confidence: number | null; // In [0, 1]
  assigned: boolean;
}

export interface SequenceRecord {
  id: string;
  length: number | null;
  status: ClassificationStatus;
  assigned_depth: number;
  deepest_rank: string | null;
  deepest_taxon: string | null;
  lineage: LineageEntry[];
  warnings: string[];
  extras?: {
    novelty?: { score: number; method: string };
    nearest_references?: Array<{ reference_id: string; distance: number }>;
    [key: string]: unknown;
  };
  // UI helper for FASTA display
  sequence_str?: string;
}

export interface SummaryMetadata {
  n_sequences: number;
  n_by_status: {
    assigned_full?: number;
    assigned_partial?: number;
    unassigned?: number;
    invalid_input?: number;
    [key: string]: number | undefined;
  };
  n_by_deepest_rank: Record<string, number>;
}

export interface ClassificationResult {
  contract_version: ContractVersion;
  run: RunMetadata;
  sequences: SequenceRecord[];
  summary: SummaryMetadata;
  is_synthetic?: boolean;
  disclaimer?: string;
}

export type AppView = 'overview' | 'results' | 'upload' | 'insights';
