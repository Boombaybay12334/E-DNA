from typing import List, Optional
from pydantic import BaseModel, Field


class SequenceQCItem(BaseModel):
    """Metadata and validation outcome for an individual sequence.
    Does NOT include the raw nucleotide sequence string to preserve bandwidth
    and adhere to security best practices for large FASTA datasets.
    """
    sequence_id: str = Field(..., description="Unique sequence identifier parsed from header")
    header: Optional[str] = Field(None, description="Full FASTA header line without leading '>'")
    length: int = Field(..., description="Sequence length in base pairs (bp)")
    valid: bool = Field(..., description="Whether sequence conforms to structural and chemistry validation")
    qc_flags: List[str] = Field(default_factory=list, description="Quality control observation flags")


class SequenceErrorItem(BaseModel):
    """Specific error encountered during FASTA parsing or structural validation."""
    sequence_id: Optional[str] = Field(None, description="Sequence ID where error occurred, if known")
    message: str = Field(..., description="Plain-language description of the validation failure")


class SequenceWarningItem(BaseModel):
    """QC observation or biological warning (e.g. truncated length or ambiguous bases)."""
    sequence_id: str = Field(..., description="Sequence ID associated with the warning")
    qc_flags: List[str] = Field(..., description="List of QC warning tags triggered")
    message: str = Field(..., description="Informative explanation of the observation")
