"""
Taxonomic Assignment and Threshold Logic Service (Phase 4).

Implements the consecutive leading prefix assignment algorithm according to
Contract v1.0 and project scientific specifications.

Rules:
1. Dynamic rank ladder: Ranks come strictly from the supplied ordered rank list.
2. Consecutive prefix: A rank is assigned only if ALL predecessor ranks from root
   were successfully assigned AND its confidence meets or exceeds tau.
3. Monotonic stop: Assignment permanently stops at the first rank failing tau
   or containing null taxon/confidence. Deeper ranks are NEVER assigned.
4. Status semantics:
   - assigned_full: assigned_depth == len(ranks)
   - assigned_partial: 0 < assigned_depth < len(ranks)
   - unassigned: assigned_depth == 0 (valid input but root rank fails tau)
   - invalid_input: QC rejection / syntax failure
5. Pure & deterministic: No side effects or model inference.
"""

from datetime import datetime, timezone
from typing import List, Optional, Any
from app.schemas.result import (
    LineageItem,
    SequenceResultItem,
    ClassificationResultPayload,
    RunMetadata,
    ModelInfo,
    ReferenceInfo,
    MarkerInfo,
    ThresholdInfo,
)
from app.schemas.assignment import (
    SequencePredictionInput,
    AssignmentBatchRequest,
    AssignmentBatchResponse,
)
from app.services.result_service import ResultProcessingService
from app.services.result_validator import ResultContractValidator


