# StudyFlow Spring Boot Backend

Java backend là system of record và public API duy nhất cho Web. Backend chưa được scaffold dependency; thư mục hiện tại chỉ đánh dấu boundary cho giai đoạn triển khai sau.

## Module đích

| Package | Trách nhiệm |
|---|---|
| `auth`, `user` | JWT/session, RBAC, account status |
| `academic` | Subject và Semester |
| `courseoffering` | Teacher tự tạo lớp, join-code lifecycle, lock/archive |
| `enrollment` | Student request, Teacher approve/reject, access policy |
| `document`, `publication` | Teacher/Personal metadata, upload, public/revoke theo Course Offering |
| `slide`, `note` | Slide artifact access, view event và Note |
| `conversation` | Personal RAG conversation/history và citation record |
| `review` | Quiz draft review, attempt, answer và Java scoring |
| `progress`, `study` | Dashboard aggregate, Content Progress, Study Streak, Daily Goal và Study Plan/Calendar |
| `feedback`, `audit`, `settings` | Admin operation và operational metadata |
| `integration.ai`, `integration.storage` | Outbound adapters; không chứa business rule |

Mỗi business module triển khai theo `api → application → domain → infrastructure`. DTO/JPA entity không đi xuyên boundary; public/application method phải có typed contract và Javadoc theo `AGENTS.md`.

## Quy tắc

- Teacher hợp lệ tự tạo Course Offering từ Subject + Semester active; Admin quản lý catalog và giám sát, không phân công từng lớp.
- Teacher owner quản lý join code, duyệt Enrollment và public document vào lớp mình sở hữu.
- Student chỉ truy cập materials/Tutor khi Enrollment `APPROVED` hoặc historical policy cho phép.
- Teacher PPTX: Viewer + Note + Tutor, không tải file gốc. Teacher PDF: chỉ download, không AI.
- Personal Document: PDF text-layer thuộc Student owner; Personal RAG tách khỏi Teacher materials.
- Java xác minh scope trước khi gọi Python, kiểm lại citation/Quiz output và sở hữu Quiz lifecycle/scoring/progress.
- Java không đọc/ghi schema `ai` hoặc vector.

## Tài liệu triển khai

- [Kế hoạch Backend](../../docs/backend-implementation-plan.md)
- [API contract](../../docs/api-plan.md)
- [Database plan](../../docs/database-plan.md)
- [Low-level design](../../docs/low-level-design.md)

Khi bắt đầu BE-M0, thay các package marker `classroom`/`subject` cũ bằng target packages trong kế hoạch bằng migration source rõ ràng; không giữ đồng thời hai mô hình nghiệp vụ.
