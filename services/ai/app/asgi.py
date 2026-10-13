"""Production ASGI entry point.

Start with: uv run uvicorn app.asgi:app
"""

from app.main import create_app

app = create_app()
