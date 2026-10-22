-- StudyFlow Database Migration V15: Quiz, Attempt, and Review Schema
-- Schema owner: app (Java Spring Boot)

-- 1. Table quizzes
CREATE TABLE app.quizzes (
    id UUID PRIMARY KEY,
    created_by UUID NOT NULL REFERENCES app.users(id),
    creator_role VARCHAR(20) NOT NULL,
    course_offering_id UUID NULL REFERENCES app.course_offerings(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_prompt TEXT,
    generation_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    question_count INT NOT NULL DEFAULT 0,
    regenerated_from_quiz_id UUID NULL REFERENCES app.quizzes(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_quizzes_creator_role CHECK (creator_role IN ('STUDENT', 'TEACHER')),
    CONSTRAINT ck_quizzes_generation_type CHECK (generation_type IN ('PERSONAL_STUDENT', 'COURSE_TEACHER')),
    CONSTRAINT ck_quizzes_status CHECK (status IN ('GENERATING', 'REVIEW_REQUIRED', 'READY', 'PUBLISHED', 'REJECTED', 'GENERATION_FAILED', 'ARCHIVED')),
    CONSTRAINT ck_quizzes_question_count CHECK (question_count >= 0)
);

CREATE INDEX ix_quizzes_creator ON app.quizzes (created_by, creator_role, status);
CREATE INDEX ix_quizzes_course_offering ON app.quizzes (course_offering_id, status);

-- 2. Table quiz_sources
CREATE TABLE app.quiz_sources (
    id UUID PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES app.quizzes(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES app.documents(id),
    document_version INT NOT NULL DEFAULT 1,
    page_start INT NULL,
    page_end INT NULL,
    source_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_quiz_sources_quiz_doc UNIQUE (quiz_id, document_id),
    CONSTRAINT ck_quiz_sources_page_range CHECK (page_start IS NULL OR page_end IS NULL OR page_end >= page_start)
);

CREATE INDEX ix_quiz_sources_quiz ON app.quiz_sources (quiz_id);

-- 3. Table quiz_questions (MCQ_SINGLE with exactly 4 options)
CREATE TABLE app.quiz_questions (
    id UUID PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES app.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option_index INT NOT NULL,
    explanation TEXT,
    question_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_quiz_questions_correct_index CHECK (correct_option_index >= 0 AND correct_option_index <= 3),
    CONSTRAINT ck_quiz_questions_order CHECK (question_order >= 1)
);

CREATE INDEX ix_quiz_questions_quiz_order ON app.quiz_questions (quiz_id, question_order);

-- 4. Table quiz_question_sources (Grounding & Citation for Wrong-Answer Review)
CREATE TABLE app.quiz_question_sources (
    id UUID PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES app.quiz_questions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES app.documents(id),
    page_number INT NOT NULL,
    excerpt TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_quiz_question_sources_page CHECK (page_number > 0)
);

CREATE INDEX ix_quiz_question_sources_question ON app.quiz_question_sources (question_id);
CREATE INDEX ix_quiz_question_sources_doc_page ON app.quiz_question_sources (document_id, page_number);

-- 5. Table quiz_attempts
CREATE TABLE app.quiz_attempts (
    id UUID PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES app.quizzes(id),
    student_id UUID NOT NULL REFERENCES app.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    score NUMERIC(5, 2) NULL,
    correct_answers_count INT NOT NULL DEFAULT 0,
    total_questions_count INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_quiz_attempts_status CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'SCORED')),
    CONSTRAINT ck_quiz_attempts_counts CHECK (correct_answers_count >= 0 AND total_questions_count >= 0 AND correct_answers_count <= total_questions_count),
    CONSTRAINT ck_quiz_attempts_score CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX ix_quiz_attempts_student ON app.quiz_attempts (student_id, quiz_id, created_at DESC);

-- 6. Table quiz_answers
CREATE TABLE app.quiz_answers (
    id UUID PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES app.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES app.quiz_questions(id),
    selected_option_index INT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_quiz_answers_attempt_question UNIQUE (attempt_id, question_id),
    CONSTRAINT ck_quiz_answers_selected_index CHECK (selected_option_index IS NULL OR (selected_option_index >= 0 AND selected_option_index <= 3))
);

CREATE INDEX ix_quiz_answers_attempt ON app.quiz_answers (attempt_id);
CREATE INDEX ix_quiz_answers_question_correct ON app.quiz_answers (question_id, is_correct);
