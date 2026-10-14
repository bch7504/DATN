-- StudyFlow Database Migration V4: Academic and Enrollment Schema
-- Schema owner: app (Java Spring Boot)

CREATE SCHEMA IF NOT EXISTS app;

-- 1. Table subjects
CREATE TABLE app.subjects (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    credits INT NOT NULL DEFAULT 3,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_subjects_credits CHECK (credits > 0),
    CONSTRAINT ck_subjects_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX ix_subjects_code ON app.subjects (code);

-- 2. Table semesters
CREATE TABLE app.semesters (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    offering_creation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_semesters_status CHECK (status IN ('UPCOMING', 'ACTIVE', 'CLOSED')),
    CONSTRAINT ck_semesters_date_range CHECK (end_date >= start_date)
);

CREATE INDEX ix_semesters_code ON app.semesters (code);

-- 3. Table course_offerings
CREATE TABLE app.course_offerings (
    id UUID PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES app.subjects(id),
    semester_id UUID NOT NULL REFERENCES app.semesters(id),
    teacher_id UUID NOT NULL REFERENCES app.users(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    join_code_hash VARCHAR(64) UNIQUE,
    join_code_hint VARCHAR(4),
    join_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    archived_at TIMESTAMPTZ NULL,
    locked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_course_offerings_status CHECK (status IN ('ACTIVE', 'LOCKED', 'ARCHIVED')),
    CONSTRAINT uq_course_offerings_semester_code UNIQUE (semester_id, code)
);

CREATE INDEX ix_course_offerings_teacher_status ON app.course_offerings (teacher_id, status);
CREATE INDEX ix_course_offerings_join_code_hash ON app.course_offerings (join_code_hash);
CREATE INDEX ix_course_offerings_subject_semester ON app.course_offerings (subject_id, semester_id);

-- 4. Table course_enrollments
CREATE TABLE app.course_enrollments (
    id UUID PRIMARY KEY,
    course_offering_id UUID NOT NULL REFERENCES app.course_offerings(id),
    student_id UUID NOT NULL REFERENCES app.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ NULL,
    decided_by UUID NULL REFERENCES app.users(id),
    removed_at TIMESTAMPTZ NULL,
    decision_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_course_enrollments_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED')),
    CONSTRAINT uq_course_enrollments_offering_student UNIQUE (course_offering_id, student_id)
);

CREATE INDEX ix_course_enrollments_offering_status ON app.course_enrollments (course_offering_id, status);
CREATE INDEX ix_course_enrollments_student_status ON app.course_enrollments (student_id, status);
