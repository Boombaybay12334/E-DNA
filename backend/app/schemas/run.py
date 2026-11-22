from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class MarkerInfo(BaseModel):
    """Marker specification details."""
    gene: str = Field("18S rRNA", description="Target gene marker")
    region: str = Field("V4", description="Specific hypervariable region")


class RunSequenceRecord(BaseModel):
    """Sequence record metadata returned by run endpoints."""
    sequence_id: str
    header: Optional[str] = None
    length: int
    valid: bool
    qc_flags: List[str] = Field(default_factory=list)
    order_index: int


class RunErrorRecord(BaseModel):
    """Validation or parsing error."""
    sequence_id: Optional[str] = None
    message: str


class RunWarningRecord(BaseModel):
    """Quality control warning or observation."""
    sequence_id: str
    qc_flags: List[str] = Field(default_factory=list)
    message: str


class RunSummaryResponse(BaseModel):
    """Analysis Run summary item for listings and run creation response."""
    run_id: str
    filename: str
    file_size_bytes: int
    created_at: datetime
    updated_at: datetime

    total_sequences: int
    valid_sequences: int
    invalid_sequences: int
    qc_warning_count: int

    validation_status: str  # "valid" | "invalid"
    run_status: str  # "validated" | "classification_pending" | "failed"
    classification_status: str  # "unclassified"

    marker: MarkerInfo
    target_group: str
    reference_database: str
    threshold_tau: Optional[float] = None
    error_summary: Optional[str] = None


class RunDetailResponse(RunSummaryResponse):
    """Detailed Analysis Run response including errors, warnings, and sequence preview."""
    errors: List[RunErrorRecord] = Field(default_factory=list)
    warnings: List[RunWarningRecord] = Field(default_factory=list)
    sequence_sample: List[RunSequenceRecord] = Field(
        default_factory=list,
        description="Sample preview of up to first 10 sequence records"
    )


class RunListResponse(BaseModel):
    """Paginated list of saved analysis runs."""
    total: int = Field(..., description="Total count of saved runs")
    limit: int = Field(..., description="Number of items requested")
    offset: int = Field(..., description="Pagination offset")
    items: List[RunSummaryResponse] = Field(default_factory=list)


class PaginatedSequencesResponse(BaseModel):
    """Paginated list of sequence records for a specific run."""
    run_id: str
    total: int = Field(..., description="Total sequence records in this run")
    limit: int = Field(..., description="Page limit")
    offset: int = Field(..., description="Page offset")
    sequences: List[RunSequenceRecord] = Field(default_factory=list)


class LengthStats(BaseModel):
    """Summary statistics for sequence lengths."""
    min_bp: int
    max_bp: int
    avg_bp: float


class RunInsightsResponse(BaseModel):
    """Validation-derived statistical insights for a run (pre-classification)."""
    run_id: str
    total_sequences: int
    valid_sequences: int
    invalid_sequences: int
    qc_warning_count: int
    validation_status: str
    length_summary: Optional[LengthStats] = None
    qc_flags_distribution: Dict[str, int] = Field(default_factory=dict)
    notice: str = Field(
        "Validation-derived statistics only; taxonomic classification has not been performed.",
        description="Scientific status notice"
    )
