# Feature Specification — Authentication và Access Control

## 1. Requirements

| ID | Requirement |
|---|---|
| AUT-FR-001 | Đăng nhập/refresh/logout qua Java; browser không gọi Python. |
| AUT-FR-002 | Role gồm `STUDENT`, `TEACHER`, `ADMIN`; đăng ký công khai chỉ tạo Student. |
| AUT-FR-003 | Java kiểm role, ownership, Course Offering ownership, Enrollment và publication cho từng resource. |
| AUT-FR-004 | Student chỉ truy cập lớp/material khi enrollment `APPROVED` hoặc historical access policy cho phép. |
| AUT-FR-005 | Internal AI request dùng service credential và authorized scope, không chuyển JWT người dùng nếu không cần. |

## 2. Contract

- `POST /api/v1/auth/register`: `{displayName,email,password}` → `204`; Java tạo Student, không tạo enrollment.
- `POST /api/v1/auth/login`: `{identifier,password}` → `204` và session cookie an toàn.
- `POST /api/v1/auth/refresh`: refresh cookie hợp lệ → rotate token, trả `204`.
- `POST /api/v1/auth/logout`: revoke current refresh session, idempotent, trả `204`.
- `GET /api/v1/me`: trả `{id,displayName,email,role}`.

Lỗi dùng envelope `{code,message,details,traceId}`. Không phân biệt email tồn tại ở response đăng nhập; không log password/token.

## 3. Acceptance

- Student không thể tự chọn Teacher/Admin khi đăng ký.
- Student `PENDING/REJECTED` nhận `404/403` theo policy và không có signed URL.
- Teacher A không sửa lớp/publication/enrollment của Teacher B.
- Admin giám sát/lock/archive nhưng không thấy Personal Document/chat/Note riêng tư.
- Python từ chối request thiếu service credential/schema version/scope.
