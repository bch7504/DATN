# StudyFlow Spring Boot Backend

### Kho tệp PDF local (S3-compatible)

Backend chỉ bật upload khi `STORAGE_ENABLED=true` và có đủ `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`. Có thể dùng SeaweedFS S3 API trên Docker cho môi trường local (endpoint `http://127.0.0.1:8333`, bucket `studyflow-documents`) để thử upload/download qua Java. Chạy `./scripts/storage.ps1 start`, sau đó bật `AI_ALLOW_INSECURE_LOCAL_STORAGE_URL=true` cho cả Java và Python để cho phép signed URL HTTP chỉ trên loopback. Production vẫn bắt buộc HTTPS và phải giữ cờ này ở `false`. Tạo access key và secret key ngẫu nhiên, giữ ngoài repository; đặt cùng giá trị vào container (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) và môi trường chạy backend (`STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`). Đặt `S3_BUCKET=studyflow-documents` cho container để tạo bucket. Khởi động lại backend sau khi thêm biến môi trường; terminal đã mở trước đó có thể cần mở lại để nhận biến mới. Không bật cấu hình local này cho production.

Kho tệp local chỉ nhận kết nối trên `127.0.0.1:8333` và lưu trong Docker named volume `studyflow-object-data`; không xóa volume khi còn cần các PDF đã tải lên. API tải tệp vẫn đi qua Java backend và kiểm tra quyền, không đưa endpoint S3 trực tiếp cho browser.

Java S3 client đặt checksum request/response ở chế độ `WHEN_REQUIRED` để tương thích với kho S3-compatible local; chỉ kiểm tra bằng `curl` không đủ để xác nhận đường upload của Java SDK. Có thể chạy test tích hợp ghi/đọc/xóa tệp tổng hợp bằng cách đặt `STORAGE_INTEGRATION_TEST_ENABLED=true` cùng các biến `STORAGE_*`, rồi chạy `mvnw.cmd "-Dtest=S3AssignmentAttachmentStorageIntegrationTest" test`. Test mặc định bỏ qua khi chưa bật biến này.

## Kiểm thử HTTP và cấu hình trình duyệt

- Chạy riêng kiểm thử HTTP: `./mvnw -Dtest=RealHttpApiTest test` (Windows: `.\mvnw.cmd "-Dtest=RealHttpApiTest" test`). Test khởi động HTTP server trên cổng ngẫu nhiên, dùng dữ liệu tổng hợp và PostgreSQL cách ly bằng Testcontainers; chỉ giả lập gửi email và kho tệp. Cần Docker để chạy test này; không xác nhận kết nối SMTP hay S3 thật.
- Cấu hình `studyflow.cors.allowed-origins` bằng danh sách origin phân cách bởi dấu phẩy. Cấu hình mặc định nhận biến `STUDYFLOW_CORS_ALLOWED_ORIGINS`; kiểm tra profile đang chạy nếu có giá trị ghi đè. Chỉ cho phép origin cụ thể, không dùng `*` với cookie đăng nhập.
- API đổi trạng thái mã lớp nhận `PATCH /api/v1/teacher/course-offerings/{id}/join-code`; API xóa sinh viên khỏi lớp nhận `DELETE /api/v1/teacher/enrollments/{id}`. Giữ các đường dẫn cũ để tương thích; vẫn kiểm tra quyền giảng viên sở hữu lớp.
- Ghi thông báo dùng `ON CONFLICT DO NOTHING` và ràng buộc duy nhất theo người nhận, loại thông báo và nguồn trên PostgreSQL; gửi lại không ghi đè trạng thái đã đọc.
- Kiểm kê endpoint trong test chỉ báo các API còn thiếu so với tài liệu, không coi chúng là đã triển khai. Kiểm thử HTTP không thay thế kiểm thử giao diện đầu cuối.

Java backend là system of record và public API duy nhất cho Web. Module dùng Spring Boot 3, Maven và Java 17 trở lên.

## Chạy local

1. Chuẩn bị PostgreSQL và cấu hình `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`.
2. Cấu hình `JWT_SECRET` tối thiểu 32 byte.
3. Cấu hình SMTP qua `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` để gửi OTP đăng ký và thông báo cho email sinh viên đã đăng ký. Không đưa mật khẩu ứng dụng vào Git.
4. Chạy `./mvnw spring-boot:run` (Windows: `mvnw.cmd spring-boot:run`); Flyway sẽ tạo schema `app` và các bảng xác thực.

