CREATE TABLE app.ai_quiz_question_images (
    id UUID PRIMARY KEY,
    question_id UUID NOT NULL UNIQUE REFERENCES app.ai_quiz_questions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES app.documents(id),
    document_version INT NOT NULL,
    page_number INT NOT NULL,
    bbox_x NUMERIC(8, 7) NOT NULL,
    bbox_y NUMERIC(8, 7) NOT NULL,
    bbox_width NUMERIC(8, 7) NOT NULL,
    bbox_height NUMERIC(8, 7) NOT NULL,
    object_key VARCHAR(700) NOT NULL UNIQUE,
    alt_text VARCHAR(300) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_ai_quiz_image_document_version CHECK (document_version > 0),
    CONSTRAINT ck_ai_quiz_image_page CHECK (page_number > 0),
    CONSTRAINT ck_ai_quiz_image_bbox CHECK (
        bbox_x >= 0 AND bbox_y >= 0
        AND bbox_width > 0 AND bbox_height > 0
        AND bbox_x + bbox_width <= 1
        AND bbox_y + bbox_height <= 1
    )
);

CREATE INDEX ix_ai_quiz_question_images_question
    ON app.ai_quiz_question_images (question_id);
