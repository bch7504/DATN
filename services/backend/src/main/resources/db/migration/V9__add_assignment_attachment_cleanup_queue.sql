CREATE TABLE app.assignment_attachment_cleanup_queue (
    id UUID PRIMARY KEY,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_assignment_attachment_cleanup_attempts CHECK (attempt_count >= 0)
);

CREATE INDEX ix_assignment_attachment_cleanup_due
    ON app.assignment_attachment_cleanup_queue (next_attempt_at);
