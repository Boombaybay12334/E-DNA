import os
import re
from typing import Set, List, Optional
from app.schemas.sequence import SequenceQCItem, SequenceErrorItem, SequenceWarningItem
from app.schemas.response import ValidateFastaResponse
from app.services.fasta_parser import parse_fasta_text
from app.config import settings

# IUPAC standard nucleotide codes:
# Canonical bases: A, C, G, T (and U for RNA amplicon transcripts)
# Ambiguity codes:
# R = G|A, Y = T|C, S = G|C, W = A|T, K = G|T, M = A|C,
# B = C|G|T, D = A|G|T, H = A|C|T, V = A|C|G, N = any
CANONICAL_BASES: Set[str] = set("ACGTU")
IUPAC_AMBIGUOUS_BASES: Set[str] = set("RYWSKMBVDHN")
VALID_IUPAC_NUCLEOTIDES: Set[str] = CANONICAL_BASES.union(IUPAC_AMBIGUOUS_BASES)


def sanitize_filename(filename: Optional[str]) -> str:
    """
    Sanitizes an uploaded filename to prevent directory traversal attacks,
    null byte injection, or unprintable control character exploits.
    """
    if not filename:
        return "unknown.fasta"
    # Strip any directory hierarchy (e.g., ../../etc/passwd -> passwd)
    basename = os.path.basename(filename.replace("\\", "/"))
    # Remove control characters, null bytes, and non-printable characters
    clean = re.sub(r"[\x00-\x1f\x7f]", "", basename).strip()
    if not clean or clean.startswith("."):
        return "unknown.fasta"
    return clean


def validate_fasta_content(
    filename: str,
    content_str: str,
    file_size_bytes: int,
) -> ValidateFastaResponse:
    """
    Performs comprehensive structural, formatting, and biological chemistry validation
    on uploaded FASTA file contents for 18S rRNA V4 environmental amplicon analysis.
    """
    safe_filename = sanitize_filename(filename)
    errors: List[SequenceErrorItem] = []
    warnings: List[SequenceWarningItem] = []
    sequences: List[SequenceQCItem] = []

    # 1. Empty file verification
    if file_size_bytes == 0 or not content_str.strip():
        return ValidateFastaResponse(
            filename=safe_filename,
            file_size_bytes=file_size_bytes,
            validation_status="invalid",
            total_sequences=0,
            valid_sequences=0,
            invalid_sequences=0,
            sequences=[],
            errors=[SequenceErrorItem(sequence_id=None, message="Uploaded file is empty.")],
            warnings=[],
        )

    # 2. Parse FASTA records and collect syntax errors
    parse_result = parse_fasta_text(content_str)

    for seq_id, syntax_msg in parse_result.syntax_errors:
        errors.append(SequenceErrorItem(sequence_id=seq_id, message=syntax_msg))

    if not parse_result.records:
        if not errors:
            errors.append(
                SequenceErrorItem(
                    sequence_id=None,
                    message="No valid FASTA headers found in file. Headers must begin with '>'.",
                )
            )
        return ValidateFastaResponse(
            filename=filename,
            file_size_bytes=file_size_bytes,
            validation_status="invalid",
            total_sequences=0,
            valid_sequences=0,
            invalid_sequences=0,
            sequences=[],
            errors=errors,
            warnings=[],
        )

    # 3. Validate each individual record
    seen_ids: Set[str] = set()
    total_count = len(parse_result.records)
    valid_count = 0
    invalid_count = 0

    for record in parse_result.records:
        seq_id = record.sequence_id
        seq = record.sequence
        length = len(seq)
        qc_flags: List[str] = []
        is_record_valid = True

        # Check duplicate identifier
        if seq_id in seen_ids:
            is_record_valid = False
            errors.append(
                SequenceErrorItem(
                    sequence_id=seq_id,
                    message=f"Duplicate sequence identifier '{seq_id}' detected.",
                )
            )
        else:
            seen_ids.add(seq_id)

        # Check empty sequence
        if length == 0:
            is_record_valid = False
            errors.append(
                SequenceErrorItem(
                    sequence_id=seq_id,
                    message=f"Sequence '{seq_id}' contains no nucleotide sequence data (0 bp).",
                )
            )
        else:
            # Check character validity against IUPAC alphabet
            seq_char_set = set(seq)
            unsupported_chars = seq_char_set - VALID_IUPAC_NUCLEOTIDES

            if unsupported_chars:
                is_record_valid = False
                unsupported_str = ", ".join(f"'{c}'" for c in sorted(unsupported_chars))
                errors.append(
                    SequenceErrorItem(
                        sequence_id=seq_id,
                        message=f"Sequence '{seq_id}' contains unsupported characters: {unsupported_str}.",
                    )
                )

            # Check for ambiguous IUPAC characters
            ambiguous_chars = seq_char_set.intersection(IUPAC_AMBIGUOUS_BASES)
            if ambiguous_chars:
                ambig_str = "".join(sorted(ambiguous_chars))
                qc_flags.append(f"contains_ambiguous_bases({ambig_str})")
                warnings.append(
                    SequenceWarningItem(
                        sequence_id=seq_id,
                        qc_flags=[f"contains_ambiguous_bases({ambig_str})"],
                        message=f"Sequence '{seq_id}' contains IUPAC ambiguous bases: {ambig_str}.",
                    )
                )

            # Check sequence length against 18S V4 expectations
            if length < settings.MIN_SEQUENCE_LENGTH:
                flag = f"length_below_{settings.MIN_SEQUENCE_LENGTH}"
                qc_flags.append(flag)
                warnings.append(
                    SequenceWarningItem(
                        sequence_id=seq_id,
                        qc_flags=[flag],
                        message=(
                            f"Sequence '{seq_id}' length ({length} bp) is below the "
                            f"expected 18S V4 amplicon threshold of {settings.MIN_SEQUENCE_LENGTH} bp."
                        ),
                    )
                )

            if length > settings.MAX_SEQUENCE_LENGTH:
                flag = f"length_above_{settings.MAX_SEQUENCE_LENGTH}"
                qc_flags.append(flag)
                warnings.append(
                    SequenceWarningItem(
                        sequence_id=seq_id,
                        qc_flags=[flag],
                        message=(
                            f"Sequence '{seq_id}' length ({length} bp) exceeds maximum "
                            f"expected amplicon length of {settings.MAX_SEQUENCE_LENGTH} bp."
                        ),
                    )
                )

        if is_record_valid:
            valid_count += 1
        else:
            invalid_count += 1

        sequences.append(
            SequenceQCItem(
                sequence_id=seq_id,
                header=record.header,
                length=length,
                valid=is_record_valid,
                qc_flags=qc_flags,
            )
        )

    # Determine overall file status
    overall_status = "valid" if (invalid_count == 0 and len(errors) == 0 and total_count > 0) else "invalid"

    return ValidateFastaResponse(
        filename=filename,
        file_size_bytes=file_size_bytes,
        validation_status=overall_status,
        total_sequences=total_count,
        valid_sequences=valid_count,
        invalid_sequences=invalid_count,
        sequences=sequences,
        errors=errors,
        warnings=warnings,
    )
