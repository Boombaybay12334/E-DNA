import io
import os
import pytest
from app.database.models import AnalysisRunModel, SequenceRecordModel, RunErrorModel, RunWarningModel


def test_post_runs_creates_run_and_persists_records(client, db_session):
    """Verify POST /api/runs creates an Analysis Run entity, sequence records, and returns HTTP 201."""
    content = (
        ">ASV_01 Marine dinoflagellate\n" + ("ACGT" * 60) + "\n"  # 240 bp
        ">ASV_02 Prasinophyte\n" + ("TGCA" * 70) + "\n"          # 280 bp
        ">ASV_03 Short truncated\n" + ("ACGT" * 25) + "\n"       # 100 bp (< 200 bp QC flag)
    ).encode("utf-8")

    files = {"file": ("station_alpha.fasta", io.BytesIO(content), "text/plain")}
    data = {
        "threshold_tau": 0.65,
        "reference_database": "PR2 v5.0.0",
        "marker_gene": "18S rRNA",
        "marker_region": "V4",
    }

    response = client.post("/api/runs", files=files, data=data)
    assert response.status_code == 201
    run = response.json()

    # Verify run metadata
    assert run["run_id"].startswith("run-")
    assert run["filename"] == "station_alpha.fasta"
    assert run["total_sequences"] == 3
    assert run["valid_sequences"] == 3
    assert run["invalid_sequences"] == 0
    assert run["qc_warning_count"] == 1
    assert run["validation_status"] == "valid"
    assert run["run_status"] == "validated"
    assert run["classification_status"] == "unclassified"
    assert run["threshold_tau"] == 0.65
    assert run["reference_database"] == "PR2 v5.0.0"
    assert run["marker"]["gene"] == "18S rRNA"
    assert run["marker"]["region"] == "V4"

    # Verify warnings persisted
    assert len(run["warnings"]) == 1
    assert run["warnings"][0]["sequence_id"] == "ASV_03"
    assert "length_below_200" in run["warnings"][0]["qc_flags"]

    # Verify sequence preview
    assert len(run["sequence_sample"]) == 3
    assert run["sequence_sample"][0]["sequence_id"] == "ASV_01"
    assert run["sequence_sample"][0]["length"] == 240
    assert run["sequence_sample"][2]["sequence_id"] == "ASV_03"
    assert run["sequence_sample"][2]["length"] == 100

    # Verify directly in database
    db_run = db_session.query(AnalysisRunModel).filter_by(run_id=run["run_id"]).first()
    assert db_run is not None
    assert db_run.filename == "station_alpha.fasta"

    db_seqs = db_session.query(SequenceRecordModel).filter_by(run_id=run["run_id"]).all()
    assert len(db_seqs) == 3


def test_runs_unique_ids(client):
    """Verify consecutive uploads produce distinct unique run IDs."""
    content = b">ASV_UNIQ\n" + (b"ACGT" * 60) + b"\n"
    res1 = client.post("/api/runs", files={"file": ("run1.fasta", io.BytesIO(content), "text/plain")})
    res2 = client.post("/api/runs", files={"file": ("run2.fasta", io.BytesIO(content), "text/plain")})
    assert res1.status_code == 201
    assert res2.status_code == 201
    assert res1.json()["run_id"] != res2.json()["run_id"]


def test_runs_sequence_order_preserved(client):
    """Verify original FASTA sequence order is preserved exactly in order_index."""
    content = (
        ">SEQ_FIRST\n" + ("ACGT" * 60) + "\n"
        ">SEQ_SECOND\n" + ("TGCA" * 60) + "\n"
        ">SEQ_THIRD\n" + ("GGCC" * 60) + "\n"
        ">SEQ_FOURTH\n" + ("AATT" * 60) + "\n"
    ).encode("utf-8")

    files = {"file": ("ordered.fasta", io.BytesIO(content), "text/plain")}
    create_res = client.post("/api/runs", files=files)
    assert create_res.status_code == 201
    run_id = create_res.json()["run_id"]

    seq_res = client.get(f"/api/runs/{run_id}/sequences")
    assert seq_res.status_code == 200
    data = seq_res.json()
    assert data["total"] == 4
    seqs = data["sequences"]
    assert seqs[0]["sequence_id"] == "SEQ_FIRST"
    assert seqs[0]["order_index"] == 0
    assert seqs[1]["sequence_id"] == "SEQ_SECOND"
    assert seqs[1]["order_index"] == 1
    assert seqs[2]["sequence_id"] == "SEQ_THIRD"
    assert seqs[2]["order_index"] == 2
    assert seqs[3]["sequence_id"] == "SEQ_FOURTH"
    assert seqs[3]["order_index"] == 3


def test_get_runs_list_and_pagination(client):
    """Verify GET /api/runs returns paginated runs ordered newest first."""
    content = b">ASV_01\n" + (b"ACGT" * 60) + b"\n"
    for i in range(3):
        client.post("/api/runs", files={"file": (f"run_{i}.fasta", io.BytesIO(content), "text/plain")})

    # Page 1: limit 2, offset 0
    res1 = client.get("/api/runs?limit=2&offset=0")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["limit"] == 2
    assert data1["offset"] == 0
    assert len(data1["items"]) == 2
    assert data1["total"] >= 3

    # Page 2: limit 2, offset 2
    res2 = client.get("/api/runs?limit=2&offset=2")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["limit"] == 2
    assert data2["offset"] == 2
    assert len(data2["items"]) >= 1


