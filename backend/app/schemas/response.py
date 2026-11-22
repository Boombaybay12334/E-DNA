from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.sequence import SequenceQCItem, SequenceErrorItem, SequenceWarningItem


class HealthResponse(BaseModel):
    """Health check status response."""
    status: str = Field("healthy", description="Service operating status")
    service: str = Field("edna-explorer-api", description="Service identifier name")
    version: str = Field("1.0.0", description="API semantic version")
    database: Optional[str] = Field("connected", description="Database connectivity status")


class ValidateFastaResponse(BaseModel):
    """Standardized response schema for FASTA validation."""
    filename: str = Field(..., description="Original filename of the uploaded FASTA file")
    file_size_bytes: int = Field(..., description="File size in bytes")
    validation_status: str = Field(..., description="'valid' if all records pass validation, else 'invalid'")
    total_sequences: int = Field(..., description="Total number of sequence headers detected")
    valid_sequences: int = Field(..., description="Count of sequence records passing validation")
    invalid_sequences: int = Field(..., description="Count of sequence records failing validation")
    sequences: List[SequenceQCItem] = Field(
        default_factory=list,
        description="List of parsed sequence metadata items with QC flags"
    )
    errors: List[SequenceErrorItem] = Field(
        default_factory=list,
        description="List of parsing or validation errors encountered"
    )
    warnings: List[SequenceWarningItem] = Field(
        default_factory=list,
        description="List of quality-control warnings and observations"
    )
