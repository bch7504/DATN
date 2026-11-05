"""Synthetic contracts for the explicitly authorized local index helper."""

from pathlib import Path

import pytest

from evals.index_local import (
    AuthorizedLocalPdfClient,
    load_index_manifest,
    run_local_evaluation_index,
)


def test_locked_kts_manifest_has_unique_four_document_mapping() -> None:
    """The evaluation question IDs map to exactly four immutable PDF identities."""

    manifest = load_index_manifest()

    assert manifest.dataset_id == "ky-thuat-so-index-v3"
    assert len(manifest.documents) == 4
    assert len({item.document_id for item in manifest.documents}) == 4


@pytest.mark.anyio
async def test_authorized_local_client_enforces_url_and_size(tmp_path: Path) -> None:
    """The helper cannot read arbitrary URLs or files above the worker limit."""

    file_path = tmp_path / "synthetic.pdf"
    file_path.write_bytes(b"%PDF-synthetic")
    client = AuthorizedLocalPdfClient(file_path)

    assert (
        await client.download(signed_url="https://evaluation.invalid/authorized.pdf", max_bytes=100)
        == b"%PDF-synthetic"
    )
    with pytest.raises(ValueError):
        await client.download(signed_url="https://other.invalid/file.pdf", max_bytes=100)


@pytest.mark.anyio
async def test_local_index_rejects_document_outside_manifest(tmp_path: Path) -> None:
    """A retry selector cannot be used to read arbitrary local PDFs."""

    with pytest.raises(ValueError, match="outside the manifest"):
        await run_local_evaluation_index(
            document_dir=tmp_path,
            document_names=("unknown.pdf",),
        )
