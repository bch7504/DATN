"""Route boundary for idempotent index/deindex jobs."""

from fastapi import APIRouter

router = APIRouter(prefix="/documents", tags=["documents"])
