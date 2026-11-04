CREATE TABLE app.course_material_tutor_conversations (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES app.users(id),
    document_id UUID NOT NULL REFERENCES app.documents(id),
    document_version INT NOT NULL,
    course_offering_id UUID NOT NULL REFERENCES app.course_offerings(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_course_material_tutor_scope
        UNIQUE (student_id, document_id, document_version, course_offering_id)
);

CREATE INDEX ix_course_material_tutor_student_updated
    ON app.course_material_tutor_conversations (student_id, updated_at DESC);

CREATE TABLE app.course_material_tutor_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL
        REFERENCES app.course_material_tutor_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    page_number INT NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(30) NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_course_material_tutor_message_role CHECK (role IN ('USER', 'ASSISTANT')),
    CONSTRAINT ck_course_material_tutor_message_page CHECK (page_number > 0)
);

CREATE INDEX ix_course_material_tutor_message_created
    ON app.course_material_tutor_messages (conversation_id, created_at, id);

CREATE TABLE app.course_material_tutor_message_citations (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES app.course_material_tutor_messages(id) ON DELETE CASCADE,
    position INT NOT NULL,
    document_id UUID NOT NULL REFERENCES app.documents(id),
    document_version INT NOT NULL,
    page_number INT NOT NULL,
    excerpt VARCHAR(1200) NOT NULL,
    CONSTRAINT uq_course_material_tutor_citation_position UNIQUE (message_id, position),
    CONSTRAINT ck_course_material_tutor_citation_page CHECK (page_number > 0)
);
