CREATE TABLE app.study_plans (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES app.users(id),
    title VARCHAR(150) NOT NULL,
    description VARCHAR(1000) NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_study_plans_date_range CHECK (end_date >= start_date),
    CONSTRAINT ck_study_plans_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED'))
);

CREATE INDEX ix_study_plans_student_dates
    ON app.study_plans (student_id, start_date, end_date);

CREATE TABLE app.study_plan_items (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES app.study_plans(id),
    title VARCHAR(200) NOT NULL,
    description VARCHAR(1000) NULL,
    item_type VARCHAR(24) NOT NULL,
    scheduled_start TIMESTAMPTZ NULL,
    scheduled_end TIMESTAMPTZ NULL,
    due_at TIMESTAMPTZ NULL,
    status VARCHAR(16) NOT NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_study_plan_items_type
        CHECK (item_type IN ('STUDY_SESSION', 'TASK', 'QUIZ')),
    CONSTRAINT ck_study_plan_items_status
        CHECK (status IN ('TODO', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_study_plan_items_schedule_pair
        CHECK ((scheduled_start IS NULL) = (scheduled_end IS NULL)),
    CONSTRAINT ck_study_plan_items_schedule_order
        CHECK (scheduled_start IS NULL OR scheduled_end > scheduled_start),
    CONSTRAINT ck_study_plan_items_time_required
        CHECK (scheduled_start IS NOT NULL OR due_at IS NOT NULL),
    CONSTRAINT ck_study_plan_items_completion
        CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL))
);

CREATE INDEX ix_study_plan_items_plan_time
    ON app.study_plan_items (plan_id, scheduled_start, due_at);

CREATE TABLE app.learning_events (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES app.users(id),
    event_type VARCHAR(40) NOT NULL,
    source_type VARCHAR(40) NOT NULL,
    source_id UUID NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    activity_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_learning_events_type
        CHECK (event_type IN ('VIEW_PAGE', 'STUDY_TASK_COMPLETED', 'QUIZ_COMPLETED'))
);

CREATE UNIQUE INDEX uq_learning_events_source
    ON app.learning_events (student_id, event_type, source_type, source_id);
CREATE UNIQUE INDEX uq_learning_events_idempotency
    ON app.learning_events (student_id, event_type, idempotency_key);
CREATE INDEX ix_learning_events_student_activity
    ON app.learning_events (student_id, activity_date, event_type);
