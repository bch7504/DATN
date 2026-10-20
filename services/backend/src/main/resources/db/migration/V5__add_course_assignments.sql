CREATE TABLE app.course_assignments (
    id UUID PRIMARY KEY,
    course_offering_id UUID NOT NULL REFERENCES app.course_offerings(id),
    teacher_id UUID NOT NULL REFERENCES app.users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    reminder_at TIMESTAMPTZ NOT NULL,
    reminder_sent_at TIMESTAMPTZ NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_course_assignments_status CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT ck_course_assignments_reminder CHECK (reminder_at <= due_at),
    CONSTRAINT ck_course_assignments_published CHECK (
        (status = 'DRAFT' AND published_at IS NULL)
        OR (status = 'PUBLISHED' AND published_at IS NOT NULL)
    )
);

CREATE INDEX ix_course_assignments_offering_status_due
    ON app.course_assignments (course_offering_id, status, due_at);
CREATE INDEX ix_course_assignments_reminder
    ON app.course_assignments (reminder_at, due_at)
    WHERE status = 'PUBLISHED' AND reminder_sent_at IS NULL;

CREATE TABLE app.assignment_submissions (
    id UUID PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES app.course_assignments(id),
    student_id UUID NOT NULL REFERENCES app.users(id),
    answer_text TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL,
    score NUMERIC(5,2) NULL,
    teacher_feedback TEXT NULL,
    reviewed_at TIMESTAMPTZ NULL,
    reviewed_by UUID NULL REFERENCES app.users(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_assignment_submission_student UNIQUE (assignment_id, student_id),
    CONSTRAINT ck_assignment_submissions_status CHECK (status IN ('ON_TIME', 'LATE')),
    CONSTRAINT ck_assignment_submissions_score CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX ix_assignment_submissions_assignment ON app.assignment_submissions (assignment_id, submitted_at);
CREATE INDEX ix_assignment_submissions_student ON app.assignment_submissions (student_id, submitted_at DESC);

ALTER TABLE app.notifications DROP CONSTRAINT ck_notifications_type;
ALTER TABLE app.notifications ADD CONSTRAINT ck_notifications_type
    CHECK (notification_type IN ('STUDY_PLAN_DEADLINE', 'ASSIGNMENT_DEADLINE', 'ASSIGNMENT_PUBLISHED'));
