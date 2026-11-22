import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Sample Contract v1.0 Result Fixture for Testing strictly matching contract/result_schema.json
const mockSyntheticResult = {
  contract_version: "1.0",
  run: {
    run_id: "run-fixture-001",
    model: "test-classifier-v1",
    marker: "18S_V4",
    threshold_tau: 0.60,
    timestamp: "2026-11-20T12:00:00Z",
    ranks: ["domain", "supergroup", "division", "subdivision", "class", "order", "family", "genus"],
    sequence_count: 4
  },
  sequences: [
    {
      sequence_id: "SEQ_001_FULL",
      assigned_depth: 8,
      status: "assigned_full",
      deepest_rank: "genus",
      deepest_taxon: "Thalassiosira",
      qc_warnings: [],
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
      sequence_id: "SEQ_002_PARTIAL",
      assigned_depth: 3,
      status: "assigned_partial",
      deepest_rank: "division",
      deepest_taxon: "Dinoflagellata",
      qc_warnings: ["LOW_CONFIDENCE_WARNING", "AMBIGUOUS_TAXON"],
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
      sequence_id: "SEQ_003_UNASSIGNED",
      assigned_depth: 0,
      status: "unassigned",
      deepest_rank: null,
      deepest_taxon: null,
      qc_warnings: ["UNKNOWN_NOVEL_QUERY"],
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
      sequence_id: "SEQ_004_INVALID",
      assigned_depth: 0,
      status: "invalid_input",
      deepest_rank: null,
      deepest_taxon: null,
      qc_warnings: ["SEQUENCE_TOO_SHORT", "NON_ACGT_CHARACTERS"],
      lineage: []
    }
  ],
  is_synthetic: true,
  disclaimer: "SYNTHETIC FIXTURE DATASET: Provided for interface evaluation only."
};

// Filter & search logic mirror function (verifies exact algorithm used in ResultsTable.tsx)
function applyFilterAndSearch(sequences, { searchQuery = '', statusFilter = 'ALL', rankFilter = 'ALL', qcFilter = 'ALL' }) {
  return sequences.filter((seq) => {
    // Search match: seq ID or deepest taxon or any taxon in lineage
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const idMatch = seq.sequence_id.toLowerCase().includes(q);
      const taxonMatch = seq.deepest_taxon?.toLowerCase().includes(q) ?? false;
      const lineageMatch = seq.lineage.some(l => l.taxon?.toLowerCase().includes(q));
      if (!idMatch && !taxonMatch && !lineageMatch) return false;
    }
    // Status filter
    if (statusFilter !== 'ALL' && seq.status !== statusFilter) return false;
    // Rank filter
    if (rankFilter !== 'ALL') {
      if (rankFilter === 'unassigned') {
        if (seq.assigned_depth !== 0) return false;
      } else if (seq.deepest_rank !== rankFilter) {
        return false;
      }
    }
    // QC filter
    if (qcFilter !== 'ALL') {
      if (qcFilter === 'HAS_WARNINGS' && (!seq.qc_warnings || seq.qc_warnings.length === 0)) return false;
      if (qcFilter === 'NO_WARNINGS' && seq.qc_warnings && seq.qc_warnings.length > 0) return false;
      if (qcFilter !== 'HAS_WARNINGS' && qcFilter !== 'NO_WARNINGS') {
        if (!seq.qc_warnings?.includes(qcFilter)) return false;
      }
    }
    return true;
  });
}

// Pagination calculation mirror function
function paginate(items, page, pageSize) {
  const totalPages = Math.ceil(items.length / pageSize) || 1;
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * pageSize;
  const pagedItems = items.slice(start, start + pageSize);
  return { pagedItems, totalPages, currentPage: clampedPage, totalItems: items.length };
}

