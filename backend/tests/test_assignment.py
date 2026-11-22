"""
Unit and integration tests for Phase 4 Taxonomic Assignment and Threshold (tau) logic.
Tests consecutive prefix semantics, boundary conditions, dynamic ranks, and API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.services.assignment_service import TaxonomicAssignmentService
from app.services.result_validator import ResultContractValidator
from app.services.result_service import ResultProcessingService
from app.schemas.assignment import (
    RawRankPrediction,
    SequencePredictionInput,
    AssignmentBatchRequest,
    ReapplyThresholdRequest,
)

STANDARD_RANKS = [
    "domain", "supergroup", "division", "subdivision",
    "class", "order", "family", "genus"
]


def create_sample_predictions(confidences, taxa=None):
    """Helper creating RawRankPrediction items for STANDARD_RANKS."""
    if taxa is None:
        taxa = [f"Taxon_{r}" for r in STANDARD_RANKS]
    return [
        RawRankPrediction(rank=r, taxon=t, confidence=c)
        for r, t, c in zip(STANDARD_RANKS, taxa, confidences)
    ]


def test_tau_boundaries_zero_and_one():
    """Test tau = 0.0 (all assigned) and tau = 1.0 (only strictly 1.0 assigned)."""
    confs = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]
    seq_input = SequencePredictionInput(id="SEQ_1", predictions=create_sample_predictions(confs))

    # Tau = 0.0 -> all ranks meet threshold
    res_zero = TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=0.0)
    assert res_zero.status == "assigned_full"
    assert res_zero.assigned_depth == 8
    assert res_zero.deepest_rank == "genus"

    # Tau = 1.0 -> only rank 0 has confidence 1.0, rank 1 has 0.9 (fails)
    res_one = TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=1.0)
    assert res_one.status == "assigned_partial"
    assert res_one.assigned_depth == 1
    assert res_one.deepest_rank == "domain"
    assert res_one.deepest_taxon == "Taxon_domain"


def test_confidence_exactly_equal_to_tau():
    """Confidence exactly matching tau meets the threshold and is assigned."""
    confs = [0.60, 0.60, 0.60, 0.50, 0.50, 0.50, 0.50, 0.50]
    seq_input = SequencePredictionInput(id="SEQ_EQ", predictions=create_sample_predictions(confs))

    res = TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=0.60)
    assert res.assigned_depth == 3
    assert res.lineage[0].assigned is True
    assert res.lineage[1].assigned is True
    assert res.lineage[2].assigned is True
    assert res.lineage[3].assigned is False
    assert res.status == "assigned_partial"


def test_confidence_just_below_tau():
    """Confidence marginally below tau fails assignment and stops the chain."""
    confs = [0.80, 0.59999, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70]
    seq_input = SequencePredictionInput(id="SEQ_BELOW", predictions=create_sample_predictions(confs))

    res = TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=0.60)
    assert res.assigned_depth == 1
    assert res.status == "assigned_partial"
    assert res.deepest_rank == "domain"
    assert res.lineage[1].assigned is False


def test_first_rank_failure_yields_unassigned():
    """If root rank fails tau, sequence is strictly 'unassigned' with depth 0."""
    confs = [0.55, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99]
    seq_input = SequencePredictionInput(id="SEQ_ROOT_FAIL", predictions=create_sample_predictions(confs))

    res = TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=0.60)
    assert res.status == "unassigned"
    assert res.assigned_depth == 0
    assert res.deepest_rank is None
    assert res.deepest_taxon is None
    assert all(item.assigned is False for item in res.lineage)


def test_higher_confidence_at_deeper_rank_never_assigned():
    """Scientific safeguard: Deeper rank with 0.99 confidence after rank failing tau MUST NOT be assigned."""
    confs = [0.90, 0.85, 0.40, 0.99, 0.99, 0.99, 0.99, 0.99]
    seq_input = SequencePredictionInput(id="SEQ_DEEP_HIGH", predictions=create_sample_predictions(confs))

    res = TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=0.60)
    assert res.assigned_depth == 2
    assert res.deepest_rank == "supergroup"
    assert res.lineage[2].assigned is False  # division failed (0.40)
    assert res.lineage[3].assigned is False  # subdivision has 0.99 but stopped!
    assert res.lineage[7].assigned is False  # genus has 0.99 but stopped!


def test_null_taxon_stops_assignment():
    """Even if confidence >= tau, a null taxon cannot be assigned and halts assignment."""
    confs = [0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60]
    taxa = ["Eukaryota", "TSAR", None, "Dinoflagellata", "Dinophyceae", "Peridiniales", "Family", "Genus"]
    seq_input = SequencePredictionInput(
        id="SEQ_NULL_TAXON",
        predictions=create_sample_predictions(confs, taxa=taxa),
    )

    res = TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=0.60)
    assert res.assigned_depth == 2
    assert res.deepest_rank == "supergroup"
    assert res.deepest_taxon == "TSAR"
    assert res.lineage[2].assigned is False  # division is None


def test_missing_confidence_stops_assignment():
    """Missing (None) confidence halts assignment."""
    confs = [0.95, None, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60]
    seq_input = SequencePredictionInput(
        id="SEQ_NULL_CONF",
        predictions=create_sample_predictions(confs),
    )

    res = TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=0.60)
    assert res.assigned_depth == 1
    assert res.deepest_rank == "domain"
    assert res.lineage[1].assigned is False


def test_invalid_input_sequence():
    """Sequence flagged as is_invalid gets status='invalid_input' with assigned_depth=0."""
    confs = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
    seq_input = SequencePredictionInput(
        id="SEQ_INVALID",
        predictions=create_sample_predictions(confs),
        warnings=["non_acgt_characters"],
        is_invalid=True,
    )

    res = TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=0.60)
    assert res.status == "invalid_input"
    assert res.assigned_depth == 0
    assert res.deepest_rank is None
    assert res.deepest_taxon is None
    assert all(item.assigned is False for item in res.lineage)


def test_dynamic_custom_ranks():
    """Assignment works on arbitrary dynamic rank lists (not hardcoded to 8 ranks)."""
    custom_ranks = ["kingdom", "phylum", "genus", "species"]
    confs = [0.99, 0.85, 0.70, 0.45]
    preds = [
        RawRankPrediction(rank=r, taxon=f"Call_{r}", confidence=c)
        for r, c in zip(custom_ranks, confs)
    ]
    seq_input = SequencePredictionInput(id="CUSTOM_1", predictions=preds)

    res = TaxonomicAssignmentService.assign_sequence(custom_ranks, seq_input, tau=0.60)
    assert res.assigned_depth == 3
    assert res.deepest_rank == "genus"
    assert res.deepest_taxon == "Call_genus"
    assert res.status == "assigned_partial"


def test_malformed_inputs_rejected():
    """Empty rank list, invalid tau, or mismatched predictions raise ValueError."""
    seq_input = SequencePredictionInput(id="S1", predictions=create_sample_predictions([0.9] * 8))

    with pytest.raises(ValueError, match="Threshold tau"):
        TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=1.5)

    with pytest.raises(ValueError, match="Threshold tau"):
        TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, seq_input, tau=-0.1)

    with pytest.raises(ValueError, match="at least one rank"):
        TaxonomicAssignmentService.assign_sequence([], seq_input, tau=0.6)

    bad_seq = SequencePredictionInput(id="S2", predictions=create_sample_predictions([0.9] * 5))
    with pytest.raises(ValueError, match="expected 8 matching ranks"):
        TaxonomicAssignmentService.assign_sequence(STANDARD_RANKS, bad_seq, tau=0.6)


def test_batch_assignment_passes_contract_validator():
    """Batch assignment output strictly passes Contract v1.0 ResultContractValidator."""
    confs1 = [0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60]  # assigned_full
    confs2 = [0.95, 0.80, 0.50, 0.40, 0.30, 0.20, 0.10, 0.05]  # assigned_partial (depth 2)
    confs3 = [0.40, 0.30, 0.20, 0.10, 0.05, 0.05, 0.05, 0.05]  # unassigned

    req = AssignmentBatchRequest(
        threshold_tau=0.60,
        ranks=STANDARD_RANKS,
        sequences=[
            SequencePredictionInput(id="ASV_1", predictions=create_sample_predictions(confs1)),
            SequencePredictionInput(id="ASV_2", predictions=create_sample_predictions(confs2)),
            SequencePredictionInput(id="ASV_3", predictions=create_sample_predictions(confs3)),
            SequencePredictionInput(
                id="ASV_4",
                predictions=create_sample_predictions(confs1),
                is_invalid=True,
                warnings=["length_below_200"],
            ),
        ],
    )

    batch_resp = TaxonomicAssignmentService.assign_batch(req)
    assert batch_resp.sequence_count == 4
    assert batch_resp.summary.n_by_status["assigned_full"] == 1
    assert batch_resp.summary.n_by_status["assigned_partial"] == 1
    assert batch_resp.summary.n_by_status["unassigned"] == 1
    assert batch_resp.summary.n_by_status["invalid_input"] == 1

    # Verify generated payload against ResultContractValidator
    report = ResultContractValidator.validate_dict(batch_resp.payload.model_dump(mode="json"))
    assert report.valid is True
    assert len(report.errors) == 0


def test_api_apply_threshold_endpoint(client: TestClient):
    """POST /api/assignment/apply-threshold endpoint test."""
    confs = [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25]
    req_body = {
        "threshold_tau": 0.70,
        "ranks": STANDARD_RANKS,
        "sequences": [
            {
                "id": "ASV_TEST",
                "length": 380,
                "predictions": [
                    {"rank": r, "taxon": f"T_{r}", "confidence": c}
                    for r, c in zip(STANDARD_RANKS, confs)
                ],
            }
        ],
    }

    resp = client.post("/api/assignment/apply-threshold", json=req_body)
    assert resp.status_code == 200
    data = resp.json()
    assert data["threshold_tau"] == 0.70
    assert data["sequences"][0]["assigned_depth"] == 3
    assert data["sequences"][0]["deepest_rank"] == "division"
    assert data["sequences"][0]["status"] == "assigned_partial"


def test_api_reapply_threshold_endpoint(client: TestClient):
    """POST /api/assignment/reapply-threshold modifies assignment without mutating predictions."""
    fixture_payload = ResultProcessingService.load_synthetic_fixture()
    assert fixture_payload.sequences[1].assigned_depth == 5  # At tau=0.60, ASV_0002 has depth 5

    # Reapply tau=0.95 -> depth should drop to 3 (domain=1.0, supergroup=0.99, division=0.96 >= 0.95)
    reapply_req = {
        "threshold_tau": 0.95,
        "payload": fixture_payload.model_dump(mode="json"),
    }
    resp = client.post("/api/assignment/reapply-threshold", json=reapply_req)
    assert resp.status_code == 200
    updated_data = resp.json()
    assert updated_data["run"]["threshold"]["tau"] == 0.95
    assert updated_data["sequences"][1]["assigned_depth"] == 3
    assert updated_data["sequences"][1]["deepest_rank"] == "division"


def test_api_reapply_threshold_to_saved_run(client: TestClient):
    """POST /api/runs/{run_id}/reapply-threshold updates persistent result in SQLite."""
    # 1. Create run
    fasta = ">ASV_0001\nACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGT\n"
    create_resp = client.post(
        "/api/runs",
        files={"file": ("test.fasta", fasta.encode("utf-8"), "text/plain")},
    )
    run_id = create_resp.json()["run_id"]

    # 2. Attach synthetic fixture (tau=0.60)
    fixture_payload = ResultProcessingService.load_synthetic_fixture()
    attach_resp = client.post(f"/api/runs/{run_id}/results", json=fixture_payload.model_dump(mode="json"))
    assert attach_resp.status_code == 201

    # 3. Reapply tau=0.90 to saved run
    reapply_resp = client.post(
        f"/api/runs/{run_id}/reapply-threshold",
        json={"threshold_tau": 0.90},
    )
    assert reapply_resp.status_code == 200
    assert reapply_resp.json()["threshold_tau"] == 0.90

    # 4. Fetch updated result from DB and verify new depth
    get_resp = client.get(f"/api/runs/{run_id}/results")
    assert get_resp.status_code == 200
    db_payload = get_resp.json()
    assert db_payload["run"]["threshold"]["tau"] == 0.90
    # ASV_0002 confidences: [1.0, 0.99, 0.96, 0.90, 0.64] -> at tau=0.90, depth is 4 (ciliophora)
    assert db_payload["sequences"][1]["assigned_depth"] == 4
    assert db_payload["sequences"][1]["deepest_rank"] == "subdivision"
