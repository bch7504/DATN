"""Route boundary for owner-scoped Personal Document RAG."""

from fastapi import APIRouter

router = APIRouter(prefix="/personal-rag", tags=["personal-rag"])
