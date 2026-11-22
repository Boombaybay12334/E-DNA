"""
REST API endpoints for Taxonomic Assignment and Threshold (tau) processing (Phase 4).

Endpoints:
- POST /api/assignment/apply-threshold   : Evaluates candidate rank predictions against tau
- POST /api/assignment/reapply-threshold : Recomputes assignment on a Contract v1.0 payload under a new tau
- POST /api/runs/{run_id}/reapply-threshold : Recomputes and updates assignments for a saved run under a new tau
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.assignment_service import TaxonomicAssignmentService
from app.services.result_service import ResultProcessingService
from app.schemas.result import ClassificationResultPayload, RunResultAttachmentResponse
from app.schemas.assignment import (
    AssignmentBatchRequest,
    AssignmentBatchResponse,
    ReapplyThresholdRequest,
)

router = APIRouter(tags=["Taxonomic Assignment & Threshold Logic"])


@router.post(
    "/assignment/apply-threshold",
    response_model=AssignmentBatchResponse,
    summary="Apply confidence threshold tau to candidate sequence predictions",
    description=(
        "Applies the consecutive leading prefix assignment algorithm to supplied candidate predictions. "
        "Strictly halts assignment at the first rank failing tau or containing null calls. "
        "Produces valid Contract v1.0 resolution statuses and outputs."
    ),
)
def apply_threshold_to_predictions(request: AssignmentBatchRequest) -> AssignmentBatchResponse:
    try:
        return TaxonomicAssignmentService.assign_batch(request)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/assignment/reapply-threshold",
    response_model=ClassificationResultPayload,
    summary="Reapply a new confidence threshold tau to an existing result payload",
    description=(
        "Re-evaluates assignment prefix monotonicity on an existing Contract v1.0 result payload "
        "under a different tau cutoff, without modifying raw candidate confidences or taxon names."
    ),
)
def reapply_threshold_to_payload(request: ReapplyThresholdRequest) -> ClassificationResultPayload:
    if not request.payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'payload' containing an existing Contract v1.0 result must be provided.",
        )
    try:
        return TaxonomicAssignmentService.reapply_threshold(
            payload=request.payload,
            new_tau=request.threshold_tau,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/runs/{run_id}/reapply-threshold",
    response_model=RunResultAttachmentResponse,
    summary="Recompute assignments for a saved Analysis Run under a new tau",
    description=(
        "Loads the persistent Contract v1.0 classification result attached to run_id, "
        "re-evaluates all sequence assignments under the new tau, and persists the updated result."
    ),
)
def reapply_threshold_to_saved_run(
    run_id: str,
    request: ReapplyThresholdRequest,
    db: Session = Depends(get_db),
) -> RunResultAttachmentResponse:
    from app.database.repositories import RunRepository
    run = RunRepository.get_by_id(db, run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis Run '{run_id}' not found.",
        )

    result_model = ResultProcessingService.get_result_by_run_id(db, run_id)
    if not result_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No classification result attached to Analysis Run '{run_id}'.",
        )

    try:
        existing_payload = ClassificationResultPayload.model_validate(result_model.result_payload)
        updated_payload = TaxonomicAssignmentService.reapply_threshold(
            payload=existing_payload,
            new_tau=request.threshold_tau,
        )
        saved_result = ResultProcessingService.attach_result_to_run(
            db=db,
            run_id=run_id,
            payload=updated_payload,
            is_synthetic=result_model.is_synthetic,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return RunResultAttachmentResponse(
        run_id=saved_result.run_id,
        attached_at=saved_result.created_at,
        is_synthetic=saved_result.is_synthetic,
        contract_version=saved_result.contract_version,
        model_name=saved_result.model_name,
        model_version=saved_result.model_version,
        reference_name=saved_result.reference_name,
        reference_version=saved_result.reference_version,
        threshold_tau=saved_result.threshold_tau,
        ranks=saved_result.ranks,
        sequence_count=len(updated_payload.sequences),
        message=f"Assignments successfully recomputed for Analysis Run '{run_id}' with tau={request.threshold_tau}.",
    )
