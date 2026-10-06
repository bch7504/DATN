# StudyFlow — Master Specification

- **Trạng thái:** Baseline MVP hiện hành
- **Phiên bản tài liệu:** 4.0 — PDF + Single Agent + Teacher AI Quiz
- **Phạm vi:** MVP đồ án tốt nghiệp
- **Chi tiết AI:** `ai-implementation-plan.md`

## 1. Mục tiêu sản phẩm

```text
Semester → Course Offering → Enrollment → Course Material PDF
                                  └→ PDF Viewer + Page Note + Student AI Tutor

Student → Personal PDF → Single Agent → Ask | Summarize | Create Quiz
Teacher → Course Material PDF → AI Quiz Generator → Review → Publish
Quiz → Attempt/Scoring → Wrong-answer Review → Dashboard/Plan
```

Giá trị cốt lõi:

1. Teacher tự tạo Course Offering và kiểm soát enrollment/học liệu.
2. Student chỉ truy cập Course Material sau khi `APPROVED`.
3. Toàn bộ nguồn AI trong MVP là PDF có text layer và citation theo trang.
4. Personal Document Assistant dùng một Agent với ba tool; Teacher chỉ có AI Quiz Generator, không có chatbot/Tutor.
5. Java sở hữu authorization, lifecycle, scoring, progress, Streak, Daily Goal và Plan; Python chỉ xử lý document intelligence.

## 2. Actor và quyền sở hữu

| Actor | Trách nhiệm | Phạm vi dữ liệu |
|---|---|---|
| Student | Join lớp, đọc PDF, Note/Tutor, Personal Assistant, Quiz, Dashboard và Plan | Course Offering `APPROVED` và dữ liệu cá nhân |
| Teacher | Tạo lớp, duyệt enrollment, upload/public PDF, tạo/review/publish Quiz AI | Lớp và Course Material do mình sở hữu |
| Admin | User/role, Subject, Semester, monitoring, feedback/audit/settings | Metadata quản trị; không mặc định đọc dữ liệu học cá nhân |
| Java Backend | System of record và public API | RBAC, ownership, transaction, state và scoring |
| Python AI Service | PDF index/retrieval/generation/evaluation | Authorized scope tối thiểu do Java cấp |

## 3. Trong phạm vi MVP

- Auth/profile/RBAC `STUDENT|TEACHER|ADMIN`.
- Subject/Semester; Course Offering/join code; Enrollment approval.
- Teacher Course Material PDF: upload, processing, public/revoke.
- Student PDF Viewer, Page Note, Course Material AI Tutor và page progress.
- Student Personal PDF, conversation history và Single Agent cho hỏi đáp/tóm tắt/tạo Quiz.
- Teacher AI Quiz Generator từ PDF theo số câu, độ khó, chủ đề và khoảng trang.
- Quiz `MCQ_SINGLE`: đúng 4 options, một đáp án đúng, explanation và page citation; review trước khi dùng/publish.
- Review Hub, attempt history, wrong-answer review; Java scoring.
- Dashboard đầy đủ progress/Streak/Daily Goal; Kế hoạch & Lịch tuần theo mock.
- Admin monitoring, feedback/audit/settings; deploy/test/seed tổng hợp.

Ngoài MVP: PPTX/DOCX/OCR, Teacher chatbot/Tutor, multi-agent, Topic Mastery, Exam, AI grading, recommendation tự động, XP/badge/leaderboard, calendar sync và advanced analytics.

## 4. Quy tắc nghiệp vụ

- Chỉ enrollment `APPROVED` được xem Course Material PDF, Note, Tutor và progress.
- Course Material và Personal Document chỉ nhận PDF có text layer; PDF scan/no text trả `PDF_TEXT_REQUIRED`, PDF mã hóa trả `PDF_ENCRYPTED`.
- Personal Document thuộc owner; Teacher/Admin không mặc định đọc hoặc dùng làm Official Content.
- Teacher chỉ public/tạo Quiz từ PDF và Course Offering mình sở hữu.
- Teacher không có Personal Chatbot và không có Course Material AI Tutor.
- Student Personal Assistant dùng một Single Orchestrator Agent, chỉ được gọi `ask_document`, `summarize_document`, `generate_quiz`.
- Thiếu tham số quan trọng trả `NEEDS_CLARIFICATION`; thiếu bằng chứng trả `NO_EVIDENCE`.
- Prompt/document content không thể thay system rule, tool schema, authorized scope hoặc citation rule.
- AI không accept/publish/chấm Quiz, không cập nhật progress và không điều phối Study Plan.