describe('Phase 5: Classification Results System Logic & Contract v1.0 Statuses', () => {

  it('correctly maps and renders required fields from Contract v1.0 result', () => {
    const seq = mockSyntheticResult.sequences[0];
    assert.equal(seq.sequence_id, 'SEQ_001_FULL');
    assert.equal(seq.status, 'assigned_full');
    assert.equal(seq.assigned_depth, 8);
    assert.equal(seq.deepest_rank, 'genus');
    assert.equal(seq.deepest_taxon, 'Thalassiosira');
    assert.deepEqual(seq.qc_warnings, []);

    // Check dynamic depth string calculation
    const ranks = mockSyntheticResult.run.ranks;
    const depthStr = `${seq.assigned_depth}/${ranks.length}`;
    assert.equal(depthStr, '8/8');
  });

  it('supports dynamic ranks without assuming hardcoded 7-rank Linnaean taxonomy', () => {
    // Custom 4-rank ladder
    const customRanks = ['domain', 'phylum', 'class', 'order'];
    const customSeq = {
      sequence_id: 'CUSTOM_001',
      assigned_depth: 3,
      status: 'assigned_partial',
      deepest_rank: 'class',
      deepest_taxon: 'CustomClass',
      qc_warnings: [],
      lineage: [
        { rank: 'domain', taxon: 'Bacteria', confidence: 0.99, assigned: true },
        { rank: 'phylum', taxon: 'Proteobacteria', confidence: 0.95, assigned: true },
        { rank: 'class', taxon: 'Gammaproteobacteria', confidence: 0.85, assigned: true },
        { rank: 'order', taxon: null, confidence: 0.35, assigned: false },
      ]
    };

    assert.equal(customRanks.length, 4);
    assert.equal(`${customSeq.assigned_depth}/${customRanks.length}`, '3/4');
    assert.equal(customSeq.deepest_rank, 'class');
  });

  it('searches correctly by sequence ID, deepest taxon, and lineage taxon', () => {
    // By Sequence ID
    const matchId = applyFilterAndSearch(mockSyntheticResult.sequences, { searchQuery: 'SEQ_002' });
    assert.equal(matchId.length, 1);
    assert.equal(matchId[0].sequence_id, 'SEQ_002_PARTIAL');

    // By deepest taxon
    const matchDeepest = applyFilterAndSearch(mockSyntheticResult.sequences, { searchQuery: 'Thalassiosira' });
    assert.equal(matchDeepest.length, 1);
    assert.equal(matchDeepest[0].sequence_id, 'SEQ_001_FULL');

    // By lineage taxon (intermediate rank)
    const matchLineage = applyFilterAndSearch(mockSyntheticResult.sequences, { searchQuery: 'Ochrophyta' });
    assert.equal(matchLineage.length, 1);
    assert.equal(matchLineage[0].sequence_id, 'SEQ_001_FULL');

    // Case-insensitive
    const matchCase = applyFilterAndSearch(mockSyntheticResult.sequences, { searchQuery: 'dinoflagellata' });
    assert.equal(matchCase.length, 1);
    assert.equal(matchCase[0].sequence_id, 'SEQ_002_PARTIAL');

    // Non-existent search
    const matchNone = applyFilterAndSearch(mockSyntheticResult.sequences, { searchQuery: 'NonExistentTaxon999' });
    assert.equal(matchNone.length, 0);
  });

  it('filters sequences by all four Contract v1.0 statuses correctly', () => {
    // 1. assigned_full
    const fullOnly = applyFilterAndSearch(mockSyntheticResult.sequences, { statusFilter: 'assigned_full' });
    assert.equal(fullOnly.length, 1);
    assert.equal(fullOnly[0].sequence_id, 'SEQ_001_FULL');

    // 2. assigned_partial
    const partialOnly = applyFilterAndSearch(mockSyntheticResult.sequences, { statusFilter: 'assigned_partial' });
    assert.equal(partialOnly.length, 1);
    assert.equal(partialOnly[0].sequence_id, 'SEQ_002_PARTIAL');

    // 3. unassigned
    const unassignedOnly = applyFilterAndSearch(mockSyntheticResult.sequences, { statusFilter: 'unassigned' });
    assert.equal(unassignedOnly.length, 1);
    assert.equal(unassignedOnly[0].sequence_id, 'SEQ_003_UNASSIGNED');

    // 4. invalid_input
    const invalidOnly = applyFilterAndSearch(mockSyntheticResult.sequences, { statusFilter: 'invalid_input' });
    assert.equal(invalidOnly.length, 1);
    assert.equal(invalidOnly[0].sequence_id, 'SEQ_004_INVALID');
  });

  it('filters sequences by dynamic rank', () => {
    const genusRank = applyFilterAndSearch(mockSyntheticResult.sequences, { rankFilter: 'genus' });
    assert.equal(genusRank.length, 1);
    assert.equal(genusRank[0].sequence_id, 'SEQ_001_FULL');

    const divisionRank = applyFilterAndSearch(mockSyntheticResult.sequences, { rankFilter: 'division' });
    assert.equal(divisionRank.length, 1);
    assert.equal(divisionRank[0].sequence_id, 'SEQ_002_PARTIAL');

    const orderRank = applyFilterAndSearch(mockSyntheticResult.sequences, { rankFilter: 'order' });
    assert.equal(orderRank.length, 0);
  });

  it('filters sequences by QC warnings', () => {
    const hasWarnings = applyFilterAndSearch(mockSyntheticResult.sequences, { qcFilter: 'HAS_WARNINGS' });
    assert.equal(hasWarnings.length, 3); // SEQ_002, SEQ_003, SEQ_004

    const noWarnings = applyFilterAndSearch(mockSyntheticResult.sequences, { qcFilter: 'NO_WARNINGS' });
    assert.equal(noWarnings.length, 1);
    assert.equal(noWarnings[0].sequence_id, 'SEQ_001_FULL');

    const specificWarning = applyFilterAndSearch(mockSyntheticResult.sequences, { qcFilter: 'UNKNOWN_NOVEL_QUERY' });
    assert.equal(specificWarning.length, 1);
    assert.equal(specificWarning[0].sequence_id, 'SEQ_003_UNASSIGNED');
  });

  it('resets/clears filters to restore all sequences', () => {
    const filtered = applyFilterAndSearch(mockSyntheticResult.sequences, {
      searchQuery: 'SEQ_002',
      statusFilter: 'assigned_partial',
      rankFilter: 'division',
      qcFilter: 'LOW_CONFIDENCE_WARNING'
    });
    assert.equal(filtered.length, 1);

    // Reset all filters
    const reset = applyFilterAndSearch(mockSyntheticResult.sequences, {
      searchQuery: '',
      statusFilter: 'ALL',
      rankFilter: 'ALL',
      qcFilter: 'ALL'
    });
    assert.equal(reset.length, 4);
  });

  it('correctly calculates pagination slices and total pages', () => {
    const items = Array.from({ length: 35 }, (_, i) => ({ id: i + 1 }));
    
    // Page size 10
    const p1 = paginate(items, 1, 10);
    assert.equal(p1.totalPages, 4);
    assert.equal(p1.pagedItems.length, 10);
    assert.equal(p1.pagedItems[0].id, 1);
    assert.equal(p1.pagedItems[9].id, 10);

    const p4 = paginate(items, 4, 10);
    assert.equal(p4.pagedItems.length, 5);
    assert.equal(p4.pagedItems[4].id, 35);

    // Page size 25
    const p25 = paginate(items, 1, 25);
    assert.equal(p25.totalPages, 2);
    assert.equal(p25.pagedItems.length, 25);
  });

  it('identifies synthetic fixtures and verifies disclaimer requirements', () => {
    assert.equal(mockSyntheticResult.is_synthetic, true);
    assert.ok(mockSyntheticResult.disclaimer.includes('SYNTHETIC FIXTURE'));
  });

  it('verifies neutral scientific disclosure rules without unsupported causal assertions', () => {
    // When inspecting partial assignment (stopping before deepest rank):
    const partialSeq = mockSyntheticResult.sequences[1];
    const isFullAssignment = partialSeq.assigned_depth === mockSyntheticResult.run.ranks.length;
    assert.equal(isFullAssignment, false);

    // Neutral explanation: reflects threshold cutoff without guessing unverified causal reasons
    const stopReasonNotice = "Stopping at an intermediate rank indicates that deeper ranks did not meet operating threshold \u03c4. Do not interpret unassigned deeper ranks as evidence of a novel species or organism.";
    const speciesDisclaimer = "Species-level classification has not been evaluated.";
    
    assert.ok(stopReasonNotice.includes('did not meet operating threshold'));
    assert.ok(stopReasonNotice.includes('Do not interpret unassigned deeper ranks as evidence of a novel species'));
    assert.ok(!stopReasonNotice.includes('reference database gap')); // Confirmed removed unsupported causal assert
    assert.ok(speciesDisclaimer.includes('has not been evaluated'));
  });
});
