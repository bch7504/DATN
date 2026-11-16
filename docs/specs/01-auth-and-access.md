# Feature Specification — Authentication và Access Control

## 1. Requirements

| ID | Requirement |
|---|---|
| AUT-FR-001 | Đăng nhập/refresh/logout qua Java; browser không gọi Python. |
| AUT-FR-002 | Role gồm `STUDENT`, `TEACHER`, `ADMIN`; đăng ký công khai chỉ tạo Student. |
| AUT-FR-003 | Java kiểm role, ownership, Course Offering ownership, Enrollment và publication cho từng resource. |
| AUT-FR-004 | Student chỉ truy cập lớp/material khi enrollment `APPROVED` hoặc historical access policy cho phép. |
| AUT-FR-005 | Internal AI request dùng service credential và authorized scope, không chuyển JWT người dùng nếu không cần. |
| AUT-FR-006 | Chỉ Admin tạo tài khoản Teacher qua chức năng riêng và phân công đúng một môn; không dùng sửa vai trò để tạo Teacher. |
| AUT-BR-001 | Vai trò tài khoản không được đổi qua API sửa người dùng. Teacher chỉ gửi yêu cầu mở lớp thuộc môn đã phân công; quyền đọc/sửa tài nguyên vẫn kiểm theo owner và lớp. |
| AUT-BR-002 | Student/Teacher dùng email đầy đủ làm username; Admin giữ username riêng. Không tự nối đuôi email khi đăng nhập. |

## 2. Contract

- `POST /api/v1/auth/register`: `{displayName,email,password}` → `202 VERIFICATION_REQUIRED`; chỉ nhận đúng miền `stu.ptit.edu.vn` theo cấu hình. Sau verify OTP mới tạo Student, username bằng email đầy đủ, không tạo enrollment.
- `POST /api/v1/auth/login`: `{identifier,password}` → `204` và session cookie an toàn.
- `POST /api/v1/auth/refresh`: refresh cookie hợp lệ → rotate token, trả `204`.
- `POST /api/v1/auth/logout`: revoke current refresh session, idempotent, trả `204`.
- `GET /api/v1/me`: trả `{id,displayName,email,username,timeZone,role}`.
- `POST /api/v1/admin/teachers`: Admin tạo Teacher với `{fullName,email,username,password,subjectId}` → `201`; response không có mật khẩu/hash. Chi tiết validation và lỗi ở [SPEC-13](13-admin-teacher-accounts-and-subject-assignment.md).
- `PATCH /api/v1/admin/users/{id}`: chỉ sửa trạng thái; gửi `role` bị từ chối với `422 ROLE_CHANGE_NOT_ALLOWED`.
- `GET /api/v1/teacher/subject`: chỉ trả môn được phân công cho Teacher đang đăng nhập; thiếu phân công trả `409` và không cho mở lớp.

Lỗi dùng envelope `{code,message,details,traceId}`. Không phân biệt email tồn tại ở response đăng nhập; không log password/token.

Quyết định username đầy đủ cho Student/Teacher và chuyển tài khoản hiện có ở [SPEC-16](16-full-email-account-usernames.md). Login vẫn tra email hoặc username đã lưu; không áp miền sinh viên cho Giảng viên/Admin. Email Teacher do Admin tạo được kiểm định dạng/trùng/độ dài, không thêm khóa miền Teacher trong lần này.

## 3. Acceptance

- Student không thể tự chọn Teacher/Admin khi đăng ký.
- Student/Teacher không tạo được tài khoản Giảng viên; sửa request để đổi role hoặc mở lớp môn khác cũng bị Java từ chối.
- Student `PENDING/REJECTED` nhận `404/403` theo policy và không có signed URL.
- Teacher A không sửa lớp/publication/enrollment của Teacher B.
- Admin giám sát/lock/archive nhưng không thấy Personal Document/chat/Note riêng tư.
- Python từ chối request thiếu service credential/schema version/scope.
