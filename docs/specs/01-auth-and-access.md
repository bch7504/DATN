# Feature Specification — Auth và Access Control

## 1. Mục tiêu

Cung cấp đăng ký Student, đăng nhập, session rotation, profile và kiểm soát quyền thống nhất cho Web/API.

## 2. Functional requirements

| ID | Priority | Requirement |
|---|---|---|
| AUTH-FR-001 | MUST | Người dùng chưa đăng nhập được tự đăng ký tài khoản role `STUDENT`. |
| AUTH-FR-002 | MUST | User đăng nhập bằng email/username và password khi account `ACTIVE`. |
| AUTH-FR-003 | MUST | Access token ngắn hạn và refresh token rotation được dùng cho session. |
| AUTH-FR-004 | MUST | User xem và cập nhật các trường profile được phép. |
| AUTH-FR-005 | MUST | Logout thu hồi refresh token hiện tại. |
| AUTH-BR-001 | MUST | Public registration không được chọn `TEACHER` hoặc `ADMIN`. |
| AUTH-BR-002 | MUST | Account bị khóa không đăng nhập hoặc refresh session. |
| AUTH-SEC-001 | MUST | Password và refresh token chỉ lưu dạng hash. |

## 3. Public API contracts

### `POST /api/v1/auth/register`

- **Args/input:** `email`, `username`, `password`, `fullName`; tất cả bắt buộc. Email/username unique; password 8–72 ký tự.
- **Output:** `201` với `{userId, email, username, fullName, role:"STUDENT", status:"ACTIVE"}`.
- **Errors:** `409 EMAIL_ALREADY_EXISTS|USERNAME_ALREADY_EXISTS`; `422 VALIDATION_ERROR`.
- **Side effect:** tạo user Student và audit `USER_REGISTERED`; không tự thêm vào Class.

### `POST /api/v1/auth/login`

- **Args/input:** `{identifier, password}`.
- **Output:** `200` với `{accessToken, expiresIn, user}`; refresh token nằm trong cookie HttpOnly/Secure/SameSite.
- **Errors:** `401 INVALID_CREDENTIALS`; `403 ACCOUNT_LOCKED`.
- **Side effect:** tạo refresh token hash và audit login thành công/thất bại ở mức metadata an toàn.

### `POST /api/v1/auth/refresh`

- **Args/input:** refresh cookie còn hạn và chưa revoke.
- **Output:** `200` với access token mới và refresh cookie mới.
- **Errors:** `401 INVALID_REFRESH_TOKEN|REFRESH_TOKEN_REUSED`.
- **Side effect:** revoke token cũ, liên kết `replacedById`; reuse detection thu hồi token family.

### `POST /api/v1/auth/logout`

- **Args/input:** session hiện tại.
- **Output:** `204` không body.
- **Errors:** thao tác idempotent; token đã revoke vẫn trả `204`.
- **Side effect:** revoke refresh token và xóa cookie.

### `GET/PATCH /api/v1/me`

- **Args/input PATCH:** các trường cho phép gồm `fullName`; không nhận role/status.
- **Output:** `200` với profile hiện tại.
- **Errors:** `401 UNAUTHENTICATED`; `422 VALIDATION_ERROR`.

## 4. Authorization contract

- Java filter xác thực token; application service kiểm ownership/membership/assignment.
- Client không được tự truyền role để nâng quyền.
- Admin thay đổi role/status qua Admin API riêng; thay đổi status sang locked phải revoke session.
- Tài nguyên ngoài scope ưu tiên trả `404 RESOURCE_NOT_FOUND` để tránh enumeration.

## 5. Acceptance criteria

### AUTH-AC-001 — Đăng ký Student

- **Given** email và username chưa tồn tại
- **When** người dùng gửi registration hợp lệ
- **Then** hệ thống tạo account `STUDENT/ACTIVE`, không tạo Class membership và không cho client chọn role khác.

### AUTH-AC-002 — Khóa tài khoản

- **Given** Admin khóa một user đang có refresh token
- **When** user gọi refresh hoặc đăng nhập lại
- **Then** Java từ chối, thu hồi session và trả error không chứa thông tin nhạy cảm.

### AUTH-AC-003 — Refresh rotation

- **Given** refresh token hợp lệ
- **When** token được dùng lần đầu
- **Then** token cũ bị revoke và token mới được phát hành; lần dùng lại token cũ bị phát hiện.
