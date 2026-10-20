CREATE TABLE app.notification_email_outbox (
    notification_id UUID PRIMARY KEY REFERENCES app.notifications(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ NULL,
    CONSTRAINT ck_notification_email_status CHECK (status IN ('PENDING', 'SENT', 'SKIPPED', 'FAILED')),
    CONSTRAINT ck_notification_email_attempts CHECK (attempt_count >= 0)
);

CREATE INDEX ix_notification_email_pending
    ON app.notification_email_outbox (next_attempt_at)
    WHERE status = 'PENDING';