Đăng ký công khai chỉ nhận email có miền chính xác `stu.ptit.edu.vn` (không nhận `ptit.edu.vn` hoặc miền con khác). Tài khoản `STUDENT` chỉ được tạo sau khi xác minh OTP sáu chữ số. Nếu môi trường đã đặt `STUDYFLOW_ALLOWED_EMAIL_DOMAIN`, cần đổi giá trị đó thành `stu.ptit.edu.vn` và khởi động lại backend. Tài khoản cũ không bị tự động đổi địa chỉ hoặc khóa đăng nhập.

Profile `dev` cũng dùng PostgreSQL qua cùng các biến `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`; không có CSDL nhúng riêng. Migration Flyway vẫn chạy như cấu hình mặc định.

### Sinh viên mẫu cho lớp học phần (chỉ môi trường dev)

Khi cần kiểm tra danh sách học viên, bài nộp và thống kê, khởi động backend với profile `sample-data` và `STUDYFLOW_DEV_SAMPLE_STUDENTS_ENABLED=true` trên **PostgreSQL local chứa các lớp cần thử**. Profile này chỉ kiểm tra schema hiện có, không chạy migration. Bộ nạp sẽ thêm **12 sinh viên mẫu đã được duyệt vào mỗi lớp hiện có**. Khởi động lại nhiều lần không tạo trùng; lớp tạo sau đó cần khởi động lại backend để được thêm mẫu. Mặc định tính năng **tắt**, và sẽ từ chối PostgreSQL không nằm trên chính máy (`localhost`, `127.0.0.1`, `::1`).

