"""Common structured response schemas."""

from pydantic import BaseModel, ConfigDict, Field


class ErrorDetail(BaseModel):
    """Safe error detail returned across the internal boundary."""

    model_config = ConfigDict(populate_by_name=True)

    code: str = Field(min_length=1, max_length=64)
    message: str = Field(min_length=1, max_length=256)
    request_id: str | None = Field(
        default=None,
        serialization_alias="requestId",
    )


class ErrorEnvelope(BaseModel):
    """Stable wrapper for one internal API error."""

    error: ErrorDetail
