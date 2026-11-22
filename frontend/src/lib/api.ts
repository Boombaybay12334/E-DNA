/**
 * Backend API Client for eDNA Explorer.
 * Connects to the FastAPI backend service for sequence validation and health checks.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:8000';

export interface SequenceQCItem {
  sequence_id: string;
  header?: string | null;
  length: number;
  valid: boolean;
  qc_flags: string[];
}

export interface SequenceErrorItem {
  sequence_id?: string | null;
  message: string;
}

export interface SequenceWarningItem {
  sequence_id: string;
  qc_flags: string[];
  message: string;
}

export interface ValidateFastaResponse {
  filename: string;
  file_size_bytes: number;
  validation_status: 'valid' | 'invalid';
  total_sequences: number;
  valid_sequences: number;
  invalid_sequences: number;
  sequences: SequenceQCItem[];
  errors: SequenceErrorItem[];
  warnings: SequenceWarningItem[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

/**
 * Checks connectivity and operational status of the FastAPI backend.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/api/health`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Health check returned HTTP ${res.status}: ${res.statusText}`);
    }

    return (await res.json()) as HealthResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot connect to eDNA backend at ${API_BASE_URL}. Please ensure FastAPI is running. (${msg})`
    );
  }
}

/**
 * Sends a FASTA file (.fasta, .fa, .fna) to POST /api/validate-fasta via multipart/form-data.
 * Note: Does NOT manually set Content-Type so the browser correctly generates the boundary header.
 */
export async function validateFastaFile(file: File): Promise<ValidateFastaResponse> {
  const url = `${API_BASE_URL}/api/validate-fasta`;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      // Browser automatically injects multipart/form-data boundary
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data && typeof data.detail === 'string'
          ? data.detail
          : data && data.message
          ? data.message
          : `Validation request failed with HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }

    return data as ValidateFastaResponse;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(
      `Network error connecting to eDNA backend at ${API_BASE_URL}. Ensure the FastAPI server is running.`
    );
  }
}

import type { ClassificationResult, SequenceRecord } from '../types/contract';

export interface RunSummaryItem {
  run_id: string;
  filename: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
  total_sequences: number;
  valid_sequences: number;
  invalid_sequences: number;
  qc_warning_count: number;
  validation_status: string;
  run_status: string;
  classification_status: string;
  threshold_tau?: number | null;
  marker?: { gene: string; region: string };
  reference_database?: string;
  target_group?: string;
}

export interface RunDetailResponse extends RunSummaryItem {
  errors: Array<{ sequence_id?: string | null; message: string }>;
  warnings: Array<{ sequence_id: string; qc_flags: string[]; message: string }>;
  sequence_sample: Array<{
    sequence_id: string;
    header?: string | null;
    length: number;
    valid: boolean;
    qc_flags: string[];
    order_index: number;
  }>;
}

export interface PaginatedSequencesResponse {
  run_id: string;
  total: number;
  limit: number;
  offset: number;
  sequences: Array<{
    sequence_id: string;
    header?: string | null;
    length: number;
    valid: boolean;
    qc_flags: string[];
    order_index: number;
  }>;
  items?: Array<{
    sequence_id: string;
    header?: string | null;
    length: number;
    valid: boolean;
    qc_flags: string[];
    order_index: number;
  }>;
}

export interface CreateRunOptions {
  threshold_tau?: number;
  reference_database?: string;
  marker_gene?: string;
  marker_region?: string;
  target_group?: string;
}

export interface RunListResponse {
  total: number;
  limit: number;
  offset: number;
  items: RunSummaryItem[];
}

export interface SyntheticFixtureApiResponse {
  is_synthetic: boolean;
  disclaimer: string;
  data: ClassificationResult;
}

/**
 * Fetches the synthetic fixture result payload from GET /api/results/fixture.
 * Explicitly marks result with is_synthetic: true and the official scientific disclaimer.
 */
export async function fetchSyntheticFixture(): Promise<ClassificationResult> {
  const url = `${API_BASE_URL}/api/results/fixture`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to load synthetic fixture (HTTP ${res.status}: ${res.statusText})`);
    }

    const json = (await res.json()) as SyntheticFixtureApiResponse;
    return {
      ...json.data,
      is_synthetic: json.is_synthetic ?? true,
      disclaimer:
        json.disclaimer ||
        'SYNTHETIC/FIXTURE DATA ONLY: Illustrative example for development and testing; not actual scientific predictions.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error fetching synthetic fixture: ${msg}`);
  }
}

