"""Evaluation-only indexing of explicitly authorized local course PDFs."""

import asyncio
from pathlib import Path
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.exc import SQLAlchemyError

from app.clients.openrouter import OpenRouterClient
from app.core.config import Settings
from app.core.database import build_engine, build_session_factory
from app.pipelines.parsers.pdf import PdfProcessingError
from app.repositories.index_repository import SqlAlchemyDocumentIndexRepository
from app.repositories.models import SourceType
from app.schemas.indexing import IndexDocumentCommand
from app.services.indexing import DocumentIndexWorker

DEFAULT_INDEX_MANIFEST = Path(__file__).parent / "datasets" / "ky-thuat-so-index-v3.json"


def _camel(name: str) -> str:
    """Convert a snake-case field name to the manifest's lower camel case."""

    head, *tail = name.split("_")
    return head + "".join(part.title() for part in tail)


class EvaluationIndexDocument(BaseModel):
    """One authorized local PDF identity for a disposable evaluation index."""

    model_config = ConfigDict(extra="forbid", alias_generator=_camel)
    file_name: str = Field(min_length=5, pattern=r"^[^/\\]+\.pdf$")
    document_id: UUID
    document_version: int = Field(ge=1)


class EvaluationIndexManifest(BaseModel):
    """Locked file-to-document mapping used only by the local evaluation CLI."""

    model_config = ConfigDict(extra="forbid", alias_generator=_camel)
    dataset_id: str = Field(min_length=1)
    pipeline_version: str = Field(min_length=1, max_length=64)
    documents: tuple[EvaluationIndexDocument, ...] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def validate_unique_documents(self) -> "EvaluationIndexManifest":
        """Reject duplicate file names and immutable document identities."""

        file_names = [item.file_name for item in self.documents]
        identities = [(item.document_id, item.document_version) for item in self.documents]
        if len(file_names) != len(set(file_names)) or len(identities) != len(set(identities)):
            raise ValueError("evaluation index documents must be unique")
        return self


class EvaluationIndexDocumentResult(BaseModel):
    """Content-free result for one local evaluation PDF."""

    file_name: str
    status: str = Field(pattern="^(PASSED|FAILED)$")
    page_count: int = Field(ge=0)
    chunk_count: int = Field(ge=0)
    error_code: str | None = None


class EvaluationIndexReport(BaseModel):
    """Aggregate report that never includes PDF text, vectors, prompts, or secrets."""

    dataset_id: str
    pipeline_version: str
    embedding_model: str
    document_count: int = Field(ge=0)
    page_count: int = Field(ge=0)
    chunk_count: int = Field(ge=0)
    passed: bool
    documents: tuple[EvaluationIndexDocumentResult, ...]


class AuthorizedLocalPdfClient:
    """Read exactly one explicitly authorized local PDF for evaluation only."""

    def __init__(self, file_path: Path) -> None:
        self._file_path = file_path

    async def download(self, *, signed_url: str, max_bytes: int) -> bytes:
        """Read one bounded file while satisfying the production worker contract.

        Args:
            signed_url: Fixed non-routable evaluation URL from the command.
            max_bytes: Positive maximum accepted file size.

        Returns:
            Complete authorized PDF bytes.

        Raises:
            ValueError: If URL or size limit is invalid.
            OSError: If the authorized file cannot be read.
            PdfProcessingError: If the file exceeds the configured limit.
        """

        if signed_url != "https://evaluation.invalid/authorized.pdf" or max_bytes <= 0:
            raise ValueError("invalid evaluation download contract")
        content = self._file_path.read_bytes()
        if len(content) > max_bytes:
            raise PdfProcessingError(
                code="PDF_TOO_LARGE",
                message="PDF exceeds the configured size limit",
            )
        return content


def load_index_manifest(path: Path = DEFAULT_INDEX_MANIFEST) -> EvaluationIndexManifest:
    """Load the locked evaluation file mapping.

    Args:
        path: JSON manifest path inside the evaluation package.

    Returns:
        Strictly validated immutable mapping.

    Raises:
        OSError: If the manifest cannot be read.
        pydantic.ValidationError: If its schema or identities are invalid.
    """

    return EvaluationIndexManifest.model_validate_json(path.read_text(encoding="utf-8"))


