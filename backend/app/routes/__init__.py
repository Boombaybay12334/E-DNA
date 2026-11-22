"""API routes package."""
from app.routes.health import router as health_router
from app.routes.upload import router as upload_router
from app.routes.runs import router as runs_router
from app.routes.results import router as results_router
from app.routes.assignment import router as assignment_router

__all__ = [
    "health_router",
    "upload_router",
    "runs_router",
    "results_router",
    "assignment_router",
]
