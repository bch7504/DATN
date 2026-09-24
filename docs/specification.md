# StudyFlow — Master Specification

- **Trạng thái:** Baseline triển khai theo phương án Course Offering
- **Phiên bản:** 2.1 — Dashboard/Streak/Daily Goal (24/09/2026)
- **Phạm vi:** MVP đồ án tốt nghiệp trong 12 tuần
- **Nguồn nghiệp vụ:** `Ke_hoach_do_an_tot_nghiep_cap_nhat_Streak_Daily_Goal.md`
- **Nguồn tham khảo chatbot:** [Multi-Agent Document Intelligence Assistant](https://github.com/bch7504/Multi-Agent-Document-Intelligence-Assistant), chỉ dùng làm mẫu UX/grounding, không thay thế kiến trúc StudyFlow

## 1. Mục tiêu sản phẩm

StudyFlow hỗ trợ sinh viên học và ôn luyện theo mô hình:

```text
Semester → Course Offering → Enrollment → Teacher Materials
                                  ├→ Slide Viewer + Note + Tutor
                                  └→ PDF Download

Student → Personal PDF → RAG Chat + Citation → Quiz Draft → Review → Attempt
```

Hệ thống phải chứng minh được năm giá trị:

1. Teacher hợp lệ tự tạo Course Offering từ Subject và Semester đang cho phép.
2. Student tham gia bằng join code và chỉ truy cập sau khi enrollment `APPROVED`.
3. Teacher phân phối đúng học liệu cho Course Offering mình sở hữu.
4. Student học Slide, lưu Note và hỏi AI bằng nguồn được kiểm quyền; Personal RAG chỉ dùng PDF cá nhân đã chọn.
5. Java sở hữu authorization, state transition, Dashboard progress, Study Streak, Daily Goal, kế hoạch và Quiz scoring; Python chỉ xử lý document intelligence.

## 2. Actor và quyền sở hữu

| Actor | Trách nhiệm | Phạm vi dữ liệu |
|---|---|---|
| Student | Gửi join request, học Slide/PDF, quản lý Personal PDF, RAG, Quiz, Daily Goal và plan | Course Offering có enrollment `APPROVED` và dữ liệu cá nhân |
| Teacher | Tạo/archived Course Offering, duyệt enrollment, quản lý và public tài liệu | Course Offering do mình tạo và document do mình sở hữu |
| Admin | User/role, Subject, Semester, giám sát/lock/archive Course Offering, feedback/audit/settings | Metadata quản trị; không mặc định đọc dữ liệu học tập cá nhân |
| Java Backend | System of record và public API | RBAC, ownership, enrollment, transaction, state và scoring |
| Python AI Service | Index/retrieval/generation | Authorized document scope tối thiểu do Java cấp |

Admin duyệt quyền Teacher ở cấp tài khoản, không tạo/phân công và không duyệt từng Course Offering. Teacher không tạo tài khoản Student; Teacher chỉ duyệt quan hệ Student ↔ Course Offering.

## 3. Phạm vi MVP

### 3.1 Trong phạm vi

- Auth, profile, session/JWT và RBAC `STUDENT|TEACHER|ADMIN`.
- Subject và Semester do Admin quản lý.
- Teacher tự tạo Course Offering; hệ thống sinh join code unique và cho phép bật/tắt/regenerate.
- Student gửi join request; Teacher approve/reject/remove enrollment.
- Course Offering giữ lịch sử qua `ACTIVE|ARCHIVED|LOCKED`; Semester dùng `UPCOMING|ACTIVE|CLOSED`.
- Teacher Library nhận PDF/PPTX; public/revoke theo Course Offering.
- Student xem PPTX trên web; Teacher PDF public chỉ tải xuống.
- Note theo slide, Slide AI Tutor và citation theo document/slide.
- Personal PDF, multi-document RAG, lịch sử hội thoại và citation theo page.
- AI sinh Quiz `MCQ_SINGLE` từ Personal Documents đã chọn; Student review/accept/reject trước attempt.
- Dashboard tổng hợp viewing progress, Study Streak và Daily Goal; chi tiết tiến độ nằm trong Course Offering.
- Study Plan, task, deadline và lịch tuần.
- Admin monitoring, feedback/report, audit log và typed settings.
- Deploy end-to-end, test và seed data tổng hợp.

### 3.2 Ngoài phạm vi

- Class/ClassSubject và Admin assignment Teacher theo lớp.
- Chapter/Topic taxonomy và Topic Mastery.
- Teacher Quiz, câu tự luận, AI grading hoặc recommendation tự động.
- OCR PDF scan, DOCX, Exam/Mock Exam, spaced repetition và calendar sync.
- XP, Level, Achievement, badge hoặc leaderboard.
- Import thời khóa biểu/đăng ký tín chỉ và đồng bộ hệ thống đào tạo.
- Multi-agent orchestration, model selector cho end user, Agent Trace chi tiết và Milvus.

## 4. Quy tắc Course Offering và Enrollment

- Teacher chỉ tạo Course Offering khi account `ACTIVE/TEACHER`, Subject hợp lệ và Semester cho phép tạo lớp.
- `joinCode` phải unique, khó đoán, có thể tắt hoặc regenerate; biết code không đồng nghĩa có quyền học.
- Một Student chỉ có một enrollment trên mỗi Course Offering.
- Chỉ `APPROVED` được truy cập material/slide/note/tutor/progress.
- Teacher chỉ approve/reject/remove enrollment của Course Offering do mình sở hữu.
- Admin có thể `LOCK` hoặc `ARCHIVE` để giám sát; Admin không duyệt từng lớp trước khi hoạt động.
- Kết thúc học kỳ không xóa lớp/enrollment. Course Offering được archive và Student đã được duyệt có thể xem lịch sử theo policy.

## 5. Ma trận hành vi tài liệu

| Nguồn | Loại | Student action | AI action |
|---|---|---|---|
| Teacher publication | PPTX | Viewer, Note; không tải bản gốc | Slide AI Tutor |
| Teacher publication | PDF | Download qua Java | Không AI, không page progress |
| Personal Document | PDF text layer | Quản lý, chọn 1–10 file cho hội thoại/Quiz | RAG, citation, Quiz generation |

Teacher Document gắn với owner, không nhân bản khi public cho nhiều Course Offering. Publication bị revoke phải mất quyền ở request kế tiếp.

## 5.1 Dashboard, Study Streak và Daily Goal

- Không có menu `Tiến độ & Thống kê` độc lập. Dashboard hiển thị tiến độ tổng quan; Course Offering Detail hiển thị tiến độ theo lớp/tài liệu.
- Viewing Progress chỉ phản ánh slide đã mở/xem, không suy luận mức hiểu hoặc Topic Mastery.
- Streak chỉ tính ngày có ít nhất một `VIEW_SLIDE`, `STUDY_TASK_COMPLETED` hoặc `QUIZ_COMPLETED`; login, Note hay `ASK_AI` không duy trì streak.
- Nhiều hoạt động hợp lệ trong cùng ngày chỉ tạo một activity day. Java tính `currentStreak`, `longestStreak` và tuần hoạt động theo timezone tài khoản.
- Daily Goal gồm `slideTarget`, `quizQuestionTarget`, `taskTarget`; target do Student cấu hình, actual do Java tổng hợp từ dữ liệu nghiệp vụ.
- Hoàn thành Daily Goal không phải điều kiện duy trì Streak. Client không tự tăng actual, tính streak hoặc suy luận completion.

## 6. Chatbot Personal RAG

Chatbot dùng mẫu workspace evidence-scoped:

- Cột nguồn hiển thị Personal PDF, trạng thái `PROCESSING|READY|FAILED` và checkbox chỉ bật với `READY`.
- Header hội thoại hiển thị số nguồn đang dùng, nút tạo hội thoại mới và lịch sử.
- Empty state có câu hỏi gợi ý; composer hỗ trợ Enter gửi, Shift+Enter xuống dòng.
- Mỗi lượt assistant trả `ANSWERED` hoặc `NO_EVIDENCE`, citation mở rộng theo document/page/excerpt và `traceId`.
- Java tải conversation, kiểm owner và snapshot `selectedDocumentIds` trước mỗi message.
- Python filter document/version/owner/source trước retrieval; citation chỉ dựng từ chunk đã retrieval và được kiểm định bằng code.
- Prompt xem document content là dữ liệu không tin cậy, không phải instruction.
- Không hiển thị model selector, prompt nội bộ, token usage hay Agent Trace cho Student trong MVP.
- Tạo Quiz là action riêng từ conversation scope; kết quả đi vào Java lifecycle, không biến thành Quiz làm ngay trong chat.

Những pattern trên được rút ra từ repo tham khảo; StudyFlow không dùng frontend gọi thẳng FastAPI, Supervisor tự route hay database/vector stack của repo đó.

## 7. Kiến trúc bắt buộc

```text
Next.js Web → Java Spring Boot → PostgreSQL schema app
                         ├────→ Object Storage
                         └────→ Python FastAPI → PostgreSQL schema ai/pgvector
                                                └→ OpenRouter
```

- Browser chỉ gọi Java `/api/v1`.
- Java gọi Python `/internal/v1` bằng service credential, request ID, schema version và authorized scope.
- Python không truy cập bảng user, enrollment, Note, plan, Quiz attempt/result.
- Java/Flyway sở hữu schema `app`; Python/Alembic sở hữu schema `ai`.

## 8. Quy ước requirement và API

Requirement ID dùng `{MODULE}-{TYPE}-{NNN}` với module `AUTH`, `COURSE`, `STU`, `PAI`, `DASH`, `PLAN`, `QUIZ`, `TCH`, `ADM`, `NFR`.

- JSON camelCase; ID opaque string/UUID; timestamp ISO-8601 UTC.
- List response dùng `items`, `page`, `size`, `totalItems`, `totalPages`.
- Mutation nhạy cảm/retry dùng `Idempotency-Key`.
- Error envelope thống nhất:

```json
{
  "code": "ENROLLMENT_REQUIRED",
  "message": "Bạn chưa được duyệt vào lớp học phần",
  "details": {},
  "traceId": "req_..."
}
```

- `401` session không hợp lệ; `403` thiếu role; `404` tránh lộ tài nguyên ngoài scope; `409` state/conflict; `422` validation.

## 9. Danh mục feature spec

| Tài liệu | Nội dung |
|---|---|
| `specs/01-auth-and-access.md` | Auth, session, profile và RBAC |
| `specs/02-student-learning.md` | Join/enrollment, học liệu, Slide, Note và Tutor |
| `specs/03-personal-ai-and-quiz.md` | Personal PDF, RAG, citation và Quiz generation |
| `specs/04-plan-progress-review.md` | Dashboard progress, Study Streak, Daily Goal, lịch và Quiz review/attempt |
| `specs/05-teacher-content.md` | Course Offering ownership, enrollment, library/publication |
| `specs/06-admin-operations.md` | User, Subject, Semester, monitoring, audit/settings |
| `specs/07-non-functional.md` | Performance, security, privacy và reliability |
| `specs/08-traceability.md` | Requirement/API/data/test/demo mapping |

## 10. Release criteria

1. Teacher tạo Course Offering và join code đúng Subject/Semester; Student chỉ học sau approval.
2. Toàn bộ requirement `MUST` có acceptance test bằng dữ liệu tổng hợp.
3. Không có Web → Python/database/storage/provider.
4. Course ownership, enrollment và Personal owner isolation có negative test.
5. Citation luôn thuộc authorized scope; thiếu evidence trả `NO_EVIDENCE`.
6. Quiz chưa `READY` không tạo attempt; Java là nơi duy nhất chấm điểm.
7. Không secret, upload thật, prompt hoặc document content trong log/test fixture.
8. Demo flow Course Offering chạy end-to-end và có trace ID xuyên Java/Python.
9. Dashboard/Streak/Daily Goal do Java tính đúng từ event hợp lệ; không có menu Progress độc lập hoặc gamification ngoài phạm vi.