async def run_local_evaluation_index(
    *,
    document_dir: Path,
    manifest_path: Path = DEFAULT_INDEX_MANIFEST,
    max_concurrent_documents: int = 2,
    document_names: tuple[str, ...] | None = None,
) -> EvaluationIndexReport:
    """Index authorized local PDFs with the real provider and AI-owned database.

    Args:
        document_dir: User-authorized directory containing exact manifest file names.
        manifest_path: Locked mapping of file names to evaluation document identities.
        max_concurrent_documents: Maximum PDFs indexed concurrently, from one to four.
        document_names: Optional exact manifest file names to index. None indexes all files.

    Returns:
        Content-free per-document index metadata.

    Raises:
        ValueError: If configuration, directory, manifest, or concurrency is invalid.
        RuntimeError: If provider or database initialization fails.
    """

    if not document_dir.is_dir():
        raise ValueError("document_dir must be an existing directory")
    if not 1 <= max_concurrent_documents <= 4:
        raise ValueError("max_concurrent_documents must be between 1 and 4")
    manifest = load_index_manifest(manifest_path)
    selected_documents = manifest.documents
    if document_names is not None:
        if not document_names or len(document_names) != len(set(document_names)):
            raise ValueError("document_names must contain unique manifest file names")
        requested_names = set(document_names)
        selected_documents = tuple(
            item for item in manifest.documents if item.file_name in requested_names
        )
        if len(selected_documents) != len(requested_names):
            raise ValueError("document_names contains a file outside the manifest")
    for item in selected_documents:
        if not (document_dir / item.file_name).is_file():
            raise ValueError("document_dir does not contain every manifest PDF")

    settings = Settings(INTERNAL_SERVICE_TOKEN="local-evaluation-index-token")
    if settings.ai_database_url is None or settings.openrouter_api_key is None:
        raise ValueError("AI_DATABASE_URL and OPENROUTER_API_KEY must be configured")
    engine = build_engine(settings)
    factory = build_session_factory(engine)
    provider = OpenRouterClient.from_settings(settings)
    semaphore = asyncio.Semaphore(max_concurrent_documents)

    async def index_document(item: EvaluationIndexDocument) -> EvaluationIndexDocumentResult:
        """Index one manifest PDF in its own database transaction."""

        async with semaphore:
            file_path = document_dir / item.file_name
            try:
                with factory() as session:
                    worker = DocumentIndexWorker(
                        download_client=AuthorizedLocalPdfClient(file_path),
                        embedding_client=provider,
                        vision_client=provider,
                        enable_vision=settings.ai_enable_image_extraction,
                        index_repository=SqlAlchemyDocumentIndexRepository(session),
                        embedding_model=settings.openrouter_embedding_model,
                        embedding_dimensions=settings.embedding_dimensions,
                        max_pdf_bytes=20 * 1024 * 1024,
                    )
                    artifact = await worker.execute(
                        IndexDocumentCommand(
                            request_id=f"eval-index-{str(item.document_id)[:8]}",
                            idempotency_key=(
                                f"{manifest.pipeline_version}-{item.document_id}-"
                                f"v{item.document_version}"
                            ),
                            document_id=item.document_id,
                            document_version=item.document_version,
                            source_type=SourceType.COURSE_MATERIAL_PDF,
                            pipeline_version=manifest.pipeline_version,
                            signed_url="https://evaluation.invalid/authorized.pdf",
                            mime_type="application/pdf",
                        )
                    )
                    session.commit()
                return EvaluationIndexDocumentResult(
                    file_name=item.file_name,
                    status="PASSED",
                    page_count=artifact.page_count,
                    chunk_count=artifact.chunk_count,
                )
            except Exception as error:  # noqa: BLE001 - report only a stable safe code.
                return EvaluationIndexDocumentResult(
                    file_name=item.file_name,
                    status="FAILED",
                    page_count=0,
                    chunk_count=0,
                    error_code=_safe_index_error_code(error),
                )

    try:
        documents = tuple(
            await asyncio.gather(*(index_document(item) for item in selected_documents))
        )
    finally:
        await provider.close()
        engine.dispose()

    return EvaluationIndexReport(
        dataset_id=manifest.dataset_id,
        pipeline_version=manifest.pipeline_version,
        embedding_model=settings.openrouter_embedding_model,
        document_count=len(documents),
        page_count=sum(item.page_count for item in documents),
        chunk_count=sum(item.chunk_count for item in documents),
        passed=all(item.status == "PASSED" for item in documents),
        documents=documents,
    )


def _safe_index_error_code(error: Exception) -> str:
    """Map index failures to stable codes without exposing document/provider details."""

    if isinstance(error, PdfProcessingError):
        return error.code
    if isinstance(error, SQLAlchemyError):
        return "EVALUATION_DATABASE_ERROR"
    current: BaseException | None = error
    for _ in range(6):
        if current is None:
            break
        status_code = getattr(current, "status_code", None)
        if status_code in {401, 403}:
            return "EVALUATION_PROVIDER_AUTH"
        if status_code == 402:
            return "EVALUATION_PROVIDER_CREDITS"
        if status_code == 404:
            return "EVALUATION_MODEL_NOT_AVAILABLE"
        if status_code == 429:
            return "EVALUATION_PROVIDER_RATE_LIMIT"
        if isinstance(status_code, int) and status_code >= 500:
            return "EVALUATION_PROVIDER_UPSTREAM"
        current = current.__cause__ or current.__context__
    return "EVALUATION_INDEX_FAILED"
