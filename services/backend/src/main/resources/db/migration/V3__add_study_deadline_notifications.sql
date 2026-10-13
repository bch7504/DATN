ALTER TABLE app.study_plan_items
    ADD COLUMN reminder_at TIMESTAMPTZ NULL,
    ADD COLUMN reminder_sent_at TIMESTAMPTZ NULL,
    ADD CONSTRAINT ck_study_plan_items_reminder
        CHECK (
            (reminder_at IS NULL AND reminder_sent_at IS NULL)
            OR (due_at IS NOT NULL AND reminder_at IS NOT NULL AND reminder_at <= due_at)
        );

CREATE INDEX ix_study_plan_items_due_reminder
    ON app.study_plan_items (reminder_at, due_at)
    WHERE status = 'TODO' AND reminder_sent_at IS NULL;

CREATE TABLE app.notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    notification_type VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(500) NOT NULL,
    source_type VARCHAR(40) NOT NULL,
    source_id UUID NOT NULL,
    due_at TIMESTAMPTZ NULL,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_notifications_type
        CHECK (notification_type IN ('STUDY_PLAN_DEADLINE'))
);

CREATE UNIQUE INDEX uq_notifications_source
    ON app.notifications (user_id, notification_type, source_type, source_id);
CREATE INDEX ix_notifications_user_created
    ON app.notifications (user_id, created_at DESC);
CREATE INDEX ix_notifications_user_unread
    ON app.notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;