Các tài khoản có tên `Sinh viên mẫu …`, email `@example.invalid` (không gửi được thư) và mật khẩu ngẫu nhiên không được hiển thị/lưu ở dạng rõ. Chúng chỉ phục vụ xem dữ liệu, không đăng nhập như sinh viên thật. Nếu đã xóa/từ chối một đăng ký mẫu, chạy lại sẽ không tự duyệt lại đăng ký đó. Không bật bộ nạp trên dữ liệu cần giữ sạch để nghiệm thu.

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
- Study Plan/Calendar: CRUD kế hoạch cá nhân (archive mềm), lịch tuần, kiểm tra trùng giờ, owner scope và learning event idempotent khi hoàn thành task. Item có thể gắn `courseOfferingId` nếu Student có Enrollment `APPROVED`; không gắn lớp vẫn hợp lệ. API hiển thị `OVERDUE` cho item `TODO` đã qua hạn (trạng thái lưu trong CSDL vẫn là `TODO`), không tự hoàn thành. `DELETE .../items/{itemId}` giữ nghĩa hủy (`CANCELLED`); `DELETE .../items/{itemId}/remove` ẩn mềm (`DELETED`) và giữ lịch sử; `DELETE .../items/{itemId}/permanently` xóa item, completion event, notification history và email outbox trong cùng giao dịch. Email đã gửi không thể thu hồi.
- Deadline reminder: job mặc định quét mỗi 60 giây, tạo thông báo trong ứng dụng trước hạn 24 giờ; bài tập mới công bố cũng tạo thông báo. Mỗi thông báo mới được xếp hàng gửi email tới địa chỉ `@stu.ptit.edu.vn` của Student đang hoạt động, bằng cùng SMTP với OTP. Email quét mỗi 60 giây, lỗi gửi được thử lại tối đa 5 lần; thông báo trong ứng dụng không mất khi email lỗi. Đổi chu kỳ bằng `STUDYFLOW_REMINDER_SCAN_DELAY` và `STUDYFLOW_EMAIL_SCAN_DELAY`. Không gửi tới tài khoản mẫu `@example.invalid`; không gửi push. SMTP chấp nhận thư không bảo đảm thư vào Inbox (có thể vào Spam). Nếu tiến trình dừng ngay sau khi SMTP chấp nhận thư nhưng trước khi lưu trạng thái, lần thử lại có thể gửi trùng một email.
- Teacher nhận thông báo trong ứng dụng khi có yêu cầu tham gia lớp, bài nộp lần đầu, PDF tải lên kho riêng/công bố/thu hồi và bài tập được giao/hết hạn. Student nhận thông báo bài mới, nhắc hạn, hết hạn nếu chưa nộp, xác nhận nộp, học liệu công bố/thu hồi và thay đổi trạng thái ghi danh. Upload PDF vào kho riêng không báo Student. Mỗi sự kiện có khóa chống trùng; Student đủ điều kiện được xếp hàng email, Teacher chỉ nhận trong ứng dụng. API `/api/v1/teacher/notifications` chỉ trả bản ghi thuộc tài khoản Teacher đang hoạt động; đánh dấu đã đọc qua `PATCH .../{notificationId}/read`.
- Course Assignment: Teacher giao bài theo lớp, Student nộp câu trả lời hoặc tối đa 5 tệp PDF/ảnh JPG/PNG/Office; file được kiểm tra định dạng/dung lượng, lưu riêng tư trong S3-compatible storage và chỉ tải qua endpoint Java có kiểm tra quyền. Nộp lại thay thế bài và toàn bộ tệp cũ, không giữ lịch sử; tệp cũ được đưa vào hàng đợi xóa sau khi bài mới lưu thành công (chu kỳ mặc định 60 giây, tùy chỉnh bằng `STUDYFLOW_ASSIGNMENT_ATTACHMENT_CLEANUP_DELAY`). Nhắc hạn chỉ gửi trước hạn cho Student chưa nộp. Báo cáo tính mọi Student hiện đã được duyệt vào lớp và chia đúng hạn/muộn/chưa nộp; người được duyệt sau hạn mà chưa nộp vẫn nằm trong nhóm chưa nộp. Không có chức năng chấm điểm bài tập; các cột điểm cũ trong CSDL được giữ nguyên để tránh xóa dữ liệu lịch sử. Cấu hình `STORAGE_ENABLED=true` cùng các biến `STORAGE_*` để bật upload; khi chưa cấu hình, backend vẫn khởi động nhưng endpoint upload trả `503 STORAGE_NOT_CONFIGURED`.
- Course Material: Teacher lưu PDF có text layer (tối đa 20 MB) vào kho riêng. Tệp đi qua `PENDING_PROCESSING → PROCESSING → READY|FAILED`; chỉ tệp `READY` mới được công bố hoặc dùng Tutor/Quiz. Teacher công bố/gỡ công bố theo lớp mình sở hữu; Student đã được duyệt mới xem/tải và dùng Tutor. Cấu hình `STORAGE_ENABLED=true` cùng các biến `STORAGE_*`; khi chưa bật, API trả `503 STORAGE_NOT_CONFIGURED`, không tạo dữ liệu mẫu.
- Personal Document và Personal Assistant: Student upload PDF text-layer thuộc riêng mình, theo dõi trạng thái lập chỉ mục, chọn 1–10 tệp `READY` để hỏi đáp, tóm tắt hoặc yêu cầu tạo Quiz trong cùng khu vực Tài liệu cá nhân. Java kiểm owner/scope, lưu hội thoại và kiểm lại citation/Quiz trước khi lưu.
- AI Quiz: Student có thể sinh từ form hoặc trong Personal Assistant; Teacher sinh từ Course Material theo lớp, số câu, độ khó, chủ đề và khoảng trang. Java chỉ lưu draft đúng `MCQ_SINGLE` với 4 phương án/câu, citation nằm trong phạm vi được cấp; Student phải chấp nhận và Teacher phải công bố trước khi sử dụng.

Study Plan vẫn hoạt động độc lập khi không chọn lớp học phần. Liên kết tùy chọn với Course Offering được Java kiểm tra bằng Enrollment `APPROVED`; không dùng adapter giả để bỏ qua kiểm tra quyền.

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
- Course Material: Teacher upload/public PDF text-layer; Student `APPROVED` xem/tải và dùng AI Tutor qua Java. Page Note và view event vẫn là phần chưa nối trong module hiện tại.
- Personal Document: PDF text-layer thuộc Student owner; Personal Assistant/RAG đã đi qua Java và tách khỏi Teacher materials.
- Java xác minh scope trước khi gọi Python, kiểm lại citation/Quiz output và sở hữu Quiz lifecycle/scoring/progress.
- Java không đọc/ghi schema `ai` hoặc vector.

## Tài liệu triển khai

- [Kế hoạch Backend](../../docs/backend-implementation-plan.md)
- [API contract](../../docs/api-plan.md)
- [Database plan](../../docs/database-plan.md)
- [Low-level design](../../docs/low-level-design.md)

Khi bắt đầu BE-M0, thay các package marker `classroom`/`subject` cũ bằng target packages trong kế hoạch bằng migration source rõ ràng; không giữ đồng thời hai mô hình nghiệp vụ.
