import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.database.models import AnalysisRunModel
from app.database.repositories import RunRepository
from app.services.validation import validate_fasta_content
from app.schemas.run import (
    RunSummaryResponse,
    RunDetailResponse,
    RunListResponse,
    PaginatedSequencesResponse,
    RunInsightsResponse,
    MarkerInfo,
    RunSequenceRecord,
    RunErrorRecord,
    RunWarningRecord,
    LengthStats,
)


def generate_run_id() -> str:
    """Generates a human-readable, globally unique run identifier."""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    short_uuid = uuid.uuid4().hex[:8]
    return f"run-{date_str}-{short_uuid}"


def to_summary_response(run: AnalysisRunModel) -> RunSummaryResponse:
    """Converts a database AnalysisRunModel instance to a RunSummaryResponse schema."""
    return RunSummaryResponse(
        run_id=run.run_id,
        filename=run.filename,
        file_size_bytes=run.file_size_bytes,
        created_at=run.created_at,
        updated_at=run.updated_at,
        total_sequences=run.total_sequences,
        valid_sequences=run.valid_sequences,
        invalid_sequences=run.invalid_sequences,
        qc_warning_count=run.qc_warning_count,
        validation_status=run.validation_status,
        run_status=run.run_status,
        classification_status=run.classification_status,
        marker=MarkerInfo(gene=run.marker_gene, region=run.marker_region),
        target_group=run.target_group,
        reference_database=run.reference_database,
        threshold_tau=run.threshold_tau,
        error_summary=run.error_summary,
    )


