# Feature Specification — Student Course Offering và học liệu

## 1. Requirements

| ID | Requirement |
|---|---|
| STU-FR-001 | Student nhập join code và nhận enrollment `PENDING`. |
| STU-FR-002 | Student xem enrollment theo `PENDING`, `APPROVED`, `REJECTED`, `REMOVED`; lớp đã duyệt lọc theo trạng thái `ACTIVE`, `ARCHIVED`. |
| STU-FR-003 | Chỉ enrollment `APPROVED`/historical policy hợp lệ mở materials. |
| STU-FR-004 | Teacher PPTX xem web, Note, Tutor; không tải file gốc. |
| STU-FR-005 | Teacher PDF chỉ download; không Viewer/Note/Tutor/progress/index AI. |
| STU-FR-006 | Citation Slide Tutor thuộc đúng document/version/slide và authorized Course Offering. |
| STU-FR-007 | Dashboard hiển thị viewing progress theo từng Course Offering; không suy luận Topic Mastery. |

## 2. Public API

| Endpoint | Input | Output | Errors |
|---|---|---|---|
| `POST /api/v1/student/course-enrollments/join` | `{joinCode}` | `201/200` enrollment `PENDING` | invalid/closed/duplicate |
| `GET /api/v1/student/course-enrollments` | semesterId, enrollment status | offering + enrollment state | `401` |
| `GET /api/v1/student/course-offerings` | trạng thái lớp ACTIVE/ARCHIVED | lớp đã được duyệt | `401` |
| `GET /api/v1/student/course-offerings/{id}` | offering ID | subject, semester, Teacher, state | `404` ngoài scope |
| `GET /api/v1/student/course-offerings/{id}/materials` | pagination/type | active publications | `403/404` |
| `POST /api/v1/student/materials/{documentId}/slides/{number}/view-events` | idempotency key | content progress event | `404/409` |
| `PUT /api/v1/student/materials/{documentId}/slides/{number}/note` | `{content}` | saved Note | `404/422` |
| `POST /api/v1/student/materials/{documentId}/slides/{number}/tutor` | `{question}` | answer/citation/trace | `NO_EVIDENCE`, AI unavailable |

Download PDF và slide artifact dùng signed URL ngắn hạn sau authorization; API không trả storage key.

## 3. Acceptance

- Join code đúng tạo một request, gửi lặp không tạo duplicate.
- Trước khi Teacher duyệt, Student không mở materials.
- Revoke/lock có hiệu lực trước khi cấp URL hoặc gọi AI.
- Slide Tutor chạy đúng production pipeline, citation entail claim; câu ngoài nguồn trả `NO_EVIDENCE`.
- Prompt injection trong slide không thay đổi system rule hay authorized scope.
- Viewing progress theo lớp chỉ xuất hiện trong payload Dashboard; không tạo màn hoặc endpoint Progress độc lập.
