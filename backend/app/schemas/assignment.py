"""
Pydantic schemas for Taxonomic Assignment and Threshold (tau) processing.
Used by Phase 4 assignment service to ingest raw model predictions and apply thresholds.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.result import (
    ModelInfo,
    ReferenceInfo,
    MarkerInfo,
    SequenceResultItem,
    ResultSummary,
    ClassificationResultPayload,
)


class RawRankPrediction(BaseModel):
    """Raw taxonomic call and confidence at a single rank (supplied from external classifier/test data)."""
    model_config = ConfigDict(extra="ignore")

    rank: str = Field(..., description="Rank name matching the run ranks list")
    taxon: Optional[str] = Field(None, description="Candidate taxon call; null if unpredicted")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Raw confidence score in [0.0, 1.0]")


class SequencePredictionInput(BaseModel):
    """Input sequence with raw per-rank predictions awaiting threshold evaluation."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(..., description="Sequence or ASV identifier")
    length: Optional[int] = Field(None, ge=0, description="Sequence length in base pairs")
    predictions: List[RawRankPrediction] = Field(..., description="Raw predictions per rank")
    warnings: List[str] = Field(default_factory=list, description="Quality control or input warnings")
    is_invalid: bool = Field(False, description="Flag indicating input failed biological/syntax QC")
    extras: Optional[Dict[str, Any]] = Field(None, description="Optional model-specific extras")


class AssignmentBatchRequest(BaseModel):
    """Request payload to apply confidence threshold tau across a dataset of sequence predictions."""
    model_config = ConfigDict(extra="ignore")

    threshold_tau: float = Field(..., ge=0.0, le=1.0, description="Confidence threshold cutoff tau in [0.0, 1.0]")
    ranks: List[str] = Field(..., min_length=1, description="Ordered root->leaf dynamic taxonomic ranks")
    sequences: List[SequencePredictionInput] = Field(..., description="Sequences with raw per-rank calls")
    threshold_rule: Optional[str] = Field(
        "assigned_depth = number of leading ranks (from the root) whose confidence >= tau",
        description="Textual rule description",
    )
    model_info: Optional[ModelInfo] = Field(None, description="Classifier model provenance")
    reference_info: Optional[ReferenceInfo] = Field(None, description="Taxonomic reference database provenance")
    marker_info: Optional[MarkerInfo] = Field(None, description="Target amplicon marker")
    run_id: Optional[str] = Field(None, description="Optional analysis run identifier")
    confidence_semantics: Optional[str] = Field(
        "model-specific confidence in [0.0, 1.0]; monotonic consecutive prefix assignment applied",
        description="Semantics description",
    )


class ReapplyThresholdRequest(BaseModel):
    """Request to recompute assignments on an existing Contract v1.0 result using a new tau."""
    model_config = ConfigDict(extra="ignore")

    threshold_tau: float = Field(..., ge=0.0, le=1.0, description="New confidence threshold tau in [0.0, 1.0]")
    payload: Optional[ClassificationResultPayload] = Field(
        None,
        description="Existing Contract v1.0 result payload (optional if target is a saved run)",
    )


class AssignmentBatchResponse(BaseModel):
    """Response containing computed assignments and Contract v1.0 result payload."""
    threshold_tau: float
    ranks: List[str]
    sequence_count: int
    sequences: List[SequenceResultItem]
    summary: ResultSummary
    payload: ClassificationResultPayload