def test_get_run_detail_and_404(client):
    """Verify GET /api/runs/{run_id} returns details and returns 404 for unknown run."""
    content = b">ASV_DET\n" + (b"ACGT" * 60) + b"\n"
    create_res = client.post("/api/runs", files={"file": ("detail.fasta", io.BytesIO(content), "text/plain")})
    run_id = create_res.json()["run_id"]

    res = client.get(f"/api/runs/{run_id}")
    assert res.status_code == 200
    assert res.json()["run_id"] == run_id
    assert res.json()["filename"] == "detail.fasta"

    # Test nonexistent run ID
    res_404 = client.get("/api/runs/nonexistent-run-999")
    assert res_404.status_code == 404
    assert "not found" in res_404.json()["detail"].lower()


def test_get_run_sequences_pagination(client):
    """Verify sequence pagination works for GET /api/runs/{run_id}/sequences."""
    content = (
        ">S1\n" + ("ACGT" * 60) + "\n"
        ">S2\n" + ("TGCA" * 60) + "\n"
        ">S3\n" + ("GGCC" * 60) + "\n"
    ).encode("utf-8")

    create_res = client.post("/api/runs", files={"file": ("page.fasta", io.BytesIO(content), "text/plain")})
    run_id = create_res.json()["run_id"]

    page1 = client.get(f"/api/runs/{run_id}/sequences?limit=2&offset=0")
    assert page1.status_code == 200
    assert len(page1.json()["sequences"]) == 2

    page2 = client.get(f"/api/runs/{run_id}/sequences?limit=2&offset=2")
    assert page2.status_code == 200
    assert len(page2.json()["sequences"]) == 1

    # 404 test
    not_found = client.get("/api/runs/nonexistent-run/sequences")
    assert not_found.status_code == 404


def test_get_run_insights(client):
    """Verify GET /api/runs/{run_id}/insights returns validation-only metrics."""
    content = (
        ">ASV_01\n" + ("ACGT" * 50) + "\n"  # 200 bp
        ">ASV_02\n" + ("TGCA" * 75) + "\n"  # 300 bp
        ">ASV_03\n" + ("GGCC" * 100) + "\n" # 400 bp
    ).encode("utf-8")

    create_res = client.post("/api/runs", files={"file": ("stats.fasta", io.BytesIO(content), "text/plain")})
    run_id = create_res.json()["run_id"]

    res = client.get(f"/api/runs/{run_id}/insights")
    assert res.status_code == 200
    insights = res.json()
    assert insights["run_id"] == run_id
    assert insights["total_sequences"] == 3
    assert insights["valid_sequences"] == 3
    assert insights["length_summary"]["min_bp"] == 200
    assert insights["length_summary"]["max_bp"] == 400
    assert insights["length_summary"]["avg_bp"] == 300.0
    assert "taxonomic" not in insights
    assert "classification" in insights["notice"].lower()

    # 404 test
    res_404 = client.get("/api/runs/nonexistent/insights")
    assert res_404.status_code == 404


def test_delete_run_cascades_child_records(client, db_session):
    """Verify DELETE /api/runs/{run_id} deletes run and cascades to sequences, errors, and warnings."""
    content = (
        ">ASV_DEL1\n" + ("ACGT" * 60) + "\n"
        ">ASV_DEL2\nACGT123\n"  # Invalid character error
    ).encode("utf-8")

    create_res = client.post("/api/runs", files={"file": ("to_delete.fasta", io.BytesIO(content), "text/plain")})
    assert create_res.status_code == 201
    run_id = create_res.json()["run_id"]

    # Verify records in DB before delete
    assert db_session.query(AnalysisRunModel).filter_by(run_id=run_id).count() == 1
    assert db_session.query(SequenceRecordModel).filter_by(run_id=run_id).count() == 2
    assert db_session.query(RunErrorModel).filter_by(run_id=run_id).count() >= 1

    # Delete run
    del_res = client.delete(f"/api/runs/{run_id}")
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json()["message"]

    # Verify run is gone
    get_res = client.get(f"/api/runs/{run_id}")
    assert get_res.status_code == 404

    # Verify cascade deleted child records in DB
    assert db_session.query(AnalysisRunModel).filter_by(run_id=run_id).count() == 0
    assert db_session.query(SequenceRecordModel).filter_by(run_id=run_id).count() == 0
    assert db_session.query(RunErrorModel).filter_by(run_id=run_id).count() == 0
    assert db_session.query(RunWarningModel).filter_by(run_id=run_id).count() == 0

    # Repeat delete returns 404
    del_again = client.delete(f"/api/runs/{run_id}")
    assert del_again.status_code == 404


def test_post_runs_with_example_query_fasta(client):
    """Verify creating a run with the actual contract/example_query.fasta fixture."""
    contract_fasta = os.path.join(
        os.path.dirname(__file__), "..", "..", "contract", "example_query.fasta"
    )
    with open(contract_fasta, "rb") as f:
        file_bytes = f.read()

    files = {"file": ("example_query.fasta", io.BytesIO(file_bytes), "text/plain")}
    res = client.post("/api/runs", files=files)
    assert res.status_code == 201
    run = res.json()
    assert run["total_sequences"] == 6
    assert run["valid_sequences"] == 6
    assert run["qc_warning_count"] == 2
    assert run["validation_status"] == "valid"
    assert run["classification_status"] == "unclassified"
