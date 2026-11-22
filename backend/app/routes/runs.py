import os
from typing import Optional
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session
from app.config import settings
from app.database.connection import get_db
from app.services.run_service import RunService
from app.services.validation import sanitize_filename
from app.schemas.run import (
    RunDetailResponse,
    RunListResponse,
    PaginatedSequencesResponse,
    RunInsightsResponse,
)

router = APIRouter(prefix="/runs", tags=["Analysis Run Management"])


@router.post(
    "",
    response_model=RunDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload FASTA sequence file and create a persistent Analysis Run",
    description=(
        "Accepts a FASTA file (.fasta, .fa, .fna) along with optional analysis parameters. "
        "Validates sequence chemistry and structure using the FASTA validator, creates a persistent "
        "Analysis Run entity in SQLite, saves individual sequence metadata, errors, and QC flags, "
        "and returns the saved run details. Note: ML classification is pending integration."
    ),
)
async def create_analysis_run(
    file: UploadFile = File(..., description="FASTA sequence file (.fasta, .fa, .fna)"),
    threshold_tau: Optional[float] = Form(0.60, description="Operating confidence threshold tau (default 0.60)"),
    reference_database: Optional[str] = Form("PR2 v5.0.0", description="Target taxonomic reference database"),
    marker_gene: Optional[str] = Form("18S rRNA", description="Target amplicon gene"),
    marker_region: Optional[str] = Form("V4", description="Specific amplicon hypervariable region"),
    target_group: Optional[str] = Form("eukaryotes", description="Target biological domain / group"),
    db: Session = Depends(get_db),
) -> RunDetailResponse:
    filename = sanitize_filename(file.filename)

    # 1. Extension validation
    _, ext = os.path.splitext(filename)
    if ext.lower() not in settings.ALLOWED_EXTENSIONS:
        allowed_str = ", ".join(settings.ALLOWED_EXTENSIONS)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions: {allowed_str}.",
        )

    # 2. File size streaming constraint
    content_chunks = []
    total_bytes = 0
    chunk_size = 1024 * 1024  # 1 MB

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > settings.MAX_FILE_SIZE_BYTES:
            max_mb = settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)
            status_code = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
            raise HTTPException(
                status_code=status_code,
                detail=f"File size exceeds maximum allowed limit of {max_mb} MB.",
            )
        content_chunks.append(chunk)

    raw_bytes = b"".join(content_chunks)

    # 3. Decode text safely
    try:
        content_str = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content_str = raw_bytes.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File contains binary content that could not be decoded as text.",
            )

    # 4. Process validation and persist Analysis Run
    return RunService.create_run_from_upload(
        db=db,
        filename=filename,
        content_str=content_str,
        file_size_bytes=total_bytes,
        threshold_tau=threshold_tau,
        marker_gene=marker_gene or "18S rRNA",
        marker_region=marker_region or "V4",
        target_group=target_group or "eukaryotes",
        reference_database=reference_database or "PR2 v5.0.0",
    )


@router.get(
    "",
    response_model=RunListResponse,
    summary="List persistent Analysis Runs",
    description="Returns a paginated list of saved Analysis Runs ordered by creation date (newest first).",
)
def list_analysis_runs(
    limit: int = Query(20, ge=1, le=100, description="Maximum runs to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
) -> RunListResponse:
    return RunService.list_runs(db=db, limit=limit, offset=offset)


@router.get(
    "/{run_id}",
    response_model=RunDetailResponse,
    summary="Get single Analysis Run details",
    description="Returns detailed information for a run including errors, QC warnings, and a sample preview.",
)
def get_analysis_run(
    run_id: str,
    db: Session = Depends(get_db),
) -> RunDetailResponse:
    run = RunService.get_run_detail(db=db, run_id=run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis Run '{run_id}' not found.",
        )
    return run


@router.get(
    "/{run_id}/sequences",
    response_model=PaginatedSequencesResponse,
    summary="Get paginated sequence records for a run",
    description="Returns sequence records associated with a run, preserving original FASTA order.",
)
def get_run_sequences(
    run_id: str,
    limit: int = Query(50, ge=1, le=200, description="Number of sequence records per page"),
    offset: int = Query(0, ge=0, description="Sequence records offset"),
    db: Session = Depends(get_db),
) -> PaginatedSequencesResponse:
    seq_response = RunService.get_run_sequences(db=db, run_id=run_id, limit=limit, offset=offset)
    if not seq_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis Run '{run_id}' not found.",
        )
    return seq_response


@router.get(
    "/{run_id}/insights",
    response_model=RunInsightsResponse,
    summary="Get validation-derived statistics for a run",
    description=(
        "Returns summary statistics derived from sequence validation (total, valid, invalid, "
        "QC warnings, min/max/avg length, QC flag distributions). Classification metrics are pending."
    ),
)
def get_run_insights(
    run_id: str,
    db: Session = Depends(get_db),
) -> RunInsightsResponse:
    insights = RunService.get_run_insights(db=db, run_id=run_id)
    if not insights:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis Run '{run_id}' not found.",
        )
    return insights


@router.delete(
    "/{run_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an Analysis Run and cascade child records",
    description="Permanently deletes an Analysis Run and all associated sequence records, errors, and warnings.",
)
def delete_analysis_run(
    run_id: str,
    db: Session = Depends(get_db),
):
    deleted = RunService.delete_run(db=db, run_id=run_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis Run '{run_id}' not found.",
        )
    return {"message": f"Analysis Run '{run_id}' and all associated records deleted successfully."}
