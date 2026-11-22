import json
from datetime import datetime, timezone
from typing import List
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from app.database.connection import Base


def utc_now() -> datetime:
    """Returns current UTC timestamp."""
    return datetime.now(timezone.utc)


class AnalysisRunModel(Base):
    """
    Persistent Analysis Run entity representing an environmental DNA library evaluation.
    Tracks validation results, QC metrics, and run status.
    Designed so machine learning classification results can be attached in subsequent phases.
    """
    __tablename__ = "analysis_runs"

    run_id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Validation summary counts
    total_sequences = Column(Integer, default=0, nullable=False)
    valid_sequences = Column(Integer, default=0, nullable=False)
    invalid_sequences = Column(Integer, default=0, nullable=False)
    qc_warning_count = Column(Integer, default=0, nullable=False)

    # Status tracking
    validation_status = Column(String(32), nullable=False)  # "valid" | "invalid"
    run_status = Column(
        String(32),
        default="validated",
        nullable=False,
    )  # "validated" | "classification_pending" | "classification_completed" | "failed"
    classification_status = Column(
        String(32),
        default="unclassified",
        nullable=False,
    )  # "unclassified" | "pending" | "completed"

    # Amplicon & reference parameters
    marker_gene = Column(String(64), default="18S rRNA", nullable=False)
    marker_region = Column(String(64), default="V4", nullable=False)
    target_group = Column(String(64), default="eukaryotes", nullable=False)
    reference_database = Column(String(128), default="PR2 v5.0.0", nullable=False)
    threshold_tau = Column(Float, nullable=True, default=0.60)

    # Error summary if any
    error_summary = Column(Text, nullable=True)

    # Relationships with cascading deletion
    sequences = relationship(
        "SequenceRecordModel",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="SequenceRecordModel.order_index",
    )
    errors = relationship(
        "RunErrorModel",
        back_populates="run",
        cascade="all, delete-orphan",
    )
    warnings = relationship(
        "RunWarningModel",
        back_populates="run",
        cascade="all, delete-orphan",
    )
    classification_result = relationship(
        "ClassificationResultModel",
        back_populates="run",
        uselist=False,
        cascade="all, delete-orphan",
    )


class SequenceRecordModel(Base):
    """
    Persistent record for each sequence in an analysis run.
    Stores metadata, length, validation outcome, and QC flags.
    Raw nucleotide sequence strings are deliberately NOT stored to optimize storage.
    Preserves original FASTA file order using order_index.
    """
    __tablename__ = "sequence_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey("analysis_runs.run_id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_id = Column(String(128), nullable=False, index=True)
    header = Column(Text, nullable=True)
    length = Column(Integer, nullable=False)
    valid = Column(Boolean, nullable=False, default=True)
    qc_flags = Column(JSON, nullable=False, default=list)
    order_index = Column(Integer, nullable=False, index=True)

    run = relationship("AnalysisRunModel", back_populates="sequences")


class RunErrorModel(Base):
    """Stores structured errors encountered during parsing or structural validation."""
    __tablename__ = "run_errors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey("analysis_runs.run_id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_id = Column(String(128), nullable=True)
    message = Column(Text, nullable=False)

    run = relationship("AnalysisRunModel", back_populates="errors")


class RunWarningModel(Base):
    """Stores structured biological QC observations (e.g. truncated length, ambiguous bases)."""
    __tablename__ = "run_warnings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey("analysis_runs.run_id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_id = Column(String(128), nullable=False)
    qc_flags = Column(JSON, nullable=False, default=list)
    message = Column(Text, nullable=False)

    run = relationship("AnalysisRunModel", back_populates="warnings")


class ClassificationResultModel(Base):
    """
    Persistent store for Contract v1.0 eDNA Classification Result payloads.
    Stores dynamic rank lists and structured result JSON without hardcoding taxonomic columns.
    Additive and backwards-compatible with Phase 2 schema.
    """
    __tablename__ = "classification_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(
        String(64),
        ForeignKey("analysis_runs.run_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    contract_version = Column(String(32), default="1.0", nullable=False)
    model_name = Column(String(128), nullable=False)
    model_version = Column(String(64), nullable=False)
    code_commit = Column(String(64), nullable=True)
    reference_name = Column(String(128), nullable=False)
    reference_version = Column(String(64), nullable=False)
    reference_subset = Column(String(255), nullable=True)
    marker_gene = Column(String(64), nullable=False)
    marker_region = Column(String(64), nullable=False)
    threshold_tau = Column(Float, nullable=False)
    threshold_rule = Column(Text, nullable=True)
    confidence_semantics = Column(Text, nullable=True)
    ranks = Column(JSON, nullable=False)  # Dynamic rank list e.g. ["domain", "supergroup", ...]
    result_payload = Column(JSON, nullable=False)  # Complete validated contract v1.0 payload
    summary = Column(JSON, nullable=True)
    is_synthetic = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    run = relationship("AnalysisRunModel", back_populates="classification_result")
