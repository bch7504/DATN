# StudyFlow — Database Plan

PostgreSQL là nguồn dữ liệu trung tâm. Java/Flyway sở hữu schema `app`; Python/Alembic sở hữu schema `ai` và pgvector. Hai service dùng database role riêng.

[Xem ERD tổng quan](diagrams/erd/index.html) và [giả định kiểu dữ liệu/ràng buộc](diagrams/erd/README.md). ERD là bản thiết kế đề xuất phục vụ báo cáo; kiểu dữ liệu, độ dài, nullable và khóa ghép chưa được chốt bằng migration.

## 1. Nguyên tắc

- Mô hình học vụ: `semesters → course_offerings → course_enrollments`.
- Không còn `classes`, `class_students`, `class_subjects` hoặc Teacher assignment trong baseline mới.
- File/artifact nằm ở Object Storage; database chỉ giữ metadata/key.
- Personal Document bắt buộc có owner; retrieval filter owner + document/version/source.
- Teacher publication trỏ trực tiếp đến Course Offering.
- Không xóa lịch sử lớp/enrollment khi hết học kỳ; dùng trạng thái và audit.

## 2. Identity và RBAC

### `users`

`id`, `email`, `username`, `password_hash`, `full_name`, `time_zone`, `role (STUDENT|TEACHER|ADMIN)`, `status (ACTIVE|LOCKED)`, timestamps.

- Unique `email`, `username`.
- Public registration luôn tạo `STUDENT`.
- `time_zone` là IANA zone hợp lệ, mặc định `Asia/Ho_Chi_Minh`; Java dùng để chốt local date cho Streak/Daily Goal.
- Đổi/khóa role Teacher phải kiểm Course Offering đang active và thu hồi session theo policy.

### `refresh_tokens`

