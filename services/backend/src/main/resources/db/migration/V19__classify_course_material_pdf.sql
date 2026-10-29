ALTER TABLE app.documents
    ADD COLUMN material_type VARCHAR(30) NULL;

UPDATE app.documents
SET material_type = 'REFERENCE_PDF'
WHERE document_scope = 'COURSE_MATERIAL';

ALTER TABLE app.documents
    ADD CONSTRAINT ck_documents_material_type
    CHECK (
        (document_scope = 'PERSONAL' AND material_type IS NULL)
        OR
        (document_scope = 'COURSE_MATERIAL' AND material_type IN ('SLIDE_PDF', 'REFERENCE_PDF'))
    );

CREATE INDEX ix_documents_course_material_type
    ON app.documents (owner_id, material_type, processing_status)
    WHERE deleted_at IS NULL AND document_scope = 'COURSE_MATERIAL';