## 5. Tài liệu và citation

| Nguồn | Người sử dụng | Chức năng AI | Citation |
|---|---|---|---|
| Course Material PDF | Student `APPROVED` | Tutor; Teacher dùng làm nguồn Quiz | `documentId + pageNumber + excerpt` |
| Personal PDF | Student owner | Ask, Summary, Personal Quiz | `documentId + pageNumber + excerpt` |

Publication bị revoke hoặc enrollment mất quyền phải có hiệu lực ở request kế tiếp. Query/document chunk luôn dùng cùng model, dimensions và index version.

## 6. Hai luồng Quiz

### Student Personal Quiz

- Student yêu cầu ngay trong Personal Assistant; Agent hỏi lại khi thiếu số câu/phạm vi.
- Java lưu `REVIEW_REQUIRED`; Student accept để chuyển `READY`, có thể gắn Course Offering `APPROVED` hoặc giữ cá nhân.
- Nguồn sinh và nơi nhóm ôn tập là hai khái niệm độc lập.

### Teacher Course Quiz

- Teacher cấu hình PDF/Course Offering/số câu/độ khó/chủ đề/trang.
- Java kiểm ownership; Python sinh structured draft; Teacher review/sửa rồi publish.
- State: `GENERATING → REVIEW_REQUIRED → PUBLISHED|REJECTED`; lỗi → `GENERATION_FAILED`.

Mỗi attempt được lưu riêng. “Nội dung cần ôn lại” chỉ lấy từ answer sai và nguồn câu hỏi, không dùng AI suy luận năng lực.

## 7. Dashboard, Streak, Daily Goal và Plan

- Không có màn Progress độc lập; Dashboard hiển thị aggregate và từng Course Offering.
- Page progress chỉ phản ánh trang Course Material đã xem, không suy luận mức hiểu.
- Streak chỉ tính ngày có `VIEW_PAGE`, `STUDY_TASK_COMPLETED` hoặc `QUIZ_COMPLETED`; login, Note và `ASK_AI` không tính.
- Daily Goal gồm `pageTarget`, `quizQuestionTarget`, `taskTarget`; Java tính actual theo ngày/timezone.
- Student chủ động quản lý task/lịch tuần; recommendation tự động ngoài MVP.

## 8. Kiến trúc bắt buộc

```text
Next.js Web → Java Spring Boot → PostgreSQL schema app
                         ├────→ Object Storage
                         └────→ Python FastAPI → PostgreSQL schema ai/pgvector
                                                └→ OpenRouter
```

- Browser chỉ gọi Java `/api/v1`.
- Java gọi Python `/internal/v1` bằng service credential, request ID, schema version và authorized scope.
- Python không truy cập bảng user/enrollment/Note/plan/attempt và không chấm Quiz.
- Java/Flyway sở hữu schema `app`; Python/Alembic sở hữu schema `ai`.

## 9. Danh mục feature spec

| Tài liệu | Nội dung |
|---|---|
| `specs/01-auth-and-access.md` | Auth, session, profile và RBAC |
| `specs/02-student-learning.md` | Join/enrollment, Course Material PDF, Page Note và Tutor |
| `specs/03-personal-ai-and-quiz.md` | Personal Assistant và Student Quiz |
| `specs/04-plan-progress-review.md` | Dashboard, Streak, Daily Goal, lịch và Review |
| `specs/05-teacher-content.md` | Course Offering, enrollment, PDF publication và Teacher Quiz |
| `specs/06-admin-operations.md` | User, catalog, monitoring, audit/settings |
| `specs/07-non-functional.md` | Performance, security, privacy và reliability |
| `specs/08-traceability.md` | Requirement/API/data/test/demo mapping |

## 10. Release criteria

1. Ownership/enrollment/role isolation có negative test.
2. PDF-only policy và page citation đạt contract.
3. Single Agent route đúng tool, hỏi lại khi thiếu args và không vượt scope.
4. Student/Teacher Quiz đúng 4 options, một đáp án, review trước dùng/publish; Java chấm điểm.
5. Không có Web → Python/database/storage/provider.
6. Dashboard/Streak/Daily Goal do Java tính đúng; không có Topic Mastery hoặc gamification ngoài phạm vi.
7. Không secret, upload thật, prompt hoặc document content trong log/test fixture.
