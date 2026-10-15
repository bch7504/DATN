ALTER TABLE app.assignment_submissions
    ALTER COLUMN answer_text DROP NOT NULL;

CREATE TABLE app.assignment_submission_attachments (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES app.assignment_submissions(id) ON DELETE CASCADE,
    original_file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_assignment_attachment_size CHECK (size_bytes > 0 AND size_bytes <= 10485760)
);

CREATE INDEX ix_assignment_attachments_submission
    ON app.assignment_submission_attachments (submission_id, created_at);
