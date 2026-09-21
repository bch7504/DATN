# StudyFlow — Master Specification

- **Trạng thái:** Draft for implementation
- **Phiên bản:** 1.0
- **Phạm vi:** MVP đồ án tốt nghiệp
- **Nguồn tham chiếu:** `architecture.md`, `database-plan.md`, `api-plan.md`, `low-level-design.md`, `tech-stack.md`, `demo-flow.md`

## 1. Mục tiêu sản phẩm

StudyFlow giúp sinh viên tiếp cận đúng học liệu của lớp, học với AI trong phạm vi đã được kiểm quyền, tự lập lịch học và tự ôn tập bằng Quiz sinh từ tài liệu cá nhân.

Hệ thống phải chứng minh được bốn giá trị chính:

1. Teacher phân phối học liệu đúng lớp/môn được phân công.
2. Student học Slide, lưu Note và dùng AI Tutor có citation.
3. Personal Document được cô lập theo owner và dùng cho RAG/Quiz.
4. Java sở hữu quyền, trạng thái nghiệp vụ và chấm Quiz; Python chỉ xử lý document intelligence.

## 2. Actor

| Actor | Mục tiêu | Phạm vi dữ liệu |
|---|---|---|
| Student | Học tài liệu lớp, quản lý tài liệu cá nhân, kế hoạch và Quiz | Lớp đang tham gia và dữ liệu cá nhân của chính mình |
| Teacher | Quản lý kho tài liệu và phân phối cho lớp/môn phụ trách | ClassSubject được phân công và tài liệu do mình sở hữu |
| Admin | Quản trị tài khoản, lớp, môn, membership và assignment | Dữ liệu quản trị; không mặc định đọc nội dung cá nhân của Student |
| Java Backend | System of record và public API | Toàn bộ luật nghiệp vụ, authorization, transaction và scoring |
| Python AI Service | Xử lý tài liệu và sinh nội dung AI | Authorized scope tối thiểu do Java cấp |

## 3. Phạm vi MVP

### 3.1 Trong phạm vi

- Auth, profile, JWT/refresh token và RBAC ba vai trò.
- Class, Subject, ClassSubject, Student membership và Teacher assignment.
- Teacher Library cho PDF/PPTX/DOCX; public/revoke theo ClassSubject.
- Student xem PPTX trên web; PDF/DOCX public chỉ tải xuống.
- Note theo slide, Slide AI Tutor và citation theo document/slide.
- Personal Document PDF/DOCX, multi-document RAG và citation theo page/section.
- AI sinh Quiz trắc nghiệm nhiều lựa chọn, mỗi câu chỉ có một đáp án đúng, từ Personal Documents đã chọn.
- Student duyệt/từ chối Quiz, làm bài và xem kết quả do Java chấm.
- Progress/Statistics theo hoạt động; Study Plan và lịch tuần.
- Admin quản trị user, lớp/môn, assignment, feedback, audit và settings.

### 3.2 Ngoài phạm vi

- Chapter/Topic taxonomy và Topic Mastery.
- Quiz do Teacher tạo hoặc giao.
- Câu hỏi tự luận, AI grading hoặc Teacher grading.
- Exam/Mock Exam, recommendation tự động và spaced repetition.
- OCR/vision nâng cao, discussion, gamification, billing và calendar sync.

## 4. Kiến trúc bắt buộc

```text
Next.js Web → Java Spring Boot → PostgreSQL + pgvector
                         ├────→ Object Storage
                         └────→ Python FastAPI → LLM/Embedding API
```

- Browser chỉ gọi `/api/v1` của Java.
- Java gọi Python qua `/internal/v1` bằng service credential.
- Java/Flyway sở hữu schema `app`; Python/Alembic sở hữu schema `ai`.
- Python không truy cập trực tiếp bảng user, membership, plan, Quiz attempt hoặc result.
- Object Storage giữ file gốc và artifact; database chỉ giữ metadata/key.

