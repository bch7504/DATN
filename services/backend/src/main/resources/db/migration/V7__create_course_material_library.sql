CREATE TABLE app.documents (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES app.users(id),
    owner_role VARCHAR(20) NOT NULL,
    document_scope VARCHAR(30) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    processing_status VARCHAR(30) NOT NULL,
    document_version INT NOT NULL DEFAULT 1,
    page_count INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT ck_documents_scope CHECK (document_scope IN ('COURSE_MATERIAL', 'PERSONAL')),
    CONSTRAINT ck_documents_type CHECK (file_type = 'PDF'),
    CONSTRAINT ck_documents_processing_status CHECK (processing_status IN ('UPLOADING', 'PENDING_PROCESSING', 'PROCESSING', 'READY', 'FAILED', 'DELETING')),
    CONSTRAINT ck_documents_file_size CHECK (file_size > 0),
    CONSTRAINT ck_documents_page_count CHECK (page_count > 0)
);

CREATE INDEX ix_documents_owner_scope_created
    ON app.documents (owner_id, document_scope, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE app.document_publications (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES app.documents(id),
    course_offering_id UUID NOT NULL REFERENCES app.course_offerings(id),
    published_by UUID NOT NULL REFERENCES app.users(id),
    status VARCHAR(20) NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_document_publication UNIQUE (document_id, course_offering_id),
    CONSTRAINT ck_document_publication_status CHECK (status IN ('PUBLISHED', 'REVOKED'))
);

CREATE INDEX ix_document_publications_offering_status
    ON app.document_publications (course_offering_id, status);
