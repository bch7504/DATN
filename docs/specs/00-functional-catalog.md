# Danh mục chức năng và luồng điều hướng StudyFlow

Tài liệu này mô tả chức năng theo góc nhìn người dùng: bắt đầu từ màn hình chung, thao tác mở chức năng, màn hình chi tiết, kết quả và trường hợp thay thế. Các file `01`–`08` giữ phần contract kỹ thuật, quyền và tiêu chí kiểm thử.

## 1. Chức năng dùng chung

### F-01 — Đăng nhập và chuyển đúng khu vực

- **Tác nhân:** Student, Teacher, Admin.
- **Điểm vào:** Trang Đăng nhập.
- **Luồng chính:** Nhập email/tên đăng nhập và mật khẩu → Java xác thực → hệ thống mở Dashboard đúng vai trò.
- **Luồng thay thế:** Sai thông tin, tài khoản bị khóa hoặc phiên hết hạn → hiển thị lỗi và không mở màn hình có quyền.
- **Kết quả:** Tạo phiên local an toàn; Frontend không gọi Python trực tiếp.

### F-02 — Xem và xử lý thông báo

- **Tác nhân:** Student, Teacher.
- **Điểm vào:** Biểu tượng chuông trên thanh đầu trang.
- **Luồng chính:** Mở danh sách → chọn thông báo → chuyển đến lớp, bài tập, học liệu hoặc kế hoạch liên quan → đánh dấu đã đọc.
- **Luồng thay thế:** Đích đã bị thu hồi → hiển thị không còn quyền thay vì mở dữ liệu cũ.
- **Kết quả:** Trạng thái đã đọc được lưu bởi Java.

## 2. Chức năng Student

### F-03 — Dashboard học tập

- **Điểm vào:** Menu **Tổng quan**.
- **Màn hình chung:** Tổng số lớp, deadline, Quiz, Daily Goal và Study Streak; có thể thu gọn/mở rộng.
- **Màn hình chi tiết:** Mỗi thẻ Course Offering hiển thị viewing progress, bài tập và Quiz của lớp ngay trên Dashboard.
- **Kết quả:** Không có màn `Tiến độ & Thống kê` riêng; Java tính toàn bộ số liệu.

### F-04 — Tham gia và mở lớp học phần

- **Điểm vào:** Menu **Lớp học phần**.
- **Luồng chính:** Nhập join code → nhận `PENDING` → Teacher duyệt → thẻ lớp chuyển `APPROVED` → bấm thẻ để mở chi tiết.
- **Màn hình chi tiết:** Thông tin lớp, học liệu và bài tập thuộc lớp.
- **Luồng thay thế:** Code sai/tắt, lớp khóa hoặc yêu cầu bị từ chối → không mở học liệu.

### F-05 — Xem học liệu lớp

- **Điểm vào:** Chi tiết lớp → **Học liệu** hoặc menu **Học liệu** → chọn lớp.
- **Luồng chính:** Danh sách chỉ gồm publication đang hiệu lực. `SLIDE_PDF` có nút **Xem slide**; `REFERENCE_PDF` chỉ có **Tải xuống**.
- **Màn hình chi tiết Slide:** Từng trang PDF, text layer có thể chọn, chuyển trang, tiến độ xem và Note theo trang.
- **Luồng thay thế:** Publication bị thu hồi hoặc enrollment không hợp lệ → chặn ngay.

### F-06 — Ghi chú theo trang

- **Điểm vào:** Slide Viewer → mở vùng **Ghi chú** bên dưới slide.
- **Luồng chính:** Nhập nội dung → lưu → thu gọn/mở lại khi cần.
- **Kết quả:** Note thuộc riêng Student, document và page; Note không làm tăng Streak.

### F-07 — Course Material AI Tutor

- **Điểm vào:** Slide Viewer → biểu tượng AI Tutor bên phải.
- **Luồng chính:** Mở panel → nhập câu hỏi → Java kiểm quyền → Python truy xuất đúng tài liệu/trang → trả câu trả lời và citation → bấm citation để mở trang nguồn.
- **Ngữ cảnh:** Giữ hội thoại trước, hiển thị dòng nhỏ báo trang đang xem và hiểu câu hỏi nối tiếp.
- **Luồng thay thế:** Không đủ bằng chứng → `NO_EVIDENCE`; bấm biểu tượng lần nữa để ẩn panel.

### F-08 — Xem và nộp bài tập lớp

- **Điểm vào:** Chi tiết lớp → **Bài tập** hoặc menu **Bài tập**.
- **Luồng chính:** Chọn bài → xem mô tả/hạn → làm Quiz hoặc tải tệp theo loại bài → nộp → xem trạng thái đúng hạn/nộp muộn.
- **Kết quả:** Quiz được Java chấm; bài nộp mới tuân theo chính sách của Assignment.

### F-09 — Kho tài liệu cá nhân

