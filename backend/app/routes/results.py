"""
REST API endpoints for eDNA Contract v1.0 Classification Results.

Endpoints:
- POST /api/results/validate : Validates a result payload against Contract v1.0 and taxonomic semantics
- GET  /api/results/fixture  : Provides the synthetic fixture payload with scientific disclaimer
- POST /api/runs/{run_id}/results : Attaches a validated result payload to an existing Analysis Run
- GET  /api/runs/{run_id}/results : Retrieves the classification result payload for a run
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.services.result_service import ResultProcessingService
from app.schemas.result import (
    ContractValidationReport,
    SyntheticFixtureResponse,
    RunResultAttachmentResponse,
    ClassificationResultPayload,
)

router = APIRouter(tags=["Classification Results & Contract v1.0"])


@router.post(
    "/results/validate",
    response_model=ContractValidationReport,
    summary="Validate an eDNA classification result payload",
    description=(
        "Validates an eDNA taxonomic classification result payload against Contract v1.0. "
        "Checks structural requirements, allowed statuses, confidence boundaries, dynamic rank ladder consistency, "
        "and assignment prefix monotonicity. Returns 200 if valid, or 422 with detailed errors if invalid."
    ),
)
async def validate_result_payload(request: Request, response: Response) -> ContractValidationReport:
    try:
        raw_json = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON body: {str(e)}",
        )

    payload, report = ResultProcessingService.validate_payload(raw_json)
    if not report.valid:
        response.status_code = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)
    return report


@router.get(
    "/results/fixture",
    response_model=SyntheticFixtureResponse,
    summary="Get synthetic/fixture classification result payload",
    description=(
        "Returns the illustrative synthetic example result fixture (contract/example_result.json). "
        "Explicitly flagged as synthetic for UI integration, testing, and contract verification."
    ),
)
def get_synthetic_fixture(response: Response) -> SyntheticFixtureResponse:
    try:
        fixture_payload = ResultProcessingService.load_synthetic_fixture()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load synthetic fixture: {str(e)}",
        )

    response.headers["X-eDNA-Data-Mode"] = "synthetic-fixture"
    response.headers["X-eDNA-Contract-Version"] = fixture_payload.contract_version
    return SyntheticFixtureResponse(
        is_synthetic=True,
        data=fixture_payload,
    )


@router.post(
    "/runs/{run_id}/results",
    response_model=RunResultAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Attach classification result to an existing Analysis Run",
    description=(
        "Validates and persists a Contract v1.0 classification result payload for an existing Analysis Run. "
        "Updates the run status to 'completed' without altering raw sequence tables or hardcoding taxonomic columns."
    ),
)
async def attach_result_to_run(
    run_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> RunResultAttachmentResponse:
    try:
        raw_json = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON body: {str(e)}",
        )

    # 1. Validate payload against Contract v1.0
    payload, report = ResultProcessingService.validate_payload(raw_json)
    if not payload or not report.valid:
        status_code = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)
        raise HTTPException(
            status_code=status_code,
            detail={
                "message": "Result payload does not satisfy Contract v1.0.",
                "errors": [err.model_dump() for err in report.errors],
            },
        )

    # 2. Attach to run
    try:
        saved_result = ResultProcessingService.attach_result_to_run(
            db=db,
            run_id=run_id,
            payload=payload,
            is_synthetic=False,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
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
        sequence_count=len(payload.sequences),
        message=f"Classification result payload attached successfully to Analysis Run '{run_id}'.",
    )


@router.get(
    "/runs/{run_id}/results",
    response_model=ClassificationResultPayload,
    summary="Get classification result payload for an Analysis Run",
    description="Retrieves the Contract v1.0 classification result payload attached to an Analysis Run.",
)
def get_run_results(
    run_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
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

    return result_model.result_payload
