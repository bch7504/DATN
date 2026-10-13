-- StudyFlow Database Migration V1: Academic and Enrollment Schema
-- Schema owner: app (Java Spring Boot)

CREATE SCHEMA IF NOT EXISTS app;

-- 1. Table users
CREATE TABLE IF NOT EXISTS app.users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    time_zone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table subjects
CREATE TABLE IF NOT EXISTS app.subjects (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    credits INT NOT NULL DEFAULT 3 CHECK (credits > 0),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table semesters
CREATE TABLE IF NOT EXISTS app.semesters (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('UPCOMING', 'ACTIVE', 'CLOSED')),
    offering_creation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_semester_dates CHECK (end_date >= start_date)
);

-- 4. Table course_offerings
CREATE TABLE IF NOT EXISTS app.course_offerings (
    id VARCHAR(36) PRIMARY KEY,
    subject_id VARCHAR(36) NOT NULL REFERENCES app.subjects(id),
    semester_id VARCHAR(36) NOT NULL REFERENCES app.semesters(id),
    teacher_id VARCHAR(36) NOT NULL REFERENCES app.users(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    join_code_hash VARCHAR(64) UNIQUE,
    join_code_hint VARCHAR(4),
    join_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'ARCHIVED')),
    archived_at TIMESTAMP WITH TIME ZONE,
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_offering_semester_code UNIQUE (semester_id, code)
);

-- 5. Table course_enrollments
CREATE TABLE IF NOT EXISTS app.course_enrollments (
    id VARCHAR(36) PRIMARY KEY,
    course_offering_id VARCHAR(36) NOT NULL REFERENCES app.course_offerings(id),
    student_id VARCHAR(36) NOT NULL REFERENCES app.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP WITH TIME ZONE,
    decided_by VARCHAR(36) REFERENCES app.users(id),
    removed_at TIMESTAMP WITH TIME ZONE,
    decision_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_enrollment_student_offering UNIQUE (course_offering_id, student_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_offerings_teacher_status ON app.course_offerings(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_offerings_join_code_hash ON app.course_offerings(join_code_hash);
CREATE INDEX IF NOT EXISTS idx_offerings_subject_semester ON app.course_offerings(subject_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_offering_status ON app.course_enrollments(course_offering_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status ON app.course_enrollments(student_id, status);

-- Seed Data: Demo Users (password: ptit@demo123)
INSERT INTO app.users (id, email, username, password_hash, full_name, role, status)
VALUES
    ('usr_student_01', 'student@ptit.edu.vn', 'student', '$2a$10$25XRUmNmoavqX2viCR69/OWnn1kRjncbvfPBGQ.pv0Og.8APgZ1jy', 'Nguyễn Văn An', 'STUDENT', 'ACTIVE'),
    ('usr_teacher_01', 'teacher@ptit.edu.vn', 'teacher', '$2a$10$25XRUmNmoavqX2viCR69/OWnn1kRjncbvfPBGQ.pv0Og.8APgZ1jy', 'TS. Trần Thị Giảng Viên', 'TEACHER', 'ACTIVE'),
    ('usr_admin_01', 'admin@ptit.edu.vn', 'admin', '$2a$10$25XRUmNmoavqX2viCR69/OWnn1kRjncbvfPBGQ.pv0Og.8APgZ1jy', 'Quản trị viên Hệ thống PTIT', 'ADMIN', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Standard PTIT Subjects
INSERT INTO app.subjects (id, code, name, credits, description, status)
VALUES
    ('subj_dbi', 'INT1340', 'Cơ sở dữ liệu', 3, 'Học phần Cơ sở dữ liệu theo khung chính quy PTIT', 'ACTIVE'),
    ('subj_ai', 'INT1415', 'Trí tuệ nhân tạo', 3, 'Học phần Trí tuệ nhân tạo theo khung chính quy PTIT', 'ACTIVE'),
    ('subj_dsa', 'INT1339', 'Cấu trúc dữ liệu & Giải thuật', 3, 'Học phần Cấu trúc dữ liệu và giải thuật PTIT', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Academic Semesters
INSERT INTO app.semesters (id, code, name, academic_year, start_date, end_date, status, offering_creation_enabled)
VALUES
    ('sem_2026_1', '2026_1', 'Học kỳ 1 · Năm học 2026 - 2027', '2026-2027', '2026-09-01', '2027-01-15', 'ACTIVE', TRUE),
    ('sem_2026_2', '2026_2', 'Học kỳ 2 · Năm học 2026 - 2027', '2026-2027', '2027-02-01', '2027-06-30', 'UPCOMING', FALSE)
ON CONFLICT (id) DO NOTHING;
