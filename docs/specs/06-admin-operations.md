# Feature Specification — Admin Operations

## 1. Requirements

| ID | Requirement |
|---|---|
| ADM-FR-001 | Xem/lọc tài khoản và quản lý trạng thái; vai trò chỉ đọc, không có thao tác đổi role. |
| ADM-FR-002 | CRUD/activate Subject và Semester. |
| ADM-FR-003 | Giám sát Course Offering theo Teacher/Subject/Semester/status. |
| ADM-FR-004 | Lock/archive Course Offering khi vi phạm hoặc kết thúc vận hành. |
| ADM-FR-005 | Xem feedback, audit metadata và cấu hình an toàn. |
| ADM-FR-006 | Trong Lớp học phần, duyệt yêu cầu mở nhóm lớp đúng môn được phân công của Teacher gửi yêu cầu; từ chối phải có lý do. |
| ADM-FR-007 | Tạo tài khoản Giảng viên bằng họ tên, email, username, mật khẩu ban đầu và một môn đang hoạt động. |
| ADM-FR-008 | Danh sách/chi tiết người dùng hiển thị môn phụ trách của Teacher; Student/Admin không có môn phụ trách Teacher. |
| ADM-BR-001 | Admin duyệt/từ chối yêu cầu mở lớp; lớp được giao đúng Teacher gửi yêu cầu và đúng môn đã phân công, không đổi sang Teacher/môn khác lúc duyệt. |
| ADM-BR-002 | Tài khoản tạo từ chức năng Giảng viên luôn là TEACHER/ACTIVE. Không nâng Student lên Teacher qua sửa role; mỗi Teacher chỉ phụ trách một môn. |
| ADM-PRI-001 | Admin không mặc định xem Personal Document/chat/Note/Quiz answer cá nhân. |

## 2. API chính

- `/api/v1/admin/users`: list/detail; `PATCH /{id}` chỉ sửa trạng thái. Có trường `role` trong request trả `422 ROLE_CHANGE_NOT_ALLOWED`.
- `POST /api/v1/admin/teachers`: `{fullName,email,username,password,subjectId}` → `201 User`; trả môn phụ trách, không trả mật khẩu/hash. Trùng email/username kể cả trùng chéo trả `409`; input sai trả `422`; thiếu đăng nhập/quyền trả `401/403`. Contract đầy đủ ở [SPEC-13](13-admin-teacher-accounts-and-subject-assignment.md) và `api-plan.md`.
- `/api/v1/admin/subjects`: CRUD/activate; code unique.
- `/api/v1/admin/semesters`: CRUD/open/close/archive; date range hợp lệ.
- `GET /api/v1/admin/course-offerings`: filter/pagination, chỉ metadata vận hành.
- `POST /api/v1/admin/course-offerings/{id}/lock` và `/archive`: audit reason theo contract; không hard-delete.
- `/api/v1/admin/feedback-reports`, `/system-logs`, `/system-settings`: không trả nội dung riêng tư hoặc secret.

## 3. Acceptance

- UI/API Admin không có chuyển quyền owner lớp hoặc Student membership CRUD; việc phân công một môn khi tạo Teacher là chức năng tài khoản riêng.
- Lock Course Offering chặn truy cập/publication mới theo policy nhưng không hard-delete history.
- Tạo Teacher và đổi trạng thái có audit actor/target/time, không chứa mật khẩu/token/document/chat content; không có API đổi role.
- Tạo Teacher thành công phải đăng nhập được; dữ liệu thiếu/sai, trùng định danh hoặc môn không hoạt động không tạo tài khoản dở dang.
- Secret setting chỉ nhận write-only/secret manager reference, không trả giá trị hiện tại.
