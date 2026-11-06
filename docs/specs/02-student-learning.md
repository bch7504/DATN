# Feature Specification — Student Course Offering và Course Material PDF

## 1. Requirements

| ID | Requirement |
|---|---|
| STU-FR-001 | Student nhập join code và nhận enrollment `PENDING`. |
| STU-FR-002 | Student xem enrollment theo trạng thái và lớp `ACTIVE|ARCHIVED`. |
| STU-FR-003 | Chỉ enrollment `APPROVED`/historical policy hợp lệ mở chi tiết lớp, học liệu và Assignment. |
| STU-FR-004 | `SLIDE_PDF` được xem từng trang trên web, chọn text và ghi Note theo trang; Student không tải tệp gốc. |
| STU-FR-005 | `REFERENCE_PDF` chỉ tải xuống; không có Viewer, Note hoặc Tutor. |
| STU-FR-006 | Student dùng Course Material AI Tutor trên `SLIDE_PDF`; Teacher không dùng Tutor này. |
| STU-FR-007 | Citation thuộc đúng document/version/page và authorized Course Offering. |
| STU-FR-008 | Student làm và nộp Quiz lớp qua Assignment; Java chấm điểm và lưu đúng hạn/nộp muộn. |
| STU-FR-009 | Dashboard hiển thị page progress theo Course Offering; không suy luận Topic Mastery. |

## 2. Public API

| Endpoint | Input | Output | Errors |
|---|---|---|---|
| `POST /api/v1/student/course-enrollments/join` | `{joinCode}` | enrollment `PENDING` | invalid/closed/duplicate |
| `GET /api/v1/student/course-enrollments` | semester/status | offering + enrollment | `401` |
| `GET /api/v1/student/course-offerings/{id}/materials` | pagination | Course Material PDF active | `403/404` |
| `GET /api/v1/student/materials/{documentId}/pages` | authorized document | page metadata | `404` |
| `POST /api/v1/student/materials/{documentId}/pages/{number}/view-events` | `Idempotency-Key` | `VIEW_PAGE` event | `404/409` |
| `GET/PUT /api/v1/student/materials/{documentId}/pages/{number}/note` | `{content}` | Student Note | `404/422` |
| `POST /api/v1/student/materials/{documentId}/pages/{number}/tutor` | `{question}` | answer/page citation/trace | `NO_EVIDENCE`, AI unavailable |

Browser chỉ nhận artifact/signed URL ngắn hạn sau authorization; API không trả storage key.

## 3. Assignment và Quiz lớp

- `GET /api/v1/student/assignments`: chỉ Assignment `PUBLISHED` thuộc lớp Student `APPROVED`, kèm trạng thái bài nộp của chính Student.
- `POST /api/v1/student/assignments/{assignmentId}/quiz-attempts`: tạo lượt làm cho Assignment `QUIZ`; không trả đáp án đúng.
- `POST /api/v1/student/assignments/{assignmentId}/quiz-submissions`: `{attemptId,answers:{questionId:optionIndex}}`; Java chấm điểm và lưu `ON_TIME|LATE`.
- Quiz Teacher chỉ được mở từ Assignment, không xuất hiện trong kho Ôn tập cá nhân và không bắt đầu bằng API `/review`.

## 4. Acceptance

- Join code đúng tạo một request; gửi lặp không duplicate.
- Student chưa `APPROVED` không mở PDF/page/Note/Tutor.
- `SLIDE_PDF` chỉ có **Xem slide**; `REFERENCE_PDF` chỉ có **Tải xuống**.
- Revoke/lock có hiệu lực trước khi cấp URL hoặc gọi AI.
- Tutor citation entail claim và đúng trang; câu ngoài nguồn trả `NO_EVIDENCE`.
- Prompt injection trong PDF không thay system rule hoặc scope.
- Cùng page/local date không làm tăng progress/Daily Goal hai lần.
- Lượt Quiz Assignment phải thuộc đúng Student, Quiz và Assignment; Java không tin score do client gửi.
- Progress chỉ ở Dashboard; không có endpoint/màn Progress độc lập.
