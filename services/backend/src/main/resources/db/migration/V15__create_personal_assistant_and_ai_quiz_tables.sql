CREATE TABLE app.ai_quiz_drafts (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES app.users(id),
    mode VARCHAR(30) NOT NULL,
    prompt VARCHAR(4000) NOT NULL,
    title VARCHAR(300) NOT NULL,
    status VARCHAR(30) NOT NULL,
    destination_type VARCHAR(30) NULL,
    course_offering_id UUID NULL REFERENCES app.course_offerings(id),
    created_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ NULL,
    CONSTRAINT ck_ai_quiz_mode CHECK (mode IN ('PERSONAL_STUDENT', 'COURSE_TEACHER')),
    CONSTRAINT ck_ai_quiz_status CHECK (status IN ('REVIEW_REQUIRED', 'READY', 'PUBLISHED', 'REJECTED', 'GENERATION_FAILED')),
    CONSTRAINT ck_ai_quiz_destination CHECK (destination_type IS NULL OR destination_type IN ('PERSONAL', 'COURSE_OFFERING'))
);

CREATE INDEX ix_ai_quiz_owner_created ON app.ai_quiz_drafts (owner_id, created_at DESC);

CREATE TABLE app.ai_quiz_sources (
    quiz_id UUID NOT NULL REFERENCES app.ai_quiz_drafts(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES app.documents(id),
    PRIMARY KEY (quiz_id, document_id)
);

CREATE TABLE app.ai_quiz_questions (
    id UUID PRIMARY KEY,
    quiz_id UUID NOT NULL REFERENCES app.ai_quiz_drafts(id) ON DELETE CASCADE,
    position INT NOT NULL,
    question_text TEXT NOT NULL,
    explanation TEXT NOT NULL,
    correct_option_index INT NOT NULL,
    CONSTRAINT uq_ai_quiz_question_position UNIQUE (quiz_id, position),
    CONSTRAINT ck_ai_quiz_correct_option CHECK (correct_option_index BETWEEN 0 AND 3)
);

CREATE TABLE app.ai_quiz_options (
    question_id UUID NOT NULL REFERENCES app.ai_quiz_questions(id) ON DELETE CASCADE,
    position INT NOT NULL,
    option_text TEXT NOT NULL,
    PRIMARY KEY (question_id, position),
    CONSTRAINT ck_ai_quiz_option_position CHECK (position BETWEEN 0 AND 3)
);

CREATE TABLE app.ai_quiz_citations (
    id UUID PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES app.ai_quiz_questions(id) ON DELETE CASCADE,
    position INT NOT NULL,
    document_id UUID NOT NULL REFERENCES app.documents(id),
    document_version INT NOT NULL,
    page_number INT NOT NULL,
    excerpt VARCHAR(1200) NOT NULL,
    CONSTRAINT uq_ai_quiz_citation_position UNIQUE (question_id, position)
);

CREATE TABLE app.personal_conversations (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES app.users(id),
    title VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX ix_personal_conversation_owner_updated
    ON app.personal_conversations (owner_id, updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE app.personal_conversation_documents (
    conversation_id UUID NOT NULL REFERENCES app.personal_conversations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES app.documents(id),
    document_version INT NOT NULL,
    PRIMARY KEY (conversation_id, document_id)
);

CREATE TABLE app.personal_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES app.personal_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(30) NULL,
    capability VARCHAR(30) NULL,
    quiz_id UUID NULL REFERENCES app.ai_quiz_drafts(id),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_personal_message_role CHECK (role IN ('USER', 'ASSISTANT'))
);

CREATE INDEX ix_personal_message_conversation_created
    ON app.personal_messages (conversation_id, created_at, id);

CREATE TABLE app.personal_message_citations (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES app.personal_messages(id) ON DELETE CASCADE,
    position INT NOT NULL,
    document_id UUID NOT NULL REFERENCES app.documents(id),
    document_version INT NOT NULL,
    page_number INT NOT NULL,
    excerpt VARCHAR(1200) NOT NULL,
    CONSTRAINT uq_personal_message_citation_position UNIQUE (message_id, position)
);
