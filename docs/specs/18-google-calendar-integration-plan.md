# SPEC-18 — Kế hoạch kết nối Google Calendar cho Sinh viên

Ngày chốt: 16/11/2026. Trạng thái: **đã ghi phương án theo yêu cầu; chưa triển khai hoặc kết nối tài khoản Google thật**.

## Mục tiêu và hiện trạng

Sếp muốn phần lên lịch của Sinh viên kết nối được Google Calendar và yêu cầu ghi phương án vào spec tiếp theo để thực hiện sau.

StudyFlow đã có màn **Kế hoạch & Lịch**, CRUD kế hoạch/mục học, lịch theo thời gian và nhắc hạn nội bộ. Java cung cấp `GET /api/v1/calendar`; dữ liệu thuộc schema `app` trên Supabase. Chưa có Google OAuth, liên kết tài khoản, mapping sự kiện Google hoặc job đồng bộ. Supabase không tự cung cấp chức năng đồng bộ Google Calendar cho ứng dụng.

## Phạm vi dự kiến

Giai đoạn đầu đồng bộ một chiều **StudyFlow → Google Calendar**, do Sinh viên chủ động bật và chọn lịch muốn đồng bộ. StudyFlow tiếp tục là nguồn chính cho lịch học, trạng thái nhiệm vụ và tiến độ.

- Áp dụng cho lịch học cá nhân của chính Student, trước hết là các mục có đủ `scheduledStart` và `scheduledEnd` hợp lệ.
- Tạo, sửa hoặc xóa/ẩn lịch đã chọn trên StudyFlow sẽ tạo, cập nhật hoặc gỡ sự kiện Google tương ứng.
- Không nhập lịch cá nhân Google vào StudyFlow trong giai đoạn đầu. Sửa trên Google không tự sửa kế hoạch, hoàn thành nhiệm vụ hoặc tính tiến độ trong StudyFlow.
- Chưa mở phạm vi đồng bộ cho Teacher/Admin. Không đưa PDF, Note, hội thoại AI hoặc đáp án Quiz lên Google Calendar.
- Giữ nguyên quy tắc Study Plan, Daily Goal, Study Streak, Quiz và quyền owner. Đồng bộ thành công không được tính là hoạt động học tập.

## S18-01 — Kết nối tài khoản Google

1. Student đăng nhập StudyFlow, mở **Kế hoạch & Lịch** → **Kết nối Google Calendar**.
2. Hệ thống chuyển đến Google để Student chọn tài khoản Google thật và cấp quyền lịch qua OAuth 2.0.
3. Java kiểm tra callback thuộc đúng yêu cầu kết nối ban đầu, đổi mã cấp quyền và lưu liên kết an toàn phía server.
4. Thành công: hiển thị **Đã kết nối** và cho chọn lịch học cần đồng bộ. Student từ chối hoặc Google lỗi: lịch nội bộ vẫn hoạt động.

Google Account được liên kết có thể khác email đăng nhập StudyFlow. Ví dụ tài khoản demo `student.a@stu.ptit.edu.vn` có thể liên kết Google Account thật của người sử dụng; tạo tài khoản demo không tạo hộp thư hay Google Account tương ứng. Liên kết lịch không thay cơ chế đăng nhập/role của StudyFlow.

## S18-02 — Tạo, sửa và gỡ lịch đã đồng bộ

1. Student tạo/chọn lịch học có giờ bắt đầu/kết thúc hợp lệ và bật đồng bộ Google.
2. Java kiểm tra owner, thời gian, trạng thái kế hoạch và kết nối trước khi xếp việc đồng bộ.
3. Sau khi lưu kế hoạch, job Java tạo sự kiện Google và lưu mapping mục học ↔ sự kiện để chống tạo trùng.
4. Sửa tiêu đề hoặc thời gian trên StudyFlow → cập nhật đúng sự kiện đã liên kết.
5. Hủy/ẩn/xóa mục học theo quy tắc hiện có hoặc tắt đồng bộ cho mục đó → gỡ đúng sự kiện do StudyFlow quản lý, giữ các sự kiện Google khác.
6. Giao diện thể hiện **Chờ đồng bộ / Đã đồng bộ / Cần kết nối lại / Đồng bộ lỗi**, có thao tác thử lại khi phù hợp.

Google lỗi không làm hủy thao tác lưu lịch nội bộ. Không báo đã đồng bộ chỉ vì request đã vào hàng đợi. Giữ thời điểm thực tế và múi giờ IANA của Student, không tự dịch giờ hoặc suy ra thời lượng học.

## S18-03 — Ngắt kết nối

Student có thể ngắt liên kết; hệ thống dừng job mới, hủy job không còn hợp lệ và xử lý token theo cơ chế thu hồi quyền phù hợp. Kế hoạch StudyFlow được giữ nguyên.

