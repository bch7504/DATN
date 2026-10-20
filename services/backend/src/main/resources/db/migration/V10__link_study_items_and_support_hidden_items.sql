ALTER TABLE app.study_plan_items
    ADD COLUMN course_offering_id UUID NULL REFERENCES app.course_offerings(id);

CREATE INDEX ix_study_plan_items_course_offering
    ON app.study_plan_items (course_offering_id)
    WHERE course_offering_id IS NOT NULL;

ALTER TABLE app.study_plan_items
    DROP CONSTRAINT ck_study_plan_items_status;

ALTER TABLE app.study_plan_items
    ADD CONSTRAINT ck_study_plan_items_status
    CHECK (status IN ('TODO', 'COMPLETED', 'CANCELLED', 'DELETED'));

ALTER TABLE app.study_plan_items
    DROP CONSTRAINT ck_study_plan_items_completion;

ALTER TABLE app.study_plan_items
    ADD CONSTRAINT ck_study_plan_items_completion
    CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL)
        OR (status IN ('TODO', 'CANCELLED') AND completed_at IS NULL)
        OR status = 'DELETED'
    );
