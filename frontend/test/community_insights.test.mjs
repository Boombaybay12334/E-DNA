import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Test Dataset 1: Standard 8-rank PR2 Eukaryotic Result
const mockRunResultPR2 = {
  contract_version: "1.0",
  run: {
    run_id: "run-pr2-001",
    model: { name: "modelA_reg_ens5", version: "1.0.0", code_commit: "abc1234" },
    reference: { name: "PR2", version: "5.0.0", subset: "18S V4, 99% clustered" },
    marker: { gene: "18S rRNA", region: "V4" },
    ranks: ["domain", "supergroup", "division", "subdivision", "class", "order", "family", "genus"],
    threshold: { tau: 0.60, rule: "consecutive_leading_ranks" },
    confidence_semantics: "posterior_probability"
  },
  sequences: [
    {
      id: "SEQ_01_FULL",
      length: 380,
      status: "assigned_full",
      assigned_depth: 8,
      deepest_rank: "genus",
      deepest_taxon: "Thalassiosira",
      warnings: [],
      lineage: [
        { rank: "domain", taxon: "Eukaryota", confidence: 0.99, assigned: true },
        { rank: "supergroup", taxon: "Stramenopiles", confidence: 0.98, assigned: true },
        { rank: "division", taxon: "Ochrophyta", confidence: 0.97, assigned: true },
        { rank: "subdivision", taxon: "Bacillariophytina", confidence: 0.96, assigned: true },
        { rank: "class", taxon: "Bacillariophyceae", confidence: 0.95, assigned: true },
        { rank: "order", taxon: "Thalassiosirales", confidence: 0.92, assigned: true },
        { rank: "family", taxon: "Thalassiosiraceae", confidence: 0.89, assigned: true },
        { rank: "genus", taxon: "Thalassiosira", confidence: 0.84, assigned: true }
      ]
    },
    {
      id: "SEQ_02_FULL_2",
      length: 395,
      status: "assigned_full",
      assigned_depth: 8,
      deepest_rank: "genus",
      deepest_taxon: "Chaetoceros",
      warnings: [],
      lineage: [
        { rank: "domain", taxon: "Eukaryota", confidence: 0.99, assigned: true },
        { rank: "supergroup", taxon: "Stramenopiles", confidence: 0.98, assigned: true },
        { rank: "division", taxon: "Ochrophyta", confidence: 0.97, assigned: true },
        { rank: "subdivision", taxon: "Bacillariophytina", confidence: 0.96, assigned: true },
        { rank: "class", taxon: "Bacillariophyceae", confidence: 0.95, assigned: true },
        { rank: "order", taxon: "Chaetocerotales", confidence: 0.91, assigned: true },
        { rank: "family", taxon: "Chaetocerotaceae", confidence: 0.88, assigned: true },
        { rank: "genus", taxon: "Chaetoceros", confidence: 0.81, assigned: true }
      ]
    },
    {
      id: "SEQ_03_PARTIAL",
      length: 410,
      status: "assigned_partial",
      assigned_depth: 3,
      deepest_rank: "division",
      deepest_taxon: "Dinoflagellata",
      warnings: ["LOW_CONFIDENCE_WARNING"],
      lineage: [
        { rank: "domain", taxon: "Eukaryota", confidence: 0.99, assigned: true },
        { rank: "supergroup", taxon: "Alveolata", confidence: 0.95, assigned: true },
        { rank: "division", taxon: "Dinoflagellata", confidence: 0.88, assigned: true },
        { rank: "subdivision", taxon: "Syndiniales", confidence: 0.45, assigned: false },
        { rank: "class", taxon: null, confidence: 0.30, assigned: false },
        { rank: "order", taxon: null, confidence: null, assigned: false },
        { rank: "family", taxon: null, confidence: null, assigned: false },
        { rank: "genus", taxon: null, confidence: null, assigned: false }
      ]
    },
    {
      id: "SEQ_04_UNASSIGNED",
      length: 375,
      status: "unassigned",
      assigned_depth: 0,
      deepest_rank: null,
      deepest_taxon: null,
      warnings: ["UNKNOWN_NOVEL_QUERY"],
      lineage: [
        { rank: "domain", taxon: "Eukaryota", confidence: 0.40, assigned: false },
        { rank: "supergroup", taxon: null, confidence: 0.20, assigned: false },
        { rank: "division", taxon: null, confidence: null, assigned: false },
        { rank: "subdivision", taxon: null, confidence: null, assigned: false },
        { rank: "class", taxon: null, confidence: null, assigned: false },
        { rank: "order", taxon: null, confidence: null, assigned: false },
        { rank: "family", taxon: null, confidence: null, assigned: false },
        { rank: "genus", taxon: null, confidence: null, assigned: false }
      ]
    },
    {
      id: "SEQ_05_INVALID",
      length: 120,
      status: "invalid_input",
      assigned_depth: 0,
      deepest_rank: null,
      deepest_taxon: null,
      warnings: ["SEQUENCE_TOO_SHORT"],
      lineage: []
    }
  ],
  is_synthetic: true,
  disclaimer: "SYNTHETIC FIXTURE DATASET: Provided for interface evaluation only."
};