- **Điểm vào:** Menu **Tài liệu cá nhân**.
- **Màn hình chung:** Tải/xóa PDF cá nhân và xem trạng thái xử lý.
- **Luồng chính:** Chọn 1–10 PDF `READY` → bấm **Hỏi đáp tài liệu cá nhân** để mở khu AI ngay trong trang.
- **Luồng thay thế:** PDF mã hóa, scan hoặc không có text layer → từ chối an toàn.

### F-10 — Personal Document Assistant

- **Điểm vào:** Tài liệu cá nhân → chọn PDF → **Hỏi đáp tài liệu cá nhân**.
- **Luồng chính:** Single Orchestrator Agent nhận prompt và chọn đúng một chức năng: hỏi đáp PDF, tóm tắt PDF, tạo Quiz có nguồn hoặc nhập Quiz từ văn bản.
- **Màn hình chi tiết:** Hội thoại, citation drawer và bản nháp Quiz nếu có.
- **Luồng thay thế:** Ý định chưa rõ → hỏi lại; thiếu evidence → `NO_EVIDENCE`; nhập Quiz từ văn bản → nguồn `IMPORTED_TEXT`, citation rỗng.

### F-11 — Duyệt và luyện Quiz cá nhân

- **Điểm vào:** Bản nháp từ Personal Assistant hoặc **Ôn tập**.
- **Luồng chính:** Xem bản nháp `REVIEW_REQUIRED` → chấp nhận hoặc từ chối → làm Quiz → nộp → xem kết quả.
- **Kết quả:** Mỗi attempt lưu riêng; Java chấm điểm; Quiz chỉ có 4 phương án và một đáp án đúng.

### F-12 — Ôn tập Quiz do Student tạo

- **Điểm vào:** Menu **Ôn tập** → chọn Quiz cá nhân hoặc nhóm Course Offering mà Student đã chủ động gắn Quiz của mình vào.
- **Màn hình chi tiết:** Chỉ gồm Quiz do Student tạo và đã chấp nhận, lịch sử attempt và nội dung cần ôn từ câu trả lời sai. Quiz Teacher giao được mở trong **Bài tập**, không đưa vào kho Ôn tập.
- **Kết quả:** Nguồn câu sai mở đúng document/page; hệ thống không suy đoán yếu/mạnh.

### F-13 — Kế hoạch & Lịch ôn tập

- **Điểm vào:** Menu **Kế hoạch & Lịch**.
- **Màn hình chung:** Lịch tuần Thứ 2–Chủ nhật và các nút tuần trước/tuần này/tuần sau.
- **Luồng chính:** Tạo/chọn kế hoạch → thêm task hoặc lịch học → sửa/hủy → đánh dấu task hoàn thành.
- **Màn hình chi tiết:** Danh sách lựa chọn kế hoạch nằm dưới lịch tuần.
- **Quy tắc:** Student chủ động quản lý; không có AI recommendation tự động.

## 3. Chức năng Teacher

### F-14 — Dashboard giảng viên

- **Điểm vào:** Menu **Tổng quan** của Teacher.
- **Nội dung:** Lớp đang phụ trách, yêu cầu chờ duyệt, học liệu, bài tập và hoạt động gần đây.
- **Kết quả:** Chỉ dùng dữ liệu thật từ Java; không hiển thị fixture E2E.

### F-15 — Tạo và quản lý lớp học phần

- **Điểm vào:** Menu **Lớp học phần** → **Tạo lớp học phần** hoặc bấm thẻ lớp.
- **Luồng chính:** Chọn Subject + Semester → tạo lớp/join code → mở chi tiết lớp.
- **Màn hình chi tiết:** Chỉ hiển thị thông tin tóm tắt và bốn nút **Yêu cầu chờ duyệt**, **Danh sách sinh viên**, **Bài tập & kết quả**, **Kho tài liệu lớp**. Nội dung của từng chức năng chỉ tải và hiển thị sau khi Teacher bấm nút tương ứng.
- **Luồng thay thế:** Lớp bị khóa/lưu trữ → hạn chế thao tác thay đổi.

### F-16 — Duyệt Student vào lớp

- **Điểm vào:** Chi tiết lớp → bấm **Yêu cầu chờ duyệt** để mở trang quản lý riêng đã lọc theo lớp.
- **Luồng chính:** Chọn yêu cầu `PENDING` → duyệt hoặc từ chối.
- **Kết quả:** Chỉ `APPROVED` được xem học liệu và làm bài của lớp.

### F-17 — Kho chung của giảng viên

- **Điểm vào:** Menu **Kho tài liệu**.
- **Màn hình chung:** Chỉ hiển thị thẻ kho và thẻ lớp; không trải nội dung từng kho ra ngoài.
- **Kho mặc định:** **Tài liệu tải lên** luôn tồn tại và không thể xóa; upload không chọn kho khác tự vào đây.
- **Luồng chính:** Bấm một thẻ kho → route chi tiết riêng → xem tài liệu/Quiz/bài tập → thêm vào lớp hoặc bỏ khỏi kho.
- **Quy tắc:** Xóa kho chỉ xóa cách phân loại; xóa học liệu gốc là thao tác riêng có thu hồi publication/vector.

