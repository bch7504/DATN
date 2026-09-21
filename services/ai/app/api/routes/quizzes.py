"""Route boundary for owner-scoped Personal Document Quiz generation."""

from fastapi import APIRouter

router = APIRouter(prefix="/quizzes", tags=["quizzes"])
