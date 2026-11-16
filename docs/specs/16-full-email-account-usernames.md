# SPEC-16 — Tên đăng nhập đầy đủ email cho Sinh viên và Giảng viên

Ngày thực hiện: 16/11/2026. Trạng thái: **đã áp dụng V33 trên Supabase, khởi động lại Backend và kiểm tra đăng nhập email đầy đủ đạt**.

## Yêu cầu và phạm vi

Sếp yêu cầu username sinh viên có đầy đủ đuôi email, sau đó bổ sung áp dụng cả giảng viên. Sếp đã cho phép cập nhật script kiểm tra và specs liên quan ngoài Backend.

- Sinh viên A–J: username/email `student.a@stu.ptit.edu.vn` đến `student.j@stu.ptit.edu.vn`.
- Giảng viên A–G: username/email `teacher.a@ptit.edu.vn` đến `teacher.g@ptit.edu.vn`; Giảng viên C vẫn phụ trách Kỹ thuật số.
- Chuẩn hóa Student/Teacher hiện có bằng email đang lưu, không thay email của tài khoản cũ hoặc tự khóa tài khoản theo miền.
- Admin giữ username hiện tại như `admin.local`. Không thêm vai trò, thay môn hoặc tạo lại tài khoản.
- Giữ UUID, mật khẩu, lớp, ghi chú, hội thoại, Quiz và tài nguyên. Chỉ refresh token của tài khoản thực sự đổi username bị thu hồi; người dùng đăng nhập lại bằng email.

## S16-01 — Backend tạo tài khoản mới

`UserAccount.verifiedStudent` dùng email đầy đủ đã được Auth service chuẩn hóa/kiểm tra làm username; không cắt phần sau `@` nữa. Student vẫn chỉ được tạo sau OTP hợp lệ.

Teacher do Admin tạo cũng lưu username bằng email chuẩn hóa. Contract `POST /admin/teachers` giữ field `username` để tương thích form hiện có: chấp nhận tên ngắn kiểu cũ hoặc email trùng email tài khoản; output luôn trả username là email. Nếu gửi một email khác trong username, trả `422 INVALID_TEACHER_ACCOUNT` trước khi băm mật khẩu hoặc lưu. Teacher vẫn có đúng một môn và không được tạo bằng cách đổi role Student.

Các bộ nạp opt-in local cập nhật email đầy đủ, nhận lại định danh ngắn cũ để đổi tại chỗ thay vì tạo trùng; không reset mật khẩu/tài nguyên. Bộ nạp vẫn tắt trên runtime Supabase.

## S16-02 — Migration và dữ liệu hiện có

Migration tiến `V33__use_full_email_for_account_usernames.sql`:

1. Kiểm xung đột username mới với một tài khoản khác, không gộp hoặc ghi đè tài khoản.
2. Mở rộng `users.username` từ 100 lên 254 ký tự; đồng bộ mapping JPA.
3. Đổi username Student/Teacher bằng email hiện có, không sửa ID/email/password/role.
4. Thu hồi refresh token chưa thu hồi của đúng tài khoản đổi tên.

Xung đột làm toàn bộ migration rollback. Không sửa migration đã chạy. Không chạy lại lệnh copy/reset Supabase để đổi tên tài khoản. Dùng `scripts/supabase_schema_migrate.py` với admin config đã được cấp quyền để chạy Flyway có điều phối; runtime vẫn không được cấp quyền nâng schema.

## S16-03 — Backend đang kiểm tra email ở đâu

- Đăng ký/verify/resend Student: kiểm miền chính xác `stu.ptit.edu.vn` theo cấu hình, không phân biệt hoa thường; Gmail, `@ptit.edu.vn` và miền con giả bị từ chối `422 EMAIL_DOMAIN_NOT_ALLOWED`.
- Đăng ký kiểm định dạng/độ dài bằng DTO trước khi xử lý OTP; chưa xác minh không tạo tài khoản.
- Đăng nhập: nhận email hoặc username đã lưu cùng mật khẩu, không tự nối `@...` cho tên ngắn. Tài khoản sai trả lỗi đăng nhập chung; không tiết lộ tài khoản có tồn tại hay không.
- Giảng viên do Admin tạo: kiểm định dạng email, độ dài và trùng định danh. Lần này không thêm quy tắc bắt buộc miền Teacher; các tài khoản demo A–G đã có `@ptit.edu.vn`.

Contract cập nhật tại [API plan](../api-plan.md), [Auth spec](01-auth-and-access.md), [Admin spec](06-admin-operations.md) và [Database plan](../database-plan.md). Không đổi route, cookie schema, internal AI contract hoặc Frontend source.

## Kiểm tra

- `AuthServiceTest`, `AuthControllerTest`: kiểm miền đúng/sai, OTP và username Student mới bằng email.
- `TeacherAccountServiceTest`, `AdminControllerTest`: input hợp lệ, lỗi và username Teacher canonical.
- `LocalStudentAccountsBootstrapTest`: tạo tài khoản local bằng username email, không băm/lưu khi input sai hoặc định danh trùng.
- `AccountUsernameMigrationIntegrationTest`: PostgreSQL Testcontainers tổng hợp; kiểm cả hai vai trò đổi username, Admin giữ nguyên, UUID/password giữ nguyên, refresh token bị thu hồi, cột đủ 254, chạy lại không có thay đổi và xung đột rollback.
- `RealHttpApiTest#adminCreatesTeacherAndSubjectCannotBeBypassed`: HTTP/PostgreSQL cách ly đạt; Admin tạo tài khoản username=email và đăng nhập được, giữ RBAC và kiểm môn.
- Script smoke Supabase đã đổi sang email đầy đủ để tiếp tục dùng được với dữ liệu mới.
- Supabase báo version Flyway `33`, chuẩn hóa 28 tài khoản Student/Teacher; không còn username ngắn ở hai vai trò. Con số gồm 17 tài khoản A–G/A–J theo yêu cầu, 8 tài khoản E2E cũ và 3 tài khoản local/StudyFlow cũ; không tạo thêm 28 tài khoản và không tính Admin. Migration áp dụng theo role toàn bộ dữ liệu đang có, không chỉ 17 demo mới.
- Smoke thực tế đạt: đăng nhập đủ 7 Teacher, 10 Student demo và Admin; `/me.username` bằng email; Teacher C vẫn đúng KTS; tải đủ 9 PDF, Viewer/Note/history `200`, Student ngoài lớp vẫn `403`, Web login `200`.
- Kiểm tra trực tiếp: tên ngắn `student.a`/`teacher.c` và hai email sai đuôi khi login đều `401`; email Student đầy đủ viết hoa vẫn đăng nhập `204`; bốn miền đăng ký Student sai trả `422 EMAIL_DOMAIN_NOT_ALLOWED`, không tạo tài khoản/OTP.

## Bàn giao

- Runtime đang dùng Supabase; đăng nhập bằng email đầy đủ. Phiên refresh cũ của tài khoản đổi tên đã được thu hồi nên người dùng đăng nhập lại.
- Dữ liệu local được giữ làm snapshot trước chuyển; không tự đồng bộ ngược dữ liệu cloud vào snapshot cũ.
- Chưa kiểm giao diện bằng browser; không chạy lại luồng tạo/giao Quiz, PPTX hoặc provider AI vì không thay phần đó.
- Phạm vi bàn giao Git gồm Backend, migration, test, script kiểm tra và tài liệu; không đưa cấu hình riêng hoặc dữ liệu thật vào repository.
