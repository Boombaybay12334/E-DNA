"""
Integration and unit tests for eDNA Contract v1.0 Classification Result architecture.
Tests schema validation, dynamic ranks, biological semantics, fixture loading, and DB persistence.
"""

import json
import os
import copy
import pytest
from fastapi.testclient import TestClient
from app.services.result_service import ResultProcessingService
from app.services.result_validator import ResultContractValidator


@pytest.fixture
def example_result_data():
    """Loads contract/example_result.json from workspace."""
    fixture_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "contract", "example_result.json")
    )
    with open(fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


def test_validate_example_result_fixture_passes_completely(example_result_data):
    """The provided contract/example_result.json must pass all semantic and schema checks."""
    payload, report = ResultProcessingService.validate_payload(example_result_data)
    assert report.valid is True
    assert len(report.errors) == 0
    assert payload is not None
    assert payload.contract_version == "1.0"
    assert payload.run.run_id == "example-run-0001"
    assert len(payload.sequences) == 6
    assert payload.run.ranks == [
        "domain", "supergroup", "division", "subdivision",
        "class", "order", "family", "genus"
    ]


def test_fixture_endpoint_returns_synthetic_disclaimer(client: TestClient):
    """GET /api/results/fixture returns valid data explicitly flagged as synthetic."""
    response = client.get("/api/results/fixture")
    assert response.status_code == 200
    assert response.headers.get("X-eDNA-Data-Mode") == "synthetic-fixture"

    data = response.json()
    assert data["is_synthetic"] is True
    assert "SYNTHETIC/FIXTURE DATA ONLY" in data["disclaimer"]
    assert data["data"]["contract_version"] == "1.0"
    assert len(data["data"]["sequences"]) == 6


def test_validate_endpoint_valid_payload(client: TestClient, example_result_data):
    """POST /api/results/validate returns 200 for valid contract payload."""
    response = client.post("/api/results/validate", json=example_result_data)
    assert response.status_code == 200
    report = response.json()
    assert report["valid"] is True
    assert len(report["errors"]) == 0
    assert report["sequence_count"] == 6


def test_validate_missing_required_fields(client: TestClient):
    """Missing contract_version, run, or sequences triggers 422 with clear error path."""
    bad_payload = {"some_field": 123}
    response = client.post("/api/results/validate", json=bad_payload)
    assert response.status_code == 422
    report = response.json()
    assert report["valid"] is False
    assert len(report["errors"]) >= 3
    error_paths = [e["path"] for e in report["errors"]]
    assert any("contract_version" in p for p in error_paths)
    assert any("run" in p for p in error_paths)
    assert any("sequences" in p for p in error_paths)


def test_validate_invalid_contract_version(client: TestClient, example_result_data):
    r"""Contract version not matching ^1\.[0-9]+$ is rejected."""
    bad_data = copy.deepcopy(example_result_data)
    bad_data["contract_version"] = "2.0"  # Major version 2 not supported
    response = client.post("/api/results/validate", json=bad_data)
    assert response.status_code == 422
    report = response.json()
    assert report["valid"] is False
    assert any("contract_version" in e["path"] for e in report["errors"])


def test_validate_tau_out_of_bounds(client: TestClient, example_result_data):
    """Confidence threshold tau outside [0, 1] is rejected."""
    bad_data = copy.deepcopy(example_result_data)
    bad_data["run"]["threshold"]["tau"] = 1.5
    response = client.post("/api/results/validate", json=bad_data)
    assert response.status_code == 422
    report = response.json()
    assert report["valid"] is False
    assert any("tau" in e["path"] for e in report["errors"])


def test_validate_duplicate_ranks(client: TestClient, example_result_data):
    """Duplicate rank names in run.ranks trigger DUPLICATE_RANKS error."""
    bad_data = copy.deepcopy(example_result_data)
    bad_data["run"]["ranks"] = ["domain", "genus", "genus"]
    # Adjust sequences to match 3 ranks
    for s in bad_data["sequences"]:
        s["lineage"] = s["lineage"][:3]
        for idx, r in enumerate(bad_data["run"]["ranks"]):
            s["lineage"][idx]["rank"] = r
        s["assigned_depth"] = 0
        s["status"] = "unassigned"
        s["deepest_rank"] = None
        s["deepest_taxon"] = None
        for item in s["lineage"]:
            item["assigned"] = False

    response = client.post("/api/results/validate", json=bad_data)
    assert response.status_code == 422
    report = response.json()
    assert report["valid"] is False
    assert any(e["error_code"] == "DUPLICATE_RANKS" for e in report["errors"])


def test_validate_lineage_rank_mismatch(client: TestClient, example_result_data):
    """If sequence lineage ranks do not match run.ranks, clear error is emitted."""
    bad_data = copy.deepcopy(example_result_data)
    # Alter rank name in first sequence
    bad_data["sequences"][0]["lineage"][1]["rank"] = "kingdom_wrong"
    response = client.post("/api/results/validate", json=bad_data)
    assert response.status_code == 422
    report = response.json()
    assert report["valid"] is False
    assert any(e["error_code"] == "RANK_ORDER_MISMATCH" for e in report["errors"])


def test_validate_non_contiguous_assigned_flags(client: TestClient, example_result_data):
    """Non-contiguous assigned flags (gaps in taxonomic ladder) are rejected."""
    bad_data = copy.deepcopy(example_result_data)
    seq = bad_data["sequences"][0]
    # Mark rank 0 True, rank 1 False, rank 2 True
    seq["lineage"][0]["assigned"] = True
    seq["lineage"][1]["assigned"] = False
    seq["lineage"][2]["assigned"] = True
    response = client.post("/api/results/validate", json=bad_data)
    assert response.status_code == 422
    report = response.json()
    assert report["valid"] is False
    assert any(e["error_code"] == "NON_CONTIGUOUS_ASSIGNMENT" for e in report["errors"])


def test_validate_status_semantics_mismatch(client: TestClient, example_result_data):
    """Full assigned_depth with status='assigned_partial' must be rejected."""
    bad_data = copy.deepcopy(example_result_data)
    seq = bad_data["sequences"][0]  # ASV_0001 has assigned_depth=8 (all ranks)
    seq["status"] = "assigned_partial"  # Wrong status for full resolution
    response = client.post("/api/results/validate", json=bad_data)
    assert response.status_code == 422
    report = response.json()
    assert report["valid"] is False
    assert any(e["error_code"] == "STATUS_MISMATCH_FULL" for e in report["errors"])


def test_validate_assigned_rank_confidence_below_tau(client: TestClient, example_result_data):
    """Assigned rank with confidence below tau triggers CONFIDENCE_BELOW_TAU."""
    bad_data = copy.deepcopy(example_result_data)
    seq = bad_data["sequences"][0]
    seq["lineage"][7]["confidence"] = 0.40  # Below tau=0.60, but assigned is True
    response = client.post("/api/results/validate", json=bad_data)
    assert response.status_code == 422
    report = response.json()
    assert report["valid"] is False
    assert any(e["error_code"] == "CONFIDENCE_BELOW_TAU" for e in report["errors"])


def test_attach_and_retrieve_results_on_analysis_run(client: TestClient, example_result_data):
    """Test full integration: upload FASTA -> create run -> attach results -> get results -> cascade delete."""
    # 1. Create run via POST /api/runs
    fasta_content = ">ASV_0001\nACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGT\n"
    create_resp = client.post(
        "/api/runs",
        files={"file": ("test_sample.fasta", fasta_content.encode("utf-8"), "text/plain")},
    )
    assert create_resp.status_code == 201
    run_id = create_resp.json()["run_id"]

    # Verify initial run status is 'unclassified'
    get_run_resp = client.get(f"/api/runs/{run_id}")
    assert get_run_resp.status_code == 200
    assert get_run_resp.json()["classification_status"] == "unclassified"

    # 2. Attach classification results to this run
    attach_resp = client.post(f"/api/runs/{run_id}/results", json=example_result_data)
    assert attach_resp.status_code == 201
    attach_data = attach_resp.json()
    assert attach_data["run_id"] == run_id
    assert attach_data["model_name"] == "example_model"
    assert attach_data["sequence_count"] == 6

    # Verify run status is updated to 'completed'
    updated_run_resp = client.get(f"/api/runs/{run_id}")
    assert updated_run_resp.json()["classification_status"] == "completed"

    # 3. Retrieve attached results via GET /api/runs/{run_id}/results
    get_results_resp = client.get(f"/api/runs/{run_id}/results")
    assert get_results_resp.status_code == 200
    retrieved_payload = get_results_resp.json()
    assert retrieved_payload["contract_version"] == "1.0"
    assert len(retrieved_payload["sequences"]) == 6

    # 4. Delete the run and verify cascade deletion of classification result
    delete_resp = client.delete(f"/api/runs/{run_id}")
    assert delete_resp.status_code == 200

    # Verify result is also gone
    gone_resp = client.get(f"/api/runs/{run_id}/results")
    assert gone_resp.status_code == 404


def test_attach_invalid_result_to_run_fails(client: TestClient):
    """Attaching invalid result payload returns 422 and does not corrupt the run."""
    # Create run
    fasta_content = ">ASV_0001\nACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGT\n"
    create_resp = client.post(
        "/api/runs",
        files={"file": ("test_sample.fasta", fasta_content.encode("utf-8"), "text/plain")},
    )
    run_id = create_resp.json()["run_id"]

    # Attempt to attach invalid payload
    bad_payload = {"invalid": "data"}
    attach_resp = client.post(f"/api/runs/{run_id}/results", json=bad_payload)
    assert attach_resp.status_code == 422

    # Check run still exists with unclassified status
    run_resp = client.get(f"/api/runs/{run_id}")
    assert run_resp.status_code == 200
    assert run_resp.json()["classification_status"] == "unclassified"
