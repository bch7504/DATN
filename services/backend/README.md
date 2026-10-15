# StudyFlow Spring Boot Backend

## Kiểm thử HTTP và cấu hình trình duyệt

- Chạy riêng kiểm thử HTTP: `./mvnw -Dtest=RealHttpApiTest test` (Windows: `.\mvnw.cmd "-Dtest=RealHttpApiTest" test`). Test khởi động HTTP server trên cổng ngẫu nhiên, dùng dữ liệu tổng hợp và H2; chỉ giả lập gửi email và kho tệp. Không xác nhận kết nối SMTP, S3 hay PostgreSQL thật.
- Cấu hình `studyflow.cors.allowed-origins` bằng danh sách origin phân cách bởi dấu phẩy. Cấu hình mặc định nhận biến `STUDYFLOW_CORS_ALLOWED_ORIGINS`; kiểm tra profile đang chạy nếu có giá trị ghi đè. Chỉ cho phép origin cụ thể, không dùng `*` với cookie đăng nhập.
- API đổi trạng thái mã lớp nhận `PATCH /api/v1/teacher/course-offerings/{id}/join-code`; API xóa sinh viên khỏi lớp nhận `DELETE /api/v1/teacher/enrollments/{id}`. Giữ các đường dẫn cũ để tương thích; vẫn kiểm tra quyền giảng viên sở hữu lớp.
- Ghi thông báo dùng `ON CONFLICT DO NOTHING` và ràng buộc duy nhất theo người nhận, loại thông báo và nguồn. H2 ở chế độ PostgreSQL và PostgreSQL đều chống tạo trùng; gửi lại không ghi đè trạng thái đã đọc.
- Kiểm kê endpoint trong test chỉ báo các API còn thiếu so với tài liệu, không coi chúng là đã triển khai. Kiểm thử HTTP không thay thế kiểm thử giao diện đầu cuối.

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
- Deadline reminder: job mặc định quét mỗi 60 giây, tạo một thông báo trong ứng dụng trước hạn 24 giờ và cung cấp API danh sách/đánh dấu đã đọc. Có thể đổi chu kỳ bằng `STUDYFLOW_REMINDER_SCAN_DELAY` sau khi khai báo mapping cấu hình triển khai; không gửi email/push trong MVP.
- Course Assignment: Teacher giao bài theo lớp, Student nộp câu trả lời hoặc tối đa 5 tệp PDF/ảnh JPG/PNG/Office; file được kiểm tra định dạng/dung lượng, lưu riêng tư trong S3-compatible storage và chỉ tải qua endpoint Java có kiểm tra quyền. Cấu hình `STORAGE_ENABLED=true` cùng các biến `STORAGE_*` để bật upload; khi chưa cấu hình, backend vẫn khởi động nhưng endpoint upload trả `503 STORAGE_NOT_CONFIGURED`.
- Course Material: Teacher lưu PDF có text layer (tối đa 20 MB) vào kho riêng, công bố/gỡ công bố theo lớp mình sở hữu; Student đã được duyệt mới xem/tải được. Cấu hình `STORAGE_ENABLED=true` cùng các biến `STORAGE_*`; khi chưa bật, API trả `503 STORAGE_NOT_CONFIGURED`, không tạo dữ liệu mẫu.

Study Plan hoạt động độc lập khi module Course Offering chưa sẵn sàng. Liên kết item với lớp học phần chỉ được bổ sung sau khi có access policy production; không dùng adapter giả để bỏ qua kiểm tra quyền.

## Kiểm tra luồng học liệu và giới hạn tải lên

- Công bố học liệu kiểm tra toàn bộ lớp được chọn trước khi cập nhật. Gửi lại cùng danh sách không đổi thời điểm công bố; danh sách rỗng gỡ công bố khỏi mọi lớp, còn danh sách `null` bị từ chối.
- Mỗi lần sinh viên tải học liệu đều kiểm tra lại đăng ký đã được duyệt, công bố còn hiệu lực và lớp không bị khóa. Thu hồi công bố chặn yêu cầu tải mới; không thu hồi được bản PDF người dùng đã tải trước đó.
- Nếu giao dịch lưu thông tin PDF bị hủy, hệ thống thử xóa tệp vừa tải lên. Không xóa khi kết quả giao dịch chưa xác định; khi dọn tệp thất bại, cần đối soát tệp dư với kho lưu trữ. Lỗi dọn tệp không che mất lỗi cơ sở dữ liệu ban đầu.
- Giới hạn multipart chung: 20 MiB/tệp, 26 MiB/yêu cầu để đủ phần bao gói cho bài nộp tổng 25 MiB. Bộ kiểm tra của bài tập vẫn giới hạn 10 MiB/tệp và tối đa 5 tệp; học liệu nhận một PDF tối đa 20 MiB.
- Kiểm thử Java: `./mvnw test` (Windows: `.\mvnw.cmd test`). Các ca kiểm tra học liệu dùng PDF tổng hợp và kho lưu trữ giả lập trong test, không thay thế việc kiểm tra tải tệp thực trên môi trường triển khai.

## Quy tắc

- Teacher hợp lệ tự tạo Course Offering từ Subject + Semester active; Admin quản lý catalog và giám sát, không phân công từng lớp.
- Teacher owner quản lý join code, duyệt Enrollment và public document vào lớp mình sở hữu.
- Student chỉ truy cập materials/Tutor khi Enrollment `APPROVED` hoặc historical policy cho phép.
- Course Material: Teacher upload/public PDF text-layer; Student `APPROVED` xem/tải qua Java. Page Note, view event và AI Tutor là contract đích nhưng chưa được triển khai trong module này.
- Personal Document: PDF text-layer thuộc Student owner; Personal RAG tách khỏi Teacher materials.
- Java xác minh scope trước khi gọi Python, kiểm lại citation/Quiz output và sở hữu Quiz lifecycle/scoring/progress.
- Java không đọc/ghi schema `ai` hoặc vector.

## Tài liệu triển khai

- [Kế hoạch Backend](../../docs/backend-implementation-plan.md)
- [API contract](../../docs/api-plan.md)
- [Database plan](../../docs/database-plan.md)
- [Low-level design](../../docs/low-level-design.md)

Khi bắt đầu BE-M0, thay các package marker `classroom`/`subject` cũ bằng target packages trong kế hoạch bằng migration source rõ ràng; không giữ đồng thời hai mô hình nghiệp vụ.