Trước khi triển khai cần chốt UX xử lý sự kiện đã tạo trên Google: giữ lại hay cho Student chọn gỡ các sự kiện do StudyFlow tạo. Không tự xóa sự kiện cá nhân ngoài phạm vi ứng dụng hoặc toàn bộ calendar.

## Thiết kế kỹ thuật dự kiến

- Frontend chỉ gọi Java, không giữ OAuth token/client secret trong trình duyệt. Python AI service không tham gia đồng bộ lịch.
- Java sở hữu liên kết, kiểm quyền, token được mã hóa phía server, event mapping và job/outbox đồng bộ. Các bảng mới thuộc schema `app`, có migration tiến và unique constraint chống tạo trùng.
- OAuth state phải ngắn hạn, dùng một lần và gắn với Student/yêu cầu ban đầu; kiểm redirect URI và callback. Thiết kế tương thích cookie bảo mật hiện có, không nới lỏng xác thực toàn ứng dụng để OAuth hoạt động.
- Chọn scope Google tối thiểu; xem xét calendar riêng do ứng dụng tạo nếu đáp ứng nhu cầu. Không log token, authorization code, client secret hoặc nội dung lịch cá nhân.
- Job dùng retry giới hạn/backoff cho lỗi tạm thời, idempotency/event mapping và phiên bản mục học để không áp dụng cập nhật cũ. Quyền bị thu hồi/token không gia hạn được phải chuyển **Cần kết nối lại**.
- Kiểm lại owner khi chạy job; request chỉnh Student ID không được truy cập liên kết/sự kiện người khác.
- Khi triển khai phải ghi request/response/error, status HTTP, job payload và side effect trong `docs/api-plan.md`, cùng contract/test theo `AGENTS.md`. Những endpoint và bảng này **chưa tồn tại** trong bản hiện tại.

## Chuẩn bị và quyết định còn mở

1. Tạo/cấu hình Google Cloud project, bật Calendar API, OAuth consent và web client; đăng ký callback URL theo môi trường.
2. Chuẩn bị tài khoản Google thật để nghiệm thu, khai báo test user nếu chế độ OAuth yêu cầu. Client ID, client secret và khóa mã hóa token đặt trong cấu hình server riêng, không ghi giá trị thật vào spec/Git.
3. Chốt calendar đích/scope, cách đồng bộ ban đầu các mục cũ được chọn, xử lý sự kiện bị sửa/xóa trực tiếp trên Google, ngắt kết nối và archive toàn kế hoạch.
4. Chốt cách biểu diễn task chỉ có `dueAt` mà chưa có giờ học; không tự tạo khoảng thời gian giả. Đồng bộ hai chiều và tự động mọi hạn bài tập lớp không thuộc giai đoạn đầu này.

## Tiêu chí nghiệm thu dự kiến

- Kết nối thành công/từ chối/hết hạn; callback sai hoặc state dùng lại bị từ chối, không gắn nhầm Student.
- Student A không truy cập hoặc thay đổi liên kết/sự kiện của Student B bằng request tự sửa.
- Tạo một lịch được chọn → đúng một sự kiện đúng giờ; retry không nhân đôi, sửa/gỡ tác động đúng sự kiện mapping.
- Google lỗi mạng/giới hạn lưu lượng hoặc token hết hiệu lực không làm mất lịch nội bộ; trạng thái và kết nối lại rõ ràng.
- Ngắt kết nối không mất kế hoạch hoặc xóa sự kiện ngoài phạm vi; đổi múi giờ/DST giữ đúng thời điểm.
- Hoàn thành task, điểm, Streak và Daily Goal không bị cập nhật bởi sự kiện Google.
- Test tự động dùng OAuth/Calendar transport giả và dữ liệu tổng hợp; nghiệm thu live riêng với Google Account được cấp quyền, không coi mock là đã tích hợp thật.

## Kết quả lần này và bàn giao

- Đã rà soát API lịch hiện hành, ghi SPEC-18 và bổ sung chỉ mục/dẫn đường từ spec Kế hoạch & Lịch.
- Chỉ sửa Markdown; không sửa code, thêm dependency, cấu hình OAuth/migration, ghi Google Calendar hoặc thay dữ liệu Supabase.
- Chưa triển khai UI/API/job/mã hóa token hoặc nghiệm thu live. Các quyết định UX/kỹ thuật còn mở phải được chốt trong lần thực hiện tiếp theo.
- Kiểm tra lần này: đường dẫn liên kết và `git diff --check`; không chạy build/test service cho thay đổi chỉ có tài liệu.

## Tham chiếu chính thức

- [Google: tạo và cập nhật sự kiện](https://developers.google.com/workspace/calendar/api/guides/create-events).
- [Google: OAuth và phạm vi quyền Calendar API](https://developers.google.com/workspace/calendar/api/auth).
- [Google: đồng bộ tăng dần](https://developers.google.com/workspace/calendar/api/guides/sync), tham khảo nếu mở rộng hai chiều trong một giai đoạn được duyệt sau.
