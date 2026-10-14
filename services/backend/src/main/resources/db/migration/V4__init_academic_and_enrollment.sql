-- StudyFlow Database Migration V4: Academic and Enrollment Schema
-- Schema owner: app (Java Spring Boot)

CREATE SCHEMA IF NOT EXISTS app;

-- 1. Table subjects
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

-- 2. Table semesters
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

-- 3. Table course_offerings
CREATE TABLE IF NOT EXISTS app.course_offerings (
    id VARCHAR(36) PRIMARY KEY,
    subject_id VARCHAR(36) NOT NULL REFERENCES app.subjects(id),
    semester_id VARCHAR(36) NOT NULL REFERENCES app.semesters(id),
    teacher_id VARCHAR(36) NOT NULL,
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

-- 4. Table course_enrollments
CREATE TABLE IF NOT EXISTS app.course_enrollments (
    id VARCHAR(36) PRIMARY KEY,
    course_offering_id VARCHAR(36) NOT NULL REFERENCES app.course_offerings(id),
    student_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP WITH TIME ZONE,
    decided_by VARCHAR(36),
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
INSERT INTO app.users (id, email, username, password_hash, full_name, time_zone, role, status, email_verified_at, created_at, updated_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@ptit.edu.vn', 'admin', '/sBqMhYq9.TqK6o0kZ6Oq4zV8K3J2R3o1kZ6Oq4zV', 'Hệ thống Quản trị viên', 'Asia/Ho_Chi_Minh', 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222222', 'teacher@ptit.edu.vn', 'teacher', '/sBqMhYq9.TqK6o0kZ6Oq4zV8K3J2R3o1kZ6Oq4zV', 'TS. Nguyễn Văn Hùng', 'Asia/Ho_Chi_Minh', 'TEACHER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('33333333-3333-3333-3333-333333333333', 'student@ptit.edu.vn', 'student', '/sBqMhYq9.TqK6o0kZ6Oq4zV8K3J2R3o1kZ6Oq4zV', 'Trần Hoàng Nam', 'Asia/Ho_Chi_Minh', 'STUDENT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Default Subjects
INSERT INTO app.subjects (id, code, name, credits, description, status)
VALUES
    ('subj_dbi', 'INT1340', 'Cơ sở dữ liệu', 3, 'Học phần nền tảng về thiết kế mô hình dữ liệu quan hệ, SQL và tối ưu hóa truy vấn.', 'ACTIVE'),
    ('subj_dsa', 'INT1339', 'Cấu trúc dữ liệu và giải thuật', 3, 'Học phần cung cấp kiến thức giải thuật sắp xếp, tìm kiếm, cây, đồ thị và độ phức tạp.', 'ACTIVE'),
    ('subj_oop', 'INT1332', 'Lập trình hướng đối tượng', 3, 'Học phần trang bị tư duy hướng đối tượng với Java: Encapsulation, Inheritance, Polymorphism.', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Default Semesters
INSERT INTO app.semesters (id, code, name, academic_year, start_date, end_date, status, offering_creation_enabled)
VALUES
    ('sem_2026_1', '2026_1', 'Học kỳ 1 · Năm học 2026 - 2027', '2026-2027', '2026-08-15', '2026-12-31', 'ACTIVE', TRUE),
    ('sem_2026_2', '2026_2', 'Học kỳ 2 · Năm học 2026 - 2027', '2026-2027', '2027-01-15', '2027-05-30', 'UPCOMING', FALSE)
ON CONFLICT (id) DO NOTHING;
