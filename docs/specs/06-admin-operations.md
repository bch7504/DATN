# Feature Specification — Admin Operations

## 1. Requirements

| ID | Requirement |
|---|---|
| ADM-FR-001 | Quản lý User, Role và trạng thái tài khoản. |
| ADM-FR-002 | CRUD/activate Subject và Semester. |
| ADM-FR-003 | Giám sát Course Offering theo Teacher/Subject/Semester/status. |
| ADM-FR-004 | Lock/archive Course Offering khi vi phạm hoặc kết thúc vận hành. |
| ADM-FR-005 | Xem feedback, audit metadata và cấu hình an toàn. |
| ADM-BR-001 | Admin không tạo/duyệt từng lớp hoặc phân công Teacher trong MVP. |
| ADM-PRI-001 | Admin không mặc định xem Personal Document/chat/Note/Quiz answer cá nhân. |

## 2. API chính

- `/api/v1/admin/users`: list/detail/status/role với validation role transition.
- `/api/v1/admin/subjects`: CRUD/activate; code unique.
- `/api/v1/admin/semesters`: CRUD/open/close/archive; date range hợp lệ.
- `GET /api/v1/admin/course-offerings`: filter/pagination, chỉ metadata vận hành.
- `PATCH /api/v1/admin/course-offerings/{id}/status`: `{status:"LOCKED|ARCHIVED",reason}`; audit bắt buộc.
- `/api/v1/admin/feedback`, `/audit-logs`, `/settings`: không trả nội dung riêng tư/secret.

## 3. Acceptance

- UI/API Admin không có Teacher assignment hoặc Student membership CRUD.
- Lock Course Offering chặn truy cập/publication mới theo policy nhưng không hard-delete history.
- Role/status thay đổi có audit actor/target/time/reason, không chứa token/document/chat content.
- Secret setting chỉ nhận write-only/secret manager reference, không trả giá trị hiện tại.
