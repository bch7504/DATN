-- Every Teacher owns one non-deletable fallback library for uploads that were not filed explicitly.
ALTER TABLE app.teacher_resource_libraries
    DROP CONSTRAINT ck_teacher_resource_library_type;

ALTER TABLE app.teacher_resource_libraries
    DROP CONSTRAINT ck_teacher_resource_library_subject;

ALTER TABLE app.teacher_resource_libraries
    ADD CONSTRAINT ck_teacher_resource_library_type
        CHECK (library_type IN ('DEFAULT', 'SUBJECT', 'PRIVATE'));

ALTER TABLE app.teacher_resource_libraries
    ADD CONSTRAINT ck_teacher_resource_library_subject CHECK (
        (library_type = 'SUBJECT' AND subject_id IS NOT NULL)
        OR (library_type IN ('DEFAULT', 'PRIVATE') AND subject_id IS NULL)
    );

CREATE UNIQUE INDEX uq_teacher_resource_libraries_default_owner
    ON app.teacher_resource_libraries (teacher_id)
    WHERE library_type = 'DEFAULT' AND deleted_at IS NULL;
