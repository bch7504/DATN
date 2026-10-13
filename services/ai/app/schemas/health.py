"""Health endpoint response schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Liveness and readiness result without sensitive configuration."""

    model_config = ConfigDict(populate_by_name=True)

    service: str
    version: str
    status: Literal["UP"]
    readiness: Literal["READY", "NOT_READY"]
    schema_version: Literal["3"] = Field(serialization_alias="schemaVersion")
    request_id: str = Field(serialization_alias="requestId")
    missing_configuration: tuple[str, ...] = Field(
        default=(),
        serialization_alias="missingConfiguration",
    )
