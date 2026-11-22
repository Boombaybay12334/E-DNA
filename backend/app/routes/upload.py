import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.schemas.response import ValidateFastaResponse
from app.services.validation import validate_fasta_content, sanitize_filename
from app.config import settings

router = APIRouter(tags=["FASTA Upload & Validation"])


@router.post(
    "/validate-fasta",
    response_model=ValidateFastaResponse,
    summary="Validate an uploaded FASTA sequence file",
    description=(
        "Accepts a FASTA file (.fasta, .fa, .fna) via multipart/form-data. "
        "Parses headers and nucleotide lines, validates against IUPAC chemistry and "
        "18S V4 length constraints, and returns structural and QC validation findings."
    ),
)
async def validate_fasta(
    file: UploadFile = File(..., description="FASTA format sequence file (.fasta, .fa, .fna)"),
) -> ValidateFastaResponse:
    """
    Validates uploaded environmental DNA sequence file without running classification.
    """
    filename = sanitize_filename(file.filename)

    # 1. Extension check
    _, ext = os.path.splitext(filename)
    if ext.lower() not in settings.ALLOWED_EXTENSIONS:
        allowed_str = ", ".join(settings.ALLOWED_EXTENSIONS)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file extension '{ext}'. Allowed FASTA extensions are: {allowed_str}."
            ),
        )

    # 2. Read content safely in chunks to enforce file size constraint
    content_chunks = []
    total_bytes = 0

    chunk_size = 1024 * 1024  # 1 MB chunks
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > settings.MAX_FILE_SIZE_BYTES:
            max_mb = settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)
            # Use HTTP_413_CONTENT_TOO_LARGE (falling back to 413)
            status_code = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
            raise HTTPException(
                status_code=status_code,
                detail=f"File size exceeds maximum allowed limit of {max_mb} MB.",
            )
        content_chunks.append(chunk)

    raw_bytes = b"".join(content_chunks)

    # 3. Safe string decoding
    try:
        content_str = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content_str = raw_bytes.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File contains binary or non-text content that could not be decoded as text.",
            )

    # 4. Perform biological & structural validation
    return validate_fasta_content(
        filename=filename,
        content_str=content_str,
        file_size_bytes=total_bytes,
    )
