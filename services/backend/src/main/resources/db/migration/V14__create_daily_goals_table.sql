-- V14__create_daily_goals_table.sql
-- Create daily_goals table and enhance learning_events for BE1-F02

CREATE TABLE app.daily_goals (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL UNIQUE REFERENCES app.users(id) ON DELETE CASCADE,
    page_target INT NOT NULL DEFAULT 5,
    quiz_question_target INT NOT NULL DEFAULT 10,
    task_target INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_daily_goals_page_target CHECK (page_target >= 0 AND page_target <= 100),
    CONSTRAINT ck_daily_goals_quiz_target CHECK (quiz_question_target >= 0 AND quiz_question_target <= 200),
    CONSTRAINT ck_daily_goals_task_target CHECK (task_target >= 0 AND task_target <= 50),
    CONSTRAINT ck_daily_goals_total_target CHECK (page_target + quiz_question_target + task_target > 0)
);

CREATE INDEX ix_daily_goals_student_id ON app.daily_goals (student_id);

-- Add quantity column to learning_events for granular event counting (e.g. quiz question count)
ALTER TABLE app.learning_events ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