### F-18 — Tải PDF/PPTX và chuẩn hóa học liệu

- **Điểm vào:** Kho chi tiết hoặc kho lớp → **Thêm tài liệu/Tải từ máy**.
- **Luồng chính:** Chọn kho, tệp, tiêu đề và `SLIDE_PDF|REFERENCE_PDF` → Java kiểm tra; PPTX được chuyển thành PDF → lưu/index → theo dõi đến `READY`.
- **Luồng thay thế:** Tệp lỗi, mã hóa, quá dung lượng hoặc không có text layer → không tạo học liệu.

### F-19 — Công bố học liệu vào lớp

- **Điểm vào:** Chi tiết kho Teacher → chọn lớp → **Thêm vào lớp**, hoặc màn quản lý publication.
- **Luồng chính:** Java kiểm ownership/trạng thái → tạo publication → học liệu xuất hiện trong kho lớp.
- **Luồng thay thế:** **Gỡ khỏi lớp** thu hồi quyền Student nhưng không xóa bản gốc trong kho Teacher.

### F-20 — AI Quiz Studio của Teacher

- **Điểm vào:** Menu **AI Quiz Studio**.
- **Luồng chính:** Chọn lớp → chọn 1–10 `SLIDE_PDF` đã công bố → nhập số câu, độ khó, chủ đề, phạm vi trang → sinh bản nháp.
- **Màn hình chi tiết:** Duyệt/sửa câu, phương án, đáp án, giải thích và citation → công bố hoặc từ chối.
- **Quy tắc:** Teacher không có chatbot cá nhân hoặc AI Tutor; AI không tự công bố/chấm điểm.

### F-21 — Giao Quiz thành bài tập

- **Điểm vào:** Quiz Teacher đã công bố → **Giao thành bài tập**.
- **Luồng chính:** Chọn lớp, tiêu đề, mô tả và hạn nộp → công bố Assignment.
- **Kết quả:** Student `APPROVED` thấy bài trong lớp, danh sách Bài tập và Kế hoạch & Lịch.

### F-22 — Xem bài nộp và thống kê Quiz

- **Điểm vào:** Chi tiết lớp → **Bài tập** → chọn bài.
- **Màn hình chi tiết:** Đã nộp/chưa nộp, đúng hạn/nộp muộn, điểm từng Student và tỷ lệ sai từng câu.
- **Kết quả:** Chỉ thống kê Assignment/Quiz của lớp Teacher sở hữu; không xem Quiz cá nhân.

## 4. Chức năng Admin

### F-23 — Dashboard quản trị

- **Điểm vào:** Dashboard Admin.
- **Nội dung:** Tổng quan user, danh mục, lớp học phần, feedback, audit và trạng thái hệ thống.
- **Kết quả:** Số liệu thật; không có dữ liệu giả để lấp màn hình trống.

### F-24 — Quản lý người dùng và vai trò

- **Điểm vào:** Menu **Người dùng** → chọn tài khoản.
- **Luồng chính:** Tìm/lọc → mở chi tiết → cập nhật role hoặc trạng thái theo quyền.
- **Quy tắc:** Không hiển thị mật khẩu, token hoặc nội dung học riêng tư.

### F-25 — Quản lý Subject và Semester

- **Điểm vào:** Menu **Danh mục** → Môn học/Học kỳ.
- **Luồng chính:** Danh sách → tạo/sửa/kích hoạt/ngừng hoạt động.
- **Kết quả:** Teacher chỉ dùng danh mục đang hợp lệ để tạo lớp.

### F-26 — Giám sát lớp học phần

- **Điểm vào:** Menu **Lớp học phần** của Admin → chọn lớp.
- **Màn hình chi tiết:** Teacher owner, Subject, Semester, trạng thái và số liệu vận hành.
- **Luồng thay thế:** Admin khóa/lưu trữ khi cần; Admin không tự phân công Teacher hoặc duyệt từng enrollment.

### F-27 — Feedback, Audit và Settings

- **Điểm vào:** Các menu tương ứng của Admin.
- **Luồng chính:** Mở danh sách → chọn bản ghi → xem metadata và xử lý theo quyền.
- **Quy tắc:** Audit không lưu prompt, nội dung PDF, password, token hoặc vector.

## 5. Liên kết sang spec kỹ thuật

| Nhóm chức năng | Spec contract |
|---|---|
| F-01–F-02 | `01-auth-and-access.md` |
| F-03–F-08 | `02-student-learning.md`, `04-plan-progress-review.md` |
| F-09–F-12 | `03-personal-ai-and-quiz.md`, `04-plan-progress-review.md` |
| F-13 | `04-plan-progress-review.md` |
| F-14–F-22 | `05-teacher-content.md` |
| F-23–F-27 | `06-admin-operations.md` |
| Yêu cầu chất lượng chung | `07-non-functional.md` |
| Mapping requirement/test | `08-traceability.md` |