`id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `replaced_by_id`, metadata thiết bị tối thiểu. Không lưu raw token.

## 3. Subject, Semester và Course Offering

### `subjects`

`id`, `code`, `name`, `description`, `status`, timestamps.

- Unique `code`.
- Chỉ Admin CRUD; Teacher chỉ chọn Subject hợp lệ.

### `semesters`

`id`, `code`, `name`, `academic_year`, `start_date`, `end_date`, `status (UPCOMING|ACTIVE|CLOSED)`, `offering_creation_enabled`, timestamps.

- Unique `code`.
- `end_date >= start_date`.
- Java quyết định Semester nào cho phép Teacher tạo lớp; không tin client gửi status.

### `course_offerings`

`id`, `subject_id`, `semester_id`, `teacher_id`, `code`, `name`, `join_code_hash`, `join_code_hint`, `join_enabled`, `status (ACTIVE|ARCHIVED|LOCKED)`, `archived_at`, `locked_at`, timestamps.

- Index `(teacher_id, semester_id, status)` và `(subject_id, semester_id)`.
- Unique đề xuất `(semester_id, code)`; join code lookup dùng hash có unique index.
- `teacher_id` phải là user `TEACHER/ACTIVE` tại application service.
- Teacher chỉ tạo trong Semester được phép và chỉ mutate lớp mình sở hữu.
- Admin có thể lock/archive nhưng không approve lớp.
- Không lưu join code vào log/audit metadata; response chỉ trả code khi nghiệp vụ cần.

### `course_enrollments`

`id`, `course_offering_id`, `student_id`, `status (PENDING|APPROVED|REJECTED|REMOVED)`, `requested_at`, `decided_at`, `decided_by`, `removed_at`, `decision_note`, timestamps.

- Unique `(course_offering_id, student_id)`.
- Index `(course_offering_id, status, requested_at)` và `(student_id, status)`.
- Student nhập code tạo/reopen request theo state machine; không tự ghi `APPROVED`.
- `decided_by` phải là Teacher owner hoặc Admin trong policy đặc biệt được audit; luồng MVP dùng Teacher owner.
- Enrollment không bị xóa khi lớp/học kỳ kết thúc.

## 4. Tài liệu và publication

### `documents`

`id`, `owner_id`, `owner_role`, `document_scope (TEACHER_LIBRARY|PERSONAL)`, `file_name`, `display_name`, `file_type (PDF|PPTX)`, `mime_type`, `file_size`, `storage_key`, `processing_status`, `document_version`, `page_count`, `slide_count`, timestamps, soft-delete fields.

- Personal: owner Student, chỉ PDF có text layer cho AI.
- Teacher Library: owner Teacher, PDF/PPTX.
- PPTX muốn public phải `READY`; PDF Teacher không AI index.
- Object key không trả browser.

### `document_publications`

`id`, `document_id`, `course_offering_id`, `published_by`, `status (PUBLISHED|REVOKED)`, `published_at`, `revoked_at`.

- Unique `(document_id, course_offering_id)`.
- Document owner và Course Offering owner phải là Teacher hiện tại.
- Re-public re-activate row cũ; không tạo duplicate hoặc nhân bản file.

### `slides`

`id`, `document_id`, `slide_number`, `rendered_key`, `preview_key`, `extracted_text`, `processing_status`.

- Unique `(document_id, slide_number)`.
- Chỉ PPTX Teacher; frontend không nhận file gốc.

### `slide_notes`

`id`, `student_id`, `document_id`, `slide_number`, `content`, timestamps.

- Unique `(student_id, document_id, slide_number)`.
- Mọi read/write kiểm enrollment `APPROVED`, publication và archive/lock policy hiện tại.

## 5. Chat và AI data

### Schema `app`

`chat_conversations`: `id`, `student_id`, `type (PERSONAL_RAG|SLIDE_TUTOR)`, `title`, `status`, timestamps.

`conversation_documents`: `conversation_id`, `document_id`, `document_version`, timestamps.

- Unique `(conversation_id, document_id)`.
- Chỉ Personal PDF owner/READY được thêm vào Personal conversation.
- Đây là snapshot scope do Java sở hữu; client không tự mở rộng scope khi gửi message.

`chat_messages`: `id`, `conversation_id`, `role`, `content`, `answer_status`, `citations_json`, `trace_id`, timestamps.

- Retention theo system setting; system log không sao chép message content.
- Citation JSON chỉ lưu structured document/page hoặc document/slide data đã Java revalidate.

### Schema `ai`

`ai.index_jobs`: `id`, `request_id`, `idempotency_key`, `operation`, document/version/pipeline, safe status/attempt/error, transient signed URL và timestamps.

`ai.document_indexes`: document/version/pipeline, embedding provider/model/dimensions, status, activated_at.

`ai.document_chunks`: `id`, document/version/owner/source_type, page/slide, chunk_index, content, `embedding vector(1024)`, timestamps.

- Unique job idempotency key.
- Unique `(document_id, document_version, chunk_index)`.
- Scope B-tree index trước vector search; HNSW cosine cho 1024 chiều.
- Query và document phải cùng embedding model/dimensions/index version.
- Signed URL được xóa sau terminal status và không bao giờ log.

## 6. Dashboard Progress, Study Streak và Daily Goal

### `learning_progress`

`id`, `student_id`, `course_offering_id`, `document_id`, `last_slide`, `viewed_slide_count`, `progress_percent`, `completed_at`, `updated_at`.

- Unique `(student_id, document_id)`.
- Chỉ PPTX/Slide có document progress; PDF Teacher không page progress.
- Mọi update kiểm enrollment `APPROVED` hoặc archive access policy.

### `learning_events`

`id`, `student_id`, `event_type`, `target_type`, `target_id`, `activity_date`, `quantity`, `idempotency_key`, `metadata`, `occurred_at`.

- `activity_date` được Java chốt theo `users.time_zone` tại thời điểm ghi event; không để client truyền.
- `quantity >= 1`; `QUIZ_COMPLETED` dùng số câu trong attempt đã chấm, `STUDY_TASK_COMPLETED` dùng `1`.
- Unique `(student_id, idempotency_key)`; partial unique `(student_id, target_id, activity_date, event_type)` cho `VIEW_SLIDE` để Daily Goal không đếm lại cùng slide trong ngày.
- Index `(student_id, activity_date, event_type)` phục vụ Dashboard/Streak/Daily Goal.

Event chính:

```text
COURSE_JOIN_REQUESTED
COURSE_JOIN_APPROVED
VIEW_SLIDE
NOTE_SAVED
PERSONAL_DOCUMENT_UPLOADED
PERSONAL_DOCUMENT_INDEXED
ASK_AI
STUDY_PLAN_CREATED
STUDY_TASK_COMPLETED
QUIZ_GENERATED
QUIZ_ACCEPTED
QUIZ_COMPLETED
```

Metadata không chứa join code, prompt, document text hay secret.

Chỉ `VIEW_SLIDE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED` được dùng để tính Streak. Login, `NOTE_SAVED`, `ASK_AI` và upload/index không tạo activity day.

### `daily_goals`

`student_id`, `slide_target`, `quiz_question_target`, `task_target`, `updated_at`.

- Primary key/FK `student_id`; một cấu hình đang áp dụng cho mỗi Student và lặp lại cho các ngày sau đến khi thay đổi.
- Check: `slide_target 0..100`, `quiz_question_target 0..200`, `task_target 0..50` và tổng target lớn hơn `0`.
- Chỉ lưu target. `slide_actual`, `quiz_question_actual`, `task_actual` và `completed` được Java tính từ dữ liệu/event của `activity_date` hiện tại, không lưu để client cập nhật.
- Streak không phụ thuộc `completed`; một event học hợp lệ là đủ duy trì ngày học.

## 7. Study Plan và Calendar

`study_plans`: owner, title, description, start/end, status, timestamps.

`study_plan_items`: plan, title, schedule/deadline/duration, status, optional `course_offering_id`, timestamps.

- Calendar là projection của plan items, không tạo bảng calendar trùng.
- Java validate time range và xung đột của cùng Student.
- Index theo owner/scheduled start thông qua plan.

## 8. Quiz

### `quizzes`

`id`, `student_id`, nullable `course_offering_id`, title/description, `user_prompt`, `generation_type=AI_PERSONAL_DOCUMENTS`, status, question_count, optional `regenerated_from_quiz_id`, timestamps.

State: `GENERATING → REVIEW_REQUIRED → READY|REJECTED`; generation lỗi → `GENERATION_FAILED`; lịch sử → `ARCHIVED`.

### Source/question/attempt

- `quiz_sources`: quiz + Personal document/version; unique `(quiz_id, document_id)`.
- `quiz_questions`: `MCQ_SINGLE`, đúng 4 options, một correct index, explanation, order.
- `quiz_question_sources`: question + document/page/excerpt.
- `quiz_attempts`: quiz/student/start/submit/score/status.
- `quiz_answers`: attempt/question/selected option/correctness/score; unique `(attempt_id, question_id)`.

Java validate structured output và chấm trong transaction. Python/LLM không tạo attempt và không chấm điểm.

- `course_offering_id` chỉ được gán khi Student accept và có enrollment `APPROVED`; `NULL` nghĩa là Quiz cá nhân.
- `quiz_sources` luôn mô tả nguồn sinh Quiz và độc lập với `course_offering_id` dùng để nhóm nơi ôn tập.
- “Nội dung cần ôn lại” là projection từ `quiz_answers.is_correct=false → quiz_questions → quiz_question_sources`; không lưu kết luận năng lực do AI.
- Mỗi lượt làm là một `quiz_attempts` mới; submit không overwrite attempt đã hoàn thành.

## 9. Admin và vận hành

- `feedback_reports`: reporter/type/title/content/status/resolution metadata.
- `system_logs`: actor/action/target/status/trace/safe metadata/timestamp.
- `system_settings`: allowlisted typed key/value; không chứa secret.

Audit tối thiểu: auth, role/status, Semester/Subject, Course Offering create/archive/lock, join-code enable/regenerate, enrollment decision, publication/revoke và setting change.

## 10. Tính nhất quán và xóa

- Revoke publication không xóa Teacher Document.
- Xóa Teacher Document yêu cầu không còn publication active.
- Xóa Personal Document: Java chuyển `DELETING`, loại ngay khỏi conversation/Quiz authorization, gọi deindex rồi xóa object/metadata.
- Reindex ghi version mới, activate nguyên tử rồi dọn version cũ.
- Archive Course Offering giữ enrollment, publication, Note/progress theo retention; lock ưu tiên chặn access.
- Backup PostgreSQL và Object Storage; restore drill trước demo.

## 11. Migration từ baseline cũ

Không sửa migration đã chạy. Nếu schema cũ đã tồn tại, tạo forward migration:

1. Tạo `semesters`, `course_offerings`, `course_enrollments`.
2. Chuyển dữ liệu có thể ánh xạ từ `class_subjects` sang offering và `class_students` sang enrollment `APPROVED` với audit migration.
3. Thêm `course_offering_id` vào publication/progress/plan item.
4. Chuyển read/write sang bảng mới.
5. Chỉ deprecate bảng cũ sau kiểm tra đối soát; không drop trong cùng release migration dữ liệu.
