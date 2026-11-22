import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database.connection import init_db
from app.routes.health import router as health_router
from app.routes.upload import router as upload_router
from app.routes.runs import router as runs_router
from app.routes.results import router as results_router
from app.routes.assignment import router as assignment_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("edna-explorer-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: initializes persistent database schema on startup."""
    logger.info("Initializing persistent SQLite database schema...")
    init_db()
    logger.info("Database schema initialized successfully.")
    yield


# Initialize FastAPI Application
app = FastAPI(
    title="eDNA Explorer API",
    version=settings.APP_VERSION,
    description=(
        "Scientific backend API foundation for environmental DNA (eDNA) amplicon "
        "classification and sequence analysis platforms."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Global Unhandled Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled exception during request {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the request.",
        },
    )


# Include API Routers with designated prefix (/api)
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(upload_router, prefix=settings.API_PREFIX)
app.include_router(runs_router, prefix=settings.API_PREFIX)
app.include_router(results_router, prefix=settings.API_PREFIX)
app.include_router(assignment_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
def root():
    """Root endpoint welcoming clients and referencing documentation."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "documentation": "/docs",
        "health_check": f"{settings.API_PREFIX}/health",
        "runs": f"{settings.API_PREFIX}/runs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
