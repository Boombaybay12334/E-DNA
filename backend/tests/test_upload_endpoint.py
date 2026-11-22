import os
import io
import pytest


def test_upload_valid_fasta(client):
    """Verify POST /api/validate-fasta processes a standard FASTA upload."""
    content = (
        ">ASV_T1 18S amplicon A\n" + ("ACGT" * 60) + "\n"
        ">ASV_T2 18S amplicon B\n" + ("TGCA" * 65) + "\n"
    ).encode("utf-8")

    files = {"file": ("test_library.fasta", io.BytesIO(content), "text/plain")}
    response = client.post("/api/validate-fasta", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test_library.fasta"
    assert data["validation_status"] == "valid"
    assert data["total_sequences"] == 2
    assert data["valid_sequences"] == 2
    assert data["invalid_sequences"] == 0
    assert len(data["sequences"]) == 2
    assert data["sequences"][0]["sequence_id"] == "ASV_T1"
    assert data["sequences"][0]["length"] == 240
    # Confirm raw DNA sequence is NOT returned in response
    assert "sequence" not in data["sequences"][0]


def test_upload_unsupported_file_extension(client):
    """Verify uploading .txt or .csv file extension returns HTTP 400."""
    content = b">ASV_001\nACGT\n"
    files = {"file": ("dataset.txt", io.BytesIO(content), "text/plain")}
    response = client.post("/api/validate-fasta", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "Unsupported file extension '.txt'" in data["detail"]


def test_upload_empty_file(client):
    """Verify uploading an empty 0-byte file returns invalid validation_status."""
    files = {"file": ("empty.fasta", io.BytesIO(b""), "application/octet-stream")}
    response = client.post("/api/validate-fasta", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["validation_status"] == "invalid"
    assert data["total_sequences"] == 0
    assert any("empty" in e["message"].lower() for e in data["errors"])


def test_upload_file_with_invalid_characters(client):
    """Verify sequences with illegal characters are reported as invalid."""
    content = b">ASV_ERR\nACGT123XYZ\n"
    files = {"file": ("invalid_chars.fa", io.BytesIO(content), "text/plain")}
    response = client.post("/api/validate-fasta", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["validation_status"] == "invalid"
    assert data["invalid_sequences"] == 1
    assert any("unsupported characters" in e["message"] for e in data["errors"])


def test_upload_real_contract_query_fasta(client):
    """Verify uploading the actual contract/example_query.fasta fixture."""
    contract_fasta_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "contract", "example_query.fasta"
    )
    assert os.path.exists(contract_fasta_path), "Contract query FASTA must exist"

    with open(contract_fasta_path, "rb") as f:
        file_bytes = f.read()

    files = {"file": ("example_query.fasta", io.BytesIO(file_bytes), "text/plain")}
    response = client.post("/api/validate-fasta", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "example_query.fasta"
    assert data["total_sequences"] == 6
    # In contract query: ASV_0004 has length 122 bp (QC flag length_below_200)
    # ASV_0005 has N (QC flag contains_ambiguous_bases)
    # All are valid IUPAC sequences
    assert data["valid_sequences"] == 6
    assert data["invalid_sequences"] == 0
    assert len(data["warnings"]) > 0


def test_upload_file_size_limit(client, monkeypatch):
    """Verify file exceeding MAX_FILE_SIZE_BYTES returns HTTP 413."""
    from app.config import settings
    # Temporarily set small file limit for test
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_BYTES", 50)

    oversized_content = b">ASV_BIG\n" + (b"ACGT" * 30)
    files = {"file": ("oversized.fna", io.BytesIO(oversized_content), "text/plain")}
    response = client.post("/api/validate-fasta", files=files)
    assert response.status_code == 413
    assert "exceeds maximum allowed limit" in response.json()["detail"]
