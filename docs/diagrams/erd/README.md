# ERD StudyFlow — Dạng bảng và quan hệ chân quạ

Mở [index.html](index.html) để xem một ERD tổng quan duy nhất gồm 30 bảng. [Bản SVG](studyflow-overview.svg) có thể phóng to hoặc chèn vào Word. Bản vẽ dựa trên [database-plan.md](../../database-plan.md); đây là thiết kế đề xuất, chưa phải schema đã chạy migration.

![ERD tổng quan StudyFlow](studyflow-overview.svg)

Mỗi bảng xuất hiện đúng một lần. Sơ đồ trình bày các cột nghiệp vụ chính; timestamps chung và soft-delete metadata được giản lược.

## Ký hiệu và giả định thiết kế

- PK: khóa chính; FK: khóa ngoại; PK/FK: cột vừa thuộc khóa chính vừa tham chiếu bảng cha.
- UQ: unique một cột; unique nhiều cột được liệt kê bên dưới.
- N: cho phép NULL. Các trường không có N được đề xuất NOT NULL.
- Hai vạch: đúng một; vòng tròn và chân quạ: không hoặc nhiều; vòng tròn và vạch: không hoặc một.
- Đường đứt: quan hệ FK trong schema app; đường chấm trong schema ai: liên hệ logic document/version/pipeline. Không có FK từ ai sang app.
- REF: định danh do Java cấp, không phải FK tới bảng Java.
- FK*: khóa ghép (document_id, slide_number) của slide_notes tham chiếu slides(document_id, slide_number).
- UUID, độ dài varchar, precision numeric, tên cột chi tiết của các bảng mới được mô tả khái quát trong database-plan và lựa chọn NULL là đề xuất để trực quan hóa. Cần chốt bằng migration khi triển khai.
- conversation_documents và quiz_sources đề xuất khóa chính ghép thay cho surrogate ID; daily_goals dùng student_id làm PK/FK như kế hoạch.
- quiz_questions.options dùng JSONB và correct_option_index cho MCQ_SINGLE. Không bổ sung bảng quiz_options khi kế hoạch hiện hành chưa yêu cầu.
- Daily Goal chỉ lưu target; actual và Study Streak tính từ learning_events. Calendar và nội dung cần ôn lại là dữ liệu tổng hợp, không tạo bảng riêng.
- learning_progress ở cấp student/document; không có FK slide_id. last_slide là số thứ tự. course_offering_id của Study Plan nằm trên study_plan_items, có thể NULL.
- Signed URL trong ai.index_jobs là dữ liệu tạm và phải xóa sau trạng thái kết thúc; không ghi log.

## Danh mục tham chiếu đầy đủ

Đường trên hình ưu tiên các quan hệ chính. Các FK phụ và tự tham chiếu được ghi đầy đủ ở bảng này; dấu ? chỉ FK tùy chọn.

| Bảng con | FK → bảng cha |
|---|---|
| refresh_tokens | user_id → users.id; replaced_by_id? → refresh_tokens.id |
| course_offerings | subject_id → subjects.id; semester_id → semesters.id; teacher_id → users.id |
| course_enrollments | course_offering_id → course_offerings.id; student_id → users.id; decided_by? → users.id |
| documents | owner_id → users.id |
| document_publications | document_id → documents.id; course_offering_id → course_offerings.id; published_by → users.id |
| slides | document_id → documents.id |
| slide_notes | student_id → users.id; (document_id, slide_number) → slides(document_id, slide_number) |
| chat_conversations | student_id → users.id |
| conversation_documents | conversation_id → chat_conversations.id; document_id → documents.id |
| chat_messages | conversation_id → chat_conversations.id |
| learning_progress | student_id → users.id; course_offering_id → course_offerings.id; document_id → documents.id |
| learning_events | student_id → users.id; target_id là tham chiếu đa hình theo target_type, không phải FK cố định |
| daily_goals | student_id → users.id (một Student có 0 hoặc 1 cấu hình) |
| study_plans | student_id → users.id (đặt tên cụ thể cho owner trong kế hoạch) |
| study_plan_items | plan_id → study_plans.id; course_offering_id? → course_offerings.id |
| quizzes | student_id → users.id; course_offering_id? → course_offerings.id; regenerated_from_quiz_id? → quizzes.id |
| quiz_sources | quiz_id → quizzes.id; document_id → documents.id |
| quiz_questions | quiz_id → quizzes.id |
| quiz_question_sources | question_id → quiz_questions.id; document_id → documents.id |
| quiz_attempts | quiz_id → quizzes.id; student_id → users.id |
| quiz_answers | attempt_id → quiz_attempts.id; question_id → quiz_questions.id |
| feedback_reports | reporter_id → users.id |
| system_logs | actor_id? → users.id; target_id là tham chiếu đa hình |
| system_settings | Không có FK nghiệp vụ |
| ai.document_indexes / ai.document_chunks / ai.index_jobs | Liên hệ logic document/version/pipeline; không liên kết FK sang schema app |

Document version được giữ trong snapshot source/scope; tham chiếu documents.id không thay thế việc Java kiểm tra version, ownership, publication và trạng thái truy cập.

## Ràng buộc nhiều cột quan trọng

- course_offerings: UNIQUE(semester_id, code).
- course_enrollments: UNIQUE(course_offering_id, student_id).
- document_publications: UNIQUE(document_id, course_offering_id).
- slides: UNIQUE(document_id, slide_number).
- slide_notes: UNIQUE(student_id, document_id, slide_number).
- learning_progress: UNIQUE(student_id, document_id).
- learning_events: UNIQUE(student_id, idempotency_key); partial unique(student_id, target_id, activity_date, event_type) cho VIEW_SLIDE.
- conversation_documents: UNIQUE(conversation_id, document_id).
- quiz_sources: UNIQUE(quiz_id, document_id).
- quiz_answers: UNIQUE(attempt_id, question_id).
- ai.document_chunks: UNIQUE(document_id, document_version, chunk_index).
- Daily Goal: slide_target 0..100; quiz_question_target 0..200; task_target 0..50; tổng target > 0.

Không tự động tạo hoặc sửa database từ các bản vẽ này.
