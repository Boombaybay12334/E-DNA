"""
Contract v1.0 Pydantic schemas for eDNA taxonomic classification results.

Source of truth: contract/result_schema.json
Model-agnostic output structure for any classifier in this project.
Dynamic ranks are preserved from the run metadata without hardcoding.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class ModelInfo(BaseModel):
    """Model identity and provenance."""
    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., description="e.g. modelA_reg_ens5, idtaxa")
    version: str = Field(..., description="Model release or iteration version")
    code_commit: Optional[str] = Field(None, description="git commit hash of the code that produced the result")


class ReferenceInfo(BaseModel):
    """Reference taxonomic database information."""
    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., description="e.g. PR2")
    version: str = Field(..., description="e.g. 5.0.0")
    subset: Optional[str] = Field(None, description="how reference was filtered, e.g. '18S V4, 99% clustered'")


class MarkerInfo(BaseModel):
    """Amplicon target marker definition."""
    model_config = ConfigDict(extra="ignore")

    gene: str = Field(..., description="e.g. 18S rRNA")
    region: str = Field(..., description="e.g. V4")


class ThresholdInfo(BaseModel):
    """Decision threshold applied to per-rank confidences."""
    model_config = ConfigDict(extra="ignore")

    tau: float = Field(..., ge=0.0, le=1.0, description="Confidence threshold cutoff [0.0, 1.0]")
    rule: Optional[str] = Field(None, description="e.g. assigned_depth = number of leading ranks >= tau")


class RunMetadata(BaseModel):
    """Metadata for the classification run."""
    model_config = ConfigDict(extra="ignore")

    run_id: str = Field(..., description="Identifier for this analysis run")
    created_utc: str = Field(..., description="ISO-8601 UTC timestamp")
    model: ModelInfo
    reference: ReferenceInfo
    marker: MarkerInfo
    ranks: List[str] = Field(
        ...,
        min_length=1,
        description="Ordered root->leaf rank names. Dynamic; must NOT be hardcoded.",
    )
    threshold: ThresholdInfo
    confidence_semantics: Optional[str] = Field(
        None,
        description="What the confidence numbers mean for this model",
    )


class LineageItem(BaseModel):
    """Taxon call and confidence at a single taxonomic rank."""
    model_config = ConfigDict(extra="ignore")

    rank: str = Field(..., description="Taxonomic rank name matching run.ranks")
    taxon: Optional[str] = Field(None, description="Model call at this rank (null if none)")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence score [0.0, 1.0]")
    assigned: bool = Field(..., description="true for leading ranks with confidence >= tau")


SequenceStatus = Literal["assigned_full", "assigned_partial", "unassigned", "invalid_input"]


class SequenceResultItem(BaseModel):
    """Classification outcome for a single query sequence."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Sequence or ASV identifier")
    length: Optional[int] = Field(None, ge=0, description="Sequence length in base pairs")
    status: SequenceStatus = Field(..., description="Classification resolution status")
    assigned_depth: int = Field(..., ge=0, description="Number of leading assigned ranks")
    deepest_rank: Optional[str] = Field(None, description="Name of deepest assigned rank")
    deepest_taxon: Optional[str] = Field(None, description="Taxon at deepest assigned rank")
    lineage: List[LineageItem] = Field(..., description="Full root->leaf taxonomic lineage calls")
    warnings: List[str] = Field(default_factory=list, description="Sequence-level QC warnings")
    extras: Optional[Dict[str, Any]] = Field(None, description="Model-specific fields (e.g. novelty)")


class ResultSummary(BaseModel):
    """Dataset-level classification summary counts."""
    model_config = ConfigDict(extra="ignore")

    n_sequences: Optional[int] = None
    n_by_status: Optional[Dict[str, int]] = None
    n_by_deepest_rank: Optional[Dict[str, int]] = None


class ClassificationResultPayload(BaseModel):
    """
    Complete Contract v1.0 eDNA Classification Result payload.
    Adheres strictly to contract/result_schema.json.
    """
    model_config = ConfigDict(extra="ignore")

    contract_version: str = Field(..., pattern=r"^1\.[0-9]+$", description="Major version 1 contract")
    run: RunMetadata
    sequences: List[SequenceResultItem]
    summary: Optional[ResultSummary] = None


class ContractValidationError(BaseModel):
    """Structured validation issue against the contract."""
    path: str = Field(..., description="JSON or field path where issue occurred")
    error_code: str = Field(..., description="Machine-readable error category code")
    message: str = Field(..., description="Detailed explanation of the validation failure")


class ContractValidationReport(BaseModel):
    """Outcome of validating a payload against Contract v1.0 and biological semantics."""
    valid: bool
    contract_version: Optional[str] = None
    run_id: Optional[str] = None
    sequence_count: int = 0
    errors: List[ContractValidationError] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    summary: Optional[ResultSummary] = None


class SyntheticFixtureResponse(BaseModel):
    """Fixture response explicitly flagged as synthetic illustrative data."""
    is_synthetic: bool = True
    disclaimer: str = (
        "SYNTHETIC/FIXTURE DATA ONLY: Illustrative example for development and testing; "
        "not actual scientific predictions. Species-level classification has not been evaluated."
    )
    data: ClassificationResultPayload


class RunResultAttachmentResponse(BaseModel):
    """Response returned when a result is attached to an Analysis Run."""
    run_id: str
    attached_at: datetime
    is_synthetic: bool
    contract_version: str
    model_name: str
    model_version: str
    reference_name: str
    reference_version: str
    threshold_tau: float
    ranks: List[str]
    sequence_count: int
    message: str
