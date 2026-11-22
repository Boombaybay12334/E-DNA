import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper mirror for SequenceDetailDrawer interpretation
function getInterpretationText(sequence, tau) {
  switch (sequence.status) {
    case 'assigned_full':
      return `Identified to ${sequence.deepest_rank ?? 'deepest rank'}: ${sequence.deepest_taxon ?? 'Unknown'}. All ${sequence.lineage.length} taxonomic ranks meet or exceed confidence threshold \u03c4 = ${tau.toFixed(2)}.`;
    case 'assigned_partial':
      return `Supported down to ${sequence.deepest_rank ?? 'rank'}: ${sequence.deepest_taxon ?? 'Unknown'}. Deeper taxonomic ranks did not meet operating threshold \u03c4 = ${tau.toFixed(2)}.`;
    case 'unassigned':
      return `No reliable taxonomic assignment. The initial classification confidence at the root rank fell below threshold \u03c4 = ${tau.toFixed(2)}.`;
    case 'invalid_input':
      return `Sequence failed quality validation and was rejected prior to classification: ${sequence.warnings && sequence.warnings.length > 0 ? sequence.warnings.join(', ') : 'Quality criteria not met'}.`;
    default:
      return '';
  }
}

// Helper mirror for SequenceDetailDrawer GC and base counts
function calcBaseCounts(seqStr) {
  if (!seqStr) return null;
  const clean = seqStr.toUpperCase();
  const a = (clean.match(/A/g) || []).length;
  const c = (clean.match(/C/g) || []).length;
  const g = (clean.match(/G/g) || []).length;
  const t = (clean.match(/T/g) || []).length;
  const gc = clean.length > 0 ? (((g + c) / clean.length) * 100).toFixed(1) : '0';
  return { a, c, g, t, gc, len: clean.length };
}

// Simulated API client reapplyThresholdToResult test
async function mockReapplyThreshold(mockFetchImpl, currentResult, newTau, runId) {
  const assignUrl = `http://127.0.0.1:8000/api/assignment/reapply-threshold`;
  const res = await mockFetchImpl(assignUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threshold_tau: newTau, payload: currentResult }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    const detail = errJson?.detail || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(`Threshold reapplication failed: ${detail}`);
  }

  const updated = await res.json();
  return {
    ...updated,
    is_synthetic: currentResult.is_synthetic,
    disclaimer: currentResult.disclaimer,
  };
}

describe('Phase 5 Integration & Audit: API Handling & SequenceDetailDrawer', () => {

  describe('SequenceDetailDrawer Semantics & Scientifically Neutral Language', () => {
    it('generates accurate, neutral interpretation text for assigned_full', () => {
      const seq = {
        status: 'assigned_full',
        deepest_rank: 'genus',
        deepest_taxon: 'Thalassiosira',
        lineage: new Array(8).fill({}),
        warnings: []
      };
      const text = getInterpretationText(seq, 0.60);
      assert.ok(text.includes('Identified to genus: Thalassiosira'));
      assert.ok(text.includes('All 8 taxonomic ranks meet or exceed confidence threshold'));
    });

    it('generates neutral interpretation text for assigned_partial without asserting unverified causes', () => {
      const seq = {
        status: 'assigned_partial',
        deepest_rank: 'division',
        deepest_taxon: 'Dinoflagellata',
        lineage: new Array(8).fill({}),
        warnings: []
      };
      const text = getInterpretationText(seq, 0.65);
      assert.ok(text.includes('Supported down to division: Dinoflagellata'));
      assert.ok(text.includes('Deeper taxonomic ranks did not meet operating threshold \u03c4 = 0.65'));
      // Verifies neutrality: does not guess 'reference database gap' as the cause
      assert.ok(!text.includes('reference database gap'));
    });

    it('generates accurate interpretation text for unassigned sequence', () => {
      const seq = {
        status: 'unassigned',
        deepest_rank: null,
        deepest_taxon: null,
        lineage: new Array(8).fill({}),
        warnings: []
      };
      const text = getInterpretationText(seq, 0.60);
      assert.ok(text.includes('No reliable taxonomic assignment'));
      assert.ok(text.includes('root rank fell below threshold \u03c4 = 0.60'));
    });

    it('generates accurate interpretation text for invalid_input sequence with quality warnings', () => {
      const seq = {
        status: 'invalid_input',
        deepest_rank: null,
        deepest_taxon: null,
        lineage: [],
        warnings: ['SEQUENCE_TOO_SHORT', 'NON_ACGT_CHARACTERS']
      };
      const text = getInterpretationText(seq, 0.60);
      assert.ok(text.includes('Sequence failed quality validation'));
      assert.ok(text.includes('SEQUENCE_TOO_SHORT, NON_ACGT_CHARACTERS'));
    });

    it('correctly calculates base statistics and GC content for sequence viewing', () => {
      const seq = 'ATGCATGCAT'; // A: 3, T: 3, G: 2, C: 2 -> GC = 4/10 = 40.0%
      const stats = calcBaseCounts(seq);
      assert.equal(stats.a, 3);
      assert.equal(stats.t, 3);
      assert.equal(stats.g, 2);
      assert.equal(stats.c, 2);
      assert.equal(stats.gc, '40.0');
      assert.equal(stats.len, 10);
    });
  });

  describe('Threshold Reapplication & API Error Handling Integration', () => {
    it('successfully reapplies threshold via API and updates dataset payload', async () => {
      const samplePayload = {
        contract_version: "1.0",
        run: { run_id: "test-run", threshold_tau: 0.60 },
        sequences: [],
        is_synthetic: true,
        disclaimer: "SYNTHETIC FIXTURE"
      };

      const mockFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          contract_version: "1.0",
          run: { run_id: "test-run", threshold_tau: 0.75 },
          sequences: []
        })
      });

      const result = await mockReapplyThreshold(mockFetch, samplePayload, 0.75);
      assert.equal(result.run.threshold_tau, 0.75);
      assert.equal(result.is_synthetic, true);
      assert.equal(result.disclaimer, "SYNTHETIC FIXTURE");
    });

    it('catches and formats HTTP 422 validation errors from backend', async () => {
      const samplePayload = {
        contract_version: "1.0",
        run: { run_id: "test-run", threshold_tau: 0.60 },
        sequences: []
      };

      const mockFetch422 = async () => ({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: async () => ({ detail: "threshold_tau must be between 0.0 and 1.0" })
      });

      await assert.rejects(
        async () => {
          await mockReapplyThreshold(mockFetch422, samplePayload, 1.5);
        },
        (err) => {
          assert.ok(err.message.includes('Threshold reapplication failed: threshold_tau must be between 0.0 and 1.0'));
          return true;
        }
      );
    });

    it('catches network failures when backend is unreachable', async () => {
      const samplePayload = {
        contract_version: "1.0",
        run: { run_id: "test-run", threshold_tau: 0.60 },
        sequences: []
      };

      const mockFetchNetworkFail = async () => {
        throw new Error('fetch failed (ECONNREFUSED)');
      };

      await assert.rejects(
        async () => {
          await mockReapplyThreshold(mockFetchNetworkFail, samplePayload, 0.70);
        },
        (err) => {
          assert.ok(err.message.includes('ECONNREFUSED'));
          return true;
        }
      );
    });
  });
});
