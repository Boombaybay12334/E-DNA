from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.schemas.response import HealthResponse
from app.config import settings
from app.database.connection import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Check API service operational status")
def get_health(db: Session = Depends(get_db)) -> HealthResponse:
    """
    Health check probe endpoint.
    Used by frontend monitors, containers, and deployment health checks.
    Verifies API status and database connectivity.
    """
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    overall_status = "healthy" if db_status == "connected" else "degraded"

    return HealthResponse(
        status=overall_status,
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        database=db_status,
    )
