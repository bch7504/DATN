# StudyFlow Feature Specifications

Thư mục này chứa specification có thể dùng trực tiếp cho implementation, test và báo cáo đồ án. Bắt đầu từ [`../specification.md`](../specification.md) để đọc phạm vi, kiến trúc và release criteria.

## Thứ tự đọc

1. [`01-auth-and-access.md`](01-auth-and-access.md)
2. [`02-student-learning.md`](02-student-learning.md)
3. [`03-personal-ai-and-quiz.md`](03-personal-ai-and-quiz.md)
4. [`04-plan-progress-review.md`](04-plan-progress-review.md) — Dashboard, Study Streak, Daily Goal, Study Plan và Quiz review
5. [`05-teacher-content.md`](05-teacher-content.md)
6. [`06-admin-operations.md`](06-admin-operations.md)
7. [`07-non-functional.md`](07-non-functional.md)
8. [`08-traceability.md`](08-traceability.md)

## Quy ước sử dụng

- `specification.md` chốt product scope và quyết định xuyên module.
- Feature spec chốt behavior, input/output/error, quyền và acceptance criteria.
- `api-plan.md` là danh mục contract API tổng hợp.
- `database-plan.md` là nguồn schema/data ownership.
- Khi một quyết định thay đổi, cập nhật feature spec, API/database liên quan và traceability trong cùng task.
