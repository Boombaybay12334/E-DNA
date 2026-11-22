import pytest
from app.services.fasta_parser import parse_fasta_text, extract_sequence_id


def test_extract_sequence_id():
    """Verify sequence ID extraction splits on space, tab, and semicolon."""
    assert extract_sequence_id(">ASV_001") == "ASV_001"
    assert extract_sequence_id(">ASV_002 marine dinoflagellate 18S") == "ASV_002"
    assert extract_sequence_id(">ASV_003;size=42;sample=A") == "ASV_003"
    assert extract_sequence_id(">ASV_004\tannotation") == "ASV_004"
    assert extract_sequence_id(">") == ""


def test_parse_simple_fasta():
    """Verify single-line standard FASTA parsing."""
    raw = ">ASV_001\nATGC\n>ASV_002\nCGTA\n"
    res = parse_fasta_text(raw)
    assert len(res.records) == 2
    assert res.records[0].sequence_id == "ASV_001"
    assert res.records[0].sequence == "ATGC"
    assert res.records[1].sequence_id == "ASV_002"
    assert res.records[1].sequence == "CGTA"
    assert len(res.syntax_errors) == 0


def test_parse_multiline_sequence():
    """Verify multiline sequence concatenation and whitespace trimming."""
    raw = (
        ">ASV_MULTILINE complex amplicon\n"
        "ATGC GTAC\n"
        "NNNN AAAA\n"
        "TTTT CCCC\n"
    )
    res = parse_fasta_text(raw)
    assert len(res.records) == 1
    rec = res.records[0]
    assert rec.sequence_id == "ASV_MULTILINE"
    assert rec.sequence == "ATGCGTACNNNNAAAATTTTCCCC"
    assert rec.line_number == 1


def test_parse_crlf_newlines():
    """Verify CRLF (Windows) newline handling."""
    raw = ">ASV_WIN_1\r\nACGT\r\n>ASV_WIN_2\r\nTGCA\r\n"
    res = parse_fasta_text(raw)
    assert len(res.records) == 2
    assert res.records[0].sequence == "ACGT"
    assert res.records[1].sequence == "TGCA"


def test_parse_sequence_without_header():
    """Verify syntax error is logged when sequence data precedes any header."""
    raw = "ACGTACGT\n>ASV_001\nTGCA\n"
    res = parse_fasta_text(raw)
    assert len(res.syntax_errors) > 0
    assert any("Sequence data found before any FASTA header" in err[1] for err in res.syntax_errors)
    assert len(res.records) == 1
    assert res.records[0].sequence_id == "ASV_001"


def test_parse_empty_content():
    """Verify parser handles empty or whitespace-only content cleanly."""
    res = parse_fasta_text("   \n\n\t  ")
    assert len(res.records) == 0
    assert len(res.syntax_errors) == 0
