# StudyFlow Spring Boot Backend

Java backend là system of record và public API duy nhất cho Web. Module dùng Spring Boot 3, Maven và Java 17 trở lên.

## Chạy local

1. Chuẩn bị PostgreSQL và cấu hình `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`.
2. Cấu hình `JWT_SECRET` tối thiểu 32 byte.
3. Cấu hình SMTP qua `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` để gửi OTP đăng ký.
4. Chạy `./mvnw spring-boot:run` (Windows: `mvnw.cmd spring-boot:run`); Flyway sẽ tạo schema `app` và các bảng xác thực.

Đăng ký công khai chỉ nhận email có miền chính xác `ptit.edu.vn`. Tài khoản `STUDENT` chỉ được tạo sau khi xác minh OTP sáu chữ số.

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
| `review` | Free-prompt Quiz, destination, draft review/regenerate, attempt, wrong-answer source và Java scoring |
| `progress`, `study` | Dashboard aggregate, Content Progress, Study Streak, Daily Goal và Study Plan/Calendar |
| `feedback`, `audit`, `settings` | Admin operation và operational metadata |
| `integration.ai`, `integration.storage` | Outbound adapters; không chứa business rule |

Mỗi business module triển khai theo `api → application → domain → infrastructure`. DTO/JPA entity không đi xuyên boundary; public/application method phải có typed contract và Javadoc theo `AGENTS.md`.

## Phần đã triển khai

- Auth/profile: đăng ký email PTIT qua OTP, đăng nhập, refresh/logout, RBAC và hồ sơ cá nhân.
- Study Plan/Calendar: CRUD mềm kế hoạch và nhiệm vụ cá nhân, lịch tuần, kiểm tra trùng giờ, owner scope và learning event idempotent khi hoàn thành task.

Study Plan hoạt động độc lập khi module Course Offering chưa sẵn sàng. Liên kết item với lớp học phần chỉ được bổ sung sau khi có access policy production; không dùng adapter giả để bỏ qua kiểm tra quyền.

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
