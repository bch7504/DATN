"""Top-level internal API router."""

from fastapi import APIRouter

from app.api.routes.ai_operations import router as ai_operations_router
from app.api.routes.documents import router as documents_router
from app.api.routes.health import router as health_router

internal_router = APIRouter(prefix="/internal/v1")
internal_router.include_router(health_router)
internal_router.include_router(ai_operations_router)
internal_router.include_router(documents_router)
