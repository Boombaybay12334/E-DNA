import re
from dataclasses import dataclass
from typing import List, Tuple, Optional


@dataclass
class ParsedRecord:
    """Represents a parsed FASTA record."""
    sequence_id: str
    header: str
    sequence: str
    line_number: int


@dataclass
class ParserResult:
    """Output from the FASTA parser containing records and any syntax-level errors."""
    records: List[ParsedRecord]
    syntax_errors: List[Tuple[Optional[str], str]]


def extract_sequence_id(header_line: str) -> str:
    """
    Extracts canonical sequence identifier from header line.
    Separates at first whitespace or semicolon (common in amplicon pipelines such as DADA2/VSEARCH).
    """
    header_clean = header_line.lstrip(">").strip()
    if not header_clean:
        return ""
    # Split by whitespace or semicolon
    match = re.split(r"[\s;]", header_clean, maxsplit=1)
    return match[0].strip() if match else header_clean


def parse_fasta_text(fasta_content: str) -> ParserResult:
    """
    Parses FASTA format text with support for:
    - Multiline nucleotide sequence blocks
    - Windows (CRLF), Unix (LF), and legacy Mac (CR) newlines
    - Whitespace trimming
    - Detection of missing sequence headers
    - Detection of empty sequences (headers without sequence data)
    """
    records: List[ParsedRecord] = []
    syntax_errors: List[Tuple[Optional[str], str]] = []

    lines = fasta_content.splitlines()

    current_id: Optional[str] = None
    current_header: str = ""
    current_seq_parts: List[str] = []
    header_line_number: int = 0
    has_seen_header: bool = False

    def flush_record():
        nonlocal current_id, current_header, current_seq_parts, header_line_number
        if current_id is not None:
            full_seq = "".join(current_seq_parts).replace(" ", "").replace("\t", "").upper()
            records.append(
                ParsedRecord(
                    sequence_id=current_id,
                    header=current_header,
                    sequence=full_seq,
                    line_number=header_line_number,
                )
            )

    for line_idx, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line:
            # Ignore blank lines between sequences
            continue

        if line.startswith(">"):
            # New sequence header encountered
            has_seen_header = True
            flush_record()

            raw_header = line[1:].strip()
            seq_id = extract_sequence_id(line)

            if not seq_id:
                syntax_errors.append(
                    (None, f"Line {line_idx}: Header is missing a valid sequence identifier.")
                )
                current_id = f"UNNAMED_SEQ_{len(records) + 1}"
            else:
                current_id = seq_id

            current_header = raw_header
            current_seq_parts = []
            header_line_number = line_idx
        else:
            # Sequence nucleotide line
            if not has_seen_header:
                syntax_errors.append(
                    (None, f"Line {line_idx}: Sequence data found before any FASTA header (missing '>').")
                )
                continue

            current_seq_parts.append(line)

    # Flush final record
    flush_record()

    return ParserResult(records=records, syntax_errors=syntax_errors)
