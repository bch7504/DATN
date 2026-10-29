-- A page may contribute to a new study day without duplicating a view within that day.
DROP INDEX app.uq_learning_events_source;
CREATE UNIQUE INDEX uq_learning_events_non_page_source
    ON app.learning_events (student_id, event_type, source_type, source_id)
    WHERE event_type <> 'VIEW_PAGE';
CREATE UNIQUE INDEX uq_learning_events_view_day
    ON app.learning_events (student_id, source_type, source_id, activity_date)
    WHERE event_type = 'VIEW_PAGE';

CREATE TABLE app.page_notes (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES app.users(id),
    document_id UUID NOT NULL REFERENCES app.documents(id),
    page_number INT NOT NULL CHECK (page_number > 0),
    content TEXT NOT NULL CHECK (char_length(content) <= 10000),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_page_notes_owner_page UNIQUE (student_id, document_id, page_number)
);

CREATE TABLE app.course_material_page_views (
    student_id UUID NOT NULL REFERENCES app.users(id),
    document_id UUID NOT NULL REFERENCES app.documents(id),
    page_number INT NOT NULL CHECK (page_number > 0),
    first_viewed_at TIMESTAMPTZ NOT NULL,
    last_viewed_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (student_id, document_id, page_number)
);
CREATE INDEX ix_course_page_views_document_student
    ON app.course_material_page_views (document_id, student_id);
