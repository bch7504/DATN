ALTER TABLE app.documents
    ADD COLUMN ai_job_id UUID NULL,
    ADD COLUMN ai_error_code VARCHAR(80) NULL,
    ADD COLUMN indexed_at TIMESTAMPTZ NULL,
    ADD COLUMN sha256 VARCHAR(64) NULL;

CREATE INDEX ix_documents_ai_processing
    ON app.documents (processing_status, updated_at)
    WHERE deleted_at IS NULL
      AND processing_status IN ('PENDING_PROCESSING', 'PROCESSING');

CREATE UNIQUE INDEX uq_documents_owner_sha256_active
    ON app.documents (owner_id, document_scope, sha256)
    WHERE deleted_at IS NULL AND sha256 IS NOT NULL;