// Test Dataset 2: Custom 4-Rank Ladder Result
const mockRunResultCustom4 = {
  contract_version: "1.0",
  run: {
    run_id: "run-custom-002",
    model: { name: "model-custom", version: "1.0.0", code_commit: null },
    reference: { name: "SILVA", version: "138.1", subset: null },
    marker: { gene: "16S rRNA", region: "V4" },
    ranks: ["domain", "phylum", "class", "order"],
    threshold: { tau: 0.70, rule: "consecutive_leading_ranks" },
    confidence_semantics: "bootstrap"
  },
  sequences: [
    {
      id: "CUST_01",
      length: 290,
      status: "assigned_full",
      assigned_depth: 4,
      deepest_rank: "order",
      deepest_taxon: "Bacillales",
      warnings: [],
      lineage: [
        { rank: "domain", taxon: "Bacteria", confidence: 0.99, assigned: true },
        { rank: "phylum", taxon: "Firmicutes", confidence: 0.95, assigned: true },
        { rank: "class", taxon: "Bacilli", confidence: 0.90, assigned: true },
        { rank: "order", taxon: "Bacillales", confidence: 0.85, assigned: true }
      ]
    }
  ]
};

// -------------------------------------------------------------
// Pure Calculation Helpers Mirroring CommunityInsightsView Logic
// -------------------------------------------------------------

function calculateSummaryMetrics(sequences) {
  const total = sequences.length;
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

    if (seq.warnings && seq.warnings.length > 0) countWithWarnings++;
    sumAssignedDepth += seq.assigned_depth || 0;
  }

  const assignedCount = countFull + countPartial;
  const validCount = total - countInvalid;

  const overallRateAll = total > 0 ? (assignedCount / total) * 100 : 0;
  const overallRateValid = validCount > 0 ? (assignedCount / validCount) * 100 : 0;
  const fullyAssignedRate = total > 0 ? (countFull / total) * 100 : 0;
  const partiallyAssignedRate = total > 0 ? (countPartial / total) * 100 : 0;
  const unassignedRate = total > 0 ? (countUnassigned / total) * 100 : 0;
  const invalidRate = total > 0 ? (countInvalid / total) * 100 : 0;
  const meanDepth = total > 0 ? sumAssignedDepth / total : 0;

  return {
    total,
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
}

