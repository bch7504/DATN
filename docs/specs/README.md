# StudyFlow Feature Specifications

Thư mục này chứa specification có thể dùng trực tiếp cho implementation, test và báo cáo đồ án. Bắt đầu từ [`../specification.md`](../specification.md) để đọc phạm vi, kiến trúc và release criteria.

## Thứ tự đọc

1. [`00-functional-catalog.md`](00-functional-catalog.md) — danh mục F-01…F-27, mô tả từ màn hình chung đến màn chi tiết
2. [`01-auth-and-access.md`](01-auth-and-access.md)
3. [`02-student-learning.md`](02-student-learning.md)
4. [`03-personal-ai-and-quiz.md`](03-personal-ai-and-quiz.md)
5. [`04-plan-progress-review.md`](04-plan-progress-review.md) — Dashboard, Study Streak, Daily Goal, Kế hoạch & Lịch và Quiz review
6. [`05-teacher-content.md`](05-teacher-content.md)
7. [`06-admin-operations.md`](06-admin-operations.md)
8. [`07-non-functional.md`](07-non-functional.md)
9. [`08-traceability.md`](08-traceability.md)

## Quy ước sử dụng

- `specification.md` chốt product scope và quyết định xuyên module.
- `00-functional-catalog.md` giải thích chức năng bằng ngôn ngữ người dùng và luồng điều hướng chung → chi tiết.
- Các feature spec `01`–`08` chốt behavior, input/output/error, quyền và acceptance criteria cho implementation/test.
- `api-plan.md` là danh mục contract API tổng hợp.
- `database-plan.md` là nguồn schema/data ownership.
- Khi một quyết định thay đổi, cập nhật feature spec, API/database liên quan và traceability trong cùng task.
