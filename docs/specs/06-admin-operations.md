# Feature Specification — Admin Operations

## 1. Mục tiêu

Cho phép Admin quản trị identity, cấu trúc học vụ, assignment, feedback và vận hành mà không truy cập mặc định vào dữ liệu học tập cá nhân.

## 2. Functional requirements

| ID | Priority | Requirement |
|---|---|---|
| ADM-FR-001 | MUST | Admin xem dashboard tổng hợp bằng số liệu không chứa nội dung cá nhân. |
| ADM-FR-002 | MUST | Admin CRUD user, gán role và khóa/mở tài khoản. |
| ADM-FR-003 | MUST | Admin CRUD Class và quản lý Student membership. |
| ADM-FR-004 | MUST | Admin CRUD Subject và ClassSubject. |
| ADM-FR-005 | MUST | Admin phân công Teacher cho ClassSubject. |
| ADM-FR-006 | MUST | Admin xử lý Feedback/Report theo trạng thái. |
| ADM-FR-007 | MUST | Admin xem audit log có filter/pagination. |
| ADM-FR-008 | MUST | Admin cập nhật settings được allowlist và typed validation. |
| ADM-SEC-001 | MUST | Admin không mặc định đọc Personal Document, chat, Note, plan hoặc Quiz result. |
| ADM-BR-001 | MUST | System settings không chứa secret/token/API key. |

## 3. Dashboard và user contracts

### `GET /api/v1/admin/dashboard`

- **Input:** optional period.
- **Output:** số user theo role/status, class/subject, document theo status, processing failure, feedback pending và safe activity summary.
- **Errors:** `403 ADMIN_REQUIRED`.
- Không trả document content, prompt, answer, Note hoặc result cá nhân.

### `/api/v1/admin/users`

- `POST`: input `{email, username, fullName, role}`; password được set qua activation/reset flow hoặc temporary secret không log.
- `GET`: pagination, role/status/search; output metadata account.
- `GET/PATCH /{userId}`: cập nhật profile quản trị/role theo policy.
- `PATCH /{userId}/status`: input `{status:"ACTIVE|LOCKED"}`; khóa account revoke sessions.
- Errors: `409 EMAIL_OR_USERNAME_EXISTS`; `422 INVALID_ROLE_OR_STATUS`; `409 USER_HAS_ACTIVE_ASSIGNMENT` khi thay role làm hỏng assignment.

## 4. Academic structure contracts

### Classes và membership

- CRUD `/api/v1/admin/classes` với `{code,name,cohort,academicYear,status}`.
- `GET /api/v1/admin/classes/{classId}/students` trả active/inactive membership.
- `POST .../{classId}/students` input `{studentIds:[...]}`; chỉ nhận user role Student; idempotent theo cặp class/student.
- `DELETE .../{classId}/students/{studentId}` chuyển membership inactive; không xóa learning history.
- Errors: `404`; `409 MEMBERSHIP_EXISTS`; `422 USER_NOT_STUDENT`.

### Subject, ClassSubject và assignment

- CRUD `/api/v1/admin/subjects` với code unique.
- CRUD `/api/v1/admin/class-subjects` với `{classId,subjectId,semester,academicYear,status}`.
- `PATCH /api/v1/admin/class-subjects/{id}/teacher` input `{teacherId}`; user phải có role Teacher.
- Unique `(classId, subjectId, semester, academicYear)`.
- Đổi Teacher không chuyển ownership tài liệu; publication cũ cần được review/revoke theo policy.

## 5. Feedback, audit và settings

### Feedback/Report

- `GET /api/v1/admin/feedback-reports`: pagination/filter type/status/date.
- `GET /{id}`: reporter metadata và nội dung report; không tự động kèm dữ liệu cá nhân liên quan.
- `PATCH /{id}`: `{status:"OPEN|IN_PROGRESS|RESOLVED|REJECTED", resolutionNote?}`.
- Mọi transition lưu actor/timestamp.

### Audit

`GET /api/v1/admin/system-logs`

- **Input:** actor, action, targetType, status, from/to, pagination.
- **Output:** actor ID, action, target ID/type, status, trace ID, safe metadata, timestamp.
- **Rule:** không có password, token, prompt, document/chat/note content.

### Settings

- `GET /api/v1/admin/system-settings`: trả allowlisted typed settings.
- `PATCH /api/v1/admin/system-settings/{key}`: input `{value}` theo schema của key.
- Secret/deployment credential không phải system setting và bị từ chối.
- Thay đổi ghi audit trước/after ở dạng safe metadata.

## 6. Acceptance criteria

### ADM-AC-001 — Membership

- **Given** một user role Teacher
- **When** Admin cố thêm user đó vào Class dưới dạng Student
- **Then** Java trả `422 USER_NOT_STUDENT` và không tạo membership.

### ADM-AC-002 — Assignment

- **Given** một ClassSubject hợp lệ
- **When** Admin phân công user role Student làm Teacher
- **Then** Java từ chối và không thay assignment hiện tại.

### ADM-AC-003 — Privacy boundary

- **Given** Admin đã đăng nhập
- **When** Admin thử dùng Student API để đọc Personal Document/chat/plan/Quiz result
- **Then** Java trả `403` hoặc `404` theo policy và không ghi nội dung riêng tư vào audit.

### ADM-AC-004 — Settings secret

- **Given** key không thuộc allowlist hoặc có ý nghĩa secret
- **When** Admin gửi PATCH setting
- **Then** Java trả `422 SETTING_NOT_ALLOWED` và không lưu giá trị.
