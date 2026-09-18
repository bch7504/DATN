"""Liveness endpoint. Readiness checks will include providers later."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "studyflow-ai"}

