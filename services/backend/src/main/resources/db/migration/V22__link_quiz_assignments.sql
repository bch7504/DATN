ALTER TABLE app.course_assignments
    ADD COLUMN assignment_type VARCHAR(20) NOT NULL DEFAULT 'ESSAY',
    ADD COLUMN quiz_id UUID NULL REFERENCES app.quizzes(id);

ALTER TABLE app.course_assignments
    ADD CONSTRAINT ck_course_assignments_type CHECK (assignment_type IN ('ESSAY', 'QUIZ')),
    ADD CONSTRAINT ck_course_assignments_quiz_link CHECK (
        (assignment_type = 'ESSAY' AND quiz_id IS NULL)
        OR (assignment_type = 'QUIZ' AND quiz_id IS NOT NULL)
    );

CREATE UNIQUE INDEX uq_course_assignments_quiz
    ON app.course_assignments (quiz_id) WHERE quiz_id IS NOT NULL;

ALTER TABLE app.assignment_submissions
    ADD COLUMN quiz_attempt_id UUID NULL REFERENCES app.quiz_attempts(id),
    ALTER COLUMN answer_text DROP NOT NULL;

CREATE UNIQUE INDEX uq_assignment_submissions_quiz_attempt
    ON app.assignment_submissions (quiz_attempt_id) WHERE quiz_attempt_id IS NOT NULL;
