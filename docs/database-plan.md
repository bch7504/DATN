# StudyFlow — Database Plan

PostgreSQL là nguồn dữ liệu trung tâm. Java/Flyway sở hữu schema `app`; Python/Alembic sở hữu schema `ai` và pgvector. Hai service dùng database role riêng.

[Xem ERD tổng quan](diagrams/erd/index.html) và [giả định kiểu dữ liệu/ràng buộc](diagrams/erd/README.md). ERD là bản thiết kế đề xuất phục vụ báo cáo; kiểu dữ liệu, độ dài, nullable và khóa ghép chưa được chốt bằng migration.

## Trạng thái triển khai hiện tại

- Database local chạy bằng `pgvector/pgvector:pg17` tại `127.0.0.1:5433`; xem lệnh vận hành trong [`infrastructure/docker/README.md`](../infrastructure/docker/README.md).
- Flyway đã có V1–V4 và tạo các bảng đã triển khai của Java trong schema `app`: xác thực, Study Plan, Learning Event, Notification, Subject, Semester, Course Offering và Enrollment.
- Alembic đã có revision `20261012_0001`–`20261012_0005`, tạo bảng chỉ mục tài liệu, chunk vector, job và agent run trong schema `ai`.
- Role `studyflow_app` không có quyền dùng schema `ai`; role `studyflow_ai` không có quyền dùng schema `app`. Quyền tạo schema cấp database chỉ được cấp tạm khi chạy migration rồi thu hồi.
- Các bảng Documents/Publication/Note/Conversation/Quiz/Progress/Daily Goal/Admin ở các mục dưới vẫn là thiết kế đích, chưa được xem là đã triển khai nếu chưa có migration tiến tương ứng.

## 1. Nguyên tắc

- Mô hình học vụ: `semesters → course_offerings → course_enrollments`.
- Không còn `classes`, `class_students`, `class_subjects` hoặc Teacher assignment trong baseline mới.
- File/artifact nằm ở Object Storage; database chỉ giữ metadata/key.
- Personal Document bắt buộc có owner; retrieval filter owner + document/version/source.
- Teacher publication trỏ trực tiếp đến Course Offering.
- Không xóa lịch sử lớp/enrollment khi hết học kỳ; dùng trạng thái và audit.

## 2. Identity và RBAC

### `users`

`id`, `email`, `username`, `password_hash`, `full_name`, `time_zone`, `role (STUDENT|TEACHER|ADMIN)`, `status (ACTIVE|LOCKED)`, `email_verified_at`, timestamps.

- Unique `email`, `username`.
- Public registration luôn tạo `STUDENT`.
- `time_zone` là IANA zone hợp lệ, mặc định `Asia/Ho_Chi_Minh`; Java dùng để chốt local date cho Streak/Daily Goal.
- Đổi/khóa role Teacher phải kiểm Course Offering đang active và thu hồi session theo policy.

### `email_verification_challenges`

`id`, `email`, `display_name`, `password_hash`, `code_hash`, `expires_at`, `resend_available_at`, `attempts_remaining`, `consumed_at`, timestamps.

- Chỉ lưu hash của mật khẩu và OTP trong thời gian chờ xác minh; không tạo `users` trước khi OTP hợp lệ.
- Unique email không phân biệt chữ hoa/thường; mỗi email chỉ có một yêu cầu đang được quản lý.
- OTP hết hạn hoặc đã dùng không được chấp nhận; gửi lại thay thế mã cũ và đặt lại số lần thử.

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

### Bài tập theo lớp

`course_assignments`: `id`, `course_offering_id`, `teacher_id`, `title`, `description`, `due_at`, `reminder_at`, `reminder_sent_at`, `status (DRAFT|PUBLISHED)`, `published_at`, timestamps. Teacher chỉ tạo/sửa/công bố trong lớp mình sở hữu; chỉ `PUBLISHED` hiển thị cho enrollment `APPROVED`. Nhắc hạn mặc định trước 24 giờ và idempotent.

`assignment_submissions`: `id`, `assignment_id`, `student_id`, `answer_text`, `submitted_at`, `status (ON_TIME|LATE)`, `score`, `teacher_feedback`, `reviewed_at`, `reviewed_by`, timestamps. Unique `(assignment_id, student_id)` giữ câu trả lời mới nhất; sau hạn vẫn nhận bài và đánh dấu `LATE`. Danh sách thống kê được dựng từ các enrollment `APPROVED` và left-join submission để phân biệt rõ người chưa nộp.

`assignment_submission_attachments`: `id`, `submission_id`, `original_file_name`, server-detected `content_type`, `size_bytes`, private `storage_key`, `created_at`. Không ghi nội dung file vào PostgreSQL; object key chỉ do Java sinh và không xuất hiện trong DTO. Attachment được tải qua Java sau khi xác minh owner/enrollment.