/**
 * Fetches the persistent classification result attached to a saved run from GET /api/runs/{runId}/results.
 */
export async function fetchRunClassificationResult(runId: string): Promise<ClassificationResult> {
  const url = `${API_BASE_URL}/api/runs/${encodeURIComponent(runId)}/results`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.detail || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(detail);
    }

    const data = (await res.json()) as ClassificationResult;
    return {
      ...data,
      is_synthetic: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error fetching classification result for run '${runId}': ${msg}`);
  }
}

/**
 * Fetches the list of saved analysis runs from GET /api/runs.
 */
export async function fetchRunsList(limit = 20, offset = 0): Promise<RunListResponse> {
  const url = `${API_BASE_URL}/api/runs?limit=${limit}&offset=${offset}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to list runs (HTTP ${res.status}: ${res.statusText})`);
    }

    return (await res.json()) as RunListResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error listing runs: ${msg}`);
  }
}

/**
 * Reapplies threshold tau by delegating to the backend API:
 * - If runId is present and attached in backend, calls POST /api/runs/{runId}/reapply-threshold and refetches.
 * - Otherwise calls POST /api/assignment/reapply-threshold with payload.
 *
 * Strictly avoids running client-side classification algorithms.
 */
export async function reapplyThresholdToResult(
  currentResult: ClassificationResult,
  newTau: number,
  runId?: string
): Promise<ClassificationResult> {
  // If runId corresponds to a saved backend run, try the run-specific reapply endpoint
  if (runId && runId !== 'example-run-0001' && !currentResult.is_synthetic) {
    try {
      const runUrl = `${API_BASE_URL}/api/runs/${encodeURIComponent(runId)}/reapply-threshold`;
      const res = await fetch(runUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ threshold_tau: newTau }),
      });

      if (res.ok) {
        return await fetchRunClassificationResult(runId);
      }
    } catch {
      // Fallback to stateless assignment reapply endpoint
    }
  }

  // Use stateless assignment reapply endpoint: POST /api/assignment/reapply-threshold
  const assignUrl = `${API_BASE_URL}/api/assignment/reapply-threshold`;
  try {
    const res = await fetch(assignUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        threshold_tau: newTau,
        payload: currentResult,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.detail || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(`Threshold reapplication failed: ${detail}`);
    }

    const updated = (await res.json()) as ClassificationResult;
    return {
      ...updated,
      is_synthetic: currentResult.is_synthetic,
      disclaimer: currentResult.disclaimer,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error reapplying threshold tau=${newTau}: ${msg}`);
  }
}

/**
 * Creates an Analysis Run entity in the SQLite database by uploading a FASTA file.
 * Returns the saved RunDetailResponse containing run metadata, QC warnings, errors, and sequence sample.
 */
export async function createAnalysisRun(
  file: File,
  options?: CreateRunOptions
): Promise<RunDetailResponse> {
  const url = `${API_BASE_URL}/api/runs`;
  const formData = new FormData();
  formData.append('file', file);
  if (options?.threshold_tau !== undefined) {
    formData.append('threshold_tau', String(options.threshold_tau));
  }
  if (options?.reference_database) {
    formData.append('reference_database', options.reference_database);
  }
  if (options?.marker_gene) {
    formData.append('marker_gene', options.marker_gene);
  }
  if (options?.marker_region) {
    formData.append('marker_region', options.marker_region);
  }
  if (options?.target_group) {
    formData.append('target_group', options.target_group);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data && typeof data.detail === 'string'
          ? data.detail
          : `Run creation failed with HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }

    return data as RunDetailResponse;
  } catch (err: unknown) {
    if (err instanceof Error) throw err;
    throw new Error(`Network error connecting to eDNA backend at ${API_BASE_URL}.`);
  }
}

/**
 * Retrieves single Analysis Run details by run_id from GET /api/runs/{run_id}.
 */
export async function fetchRunDetail(runId: string): Promise<RunDetailResponse> {
  const url = `${API_BASE_URL}/api/runs/${encodeURIComponent(runId)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Failed to fetch run '${runId}': HTTP ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as RunDetailResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error fetching run '${runId}': ${msg}`);
  }
}

