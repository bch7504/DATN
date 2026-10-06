# Feature Specification — Student Course Offering và Course Material PDF

## 1. Requirements

| ID | Requirement |
|---|---|
| STU-FR-001 | Student nhập join code và nhận enrollment `PENDING`. |
| STU-FR-002 | Student xem enrollment theo trạng thái và lớp `ACTIVE|ARCHIVED`. |
| STU-FR-003 | Chỉ enrollment `APPROVED`/historical policy hợp lệ mở Course Material. |
| STU-FR-004 | Course Material PDF được xem web và ghi Note theo trang. |
| STU-FR-005 | Student dùng Course Material AI Tutor; Teacher không dùng Tutor này. |
| STU-FR-006 | Citation thuộc đúng document/version/page và authorized Course Offering. |
| STU-FR-007 | Dashboard hiển thị page progress theo Course Offering; không suy luận Topic Mastery. |

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

## 3. Acceptance

- Join code đúng tạo một request; gửi lặp không duplicate.
- Student chưa `APPROVED` không mở PDF/page/Note/Tutor.
- Revoke/lock có hiệu lực trước khi cấp URL hoặc gọi AI.
- Tutor citation entail claim và đúng trang; câu ngoài nguồn trả `NO_EVIDENCE`.
- Prompt injection trong PDF không thay system rule hoặc scope.
- Cùng page/local date không làm tăng progress/Daily Goal hai lần.
- Progress chỉ ở Dashboard; không có endpoint/màn Progress độc lập.