`notifications.notification_type` bổ sung `ASSIGNMENT_PUBLISHED` và `ASSIGNMENT_DEADLINE`; source là `COURSE_ASSIGNMENT`, unique `(user_id,type,source_type,source_id)` giữ thông báo bài mới/nhắc hạn không trùng.

## 4. Tài liệu và publication

### `documents`

`id`, `owner_id`, `owner_role`, `document_scope (COURSE_MATERIAL|PERSONAL)`, `file_name`, `display_name`, `file_type=PDF`, `mime_type`, `file_size`, `storage_key`, `processing_status`, `document_version`, `page_count`, timestamps, soft-delete fields.

- Personal: owner Student, chỉ PDF có text layer cho AI.
- Course Material: owner Teacher, chỉ PDF có text layer và được AI index theo trang.
- Mọi document muốn dùng cho Tutor/Quiz hoặc public phải `READY`.
- Migration `V7` tạo bảng `app.documents`, index owner/scope, soft-delete và giữ object key private. Course Material MVP kiểm tra text layer + page count trước khi đánh dấu `READY`; file không rời Object Storage qua API ngoại trừ stream có phân quyền.
- Object key không trả browser.

### `document_publications`

`id`, `document_id`, `course_offering_id`, `published_by`, `status (PUBLISHED|REVOKED)`, `published_at`, `revoked_at`.

- Unique `(document_id, course_offering_id)`.
- Document owner và Course Offering owner phải là Teacher hiện tại.
- Re-public re-activate row cũ; không tạo duplicate hoặc nhân bản file.

### `document_pages`

`id`, `document_id`, `page_number`, optional `preview_key`, `processing_status`.

- Unique `(document_id, page_number)`.
- Metadata trang phục vụ Viewer/Note/progress; text/chunk/vector thuộc schema `ai`.

### `page_notes`

`id`, `student_id`, `document_id`, `page_number`, `content`, timestamps.

- Unique `(student_id, document_id, page_number)`.
- Mọi read/write kiểm enrollment `APPROVED`, publication và archive/lock policy hiện tại.

## 5. Chat và AI data

### Schema `app`

`chat_conversations`: `id`, `student_id`, `type=PERSONAL_ASSISTANT`, `title`, `status`, timestamps.

`conversation_documents`: `conversation_id`, `document_id`, `document_version`, timestamps.

- Unique `(conversation_id, document_id)`.
- Chỉ Personal PDF owner/READY được thêm vào Personal conversation.
- Đây là snapshot scope do Java sở hữu; client không tự mở rộng scope khi gửi message.

`chat_messages`: `id`, `conversation_id`, `role`, `content`, `answer_status`, `capability`, `structured_result_json`, `citations_json`, `trace_id`, timestamps.

- Retention theo system setting; system log không sao chép message content.
- Citation JSON chỉ lưu structured document/page data đã Java revalidate. `structured_result_json` không chứa provider payload hoặc internal prompt.

### Schema `ai`

`ai.index_jobs`: `id`, `request_id`, `idempotency_key`, `operation`, document/version/pipeline, safe status/attempt/error, transient signed URL và timestamps.

`ai.document_indexes`: document/version/pipeline, embedding provider/model/dimensions, status, activated_at.

`ai.document_chunks`: `id`, document/version/owner/source_type, page_number, chunk_index, content, `embedding vector(1024)`, timestamps.

`ai.agent_runs`: `id`, `request_id`, `conversation_id`, `selected_tool`, `status`, safe latency/token/error metadata, timestamps. Không lưu document content hoặc secret.

- Unique job idempotency key.
- Unique `(document_id, document_version, chunk_index)`.
- Scope B-tree index trước vector search; HNSW cosine cho 1024 chiều.
- Query và document phải cùng embedding model/dimensions/index version.
- Signed URL được xóa sau terminal status và không bao giờ log.

## 6. Dashboard Progress, Study Streak và Daily Goal

### `learning_progress`

`id`, `student_id`, `course_offering_id`, `document_id`, `last_page`, `viewed_page_count`, `progress_percent`, `completed_at`, `updated_at`.

- Unique `(student_id, document_id)`.
- Course Material PDF có progress theo trang; Personal PDF không tính progress lớp.
- Mọi update kiểm enrollment `APPROVED` hoặc archive access policy.

### `learning_events`

`id`, `student_id`, `event_type`, `target_type`, `target_id`, `activity_date`, `quantity`, `idempotency_key`, `metadata`, `occurred_at`.

