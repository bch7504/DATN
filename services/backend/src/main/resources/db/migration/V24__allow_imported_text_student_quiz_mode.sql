ALTER TABLE app.ai_quiz_drafts
    DROP CONSTRAINT ck_ai_quiz_mode;

ALTER TABLE app.ai_quiz_drafts
    ADD CONSTRAINT ck_ai_quiz_mode
        CHECK (mode IN ('PERSONAL_STUDENT', 'COURSE_TEACHER', 'IMPORTED_TEXT_STUDENT'));
