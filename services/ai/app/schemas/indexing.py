"""Typed contracts for asynchronous PDF indexing."""

from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from app.repositories.models import SourceType
from app.schemas.documents import TextChunk


class IndexDocumentCommand(BaseModel):
    """Validated payload required to index one immutable PDF version."""

    model_config = ConfigDict(frozen=True)

    request_id: str = Field(min_length=3, max_length=128)
    idempotency_key: str = Field(min_length=8, max_length=255)
    document_id: UUID
    document_version: int = Field(ge=1)
    owner_id: UUID | None = None
    source_type: SourceType
    pipeline_version: str = Field(min_length=1, max_length=64)
    signed_url: AnyHttpUrl
    mime_type: str = Field(pattern=r"^application/pdf$")

    @model_validator(mode="after")
    def validate_owner(self) -> "IndexDocumentCommand":
        """Require an owner for every Personal PDF.

        Args:
            None. Pydantic supplies the validated model instance.

        Returns:
            This validated command.

        Raises:
            ValueError: If a Personal PDF has no owner identifier.
        """

        if self.source_type is SourceType.PERSONAL_PDF and self.owner_id is None:
            raise ValueError("Personal PDF indexing requires owner_id")
        return self


class IndexedChunk(BaseModel):
    """One page-bounded chunk paired with its fixed-size embedding."""

    model_config = ConfigDict(frozen=True)

    chunk: TextChunk
    embedding: tuple[float, ...] = Field(min_length=1)


class IndexArtifact(BaseModel):
    """Safe metadata produced after successful document indexing."""

    model_config = ConfigDict(
        frozen=True, alias_generator=to_camel, populate_by_name=True, serialize_by_alias=True
    )

    page_count: int = Field(ge=1)
    chunk_count: int = Field(ge=1)
    embedding_model: str = Field(min_length=1)
    embedding_dimensions: int = Field(ge=1)
    pipeline_version: str = Field(min_length=1)