class TaxonomicAssignmentService:
    """Service implementing the scientific consecutive prefix assignment algorithm."""

    @staticmethod
    def validate_threshold_tau(tau: Any) -> float:
        """Validates that tau is a float within [0.0, 1.0]."""
        try:
            val = float(tau)
        except (TypeError, ValueError):
            raise ValueError(f"Threshold tau must be a numeric value, got '{tau}'.")

        if val < 0.0 or val > 1.0:
            raise ValueError(f"Threshold tau must be between 0.0 and 1.0 (got {val}).")
        return val

    @classmethod
    def assign_sequence(
        cls,
        ranks: List[str],
        seq_input: SequencePredictionInput,
        tau: float,
    ) -> SequenceResultItem:
        """
        Applies consecutive leading prefix assignment logic to a single sequence.
        
        Deterministic:
        - If is_invalid is True: produces status='invalid_input' with zero assigned depth.
        - Otherwise, assigns leading ranks from root where confidence >= tau and taxon is not null.
        - Stops assignment at the first failure.
        """
        tau_val = cls.validate_threshold_tau(tau)

        if not ranks:
            raise ValueError("Ranks list must contain at least one rank name.")

        # Check prediction counts and ranks alignment
        if len(seq_input.predictions) != len(ranks):
            raise ValueError(
                f"Sequence '{seq_input.id}' has {len(seq_input.predictions)} predictions, "
                f"expected {len(ranks)} matching ranks: {ranks}."
            )

        for idx, (pred, expected_rank) in enumerate(zip(seq_input.predictions, ranks)):
            if pred.rank != expected_rank:
                raise ValueError(
                    f"Sequence '{seq_input.id}' prediction at index {idx} has rank '{pred.rank}', "
                    f"expected '{expected_rank}'."
                )

        # 1. Invalid input handling
        if seq_input.is_invalid:
            lineage_items = [
                LineageItem(
                    rank=pred.rank,
                    taxon=pred.taxon,
                    confidence=pred.confidence,
                    assigned=False,
                )
                for pred in seq_input.predictions
            ]
            return SequenceResultItem(
                id=seq_input.id,
                length=seq_input.length,
                status="invalid_input",
                assigned_depth=0,
                deepest_rank=None,
                deepest_taxon=None,
                lineage=lineage_items,
                warnings=seq_input.warnings,
                extras=seq_input.extras,
            )

        # 2. Consecutive leading prefix assignment algorithm
        lineage_items: List[LineageItem] = []
        assigned_depth = 0
        assignment_stopped = False

        for pred in seq_input.predictions:
            # Check if this rank can be assigned
            can_assign = False
            if not assignment_stopped:
                has_taxon = pred.taxon is not None and str(pred.taxon).strip() != ""
                has_confidence = pred.confidence is not None
                meets_tau = has_confidence and pred.confidence >= tau_val

                if has_taxon and meets_tau:
                    can_assign = True
                    assigned_depth += 1
                else:
                    # First failure: stop assignment for this and all subsequent deeper ranks
                    can_assign = False
                    assignment_stopped = True
            else:
                can_assign = False

            lineage_items.append(
                LineageItem(
                    rank=pred.rank,
                    taxon=pred.taxon,
                    confidence=pred.confidence,
                    assigned=can_assign,
                )
            )

        # 3. Determine resolution status and deepest assigned rank/taxon
        num_ranks = len(ranks)
        if assigned_depth == num_ranks:
            status = "assigned_full"
            deepest_rank = ranks[-1]
            deepest_taxon = lineage_items[-1].taxon
        elif assigned_depth > 0:
            status = "assigned_partial"
            deepest_rank = ranks[assigned_depth - 1]
            deepest_taxon = lineage_items[assigned_depth - 1].taxon
        else:
            status = "unassigned"
            deepest_rank = None
            deepest_taxon = None

        return SequenceResultItem(
            id=seq_input.id,
            length=seq_input.length,
            status=status,
            assigned_depth=assigned_depth,
            deepest_rank=deepest_rank,
            deepest_taxon=deepest_taxon,
            lineage=lineage_items,
            warnings=seq_input.warnings,
            extras=seq_input.extras,
        )

    @classmethod
    def assign_batch(cls, request: AssignmentBatchRequest) -> AssignmentBatchResponse:
        """
        Applies assignment logic across a batch of query sequence predictions and constructs
        a valid Contract v1.0 ClassificationResultPayload.
        """
        tau_val = cls.validate_threshold_tau(request.threshold_tau)
        ranks = request.ranks

        if not ranks:
            raise ValueError("Dynamic ranks list must not be empty.")

        # Process each sequence deterministically
        sequence_results: List[SequenceResultItem] = [
            cls.assign_sequence(ranks=ranks, seq_input=seq, tau=tau_val)
            for seq in request.sequences
        ]

        # Compute summary
        summary = ResultProcessingService.compute_summary(sequence_results, ranks)

        # Build Contract v1.0 run metadata
        model = request.model_info or ModelInfo(
            name="external_predictions",
            version="1.0",
            code_commit=None,
        )
        reference = request.reference_info or ReferenceInfo(
            name="PR2",
            version="5.0.0",
            subset=None,
        )
        marker = request.marker_info or MarkerInfo(
            gene="18S rRNA",
            region="V4",
        )
        run_id = request.run_id or f"assignment-run-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

        run_metadata = RunMetadata(
            run_id=run_id,
            created_utc=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            model=model,
            reference=reference,
            marker=marker,
            ranks=ranks,
            threshold=ThresholdInfo(
                tau=tau_val,
                rule=request.threshold_rule,
            ),
            confidence_semantics=request.confidence_semantics,
        )

        payload = ClassificationResultPayload(
            contract_version="1.0",
            run=run_metadata,
            sequences=sequence_results,
            summary=summary,
        )

        # Verify output passes contract validator
        report = ResultContractValidator.validate_dict(payload.model_dump(mode="json"))
        if not report.valid:
            err_str = "; ".join(f"{e.path}: {e.message}" for e in report.errors)
            raise ValueError(f"Generated assignment payload failed contract validation: {err_str}")

        return AssignmentBatchResponse(
            threshold_tau=tau_val,
            ranks=ranks,
            sequence_count=len(sequence_results),
            sequences=sequence_results,
            summary=summary,
            payload=payload,
        )

    @classmethod
    def reapply_threshold(
        cls,
        payload: ClassificationResultPayload,
        new_tau: float,
    ) -> ClassificationResultPayload:
        """
        Recomputes assignment calls on an existing Contract v1.0 result payload using a new tau.
        Does not mutate raw confidence scores or taxon calls.
        Preserves invalid_input statuses.
        """
        new_tau_val = cls.validate_threshold_tau(new_tau)
        ranks = payload.run.ranks
        num_ranks = len(ranks)

        new_sequences: List[SequenceResultItem] = []
        for seq in payload.sequences:
            if seq.status == "invalid_input":
                # Preserve invalid_input with zero assigned depth
                new_lineage = [
                    LineageItem(
                        rank=item.rank,
                        taxon=item.taxon,
                        confidence=item.confidence,
                        assigned=False,
                    )
                    for item in seq.lineage
                ]
                new_sequences.append(
                    SequenceResultItem(
                        id=seq.id,
                        length=seq.length,
                        status="invalid_input",
                        assigned_depth=0,
                        deepest_rank=None,
                        deepest_taxon=None,
                        lineage=new_lineage,
                        warnings=seq.warnings,
                        extras=seq.extras,
                    )
                )
                continue

            # Valid sequence: recompute consecutive prefix
            new_lineage: List[LineageItem] = []
            assigned_depth = 0
            assignment_stopped = False

            for item in seq.lineage:
                can_assign = False
                if not assignment_stopped:
                    has_taxon = item.taxon is not None and str(item.taxon).strip() != ""
                    has_conf = item.confidence is not None
                    meets_tau = has_conf and item.confidence >= new_tau_val

                    if has_taxon and meets_tau:
                        can_assign = True
                        assigned_depth += 1
                    else:
                        can_assign = False
                        assignment_stopped = True
                else:
                    can_assign = False

                new_lineage.append(
                    LineageItem(
                        rank=item.rank,
                        taxon=item.taxon,
                        confidence=item.confidence,
                        assigned=can_assign,
                    )
                )

            # Determine new status
            if assigned_depth == num_ranks:
                status = "assigned_full"
                deepest_rank = ranks[-1]
                deepest_taxon = new_lineage[-1].taxon
            elif assigned_depth > 0:
                status = "assigned_partial"
                deepest_rank = ranks[assigned_depth - 1]
                deepest_taxon = new_lineage[assigned_depth - 1].taxon
            else:
                status = "unassigned"
                deepest_rank = None
                deepest_taxon = None

            new_sequences.append(
                SequenceResultItem(
                    id=seq.id,
                    length=seq.length,
                    status=status,
                    assigned_depth=assigned_depth,
                    deepest_rank=deepest_rank,
                    deepest_taxon=deepest_taxon,
                    lineage=new_lineage,
                    warnings=seq.warnings,
                    extras=seq.extras,
                )
            )

        # Recompute summary
        new_summary = ResultProcessingService.compute_summary(new_sequences, ranks)

        # Update run metadata threshold
        updated_run = payload.run.model_copy(deep=True)
        updated_run.threshold.tau = new_tau_val

        updated_payload = ClassificationResultPayload(
            contract_version=payload.contract_version,
            run=updated_run,
            sequences=new_sequences,
            summary=new_summary,
        )

        # Validate resulting payload
        report = ResultContractValidator.validate_dict(updated_payload.model_dump(mode="json"))
        if not report.valid:
            err_str = "; ".join(f"{e.path}: {e.message}" for e in report.errors)
            raise ValueError(f"Reapplied threshold payload failed contract validation: {err_str}")

        return updated_payload
