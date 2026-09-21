"""Route boundary for Teacher Slide processing and Tutor requests."""

from fastapi import APIRouter

router = APIRouter(prefix="/slides", tags=["slides"])
