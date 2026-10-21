ALTER TABLE app.notifications DROP CONSTRAINT ck_notifications_type;
ALTER TABLE app.notifications ADD CONSTRAINT ck_notifications_type
    CHECK (notification_type IN (
        'STUDY_PLAN_DEADLINE', 'ASSIGNMENT_DEADLINE', 'ASSIGNMENT_PUBLISHED',
        'TEACHER_ENROLLMENT_REQUESTED', 'TEACHER_ASSIGNMENT_SUBMITTED'
    ));