/**
 * Retrieves paginated sequence records associated with a run from GET /api/runs/{run_id}/sequences.
 */
export async function fetchRunSequences(
  runId: string,
  limit = 200,
  offset = 0
): Promise<PaginatedSequencesResponse> {
  const url = `${API_BASE_URL}/api/runs/${encodeURIComponent(runId)}/sequences?limit=${limit}&offset=${offset}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Failed to fetch sequences for run '${runId}': HTTP ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as PaginatedSequencesResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error fetching sequences for run '${runId}': ${msg}`);
  }
}

/**
 * Deletes an Analysis Run and cascades child records via DELETE /api/runs/{run_id}.
 */
export async function deleteAnalysisRun(runId: string): Promise<void> {
  const url = `${API_BASE_URL}/api/runs/${encodeURIComponent(runId)}`;
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const detail = data?.detail || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(detail);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error deleting run '${runId}': ${msg}`);
  }
}

/**
 * Attaches a Contract v1.0 classification result payload to an existing Analysis Run
 * via POST /api/runs/{run_id}/results.
 */
export async function attachResultToRun(
  runId: string,
  payload: ClassificationResult
): Promise<unknown> {
  const url = `${API_BASE_URL}/api/runs/${encodeURIComponent(runId)}/results`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const detail =
        data?.detail?.message ||
        (typeof data?.detail === 'string' ? data.detail : `HTTP ${res.status}: ${res.statusText}`);
      throw new Error(detail);
    }
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error attaching result to run '${runId}': ${msg}`);
  }
}

/**
 * Helper to construct a valid Contract v1.0 ClassificationResult from an unclassified run
 * and its validated sequence records stored in SQLite.
 *
 * All sequence records are preserved with QC warnings and lengths.
 * Valid sequences have status 'unassigned' with depth 0 and null lineages.
 * Invalid sequences have status 'invalid_input'.
 * Explicitly disclaims that ML classification inference is pending.
 */
export function createUnclassifiedResultFromRun(
  run: RunDetailResponse,
  seqItems: Array<{ sequence_id: string; length: number; valid: boolean; qc_flags: string[] }>
): ClassificationResult {
  const ranks = ['domain', 'supergroup', 'division', 'subdivision', 'class', 'order', 'family', 'genus'];
  const sequences: SequenceRecord[] = seqItems.map((s) => ({
    id: s.sequence_id,
    length: s.length,
    status: s.valid ? 'unassigned' : 'invalid_input',
    assigned_depth: 0,
    deepest_rank: null,
    deepest_taxon: null,
    lineage: ranks.map((r) => ({
      rank: r,
      taxon: null,
      confidence: null,
      assigned: false,
    })),
    warnings: s.qc_flags || [],
  }));

  const nInvalid = sequences.filter((s) => s.status === 'invalid_input').length;
  const nUnassigned = sequences.length - nInvalid;

  return {
    contract_version: '1.0',
    run: {
      run_id: run.run_id,
      created_utc: typeof run.created_at === 'string' ? run.created_at : new Date().toISOString(),
      model: {
        name: 'Classifier Pending Integration',
        version: 'uncalibrated',
        code_commit: null,
      },
      reference: {
        name: run.reference_database || 'PR2 v5.0.0',
        version: '5.0.0',
        subset: null,
      },
      marker: {
        gene: run.marker?.gene || '18S rRNA',
        region: run.marker?.region || 'V4',
      },
      ranks,
      threshold: {
        tau: run.threshold_tau ?? 0.60,
        rule: 'leading_consecutive_prefix',
      },
      confidence_semantics: 'uncalibrated_score',
    },
    sequences,
    summary: {
      n_sequences: sequences.length,
      n_by_status: {
        assigned_full: 0,
        assigned_partial: 0,
        unassigned: nUnassigned,
        invalid_input: nInvalid,
      },
      n_by_deepest_rank: {
        unassigned: nUnassigned,
        none: nInvalid,
      },
    },
    is_synthetic: false,
    disclaimer:
      'ANALYSIS RUN CREATED (UNCLASSIFIED): Sequence chemistry and syntax validated and persisted in SQLite. ML classifier inference is pending integration. Sequence records reflect quality-control intake state without taxonomic calls.',
  };
}