- `activity_date` được Java chốt theo `users.time_zone` tại thời điểm ghi event; không để client truyền.
- `quantity >= 1`; `QUIZ_COMPLETED` dùng số câu trong attempt đã chấm, `STUDY_TASK_COMPLETED` dùng `1`.
- Unique `(student_id, idempotency_key)`; partial unique `(student_id, target_id, activity_date, event_type)` cho `VIEW_PAGE` để Daily Goal không đếm lại cùng trang trong ngày.
- Index `(student_id, activity_date, event_type)` phục vụ Dashboard/Streak/Daily Goal.

Event chính:

```text
COURSE_JOIN_REQUESTED
COURSE_JOIN_APPROVED
VIEW_PAGE
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

Chỉ `VIEW_PAGE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED` được dùng để tính Streak. Login, `NOTE_SAVED`, `ASK_AI` và upload/index không tạo activity day.

### `daily_goals`

`student_id`, `page_target`, `quiz_question_target`, `task_target`, `updated_at`.

- Primary key/FK `student_id`; một cấu hình đang áp dụng cho mỗi Student và lặp lại cho các ngày sau đến khi thay đổi.
- Check: `page_target 0..100`, `quiz_question_target 0..200`, `task_target 0..50` và tổng target lớn hơn `0`.
- Chỉ lưu target. `page_actual`, `quiz_question_actual`, `task_actual` và `completed` được Java tính từ dữ liệu/event của `activity_date` hiện tại, không lưu để client cập nhật.
- Streak không phụ thuộc `completed`; một event học hợp lệ là đủ duy trì ngày học.

## 7. Kế hoạch & Lịch (Study Plan/Calendar)

Các bảng phần này phục vụ task, deadline và projection lịch tuần theo khung giờ. Daily Goal, Study Streak và viewing progress được tổng hợp riêng cho Dashboard.

`study_plans`: `id`, `student_id`, title, description, `start_date`, `end_date`, status `ACTIVE|COMPLETED|ARCHIVED`, timestamps. Kế hoạch được archive mềm để giữ lịch sử.

`study_plan_items`: `id`, `plan_id`, title, description, type `STUDY_SESSION|TASK|QUIZ`, `scheduled_start`, `scheduled_end`, `due_at`, `reminder_at`, `reminder_sent_at`, status `TODO|COMPLETED|CANCELLED`, `completed_at`, timestamps. Item phải có lịch đầy đủ hoặc deadline; reminder chỉ tồn tại khi có deadline và không được sau deadline; trạng thái hoàn thành và thời điểm hoàn thành phải nhất quán.

`notifications`: thông báo trong ứng dụng gồm owner, type, title/message an toàn, source type/id, optional deadline, `read_at` và `created_at`. Unique `(user_id,type,source_type,source_id)` đảm bảo job nhắc deadline retry không tạo trùng.

`learning_events`: event học idempotent do Java sở hữu, gồm Student, loại event, nguồn, idempotency key, `occurred_at` và `activity_date`. Với `STUDY_TASK_COMPLETED`, mỗi item chỉ tạo tối đa một event để retry/đánh dấu lại không làm tăng sai Daily Goal hoặc Streak.

- Calendar là projection của plan items, không tạo bảng calendar trùng.
- Java validate time range và xung đột của cùng Student.
- Index theo owner/khoảng ngày của plan, plan/thời gian item và learning event theo Student/activity date.
- Bản triển khai độc lập đầu tiên chưa nhận `course_offering_id`; cột/FK và access policy được thêm bằng migration tiến khi module Course Offering production sẵn sàng.

## 8. Quiz

### `quizzes`

`id`, `created_by`, `creator_role (STUDENT|TEACHER)`, nullable `course_offering_id`, title/description, `user_prompt`, `generation_type (PERSONAL_STUDENT|COURSE_TEACHER)`, status, question_count, optional `regenerated_from_quiz_id`, timestamps.

Student state: `GENERATING → REVIEW_REQUIRED → READY|REJECTED`; Teacher state: `GENERATING → REVIEW_REQUIRED → PUBLISHED|REJECTED`; generation lỗi → `GENERATION_FAILED`; lịch sử → `ARCHIVED`.

### Source/question/attempt

- `quiz_sources`: quiz + PDF document/version/page range/source type; unique `(quiz_id, document_id)`.
- `quiz_questions`: `MCQ_SINGLE`, đúng 4 options, một correct index, explanation, order.
- `quiz_question_sources`: question + document/page/excerpt.
- `quiz_attempts`: quiz/student/start/submit/score/status.
- `quiz_answers`: attempt/question/selected option/correctness/score; unique `(attempt_id, question_id)`.

Java validate structured output và chấm trong transaction. Python/LLM không tạo attempt và không chấm điểm.

- Student có thể gắn `course_offering_id` khi accept và có enrollment `APPROVED`; Teacher Quiz bắt buộc gắn Course Offering do Teacher sở hữu trước khi publish. `NULL` nghĩa là Quiz cá nhân.
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
