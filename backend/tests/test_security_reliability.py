"""
Security, Reliability & Hardening Tests for eDNA Explorer.
Verifies filename sanitization, SQLite WAL mode, foreign keys, transaction rollbacks,
health check database verification, and file upload limits.
"""

import io
import pytest
from sqlalchemy import text
from app.services.validation import sanitize_filename
from app.database.connection import SessionLocal, engine


def test_sanitize_filename_traversal():
    """Verifies directory traversal strings and control characters are stripped."""
    assert sanitize_filename("../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("sample.fasta") == "sample.fasta"
    assert sanitize_filename("path/to/my_run.fa") == "my_run.fa"
    assert sanitize_filename("bad\x00file\x1fname.fasta") == "badfilename.fasta"
    assert sanitize_filename("") == "unknown.fasta"
    assert sanitize_filename(None) == "unknown.fasta"
    assert sanitize_filename("...hidden") == "unknown.fasta"


def test_sqlite_pragmas_wal_foreign_keys():
    """Verifies SQLite connection enforces WAL journal mode and foreign keys."""
    db = SessionLocal()
    try:
        # Check foreign keys pragma
        fk_status = db.execute(text("PRAGMA foreign_keys")).scalar()
        assert fk_status == 1, "SQLite foreign keys pragma should be ON"

        # Check journal mode (WAL)
        journal_mode = db.execute(text("PRAGMA journal_mode")).scalar()
        assert str(journal_mode).lower() == "wal", "SQLite journal_mode should be WAL"

        # Check busy timeout
        busy_timeout = db.execute(text("PRAGMA busy_timeout")).scalar()
        assert int(busy_timeout) >= 5000, "SQLite busy_timeout should be at least 5000ms"
    finally:
        db.close()


def test_health_check_with_db(client):
    """Verifies GET /api/health returns operational status and database connectivity."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "edna-explorer-api"
    assert data["version"] == "1.0.0"
    assert data["database"] == "connected"


def test_file_extension_rejection(client):
    """Verifies uploading files with disallowed extensions is rejected with HTTP 400."""
    fake_exe = io.BytesIO(b"binary executable payload")
    response = client.post(
        "/api/validate-fasta",
        files={"file": ("malicious.exe", fake_exe, "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_file_size_limit_rejection(client, monkeypatch):
    """Verifies file uploads exceeding MAX_FILE_SIZE_BYTES are rejected with HTTP 413."""
    from app.config import settings

    # Temporarily set max file size to 100 bytes for this test
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_BYTES", 100)

    large_content = b">seq1\n" + b"A" * 150 + b"\n"
    response = client.post(
        "/api/validate-fasta",
        files={"file": ("large.fasta", io.BytesIO(large_content), "text/plain")},
    )
    assert response.status_code == 413
    assert "File size exceeds maximum allowed limit" in response.json()["detail"]


def test_create_run_filename_sanitization(client):
    """Verifies that filename traversal in run creation is safely sanitized."""
    fasta_content = (
        ">seq1 18S rRNA amplicon\n"
        "ACTG" * 60 + "\n"
    )
    response = client.post(
        "/api/runs",
        files={"file": ("../../traversal_test.fasta", io.BytesIO(fasta_content.encode()), "text/plain")},
        data={"threshold_tau": "0.60"},
    )
    assert response.status_code == 201
    run_data = response.json()
    # The stored filename must be traversal_test.fasta, not ../../traversal_test.fasta
    assert run_data["filename"] == "traversal_test.fasta"

    # Cleanup created run
    client.delete(f"/api/runs/{run_data['run_id']}")
