import pytest
from app.services.validation import validate_fasta_content


def test_validate_valid_fasta():
    """Verify structurally sound sequence returns valid status."""
    seq_data = (
        ">ASV_001\n" + ("ACGT" * 60) + "\n"  # 240 bp (>200 bp)
        ">ASV_002\n" + ("TGCA" * 70) + "\n"  # 280 bp
    )
    res = validate_fasta_content("valid.fasta", seq_data, len(seq_data.encode()))
    assert res.validation_status == "valid"
    assert res.total_sequences == 2
    assert res.valid_sequences == 2
    assert res.invalid_sequences == 0
    assert len(res.errors) == 0


def test_validate_empty_file():
    """Verify empty file returns invalid with specific error."""
    res = validate_fasta_content("empty.fasta", "", 0)
    assert res.validation_status == "invalid"
    assert res.total_sequences == 0
    assert len(res.errors) == 1
    assert "Uploaded file is empty" in res.errors[0].message


def test_validate_empty_sequence_body():
    """Verify sequence header with no nucleotide data fails validation."""
    seq_data = ">ASV_EMPTY\n>ASV_NORMAL\n" + ("ACGT" * 60) + "\n"
    res = validate_fasta_content("test.fasta", seq_data, len(seq_data.encode()))
    assert res.validation_status == "invalid"
    assert res.total_sequences == 2
    assert res.valid_sequences == 1
    assert res.invalid_sequences == 1
    assert any("contains no nucleotide sequence data" in e.message for e in res.errors)


def test_validate_invalid_characters():
    """Verify unsupported non-nucleotide characters (e.g. 123, X, @) trigger invalid sequence error."""
    seq_data = ">ASV_BAD\nACGT123ZZZ@@@\n"
    res = validate_fasta_content("bad_chars.fasta", seq_data, len(seq_data.encode()))
    assert res.validation_status == "invalid"
    assert res.invalid_sequences == 1
    assert any("unsupported characters" in e.message for e in res.errors)


def test_validate_ambiguous_iupac_characters():
    """Verify IUPAC ambiguity codes (e.g. N, R, Y) are accepted but generate QC warnings."""
    seq_data = ">ASV_AMBIG\n" + ("ACGT" * 55) + "NNNN" + "\n"
    res = validate_fasta_content("ambig.fasta", seq_data, len(seq_data.encode()))
    assert res.validation_status == "valid"  # IUPAC characters are valid sequence representations
    assert res.valid_sequences == 1
    assert len(res.warnings) > 0
    assert any("contains_ambiguous_bases" in w.qc_flags[0] for w in res.warnings)


def test_validate_short_sequence_length():
    """Verify sequences shorter than 200 bp trigger length QC flag."""
    seq_data = ">ASV_SHORT\nACGTACGTACGT\n"  # 12 bp
    res = validate_fasta_content("short.fasta", seq_data, len(seq_data.encode()))
    assert res.valid_sequences == 1
    assert any("length_below_200" in flag for s in res.sequences for flag in s.qc_flags)
    assert any("below the expected 18S V4 amplicon threshold" in w.message for w in res.warnings)


def test_validate_duplicate_sequence_ids():
    """Verify duplicate sequence identifiers in the same file are detected and rejected."""
    seq_data = (
        ">ASV_DUP\n" + ("ACGT" * 60) + "\n"
        ">ASV_DUP\n" + ("TGCA" * 60) + "\n"
    )
    res = validate_fasta_content("dup.fasta", seq_data, len(seq_data.encode()))
    assert res.validation_status == "invalid"
    assert res.invalid_sequences == 1
    assert any("Duplicate sequence identifier 'ASV_DUP'" in e.message for e in res.errors)
