from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database.models import (
    AnalysisRunModel,
    SequenceRecordModel,
    RunErrorModel,
    RunWarningModel,
    ClassificationResultModel,
)
from app.schemas.result import ClassificationResultPayload


class RunRepository:
    """Repository encapsulating database operations for Analysis Runs and Sequence Records."""

    @staticmethod
    def create_run(
        db: Session,
        run_data: dict,
        sequences: List[dict],
        errors: List[dict],
        warnings: List[dict],
    ) -> AnalysisRunModel:
        """Persists a new Analysis Run with all sequence records, errors, and warnings in a single transaction."""
        try:
            run = AnalysisRunModel(**run_data)
            db.add(run)

            # Bulk add sequence records with order_index preserved
            sequence_models = [
                SequenceRecordModel(
                    run_id=run.run_id,
                    sequence_id=s["sequence_id"],
                    header=s.get("header"),
                    length=s["length"],
                    valid=s["valid"],
                    qc_flags=s.get("qc_flags", []),
                    order_index=s["order_index"],
                )
                for s in sequences
            ]
            db.add_all(sequence_models)

            # Bulk add errors
            error_models = [
                RunErrorModel(
                    run_id=run.run_id,
                    sequence_id=e.get("sequence_id"),
                    message=e["message"],
                )
                for e in errors
            ]
            db.add_all(error_models)

            # Bulk add warnings
            warning_models = [
                RunWarningModel(
                    run_id=run.run_id,
                    sequence_id=w["sequence_id"],
                    qc_flags=w.get("qc_flags", []),
                    message=w["message"],
                )
                for w in warnings
            ]
            db.add_all(warning_models)

            db.commit()
            db.refresh(run)
            return run
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get_by_id(db: Session, run_id: str) -> Optional[AnalysisRunModel]:
        """Retrieves a single Analysis Run by ID."""
        return db.query(AnalysisRunModel).filter(AnalysisRunModel.run_id == run_id).first()

    @staticmethod
    def list_runs(
        db: Session,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[AnalysisRunModel], int]:
        """Returns paginated runs ordered by creation date (newest first) and total count."""
        total = db.query(func.count(AnalysisRunModel.run_id)).scalar() or 0
        items = (
            db.query(AnalysisRunModel)
            .order_by(desc(AnalysisRunModel.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    @staticmethod
    def get_sequences(
        db: Session,
        run_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[SequenceRecordModel], int]:
        """Returns paginated sequence records preserving the original FASTA order_index."""
        total = (
            db.query(func.count(SequenceRecordModel.id))
            .filter(SequenceRecordModel.run_id == run_id)
            .scalar()
            or 0
        )
        sequences = (
            db.query(SequenceRecordModel)
            .filter(SequenceRecordModel.run_id == run_id)
            .order_by(SequenceRecordModel.order_index.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return sequences, total

    @staticmethod
    def get_insights(db: Session, run_id: str) -> Optional[dict]:
        """Calculates validation-derived metrics and length distribution for a run."""
        run = RunRepository.get_by_id(db, run_id)
        if not run:
            return None

        # Length summary over all valid sequences
        length_stats = (
            db.query(
                func.min(SequenceRecordModel.length),
                func.max(SequenceRecordModel.length),
                func.avg(SequenceRecordModel.length),
            )
            .filter(SequenceRecordModel.run_id == run_id)
            .filter(SequenceRecordModel.valid == True)  # noqa: E712
            .first()
        )

        min_len, max_len, avg_len = length_stats if length_stats else (None, None, None)

        # QC flag frequency aggregation
        flags_query = (
            db.query(SequenceRecordModel.qc_flags)
            .filter(SequenceRecordModel.run_id == run_id)
            .all()
        )

        qc_distribution: Dict[str, int] = {}
        for row in flags_query:
            flags = row[0] or []
            for flag in flags:
                qc_distribution[flag] = qc_distribution.get(flag, 0) + 1

        length_summary = None
        if min_len is not None and max_len is not None and avg_len is not None:
            length_summary = {
                "min_bp": int(min_len),
                "max_bp": int(max_len),
                "avg_bp": round(float(avg_len), 1),
            }

        return {
            "run_id": run.run_id,
            "total_sequences": run.total_sequences,
            "valid_sequences": run.valid_sequences,
            "invalid_sequences": run.invalid_sequences,
            "qc_warning_count": run.qc_warning_count,
            "validation_status": run.validation_status,
            "length_summary": length_summary,
            "qc_flags_distribution": qc_distribution,
        }

    @staticmethod
    def delete_run(db: Session, run_id: str) -> bool:
        """Deletes a run and cascades to all child sequence and error records."""
        try:
            run = RunRepository.get_by_id(db, run_id)
            if not run:
                return False

            db.delete(run)
            db.commit()
            return True
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def save_classification_result(
        db: Session,
        run_id: str,
        payload: ClassificationResultPayload,
        is_synthetic: bool = False,
    ) -> ClassificationResultModel:
        """
        Saves or replaces a Contract v1.0 classification result for an Analysis Run.
        Updates run classification status to 'completed'.
        """
        try:
            run = RunRepository.get_by_id(db, run_id)
            if not run:
                raise ValueError(f"Analysis Run '{run_id}' not found.")

            # Check if an existing result is present; if so, delete it before adding new
            existing = (
                db.query(ClassificationResultModel)
                .filter(ClassificationResultModel.run_id == run_id)
                .first()
            )
            if existing:
                db.delete(existing)
                db.flush()

            result_model = ClassificationResultModel(
                run_id=run_id,
                contract_version=payload.contract_version,
                model_name=payload.run.model.name,
                model_version=payload.run.model.version,
                code_commit=payload.run.model.code_commit,
                reference_name=payload.run.reference.name,
                reference_version=payload.run.reference.version,
                reference_subset=payload.run.reference.subset,
                marker_gene=payload.run.marker.gene,
                marker_region=payload.run.marker.region,
                threshold_tau=payload.run.threshold.tau,
                threshold_rule=payload.run.threshold.rule,
                confidence_semantics=payload.run.confidence_semantics,
                ranks=payload.run.ranks,
                result_payload=payload.model_dump(mode="json"),
                summary=payload.summary.model_dump(mode="json") if payload.summary else None,
                is_synthetic=is_synthetic,
            )
            db.add(result_model)

            # Update run status to reflect classification results attached
            run.classification_status = "completed"
            run.run_status = "completed"
            db.commit()
            db.refresh(result_model)
            return result_model
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get_classification_result(
        db: Session,
        run_id: str,
    ) -> Optional[ClassificationResultModel]:
        """Retrieves persistent classification result associated with an Analysis Run."""
        return (
            db.query(ClassificationResultModel)
            .filter(ClassificationResultModel.run_id == run_id)
            .first()
        )
