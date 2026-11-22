"""
Semantic validator for Contract v1.0 eDNA Classification Result payloads.

Validates:
- Contract version string adheres to ^1\.[0-9]+$
- Non-empty, distinct, dynamic rank ladder in run metadata
- Sequence lineage alignment with dynamic ranks (order, count, rank identity)
- Assignment rule: assigned_depth equals number of leading ranks >= tau
- Monotonicity: assigned flags must be a contiguous prefix from root
- Status semantics:
    * assigned_full: assigned_depth == len(ranks)
    * assigned_partial: 0 < assigned_depth < len(ranks)
    * unassigned / invalid_input: assigned_depth == 0
- Deepest rank & deepest taxon alignment with assigned_depth
- Summary consistency if summary block is present
"""

import re
from typing import List, Dict, Any, Optional
from pydantic import ValidationError
from app.schemas.result import (
    ClassificationResultPayload,
    ContractValidationReport,
    ContractValidationError,
    ResultSummary,
)

CONTRACT_VERSION_PATTERN = re.compile(r"^1\.[0-9]+$")


class ResultContractValidator:
    """Validator enforcing Contract v1.0 schema and biological consistency."""

    @classmethod
    def validate_dict(cls, data: Dict[str, Any]) -> ContractValidationReport:
        """
        Validates raw dictionary data against Contract v1.0.
        Returns a ContractValidationReport with detailed errors.
        """
        errors: List[ContractValidationError] = []
        warnings: List[str] = []

        # 1. Pydantic structural validation
        try:
            payload = ClassificationResultPayload.model_validate(data)
        except ValidationError as e:
            for err in e.errors():
                loc = ".".join(str(p) for p in err["loc"])
                errors.append(
                    ContractValidationError(
                        path=loc,
                        error_code="SCHEMA_VALIDATION_ERROR",
                        message=f"{err['msg']} (type: {err['type']})",
                    )
                )
            return ContractValidationReport(
                valid=False,
                contract_version=str(data.get("contract_version", "unknown")),
                run_id=data.get("run", {}).get("run_id") if isinstance(data.get("run"), dict) else None,
                sequence_count=len(data.get("sequences", [])) if isinstance(data.get("sequences"), list) else 0,
                errors=errors,
                warnings=warnings,
            )

        # 2. Deep semantic validation
        cls._validate_semantics(payload, errors, warnings)

        return ContractValidationReport(
            valid=len(errors) == 0,
            contract_version=payload.contract_version,
            run_id=payload.run.run_id,
            sequence_count=len(payload.sequences),
            errors=errors,
            warnings=warnings,
            summary=payload.summary,
        )

    @classmethod
    def _validate_semantics(
        cls,
        payload: ClassificationResultPayload,
        errors: List[ContractValidationError],
        warnings: List[str],
    ) -> None:
        ranks = payload.run.ranks
        tau = payload.run.threshold.tau

        # Check ranks uniqueness
        if len(ranks) != len(set(ranks)):
            errors.append(
                ContractValidationError(
                    path="run.ranks",
                    error_code="DUPLICATE_RANKS",
                    message=f"Ranks list contains duplicate rank names: {ranks}",
                )
            )

        num_ranks = len(ranks)

        # Sequence level checks
        for seq_idx, seq in enumerate(payload.sequences):
            seq_path = f"sequences[{seq_idx}]"
            lineage = seq.lineage

            # 1. Lineage length matching dynamic ranks
            if len(lineage) != num_ranks:
                errors.append(
                    ContractValidationError(
                        path=f"{seq_path}.lineage",
                        error_code="LINEAGE_LENGTH_MISMATCH",
                        message=(
                            f"Sequence '{seq.id}' has {len(lineage)} lineage items; "
                            f"expected {num_ranks} matching run.ranks ({ranks})."
                        ),
                    )
                )

            # 2. Rank names & ordering in lineage
            for r_idx, item in enumerate(lineage):
                if r_idx < num_ranks:
                    expected_rank = ranks[r_idx]
                    if item.rank != expected_rank:
                        errors.append(
                            ContractValidationError(
                                path=f"{seq_path}.lineage[{r_idx}].rank",
                                error_code="RANK_ORDER_MISMATCH",
                                message=(
                                    f"Sequence '{seq.id}' lineage rank at index {r_idx} is '{item.rank}', "
                                    f"expected '{expected_rank}' matching run.ranks."
                                ),
                            )
                        )

            # 3. Assigned prefix monotonicity
            assigned_flags = [item.assigned for item in lineage]
            assigned_count = sum(1 for a in assigned_flags if a)

            # Verify that assigned ranks form a contiguous prefix from root
            first_unassigned_idx = None
            for idx, assigned in enumerate(assigned_flags):
                if not assigned:
                    first_unassigned_idx = idx
                    break

            if first_unassigned_idx is not None:
                # Any subsequent assigned flag after an unassigned flag violates prefix rule
                for subsequent_idx in range(first_unassigned_idx + 1, len(assigned_flags)):
                    if assigned_flags[subsequent_idx]:
                        errors.append(
                            ContractValidationError(
                                path=f"{seq_path}.lineage[{subsequent_idx}].assigned",
                                error_code="NON_CONTIGUOUS_ASSIGNMENT",
                                message=(
                                    f"Sequence '{seq.id}' has assigned=true at rank index {subsequent_idx} "
                                    f"after an unassigned rank at index {first_unassigned_idx}. "
                                    f"Taxonomic assignment must be a contiguous leading prefix from root."
                                ),
                            )
                        )

            # 4. assigned_depth consistency
            if seq.assigned_depth != assigned_count:
                errors.append(
                    ContractValidationError(
                        path=f"{seq_path}.assigned_depth",
                        error_code="ASSIGNED_DEPTH_MISMATCH",
                        message=(
                            f"Sequence '{seq.id}' assigned_depth={seq.assigned_depth} does not equal "
                            f"count of assigned ranks ({assigned_count})."
                        ),
                    )
                )

            if seq.assigned_depth > num_ranks:
                errors.append(
                    ContractValidationError(
                        path=f"{seq_path}.assigned_depth",
                        error_code="ASSIGNED_DEPTH_EXCEEDS_RANKS",
                        message=(
                            f"Sequence '{seq.id}' assigned_depth={seq.assigned_depth} exceeds "
                            f"number of ranks ({num_ranks})."
                        ),
                    )
                )

            # 5. Assigned rank confidence threshold >= tau
            for r_idx, item in enumerate(lineage):
                if item.assigned:
                    if item.confidence is None:
                        errors.append(
                            ContractValidationError(
                                path=f"{seq_path}.lineage[{r_idx}].confidence",
                                error_code="ASSIGNED_RANK_MISSING_CONFIDENCE",
                                message=(
                                    f"Sequence '{seq.id}' rank '{item.rank}' is assigned=true but "
                                    f"confidence is null."
                                ),
                            )
                        )
                    elif item.confidence < tau:
                        errors.append(
                            ContractValidationError(
                                path=f"{seq_path}.lineage[{r_idx}].confidence",
                                error_code="CONFIDENCE_BELOW_TAU",
                                message=(
                                    f"Sequence '{seq.id}' rank '{item.rank}' has confidence={item.confidence} "
                                    f"which is below tau={tau}, but assigned is marked true."
                                ),
                            )
                        )

            # 6. Status semantics
            if seq.assigned_depth == num_ranks:
                if seq.status != "assigned_full":
                    errors.append(
                        ContractValidationError(
                            path=f"{seq_path}.status",
                            error_code="STATUS_MISMATCH_FULL",
                            message=(
                                f"Sequence '{seq.id}' assigned_depth={seq.assigned_depth} covers all ranks, "
                                f"so status must be 'assigned_full' (got '{seq.status}')."
                            ),
                        )
                    )
            elif seq.assigned_depth > 0:
                if seq.status != "assigned_partial":
                    errors.append(
                        ContractValidationError(
                            path=f"{seq_path}.status",
                            error_code="STATUS_MISMATCH_PARTIAL",
                            message=(
                                f"Sequence '{seq.id}' assigned_depth={seq.assigned_depth} is between 1 and "
                                f"{num_ranks - 1}, so status must be 'assigned_partial' (got '{seq.status}')."
                            ),
                        )
                    )
            else:  # assigned_depth == 0
                if seq.status not in ("unassigned", "invalid_input"):
                    errors.append(
                        ContractValidationError(
                            path=f"{seq_path}.status",
                            error_code="STATUS_MISMATCH_ZERO_DEPTH",
                            message=(
                                f"Sequence '{seq.id}' assigned_depth=0 must have status 'unassigned' or "
                                f"'invalid_input' (got '{seq.status}')."
                            ),
                        )
                    )

            # 7. Deepest rank & deepest taxon alignment
            if seq.assigned_depth > 0:
                expected_deepest_rank = ranks[seq.assigned_depth - 1] if seq.assigned_depth <= num_ranks else None
                expected_deepest_taxon = lineage[seq.assigned_depth - 1].taxon if seq.assigned_depth <= len(lineage) else None

                if seq.deepest_rank != expected_deepest_rank:
                    errors.append(
                        ContractValidationError(
                            path=f"{seq_path}.deepest_rank",
                            error_code="DEEPEST_RANK_MISMATCH",
                            message=(
                                f"Sequence '{seq.id}' deepest_rank='{seq.deepest_rank}' does not match "
                                f"rank at assigned_depth ({expected_deepest_rank})."
                            ),
                        )
                    )

                if seq.deepest_taxon != expected_deepest_taxon:
                    errors.append(
                        ContractValidationError(
                            path=f"{seq_path}.deepest_taxon",
                            error_code="DEEPEST_TAXON_MISMATCH",
                            message=(
                                f"Sequence '{seq.id}' deepest_taxon='{seq.deepest_taxon}' does not match "
                                f"taxon at assigned_depth ({expected_deepest_taxon})."
                            ),
                        )
                    )
            else:
                if seq.deepest_rank is not None:
                    errors.append(
                        ContractValidationError(
                            path=f"{seq_path}.deepest_rank",
                            error_code="UNASSIGNED_DEEPEST_RANK_NOT_NULL",
                            message=(
                                f"Sequence '{seq.id}' has assigned_depth=0 but deepest_rank is '{seq.deepest_rank}' (must be null)."
                            ),
                        )
                    )
                if seq.deepest_taxon is not None:
                    errors.append(
                        ContractValidationError(
                            path=f"{seq_path}.deepest_taxon",
                            error_code="UNASSIGNED_DEEPEST_TAXON_NOT_NULL",
                            message=(
                                f"Sequence '{seq.id}' has assigned_depth=0 but deepest_taxon is '{seq.deepest_taxon}' (must be null)."
                            ),
                        )
                    )

        # 8. Summary validation if provided
        if payload.summary:
            if payload.summary.n_sequences is not None:
                if payload.summary.n_sequences != len(payload.sequences):
                    errors.append(
                        ContractValidationError(
                            path="summary.n_sequences",
                            error_code="SUMMARY_COUNT_MISMATCH",
                            message=(
                                f"summary.n_sequences ({payload.summary.n_sequences}) does not match "
                                f"total sequences count ({len(payload.sequences)})."
                            ),
                        )
                    )