## 5. Ma trận hành vi tài liệu

| Nguồn | Loại | Student action | AI action |
|---|---|---|---|
| Teacher publication | PPTX | Xem Slide, Note; không tải bản gốc | Slide Tutor |
| Teacher publication | PDF | Tải xuống | Không AI |
| Teacher publication | DOCX | Tải xuống | Không AI |
| Personal Document | PDF | Quản lý, chọn cho chat/Quiz | RAG, Quiz generation |
| Personal Document | DOCX | Quản lý, chọn cho chat/Quiz | RAG, Quiz generation |

Quiz dùng dạng `MCQ_SINGLE`: mỗi câu có tối thiểu hai lựa chọn và đúng một đáp án. Java so sánh lựa chọn của Student với `correctOptionIndex` đã lưu.

## 6. Quy ước requirement

Requirement ID dùng định dạng `{MODULE}-{TYPE}-{NNN}`:

- Module: `AUTH`, `STU`, `PAI`, `PLAN`, `QUIZ`, `TCH`, `ADM`, `NFR`.
- Type: `FR` cho chức năng, `BR` cho business rule, `SEC` cho security.
- Priority: toàn bộ requirement ghi `MUST` thuộc release gate; `SHOULD` có thể lùi nhưng phải ghi handoff.

Mỗi feature spec bắt buộc có:

- Actor và precondition.
- `args`/input, output, error và side effect.
- Authorization rule và state transition.
- Public/internal API liên quan.
- Data entity chịu tác động.
- Acceptance criteria dạng Given/When/Then.

## 7. Danh mục feature spec

| Tài liệu | Nội dung |
|---|---|
| `specs/01-auth-and-access.md` | Auth, session, profile và RBAC |
| `specs/02-student-learning.md` | Lớp/môn, học liệu, Slide, Note và Tutor |
| `specs/03-personal-ai-and-quiz.md` | Personal Documents, RAG và Quiz generation |
| `specs/04-plan-progress-review.md` | Progress, lịch tuần, Quiz review/attempt |
| `specs/05-teacher-content.md` | Assignment, Student list, library và publication |
| `specs/06-admin-operations.md` | User, academic structure, feedback, audit, settings |
| `specs/07-non-functional.md` | Performance, security, privacy và reliability |
| `specs/08-traceability.md` | Requirement/API/data/test/demo mapping |

## 8. Chuẩn API chung

- JSON dùng camelCase; ID là opaque string/UUID.
- Timestamp dùng ISO-8601 UTC; Web hiển thị theo timezone người dùng.
- List response dùng `items`, `page`, `size`, `totalItems`, `totalPages`.
- Mutation cần idempotency dùng header `Idempotency-Key`.
- Mọi response lỗi dùng:

```json
{
  "code": "DOCUMENT_NOT_READY",
  "message": "Tài liệu đang được xử lý",
  "details": {},
  "traceId": "req_..."
}
```

- `401` cho session không hợp lệ; `403` cho thiếu quyền đã xác định; `404` dùng khi cần tránh làm lộ tài nguyên ngoài scope; `409` cho state/conflict; `422` cho validation.

## 9. Release criteria

MVP chỉ được coi là đạt khi:

1. Toàn bộ requirement `MUST` có acceptance test đạt.
2. Không có đường gọi trực tiếp Web → Python/database/storage/model provider.
3. Owner, membership và assignment isolation được test bằng dữ liệu tổng hợp.
4. Citation luôn thuộc authorized scope; trường hợp thiếu nguồn trả `NO_EVIDENCE`.
5. Quiz chưa `READY` không tạo được attempt; scoring chỉ chạy tại Java.
6. Lịch tuần phát hiện xung đột và không tạo bảng calendar trùng dữ liệu plan item.
7. Không có secret, dữ liệu upload thật hoặc nội dung tài liệu trong log/test fixture.
8. Demo flow chạy được trên seed data và có trace ID xuyên Java/Python.
