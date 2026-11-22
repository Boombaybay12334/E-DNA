"""
Full System Integration Tests for Phase 8.

Verifies end-to-end backend integration covering:
1. FASTA file intake and validation (POST /api/validate-fasta)
2. Analysis run creation and persistence (POST /api/runs)
3. Run list and pagination (GET /api/runs)
4. Run details, error tracking, and sequence retrieval (GET /api/runs/{run_id}, GET /api/runs/{run_id}/sequences)
5. Contract v1.0 result attachment (POST /api/runs/{run_id}/results)
6. Result payload retrieval (GET /api/runs/{run_id}/results)
7. Dynamic threshold reapplication (POST /api/runs/{run_id}/reapply-threshold, POST /api/assignment/reapply-threshold)
8. Run deletion and cascading cleanup (DELETE /api/runs/{run_id})
9. Synthetic fixture contract adherence (GET /api/results/fixture)
"""

import json
import os
import io
import pytest
from fastapi.testclient import TestClient

SAMPLE_FASTA = """>SEQ_18S_001 Marine flagellate
ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG
>SEQ_18S_002 Novel diatom
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTA
>SEQ_18S_003 Invalid chars
ACGT123ZZZ
"""


@pytest.fixture
def example_result_payload():
    """Loads contract/example_result.json from workspace."""
    fixture_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "contract", "example_result.json")
    )
    with open(fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


def test_full_lifecycle_end_to_end(client: TestClient, example_result_payload):
    """
    Complete end-to-end lifecycle test tracing a FASTA file through upload,
    validation, persistence, result attachment, threshold updating, and deletion.
    """
    # -------------------------------------------------------------
    # Step 1: Validate FASTA file via POST /api/validate-fasta
    # -------------------------------------------------------------
    val_file = io.BytesIO(SAMPLE_FASTA.encode("utf-8"))
    val_resp = client.post(
        "/api/validate-fasta",
        files={"file": ("sample_eukaryotes.fasta", val_file, "text/plain")},
    )
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["filename"] == "sample_eukaryotes.fasta"
    assert val_data["total_sequences"] == 3
    assert val_data["valid_sequences"] == 2
    assert val_data["invalid_sequences"] == 1
    assert len(val_data["warnings"]) >= 1

    # -------------------------------------------------------------
    # Step 2: Create Persistent Analysis Run via POST /api/runs
    # -------------------------------------------------------------
    run_file = io.BytesIO(SAMPLE_FASTA.encode("utf-8"))
    run_resp = client.post(
        "/api/runs",
        files={"file": ("sample_eukaryotes.fasta", run_file, "text/plain")},
        data={
            "threshold_tau": 0.65,
            "reference_database": "PR2 v5.0.0",
            "marker_gene": "18S rRNA",
            "marker_region": "V4",
            "target_group": "eukaryotes",
        },
    )
    assert run_resp.status_code == 201
    run_data = run_resp.json()
    run_id = run_data["run_id"]
    assert run_id.startswith("run-")
    assert run_data["total_sequences"] == 3
    assert run_data["valid_sequences"] == 2
    assert run_data["invalid_sequences"] == 1
    assert run_data["classification_status"] == "unclassified"
    assert run_data["threshold_tau"] == 0.65

    # -------------------------------------------------------------
    # Step 3: Verify Run Listing and Pagination (GET /api/runs)
    # -------------------------------------------------------------
    list_resp = client.get("/api/runs?limit=20&offset=0")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total"] >= 1
    matched = [r for r in list_data["items"] if r["run_id"] == run_id]
    assert len(matched) == 1
    assert matched[0]["classification_status"] == "unclassified"

    # -------------------------------------------------------------
    # Step 4: Verify Run Sequences Preservation (GET /api/runs/{run_id}/sequences)
    # -------------------------------------------------------------
    seqs_resp = client.get(f"/api/runs/{run_id}/sequences?limit=10&offset=0")
    assert seqs_resp.status_code == 200
    seqs_data = seqs_resp.json()
    assert seqs_data["total"] == 3
    assert seqs_data["sequences"][0]["sequence_id"] == "SEQ_18S_001"
    assert seqs_data["sequences"][1]["sequence_id"] == "SEQ_18S_002"
    assert seqs_data["sequences"][2]["sequence_id"] == "SEQ_18S_003"
    assert seqs_data["sequences"][2]["valid"] is False

    # -------------------------------------------------------------
    # Step 5: Attach Contract v1.0 Classification Results (POST /api/runs/{run_id}/results)
    # -------------------------------------------------------------
    # Clone fixture payload and adapt run metadata to point to our newly created run
    payload_to_attach = dict(example_result_payload)
    payload_to_attach["run"] = dict(payload_to_attach["run"])
    payload_to_attach["run"]["run_id"] = run_id

    attach_resp = client.post(
        f"/api/runs/{run_id}/results",
        json=payload_to_attach,
    )
    assert attach_resp.status_code == 201
    attach_data = attach_resp.json()
    assert attach_data["run_id"] == run_id
    assert attach_data["contract_version"] == "1.0"
    assert attach_data["sequence_count"] == 6

    # -------------------------------------------------------------
    # Step 6: Verify Results Retrieval (GET /api/runs/{run_id}/results)
    # -------------------------------------------------------------
    get_res_resp = client.get(f"/api/runs/{run_id}/results")
    assert get_res_resp.status_code == 200
    retrieved = get_res_resp.json()
    assert retrieved["contract_version"] == "1.0"
    assert retrieved["run"]["run_id"] == run_id
    assert len(retrieved["sequences"]) == 6

    # -------------------------------------------------------------
    # Step 7: Reapply Threshold via Backend (POST /api/runs/{run_id}/reapply-threshold)
    # -------------------------------------------------------------
    reapply_resp = client.post(
        f"/api/runs/{run_id}/reapply-threshold",
        json={"threshold_tau": 0.85},
    )
    assert reapply_resp.status_code == 200

    # Fetch updated results to verify that tau was updated to 0.85
    updated_res = client.get(f"/api/runs/{run_id}/results").json()
    assert updated_res["run"]["threshold"]["tau"] == 0.85

    # -------------------------------------------------------------
    # Step 8: Stateless Threshold Reapplication (POST /api/assignment/reapply-threshold)
    # -------------------------------------------------------------
    stateless_resp = client.post(
        "/api/assignment/reapply-threshold",
        json={
            "threshold_tau": 0.40,
            "payload": updated_res,
        },
    )
    assert stateless_resp.status_code == 200
    stateless_data = stateless_resp.json()
    assert stateless_data["run"]["threshold"]["tau"] == 0.40
    # Original stored run in database must remain at 0.85 (stateless check)
    original_check = client.get(f"/api/runs/{run_id}/results").json()
    assert original_check["run"]["threshold"]["tau"] == 0.85

    # -------------------------------------------------------------
    # Step 9: Delete Run and Verify Cascade Cleanup (DELETE /api/runs/{run_id})
    # -------------------------------------------------------------
    del_resp = client.delete(f"/api/runs/{run_id}")
    assert del_resp.status_code == 200

    # Verify run is deleted
    assert client.get(f"/api/runs/{run_id}").status_code == 404
    assert client.get(f"/api/runs/{run_id}/sequences").status_code == 404
    assert client.get(f"/api/runs/{run_id}/results").status_code == 404


def test_synthetic_fixture_endpoint_contract(client: TestClient):
    """GET /api/results/fixture returns valid Contract v1.0 fixture with mandatory disclaimer."""
    resp = client.get("/api/results/fixture")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_synthetic"] is True
    assert "SYNTHETIC/FIXTURE DATA ONLY" in data["disclaimer"]
    assert data["data"]["contract_version"] == "1.0"
    assert len(data["data"]["sequences"]) == 6
