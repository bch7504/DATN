-- V22: store Student-owned notes for Course Material pages.
CREATE TABLE app.course_material_page_notes (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES app.documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    content VARCHAR(5000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_course_material_page_note_owner_page
        UNIQUE (student_id, document_id, page_number),
    CONSTRAINT ck_course_material_page_note_page CHECK (page_number > 0),
    CONSTRAINT ck_course_material_page_note_content CHECK (char_length(content) <= 5000)
);

CREATE INDEX ix_course_material_page_notes_document_page
    ON app.course_material_page_notes (document_id, page_number);
