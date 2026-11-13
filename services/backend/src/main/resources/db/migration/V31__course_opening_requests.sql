-- New classes require Admin approval; existing approved/active classes are retained.
CREATE TABLE app.course_opening_requests (
    id UUID PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES app.users(id),
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    credits INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 30),
    semester_id UUID NOT NULL REFERENCES app.semesters(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    course_offering_id UUID UNIQUE REFERENCES app.course_offerings(id),
    decided_by UUID REFERENCES app.users(id),
    decision_reason VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ,
    CONSTRAINT ck_course_opening_decision CHECK (
      (status='PENDING' AND course_offering_id IS NULL AND decided_by IS NULL AND decided_at IS NULL)
      OR (status='APPROVED' AND course_offering_id IS NOT NULL AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
      OR (status='REJECTED' AND course_offering_id IS NULL AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND decision_reason IS NOT NULL)
    )
);
CREATE UNIQUE INDEX uq_pending_course_opening ON app.course_opening_requests(teacher_id,semester_id,code)
    WHERE status='PENDING';
CREATE INDEX ix_course_opening_teacher ON app.course_opening_requests(teacher_id,created_at DESC);
CREATE INDEX ix_course_opening_status ON app.course_opening_requests(status,created_at DESC);
