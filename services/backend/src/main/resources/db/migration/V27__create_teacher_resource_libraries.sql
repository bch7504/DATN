-- Teacher-owned resource collections. Deleting a collection never deletes the source resource.
CREATE TABLE app.teacher_resource_libraries (
    id UUID PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES app.users(id),
    subject_id UUID NULL REFERENCES app.subjects(id),
    name VARCHAR(120) NOT NULL,
    library_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT ck_teacher_resource_library_type CHECK (library_type IN ('SUBJECT', 'PRIVATE')),
    CONSTRAINT ck_teacher_resource_library_subject CHECK (
        (library_type = 'SUBJECT' AND subject_id IS NOT NULL)
        OR (library_type = 'PRIVATE' AND subject_id IS NULL)
    )
);

CREATE INDEX ix_teacher_resource_libraries_owner
    ON app.teacher_resource_libraries (teacher_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE app.teacher_resource_library_items (
    id UUID PRIMARY KEY,
    library_id UUID NOT NULL REFERENCES app.teacher_resource_libraries(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL,
    item_id UUID NOT NULL,
    added_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_teacher_resource_item_type CHECK (item_type IN ('DOCUMENT', 'QUIZ', 'ASSIGNMENT')),
    CONSTRAINT uq_teacher_resource_library_item UNIQUE (library_id, item_type, item_id)
);

CREATE INDEX ix_teacher_resource_library_items_library
    ON app.teacher_resource_library_items (library_id, added_at DESC);
