-- Upload-time slide bundles replace editable per-class source selection.
-- Retain old per-class rows as history and copy each known pair once to a reusable private bundle.
ALTER TABLE app.course_material_tutor_sources
    ALTER COLUMN course_offering_id DROP NOT NULL;

INSERT INTO app.course_material_tutor_sources
    (id, course_offering_id, primary_document_id, supporting_document_id, created_by, created_at)
SELECT gen_random_uuid(), NULL, primary_document_id, supporting_document_id, created_by, created_at
FROM (
    SELECT DISTINCT ON (primary_document_id, supporting_document_id)
           primary_document_id, supporting_document_id, created_by, created_at
    FROM app.course_material_tutor_sources
    WHERE course_offering_id IS NOT NULL
    ORDER BY primary_document_id, supporting_document_id, created_at
) AS known_sources;

CREATE UNIQUE INDEX uq_course_material_upload_attachment
    ON app.course_material_tutor_sources (primary_document_id, supporting_document_id)
    WHERE course_offering_id IS NULL;