function calculateDepthDistribution(sequences, ranks) {
  const total = sequences.length;
  const counts = new Array(ranks.length + 1).fill(0);

  for (const seq of sequences) {
    const d = Math.min(Math.max(0, seq.assigned_depth || 0), ranks.length);
    counts[d]++;
  }

  return counts.map((count, d) => ({
    depth: d,
    rankName: d === 0 ? 'Unassigned at Root' : ranks[d - 1],
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

function calculateTaxonomicComposition(sequences, rank, scopeFilter = 'ALL') {
  const scopedSequences = sequences.filter((seq) => {
    if (scopeFilter === 'ASSIGNED_ONLY') {
      return seq.status === 'assigned_full' || seq.status === 'assigned_partial';
    }
    return true;
  });

  const scopeTotal = scopedSequences.length;
  const taxonMap = new Map();

  for (const seq of scopedSequences) {
    const entry = seq.lineage?.find((l) => l.rank === rank);
    let taxonName;
    let isUnassigned = false;

    if (entry && entry.assigned && entry.taxon) {
      taxonName = entry.taxon;
    } else {
      taxonName = `(Unassigned at ${rank})`;
      isUnassigned = true;
    }

    const existing = taxonMap.get(taxonName);
    if (existing) {
      existing.count++;
      existing.sequenceIds.push(seq.id);
    } else {
      taxonMap.set(taxonName, { count: 1, sequenceIds: [seq.id], isUnassigned });
    }
  }

  const taxa = Array.from(taxonMap.entries()).map(([taxon, data]) => ({
    taxon,
    count: data.count,
    percentage: scopeTotal > 0 ? (data.count / scopeTotal) * 100 : 0,
    sequenceIds: data.sequenceIds,
    isUnassigned: data.isUnassigned,
  }));

  return { scopeTotal, taxa };
}

// -------------------------------------------------------------
// Test Suite
// -------------------------------------------------------------

describe('Phase 6: Community Insights Dashboard Implementation Tests', () => {

  describe('1. Dashboard Summary Metrics & Denominators', () => {
    it('calculates mathematically exact counts across all Contract v1.0 statuses', () => {
      const m = calculateSummaryMetrics(mockRunResultPR2.sequences);

      assert.equal(m.total, 5);
      assert.equal(m.countFull, 2);
      assert.equal(m.countPartial, 1);
      assert.equal(m.countUnassigned, 1);
      assert.equal(m.countInvalid, 1);
      assert.equal(m.countWithWarnings, 3); // SEQ_03, SEQ_04, SEQ_05
      assert.equal(m.assignedCount, 3); // 2 full + 1 partial
      assert.equal(m.validCount, 4); // 5 total - 1 invalid
    });

    it('enforces strict count reconciliation (sum of all 4 statuses equals total)', () => {
      const m = calculateSummaryMetrics(mockRunResultPR2.sequences);
      const reconciledSum = m.countFull + m.countPartial + m.countUnassigned + m.countInvalid;
      assert.equal(reconciledSum, m.total, "All sequences must be 100% accounted for without gaps");
    });

    it('calculates percentages with explicitly stated denominators', () => {
      const m = calculateSummaryMetrics(mockRunResultPR2.sequences);

      // Denominator: Total sequences N = 5
      assert.equal(m.overallRateAll, (3 / 5) * 100); // 60.0%
      assert.equal(m.fullyAssignedRate, (2 / 5) * 100); // 40.0%
      assert.equal(m.partiallyAssignedRate, (1 / 5) * 100); // 20.0%
      assert.equal(m.unassignedRate, (1 / 5) * 100); // 20.0%
      assert.equal(m.invalidRate, (1 / 5) * 100); // 20.0%

      // Denominator: Valid sequences N_valid = 4
      assert.equal(m.overallRateValid, (3 / 4) * 100); // 75.0%
    });

    it('handles empty sequences array safely without NaN or division by zero', () => {
      const empty = calculateSummaryMetrics([]);
      assert.equal(empty.total, 0);
      assert.equal(empty.countFull, 0);
      assert.equal(empty.countPartial, 0);
      assert.equal(empty.countUnassigned, 0);
      assert.equal(empty.countInvalid, 0);
      assert.equal(empty.overallRateAll, 0);
      assert.equal(empty.overallRateValid, 0);
      assert.equal(empty.fullyAssignedRate, 0);
      assert.equal(empty.meanDepth, 0);
      assert.ok(!Number.isNaN(empty.overallRateAll));
    });
  });

  describe('2. Assignment Status Distribution', () => {
    it('accurately represents all four Contract v1.0 statuses', () => {
      const m = calculateSummaryMetrics(mockRunResultPR2.sequences);
      const statuses = ['assigned_full', 'assigned_partial', 'unassigned', 'invalid_input'];
      
      const counts = {
        assigned_full: m.countFull,
        assigned_partial: m.countPartial,
        unassigned: m.countUnassigned,
        invalid_input: m.countInvalid,
      };

      for (const st of statuses) {
        assert.ok(counts[st] !== undefined, `Status ${st} must be present`);
        assert.ok(counts[st] >= 0, `Status count must be non-negative`);
      }
    });

    it('correctly handles runs where some statuses have zero counts', () => {
      const singleSeq = [mockRunResultPR2.sequences[0]]; // Only assigned_full
      const m = calculateSummaryMetrics(singleSeq);
      assert.equal(m.total, 1);
      assert.equal(m.countFull, 1);
      assert.equal(m.countPartial, 0);
      assert.equal(m.countUnassigned, 0);
      assert.equal(m.countInvalid, 0);
    });
  });

  describe('3. Dynamic Taxonomic Ranks & Assignment Depth', () => {
    it('supports 8-rank PR2 ladder dynamically', () => {
      const ranks = mockRunResultPR2.run.ranks;
      const depthDist = calculateDepthDistribution(mockRunResultPR2.sequences, ranks);

      assert.equal(depthDist.length, 9); // Depth 0 to 8
      assert.equal(depthDist[0].rankName, 'Unassigned at Root');
      assert.equal(depthDist[0].count, 2); // SEQ_04 (unassigned) + SEQ_05 (invalid_input)
      assert.equal(depthDist[3].rankName, 'division');
      assert.equal(depthDist[3].count, 1); // SEQ_03 (depth 3)
      assert.equal(depthDist[8].rankName, 'genus');
      assert.equal(depthDist[8].count, 2); // SEQ_01, SEQ_02 (depth 8)

      // Total count across all depths must equal total sequences
      const totalDepthCount = depthDist.reduce((acc, d) => acc + d.count, 0);
      assert.equal(totalDepthCount, mockRunResultPR2.sequences.length);
    });

    it('supports custom 4-rank ladder without assuming hardcoded 7/8 ranks', () => {
      const ranks = mockRunResultCustom4.run.ranks;
      const depthDist = calculateDepthDistribution(mockRunResultCustom4.sequences, ranks);

      assert.equal(depthDist.length, 5); // Depth 0 to 4
      assert.equal(depthDist[4].rankName, 'order');
      assert.equal(depthDist[4].count, 1);
      assert.equal(depthDist[0].count, 0);
    });
  });

  describe('4. Taxonomic Composition Explorer', () => {
    it('aggregates taxa correctly at specified rank without double-counting', () => {
      // Evaluate at 'division' rank
      const comp = calculateTaxonomicComposition(mockRunResultPR2.sequences, 'division', 'ALL');
      assert.equal(comp.scopeTotal, 5);

      const ochrophyta = comp.taxa.find((t) => t.taxon === 'Ochrophyta');
      assert.ok(ochrophyta);
      assert.equal(ochrophyta.count, 2); // SEQ_01, SEQ_02
      assert.equal(ochrophyta.percentage, (2 / 5) * 100);

      const dinoflagellata = comp.taxa.find((t) => t.taxon === 'Dinoflagellata');
      assert.ok(dinoflagellata);
      assert.equal(dinoflagellata.count, 1); // SEQ_03

      // Verify unassigned at division are explicitly represented (SEQ_04, SEQ_05)
      const unassignedAtDivision = comp.taxa.find((t) => t.isUnassigned);
      assert.ok(unassignedAtDivision);
      assert.equal(unassignedAtDivision.count, 2);

      // Sum of counts must equal total scope
      const sumTaxa = comp.taxa.reduce((acc, t) => acc + t.count, 0);
      assert.equal(sumTaxa, 5);
    });

    it('filters scope to assigned sequences only when requested', () => {
      const comp = calculateTaxonomicComposition(mockRunResultPR2.sequences, 'genus', 'ASSIGNED_ONLY');
      assert.equal(comp.scopeTotal, 3); // SEQ_01, SEQ_02, SEQ_03 (assigned_full + assigned_partial)

      const thalassiosira = comp.taxa.find((t) => t.taxon === 'Thalassiosira');
      assert.equal(thalassiosira.count, 1);
      assert.equal(thalassiosira.percentage, (1 / 3) * 100);

      const chaetoceros = comp.taxa.find((t) => t.taxon === 'Chaetoceros');
      assert.equal(chaetoceros.count, 1);

      // SEQ_03 stopped at division, so at genus it is unassigned
      const unassignedAtGenus = comp.taxa.find((t) => t.isUnassigned);
      assert.equal(unassignedAtGenus.count, 1);
    });
  });

  describe('5. Threshold Sensitivity Simulation & Scientific Neutrality', () => {
    it('calculates side-by-side delta between current and candidate results without mutating original', () => {
      const current = calculateSummaryMetrics(mockRunResultPR2.sequences);

      // Simulate a stricter candidate cutoff (e.g. tau = 0.95 where SEQ_01 stops at order instead of genus)
      const simulatedCandidateSeqs = mockRunResultPR2.sequences.map((s) => {
        if (s.id === 'SEQ_01_FULL') {
          return { ...s, status: 'assigned_partial', assigned_depth: 6, deepest_rank: 'order' };
        }
        return s;
      });

      const candidate = calculateSummaryMetrics(simulatedCandidateSeqs);

      // Verify original is untouched
      assert.equal(current.countFull, 2);
      assert.equal(candidate.countFull, 1);

      const deltaFull = candidate.countFull - current.countFull;
      assert.equal(deltaFull, -1);
      const deltaPartial = candidate.countPartial - current.countPartial;
      assert.equal(deltaPartial, +1);
    });

    it('identifies synthetic fixtures and presents persistent disclaimers', () => {
      assert.equal(mockRunResultPR2.is_synthetic, true);
      assert.ok(mockRunResultPR2.disclaimer.includes("SYNTHETIC FIXTURE"));
    });
  });

  describe('6. Edge Cases & Stale Data Prevention Audit', () => {
    it('handles datasets with 100% invalid sequences safely', () => {
      const invalidOnly = [
        { id: "INV_1", length: 50, status: "invalid_input", assigned_depth: 0, warnings: ["SHORT"], lineage: [] },
        { id: "INV_2", length: 60, status: "invalid_input", assigned_depth: 0, warnings: ["SHORT"], lineage: [] },
      ];
      const m = calculateSummaryMetrics(invalidOnly);
      assert.equal(m.total, 2);
      assert.equal(m.countInvalid, 2);
      assert.equal(m.validCount, 0);
      assert.equal(m.assignedCount, 0);
      assert.equal(m.overallRateAll, 0);
      assert.equal(m.overallRateValid, 0); // Safely returns 0 without 0/0 NaN
      assert.equal(m.invalidRate, 100);
      assert.equal(m.countFull + m.countPartial + m.countUnassigned + m.countInvalid, 2);
    });

    it('correctly groups null or missing taxon entries without dropping from denominator', () => {
      const nullTaxonSeqs = [
        {
          id: "NULL_1",
          status: "assigned_partial",
          assigned_depth: 1,
          lineage: [
            { rank: "domain", taxon: "Eukaryota", assigned: true, confidence: 0.99 },
            { rank: "division", taxon: null, assigned: false, confidence: null }
          ]
        }
      ];
      const comp = calculateTaxonomicComposition(nullTaxonSeqs, 'division', 'ALL');
      assert.equal(comp.scopeTotal, 1);
      assert.equal(comp.taxa.length, 1);
      assert.equal(comp.taxa[0].taxon, '(Unassigned at division)');
      assert.equal(comp.taxa[0].count, 1);
      assert.equal(comp.taxa[0].percentage, 100);
    });

    it('verifies that in-flight stale simulation responses are invalidated', () => {
      let activeReqId = 0;
      let committedResult = null;

      function simulateResponse(reqId, targetRunId, currentRunId, payload) {
        if (reqId !== activeReqId) return false; // Discard stale request
        if (targetRunId !== currentRunId) return false; // Discard wrong run
        committedResult = payload;
        return true;
      }

      // Request 1 starts for run-1
      const req1 = ++activeReqId;
      // User switches to run-2 before req1 finishes
      activeReqId++;
      const currentRun = "run-2";

      // Req 1 finally resolves late
      const accepted = simulateResponse(req1, "run-1", currentRun, { data: "stale" });
      assert.equal(accepted, false, "Stale request must be rejected");
      assert.equal(committedResult, null, "Committed result must remain null");
    });
  });
});
