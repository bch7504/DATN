CREATE TABLE app.feedback_reports (
    id UUID PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES app.users(id),
    type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    resolution TEXT NULL,
    resolved_by UUID NULL REFERENCES app.users(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_feedback_reports_status CHECK (status IN ('OPEN', 'RESOLVED')),
    CONSTRAINT ck_feedback_reports_content CHECK (char_length(content) BETWEEN 1 AND 10000)
);
CREATE INDEX ix_feedback_reports_status_created ON app.feedback_reports (status, created_at DESC);

CREATE TABLE app.system_logs (
    id UUID PRIMARY KEY,
    actor_id UUID NULL REFERENCES app.users(id),
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(40) NOT NULL,
    target_id UUID NULL,
    status VARCHAR(20) NOT NULL,
    trace_id VARCHAR(128) NULL,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ix_system_logs_created ON app.system_logs (created_at DESC);

CREATE TABLE app.system_settings (
    setting_key VARCHAR(60) PRIMARY KEY,
    boolean_value BOOLEAN NOT NULL,
    updated_by UUID NULL REFERENCES app.users(id),
    updated_at TIMESTAMPTZ NOT NULL
);
INSERT INTO app.system_settings (setting_key, boolean_value, updated_at)
VALUES ('registration_enabled', TRUE, NOW());
