"""Regression checks for authorization SQL, output schemas, and vector validation."""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session

from app.clients.structured_schema import provider_schema
from app.core.config import Settings
from app.repositories.chunk_repository import PgVectorChunkRepository
from app.repositories.models import SourceType
from app.schemas.grounding import AuthorizedDocument, AuthorizedScope, GeneratedQuiz
from app.schemas.orchestration import IntentDecision


def test_embedding_dimensions_accepts_environment_string_and_remains_fixed() -> None:
    """Environment text must parse to the single supported vector dimension."""

    settings = Settings(
        INTERNAL_SERVICE_TOKEN="test-service-token-123456789",
        EMBEDDING_DIMENSIONS="1024",
    )
    assert settings.embedding_dimensions == 1024

    with pytest.raises(ValidationError):
        Settings(
            INTERNAL_SERVICE_TOKEN="test-service-token-123456789",
            EMBEDDING_DIMENSIONS="1536",
        )


def test_page_filter_keeps_document_owner_version_and_embedding_model() -> None:
    """Compile real SQL to catch page filters accidentally replacing authorization."""
    owner_id, document_id = uuid4(), uuid4()
    session = MagicMock(spec=Session)
    session.execute.return_value.all.return_value = []
    repository = PgVectorChunkRepository(session)
    scope = AuthorizedScope(
        actor_id=owner_id,
        documents=(
            AuthorizedDocument(
                document_id=document_id,
                document_version=3,
                owner_id=owner_id,
                source_type=SourceType.PERSONAL_PDF,
                allowed_pages=(2, 4),
            ),
        ),
    )
    repository.search(query_embedding=(0.1,) * 1024, scope=scope, limit=8)
    statement = session.execute.call_args.args[0]
    compiled = statement.compile(dialect=postgresql.dialect())
    where_clause = str(compiled).split("WHERE", 1)[1].split("ORDER BY", 1)[0]
    for required in (
        "document_id",
        "document_version",
        "owner_id",
        "source_type",
        "page_number",
        "embedding_model",
        "embedding_dimensions",
        "status",
    ):
        assert required in where_clause
    assert owner_id in compiled.params.values()
    assert document_id in compiled.params.values()


def test_personal_document_scope_requires_matching_owner() -> None:
    """Missing/mismatched owners must fail before any provider or DB request."""
    with pytest.raises(ValidationError):
        AuthorizedDocument(
            document_id=uuid4(), document_version=1, source_type=SourceType.PERSONAL_PDF
        )
    with pytest.raises(ValidationError):
        AuthorizedScope(
            actor_id=uuid4(),
            documents=(
                AuthorizedDocument(
                    document_id=uuid4(),
                    document_version=1,
                    owner_id=uuid4(),
                    source_type=SourceType.PERSONAL_PDF,
                ),
            ),
        )


def test_provider_schema_closes_optional_fields_and_normalizes_four_options() -> None:
    """Strict JSON Schema requires all fields and homogeneous four-option arrays."""
    quiz_schema = provider_schema(GeneratedQuiz)
    question = quiz_schema["$defs"]["GeneratedQuizQuestion"]
    assert question["additionalProperties"] is False
    options = question["properties"]["options"]
    assert options["items"]["type"] == "string"
    assert options["minItems"] == options["maxItems"] == 4
    assert "prefixItems" not in options
    intent_schema = provider_schema(IntentDecision)
    assert set(intent_schema["required"]) == set(intent_schema["properties"])
    assert "default" not in intent_schema["properties"]["quizArgs"]
