# StudyFlow — Database plan

PostgreSQL là nguồn dữ liệu trung tâm; pgvector là extension trong cùng cụm PostgreSQL. Java sở hữu schema `app`, Python sở hữu schema `ai`. Hai service dùng database role khác nhau và migration riêng.

## 1. Nguyên tắc

- Java/Flyway quản lý bảng nghiệp vụ, transaction và quyền.
- Python/Alembic quản lý AI job, chunk và embedding.
- File gốc, slide render và preview nằm ở Object Storage; database chỉ giữ metadata/path.
- Không có Chapter/Topic trong MVP.
- Personal Document bắt buộc có `owner_id`; retrieval luôn filter owner và danh sách document Java đã xác thực.
- Teacher Document chỉ tới Student qua `document_publications → class_subjects → class_students`.

## 2. Identity và RBAC

### `users`

`id`, `email`, `username`, `password_hash`, `full_name`, `role` (`STUDENT|TEACHER|ADMIN`), `status`, timestamps.

- Unique: `email`, `username`.
- Khóa tài khoản phải thu hồi refresh session.

### `refresh_tokens`

`id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `replaced_by_id`, metadata thiết bị tối thiểu.

Không lưu raw refresh token.

## 3. Lớp học, môn học và phân công

### `classes`

`id`, `code`, `name`, `cohort`, `academic_year`, `status`, timestamps.

### `class_students`

`class_id`, `student_id`, `joined_at`, `status`.

- Unique: `(class_id, student_id)`.
- Chỉ user role Student được thêm.

### `subjects`

`id`, `code`, `name`, `description`, `status`, timestamps.

### `class_subjects`

`id`, `class_id`, `subject_id`, `teacher_id`, `semester`, `academic_year`, `status`, timestamps.

- Unique đề xuất: `(class_id, subject_id, semester, academic_year)`.
- `teacher_id` phải có role Teacher.
- Đây là authorization scope cho việc public tài liệu.

## 4. Tài liệu và publication

### `documents`

`id`, `owner_id`, `owner_role`, `document_scope` (`TEACHER_LIBRARY|PERSONAL`), `file_name`, `file_type` (`PDF|PPTX`), `mime_type`, `file_size`, `storage_key`, `processing_status`, `document_version`, `page_count`, `slide_count`, timestamps, soft-delete fields.

Quy tắc:

- Personal: owner là Student, chỉ `PDF`.
- Teacher Library: owner là Teacher, cho phép `PDF|PPTX`.
- PPTX muốn public phải `READY` để xem Slide.
- Object key không trả trực tiếp cho browser.

Trạng thái: `UPLOADING → PENDING_PROCESSING → PROCESSING → READY|FAILED`; xóa qua `DELETING → DELETED`.

### `document_publications`

`id`, `document_id`, `class_subject_id`, `published_by`, `status` (`PUBLISHED|REVOKED`), `published_at`, `revoked_at`.

- Unique: `(document_id, class_subject_id)`.
- Document phải thuộc Teacher thực hiện.
- Teacher phải đang được phân công cho ClassSubject.
- Một file có thể public cho nhiều ClassSubject mà không nhân bản.

### `slides`

`id`, `document_id`, `slide_number`, `rendered_key`, `preview_key`, `extracted_text`, `processing_status`.

- Unique: `(document_id, slide_number)`.
- Chỉ dùng cho PPTX Teacher.
- Frontend không nhận file PPTX gốc.

### `slide_notes`

`id`, `user_id`, `document_id`, `slide_number`, `content`, timestamps.

- Unique: `(user_id, document_id, slide_number)`.
- Khi đọc/ghi phải kiểm publication và membership còn hiệu lực.

## 5. AI data trong schema `ai`

### `ai.index_jobs`

`id`, `request_id`, `idempotency_key`, `document_id`, `document_version`, `pipeline_type` (`PERSONAL_RAG|TEACHER_SLIDE`), `status`, `attempts`, `next_retry_at`, `error_code`, timestamps.

- Unique: `idempotency_key`.
- Signed URL chỉ dùng lúc tải và không ghi log.

### `ai.document_indexes`

`document_id`, `document_version`, `pipeline_type`, `embedding_model`, `dimensions`, `status`, `activated_at`.

- Chỉ một version active cho mỗi document/pipeline.

### `ai.document_chunks`

`id`, `document_id`, `document_version`, `owner_id`, `source_type` (`PERSONAL|TEACHER_SLIDE`), `slide_number` hoặc `page_number`, `chunk_index`, `content`, `embedding vector(n)`, timestamps.

- Unique: `(document_id, document_version, chunk_index)`.
- B-tree index cho document/version/owner/source/location.
- Vector index chỉ thêm sau khi đo dữ liệu; MVP có thể dùng exact cosine search.
- PDF Teacher public không cần index.

### Chat metadata

`chat_conversations`: user, type `PERSONAL_RAG|SLIDE_TUTOR`, context metadata.

`chat_messages`: conversation, role, content, citation JSON, timestamps.

Nếu lưu hội thoại, Java sở hữu bảng và áp dụng retention. Không log bản sao message ở system log.

## 6. Tiến độ và kế hoạch

### `learning_progress`

`id`, `student_id`, `class_subject_id`, `document_id`, `last_slide`, `viewed_slide_count`, `progress_percent`, `completed_at`, `updated_at`.

- Unique: `(student_id, document_id)`.
- Chỉ PPTX/Slide có document progress; PDF Teacher không có page progress.

### `learning_events`

`id`, `student_id`, `event_type`, `target_type`, `target_id`, `metadata`, `occurred_at`.

Event chính: `VIEW_SLIDE`, `NOTE_SAVED`, `PERSONAL_DOCUMENT_UPLOADED`, `PERSONAL_DOCUMENT_INDEXED`, `ASK_AI`, `QUIZ_GENERATED`, `QUIZ_ACCEPTED`, `QUIZ_COMPLETED`, `STUDY_PLAN_CREATED`, `STUDY_PLAN_COMPLETED`.

### `study_plans` và `study_plan_items`

- Plan: owner, title, description, start/end date, status.
- Item: plan, title, `scheduled_start`, `scheduled_end`, deadline, duration, status, class_subject tham chiếu tùy chọn.
- Calendar là projection của plan items, không cần bảng sự kiện trùng lặp.
- Index theo `(student_id, scheduled_start)` thông qua quan hệ plan; Java kiểm thời gian hợp lệ và phát hiện lịch chồng nhau.

Không có bảng recommendation trong MVP.

## 7. Ôn tập và Quiz

### `quizzes`

`id`, `student_id`, `title`, `description`, `generation_type` (`AI_PERSONAL_RAG`), `status` (`GENERATING|REVIEW_REQUIRED|READY|REJECTED|GENERATION_FAILED|ARCHIVED`), `question_count`, timestamps.

- Quiz AI luôn thuộc Student đã yêu cầu tạo.
- Sau khi Java validate kết quả Python, Quiz ở `REVIEW_REQUIRED`.
- Chỉ Student owner được `ACCEPT`; thao tác này chuyển Quiz sang `READY`.
- Quiz chưa `READY` không tạo attempt.

### `quiz_sources`

`quiz_id`, `document_id`, `document_version`, `source_type`, timestamps.

- Source của Quiz AI chỉ là Personal Documents thuộc Student và đã được chọn khi sinh.
- Unique: `(quiz_id, document_id)`.
- Giữ version để audit câu hỏi được sinh từ bản tài liệu nào.

### `quiz_questions`

`id`, `quiz_id`, `content`, `question_type` (`MCQ_SINGLE`), `options`, `correct_option_index`, `explanation`, `display_order`.

- Mỗi câu có tối thiểu hai options khác nhau và đúng một `correct_option_index` hợp lệ.
- MVP chưa có câu tự luận, nhiều đáp án đúng hoặc partial scoring.

### `quiz_question_sources`

`question_id`, `document_id`, `location_kind`, `location_value`, `excerpt`.

Java đối chiếu document/version với authorized scope trước khi lưu.

### `quiz_attempts` và `quiz_answers`

- Attempt: quiz, student, start/submit time, total score, status, duration.
- Answer: attempt, question, `selected_option_id`, correctness và awarded score.
- Unique: `(attempt_id, question_id)`.
- Java chấm điểm trong transaction; Python/LLM không chấm attempt.

## 8. Admin và vận hành

- `feedback_reports`: reporter, type, title, content, status, resolution timestamps.
- `system_logs`: actor, action, target type/ID, safe metadata, timestamp.
- `system_settings`: typed key/value, description, updated_by; không chứa secret.

Audit các sự kiện: login, role/status change, membership, ClassSubject assignment, publication/revoke và settings.

## 9. Xóa và tính nhất quán

- Thu hồi publication không xóa file khỏi Teacher Library.
- Xóa Teacher Document chỉ được thực hiện khi đã xử lý publication liên quan.
- Xóa Personal Document: Java chuyển `DELETING`, lập tức loại khỏi authorized scope, yêu cầu Python deindex, sau đó xóa object và metadata.
- Reindex ghi version mới, activate nguyên tử trong schema AI rồi dọn version cũ.
- Backup PostgreSQL và Object Storage; phải thử restore trước demo.
