-- V29: indexed supporting PDFs and explicit per-class Slide Tutor source links.
ALTER TABLE app.documents
    DROP CONSTRAINT ck_documents_material_type;

ALTER TABLE app.documents
    ADD CONSTRAINT ck_documents_material_type
    CHECK (
        (document_scope = 'PERSONAL' AND material_type IS NULL)
        OR
        (document_scope = 'COURSE_MATERIAL' AND material_type IN ('SLIDE_PDF', 'SUPPORTING_PDF', 'REFERENCE_PDF'))
    );

CREATE TABLE app.course_material_tutor_sources (
    id UUID PRIMARY KEY,
    course_offering_id UUID NOT NULL REFERENCES app.course_offerings(id),
    primary_document_id UUID NOT NULL REFERENCES app.documents(id),
    supporting_document_id UUID NOT NULL REFERENCES app.documents(id),
    created_by UUID NOT NULL REFERENCES app.users(id),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_course_material_tutor_source
        UNIQUE (course_offering_id, primary_document_id, supporting_document_id),
    CONSTRAINT ck_course_material_tutor_source_distinct
        CHECK (primary_document_id <> supporting_document_id)
);

CREATE INDEX ix_course_material_tutor_sources_primary
    ON app.course_material_tutor_sources (course_offering_id, primary_document_id, created_at);
