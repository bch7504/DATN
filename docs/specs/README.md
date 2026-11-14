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
10. [`09-current-project-status.md`](09-current-project-status.md) — ảnh chụp hiện trạng dự án tại ngày 11/11/2026
11. [`10-course-material-supporting-sources.md`](10-course-material-supporting-sources.md) — bảng chọn nhiều học liệu và luồng Slide Tutor dùng nguồn hỗ trợ
12. [`11-course-tutor-live-completion.md`](11-course-tutor-live-completion.md) — hoàn thiện fallback tuần tự, kiểm quyền sau AI và nghiệm thu tài liệu Kỹ thuật số thật
13. [`12-course-opening-approval-and-library-management.md`](12-course-opening-approval-and-library-management.md) — lịch sử lần 13/11: duyệt mở lớp và quản lý tài liệu; quy tắc tự nhập môn được thay bởi SPEC-13
14. [`13-admin-teacher-accounts-and-subject-assignment.md`](13-admin-teacher-accounts-and-subject-assignment.md) — Admin tạo Giảng viên, phân công một môn, bỏ đổi role; thay quy tắc nhập môn tự do của lần trước
15. [`14-supabase-shared-data-plan.md`](14-supabase-shared-data-plan.md) — phương án PostgreSQL/pgvector và Storage dùng chung qua Supabase; chưa triển khai, để thực hiện lần sau

## Quy ước sử dụng

- `specification.md` chốt product scope và quyết định xuyên module.
- `00-functional-catalog.md` giải thích chức năng bằng ngôn ngữ người dùng và luồng điều hướng chung → chi tiết.
- Các feature spec `01`–`08` chốt behavior, input/output/error, quyền và acceptance criteria cho implementation/test.
- `api-plan.md` là danh mục contract API tổng hợp.
- `database-plan.md` là nguồn schema/data ownership.
- Khi một quyết định thay đổi, cập nhật feature spec, API/database liên quan và traceability trong cùng task.

## Quy ước spec theo lần thực hiện

- Các file `00`–`08` là bộ đặc tả nền, mô tả chức năng và quy tắc ổn định của hệ thống.
- Từ `09` trở đi, mỗi file spec tương ứng với **một lần triển khai hoặc một nhóm thay đổi có cùng mục tiêu**; không dùng file mới để chép lại toàn bộ đặc tả nền.
- Mỗi spec theo lần thực hiện phải ghi ngày chốt, mục tiêu, hiện trạng ban đầu, phạm vi thay đổi, kết quả kiểm tra, phần chưa hoàn thành và việc bàn giao tiếp theo.
- Trạng thái `Đã có mã` không đồng nghĩa với `Đã nghiệm thu`. Chỉ ghi `Đã kiểm tra` khi có lệnh, endpoint hoặc kịch bản kiểm thử cụ thể trong chính lần thực hiện đó.
- Khi bắt đầu một lần thay đổi mới, tạo spec số tiếp theo thay vì sửa lịch sử của lần trước; chỉ sửa spec cũ để đính chính sai sót thực tế.
- Quyết định hiện hành về tài khoản Teacher, môn phụ trách và kho riêng nằm trong SPEC-13; các spec nền `00`, `01`, `05`, `06`, `08` đã đồng bộ theo quyết định này. Kết quả kiểm tra và việc còn lại được ghi riêng trong SPEC-13.
