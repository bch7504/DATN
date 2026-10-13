CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    role VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL,
    email_verified_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_users_role CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN')),
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'LOCKED'))
);

CREATE UNIQUE INDEX uq_users_email_ci ON app.users (LOWER(email));
CREATE UNIQUE INDEX uq_users_username_ci ON app.users (LOWER(username));

CREATE TABLE app.email_verification_challenges (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    code_hash VARCHAR(100) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    resend_available_at TIMESTAMPTZ NOT NULL,
    attempts_remaining INTEGER NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_email_verification_attempts CHECK (attempts_remaining >= 0)
);

CREATE UNIQUE INDEX uq_email_verification_challenges_email_ci
    ON app.email_verification_challenges (LOWER(email));
CREATE INDEX ix_email_verification_expiry
    ON app.email_verification_challenges (expires_at)
    WHERE consumed_at IS NULL;

CREATE TABLE app.refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    replaced_by_id UUID NULL REFERENCES app.refresh_tokens(id),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_refresh_tokens_hash ON app.refresh_tokens (token_hash);
CREATE INDEX ix_refresh_tokens_user_active ON app.refresh_tokens (user_id, expires_at)
    WHERE revoked_at IS NULL;
