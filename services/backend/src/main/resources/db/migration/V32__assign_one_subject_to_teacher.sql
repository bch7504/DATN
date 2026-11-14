-- One assigned subject per Teacher; several class groups may share that subject.
ALTER TABLE app.users ADD COLUMN teacher_subject_id UUID REFERENCES app.subjects(id);
ALTER TABLE app.users ADD CONSTRAINT ck_teacher_subject_role
    CHECK (teacher_subject_id IS NULL OR role = 'TEACHER');
CREATE INDEX ix_users_teacher_subject ON app.users(teacher_subject_id)
    WHERE teacher_subject_id IS NOT NULL;

-- Backfill only unambiguous existing assignments; never guess for other users.
UPDATE app.users u SET teacher_subject_id = owned.subject_id
FROM (
    SELECT teacher_id, (array_agg(DISTINCT subject_id))[1] AS subject_id
    FROM app.course_offerings GROUP BY teacher_id HAVING COUNT(DISTINCT subject_id) = 1
) owned WHERE u.id = owned.teacher_id AND u.role = 'TEACHER';

-- The documented local Teacher is retained as the Digital Logic Teacher.
UPDATE app.users u SET teacher_subject_id = s.id
FROM app.subjects s WHERE s.code = 'KTS' AND u.role = 'TEACHER'
    AND u.username IN ('teacher.local', 'teacher.kts.local')
    AND lower(u.email) LIKE '%@studyflow.local';

-- Preserve existing collections and references while retiring multi-subject folders.
UPDATE app.teacher_resource_libraries SET library_type='PRIVATE',subject_id=NULL,updated_at=NOW()
WHERE library_type='SUBJECT';
