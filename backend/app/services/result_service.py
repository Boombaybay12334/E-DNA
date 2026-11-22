"""
Service layer for processing, validating, and managing eDNA classification result payloads.

Keeps result handling decoupled from future ML inference pipelines.
Provides loading for synthetic/fixture payloads with clear scientific disclaimers.
"""

import json
import os
from typing import Dict, Any, Optional, Tuple, Union
from collections import Counter
from sqlalchemy.orm import Session

from app.schemas.result import (
    ClassificationResultPayload,
    ContractValidationReport,
    ResultSummary,
    SequenceResultItem,
)
from app.services.result_validator import ResultContractValidator


class ResultProcessingService:
    """Service handling validation, summary calculation, and ingestion of Contract v1.0 results."""

    @classmethod
    def validate_payload(
        cls,
        data: Union[Dict[str, Any], str],
    ) -> Tuple[Optional[ClassificationResultPayload], ContractValidationReport]:
        """
        Parses and validates a classification result against Contract v1.0.
        Returns a tuple of (ParsedPayload if valid else None, ValidationReport).
        """
        if isinstance(data, str):
            try:
                dict_data = json.loads(data)
            except Exception as e:
                report = ContractValidationReport(
                    valid=False,
                    errors=[
                        {
                            "path": "$",
                            "error_code": "INVALID_JSON",
                            "message": f"Malformed JSON string: {str(e)}",
                        }
                    ],
                )
                return None, report
        else:
            dict_data = data

        report = ResultContractValidator.validate_dict(dict_data)
        if not report.valid:
            return None, report

        payload = ClassificationResultPayload.model_validate(dict_data)
        return payload, report

    @classmethod
    def compute_summary(
        cls,
        sequences: list[SequenceResultItem],
        ranks: list[str],
    ) -> ResultSummary:
        """
        Derives summary statistics (n_sequences, n_by_status, n_by_deepest_rank)
        from sequence items according to contract semantics.
        """
        status_counts = Counter(s.status for s in sequences)
        rank_counts: Dict[str, int] = {}
        for s in sequences:
            key = s.deepest_rank if s.deepest_rank else "none"
            rank_counts[key] = rank_counts.get(key, 0) + 1

        return ResultSummary(
            n_sequences=len(sequences),
            n_by_status=dict(status_counts),
            n_by_deepest_rank=rank_counts,
        )

    @classmethod
    def load_synthetic_fixture(
        cls,
        fixture_path: Optional[str] = None,
    ) -> ClassificationResultPayload:
        """
        Loads the provided example result payload from disk and validates it.
        This fixture is strictly for development, testing, and UI integration.
        """
        if not fixture_path:
            # Look in contract/example_result.json relative to repository root
            candidates = [
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "contract", "example_result.json")),
                os.path.abspath(os.path.join(os.getcwd(), "contract", "example_result.json")),
                os.path.abspath(os.path.join(os.getcwd(), "..", "contract", "example_result.json")),
            ]
            for candidate in candidates:
                if os.path.isfile(candidate):
                    fixture_path = candidate
                    break

        if not fixture_path or not os.path.isfile(fixture_path):
            raise FileNotFoundError(f"Fixture file not found. Checked: {candidates}")

        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        payload, report = cls.validate_payload(data)
        if not payload:
            err_msgs = "; ".join(f"{e.path}: {e.message}" for e in report.errors)
            raise ValueError(f"Synthetic fixture failed contract validation: {err_msgs}")

        return payload

    @classmethod
    def attach_result_to_run(
        cls,
        db: Session,
        run_id: str,
        payload: ClassificationResultPayload,
        is_synthetic: bool = False,
    ):
        """
        Attaches a validated result payload to an existing Analysis Run in the database.
        Updates run classification status to 'completed'.
        """
        from app.database.repositories import RunRepository
        return RunRepository.save_classification_result(
            db=db,
            run_id=run_id,
            payload=payload,
            is_synthetic=is_synthetic,
        )

    @classmethod
    def get_result_by_run_id(cls, db: Session, run_id: str):
        """Retrieves stored classification result for an Analysis Run if attached."""
        from app.database.repositories import RunRepository
        return RunRepository.get_classification_result(db=db, run_id=run_id)