class RunService:
    """Service orchestrating validation, persistence, and querying of Analysis Runs."""

    @staticmethod
    def create_run_from_upload(
        db: Session,
        filename: str,
        content_str: str,
        file_size_bytes: int,
        threshold_tau: Optional[float] = 0.60,
        marker_gene: str = "18S rRNA",
        marker_region: str = "V4",
        target_group: str = "eukaryotes",
        reference_database: str = "PR2 v5.0.0",
    ) -> RunDetailResponse:
        """
        Validates uploaded FASTA content and creates a persistent Analysis Run.
        This phase does not perform classification.
        """
        # 1. Run biological & structural validation
        validation_res = validate_fasta_content(
            filename=filename,
            content_str=content_str,
            file_size_bytes=file_size_bytes,
        )

        run_id = generate_run_id()

        # 2. Build run dictionary
        error_summary = None
        if validation_res.errors:
            error_summary = f"{len(validation_res.errors)} validation errors detected during intake."

        run_status = "validated" if validation_res.validation_status == "valid" else "failed"

        run_dict = {
            "run_id": run_id,
            "filename": filename,
            "file_size_bytes": file_size_bytes,
            "total_sequences": validation_res.total_sequences,
            "valid_sequences": validation_res.valid_sequences,
            "invalid_sequences": validation_res.invalid_sequences,
            "qc_warning_count": len(validation_res.warnings),
            "validation_status": validation_res.validation_status,
            "run_status": run_status,
            "classification_status": "unclassified",
            "marker_gene": marker_gene,
            "marker_region": marker_region,
            "target_group": target_group,
            "reference_database": reference_database,
            "threshold_tau": threshold_tau,
            "error_summary": error_summary,
        }

        # 3. Build sequence records with preserved order_index
        sequences_data = [
            {
                "sequence_id": seq.sequence_id,
                "header": seq.header,
                "length": seq.length,
                "valid": seq.valid,
                "qc_flags": seq.qc_flags,
                "order_index": idx,
            }
            for idx, seq in enumerate(validation_res.sequences)
        ]

        # 4. Build errors and warnings
        errors_data = [
            {"sequence_id": e.sequence_id, "message": e.message}
            for e in validation_res.errors
        ]
        warnings_data = [
            {"sequence_id": w.sequence_id, "qc_flags": w.qc_flags, "message": w.message}
            for w in validation_res.warnings
        ]

        # 5. Persist via repository
        saved_run = RunRepository.create_run(
            db=db,
            run_data=run_dict,
            sequences=sequences_data,
            errors=errors_data,
            warnings=warnings_data,
        )

        # 6. Format detailed response
        sample_sequences = [
            RunSequenceRecord(
                sequence_id=s.sequence_id,
                header=s.header,
                length=s.length,
                valid=s.valid,
                qc_flags=s.qc_flags,
                order_index=s.order_index,
            )
            for s in saved_run.sequences[:10]
        ]

        errors_records = [
            RunErrorRecord(sequence_id=e.sequence_id, message=e.message)
            for e in saved_run.errors
        ]
        warnings_records = [
            RunWarningRecord(
                sequence_id=w.sequence_id,
                qc_flags=w.qc_flags,
                message=w.message,
            )
            for w in saved_run.warnings
        ]

        summary = to_summary_response(saved_run)
        return RunDetailResponse(
            **summary.model_dump(),
            errors=errors_records,
            warnings=warnings_records,
            sequence_sample=sample_sequences,
        )

    @staticmethod
    def get_run_detail(db: Session, run_id: str) -> Optional[RunDetailResponse]:
        """Retrieves an analysis run with its errors, warnings, and sequence preview sample."""
        run = RunRepository.get_by_id(db, run_id)
        if not run:
            return None

        sample_sequences = [
            RunSequenceRecord(
                sequence_id=s.sequence_id,
                header=s.header,
                length=s.length,
                valid=s.valid,
                qc_flags=s.qc_flags,
                order_index=s.order_index,
            )
            for s in run.sequences[:10]
        ]
        errors_records = [
            RunErrorRecord(sequence_id=e.sequence_id, message=e.message)
            for e in run.errors
        ]
        warnings_records = [
            RunWarningRecord(
                sequence_id=w.sequence_id,
                qc_flags=w.qc_flags,
                message=w.message,
            )
            for w in run.warnings
        ]

        summary = to_summary_response(run)
        return RunDetailResponse(
            **summary.model_dump(),
            errors=errors_records,
            warnings=warnings_records,
            sequence_sample=sample_sequences,
        )

    @staticmethod
    def list_runs(db: Session, limit: int = 20, offset: int = 0) -> RunListResponse:
        """Returns paginated runs list ordered newest first."""
        items, total = RunRepository.list_runs(db, limit=limit, offset=offset)
        summary_items = [to_summary_response(r) for r in items]
        return RunListResponse(
            total=total,
            limit=limit,
            offset=offset,
            items=summary_items,
        )

    @staticmethod
    def get_run_sequences(
        db: Session,
        run_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Optional[PaginatedSequencesResponse]:
        """Returns paginated sequence records preserving FASTA order_index."""
        run = RunRepository.get_by_id(db, run_id)
        if not run:
            return None

        sequences, total = RunRepository.get_sequences(db, run_id=run_id, limit=limit, offset=offset)
        seq_records = [
            RunSequenceRecord(
                sequence_id=s.sequence_id,
                header=s.header,
                length=s.length,
                valid=s.valid,
                qc_flags=s.qc_flags,
                order_index=s.order_index,
            )
            for s in sequences
        ]

        return PaginatedSequencesResponse(
            run_id=run_id,
            total=total,
            limit=limit,
            offset=offset,
            sequences=seq_records,
        )

    @staticmethod
    def get_run_insights(db: Session, run_id: str) -> Optional[RunInsightsResponse]:
        """Returns validation-derived statistical insights for a run."""
        raw_insights = RunRepository.get_insights(db, run_id)
        if not raw_insights:
            return None

        length_summary = None
        if raw_insights["length_summary"]:
            ls = raw_insights["length_summary"]
            length_summary = LengthStats(
                min_bp=ls["min_bp"],
                max_bp=ls["max_bp"],
                avg_bp=ls["avg_bp"],
            )

        return RunInsightsResponse(
            run_id=raw_insights["run_id"],
            total_sequences=raw_insights["total_sequences"],
            valid_sequences=raw_insights["valid_sequences"],
            invalid_sequences=raw_insights["invalid_sequences"],
            qc_warning_count=raw_insights["qc_warning_count"],
            validation_status=raw_insights["validation_status"],
            length_summary=length_summary,
            qc_flags_distribution=raw_insights["qc_flags_distribution"],
        )

    @staticmethod
    def delete_run(db: Session, run_id: str) -> bool:
        """Deletes run and cascades to all child sequence/error records."""
        return RunRepository.delete_run(db, run_id)
