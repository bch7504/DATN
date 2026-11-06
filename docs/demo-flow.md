# Kịch bản demo hoàn chỉnh — StudyFlow MVP

## 1. Mục tiêu buổi demo

Kịch bản trình diễn một luồng xuyên suốt, dùng cùng một lớp và học liệu để thấy dữ liệu đi qua ba vai trò:

```text
Admin chuẩn bị danh mục
  → Teacher mở lớp và duyệt Student
  → Teacher tải Slide Chương 2 lên kho, công bố và tạo Quiz
  → Student xem slide, ghi chú, hỏi AI Tutor và nộp Quiz
  → Teacher xem kết quả, tỷ lệ sai
  → Student xem Dashboard, nội dung cần ôn và lập kế hoạch học
```

Luồng chính dùng:

- Lớp học phần: **KTS-01 · Kỹ thuật số**.
- Học liệu: **Slide Chương 2 – Cổng logic**.
- Loại học liệu: `SLIDE_PDF`; Student chỉ xem trên web, không tải tệp nguồn.
- Quiz: `MCQ_SINGLE`, mỗi câu có đúng 4 lựa chọn và một đáp án đúng.

## 2. Chuẩn bị trước khi trình bày

### 2.1 Tài khoản

Dùng ba tài khoản local được công bố trong `README.md` ở thư mục gốc. Không trình chiếu API key, biến môi trường hoặc mật khẩu ngoài bộ tài khoản test local.

### 2.2 Trạng thái dữ liệu

- Semester và Subject **Kỹ thuật số** đang hoạt động.
- Teacher sở hữu lớp `KTS-01`.
- Student đã gửi yêu cầu tham gia hoặc sẽ gửi trong lúc demo.
- Kho **Tài liệu tải lên** mặc định của Teacher tồn tại.
- Chỉ giữ học liệu **Slide Chương 2 – Cổng logic** cho luồng chính.
- Frontend, Java Backend, Python AI Service, PostgreSQL, pgvector và Object Storage đều sẵn sàng.

### 2.3 Kiểm tra nhanh

- Đăng nhập được bằng cả ba vai trò.
- Health check Java và Python báo hoạt động.
- Slide Chương 2 có text layer, đủ trang và chuyển sang `READY` sau xử lý.
- Giao diện không bật dữ liệu demo/fixture.

## 3. Phần A — Admin chuẩn bị và giám sát

### A1. Đăng nhập và kiểm tra người dùng

1. Đăng nhập bằng tài khoản Admin local.
2. Kiểm tra hệ thống chuyển đúng vào Dashboard Admin.
3. Mở **Người dùng** để cho thấy ba vai trò và trạng thái tài khoản.

**Kết quả:** Admin quản trị tài khoản, danh mục và giám sát; không xem Personal PDF, Note, hội thoại hoặc kết quả Quiz cá nhân của Student.

### A2. Kiểm tra danh mục học tập

1. Mở **Danh mục → Học kỳ** và kiểm tra học kỳ đang hoạt động.
2. Mở **Danh mục → Môn học** và kiểm tra môn **Kỹ thuật số**.
3. Mở danh sách lớp học phần và tìm `KTS-01`.

**Kết quả:** Subject và Semester là dữ liệu chuẩn để Teacher tự tạo lớp; Admin không phân công từng lớp cho Teacher trong MVP.

### A3. Kiểm tra giám sát

1. Mở chi tiết `KTS-01` ở khu vực giám sát lớp.
2. Mở **Audit** và **Feedback** để cho thấy metadata vận hành.

**Kết quả:** Admin giám sát trạng thái và nhật ký nhưng không can thiệp nội dung học cá nhân.

## 4. Phần B — Teacher quản lý lớp và kho học liệu

### B1. Mở lớp học phần

1. Đăng xuất Admin và đăng nhập Teacher local.
2. Mở **Lớp học phần** và chọn `KTS-01 · Kỹ thuật số`.
3. Giới thiệu thông tin lớp và bốn nút điều hướng: **Yêu cầu chờ duyệt**, **Danh sách sinh viên**, **Bài tập & kết quả**, **Kho tài liệu lớp**. Không trải toàn bộ dữ liệu trên trang chính của lớp.
4. Nếu cần trình diễn tạo mới, chọn **Tạo lớp học phần**, chọn Subject + Semester và để hệ thống sinh join code.

**Kết quả:** Teacher chỉ quản lý lớp mình sở hữu.

### B2. Duyệt yêu cầu tham gia

1. Trong `KTS-01`, mở **Yêu cầu chờ duyệt**.
2. Chọn Student `PENDING` và bấm **Duyệt**.
3. Kiểm tra Student chuyển thành `APPROVED`.

**Kết quả:** Student chỉ xem được học liệu lớp sau khi được duyệt.

### B3. Mở kho chung của Teacher

1. Mở **Kho tài liệu**.
2. Trang ngoài chỉ hiển thị các thẻ kho, không hiển thị lẫn nội dung của mọi kho.
3. Mở kho mặc định **Tài liệu tải lên**.
4. Giới thiệu **Thêm tài liệu**, **Tạo kho** và kho theo môn/kho riêng.

**Kết quả:** Mỗi Teacher có một kho mặc định. Tài liệu không chọn kho khác tự vào **Tài liệu tải lên**.

### B4. Tải và xử lý học liệu

1. Trong kho, bấm **Thêm tài liệu**.
2. Chọn PDF có text layer hoặc PPTX để Java chuyển sang PDF rồi kiểm tra text layer.
3. Đặt tên **Slide Chương 2 – Cổng logic** và chọn `SLIDE_PDF`.
4. Theo dõi `PENDING_PROCESSING → PROCESSING → READY`.

**Kết quả:** Python chỉ nhận PDF đã chuẩn hóa; Student không nhận PPTX gốc. Tệp mã hóa, lỗi hoặc không có text layer bị từ chối an toàn.

### B5. Sắp xếp và công bố học liệu

1. Nếu cần, tạo kho **Kho Kỹ thuật số** và đưa Slide Chương 2 vào kho này.
2. Trong chi tiết kho, chọn lớp `KTS-01` và bấm **Thêm vào lớp**.
3. Mở kho của `KTS-01` để kiểm tra học liệu đã xuất hiện.

**Kết quả:** Tài liệu chỉ cấp quyền cho Student sau khi được công bố vào lớp; bản gốc vẫn thuộc Teacher.

## 5. Phần C — Student tham gia lớp và học với AI Tutor

### C1. Tham gia lớp

1. Đăng nhập Student local.
2. Mở **Lớp học phần**, nhập join code nếu chưa có enrollment.
3. Cho thấy `PENDING` trước khi Teacher duyệt và `APPROVED` sau khi duyệt.

**Kết quả:** Join code sai, bị tắt hoặc lớp bị khóa không tạo quyền truy cập học liệu.

### C2. Xem Slide PDF và ghi chú

1. Mở `KTS-01` và chọn **Slide Chương 2 – Cổng logic**.
2. Bấm **Xem slide**, chuyển qua vài trang và bôi đen chữ trên PDF.
3. Mở vùng ghi chú bên dưới, lưu ghi chú cho trang hiện tại rồi thu gọn.

**Kết quả:** Viewer hiển thị từng trang PDF; `SLIDE_PDF` không có nút tải xuống. Note gắn đúng Student, tài liệu và số trang.

### C3. Hỏi Course Material AI Tutor

1. Bấm biểu tượng AI Tutor bên phải để mở; bấm lại để ẩn.
2. Hỏi: **“Cổng NAND hoạt động như thế nào?”**
3. Bấm citation để mở đúng trang và đoạn nguồn.
4. Chuyển trang; kiểm tra chat giữ hội thoại cũ và có dòng nhỏ báo trang hiện tại.
5. Hỏi nối tiếp: **“Vậy nó khác cổng AND ở điểm nào?”**
6. Hỏi một câu ngoài tài liệu để minh họa `NO_EVIDENCE`.

**Kết quả:** AI dùng lịch sử, trang đang xem và phạm vi lớp được phép. Câu trả lời có citation `documentId + pageNumber`; thiếu nguồn thì không tự đoán.

## 6. Phần D — Teacher tạo, duyệt và giao Quiz

### D1. Tạo Quiz bằng AI Quiz Studio

1. Đăng nhập lại Teacher và mở **AI Quiz Studio**.
2. Chọn một hoặc nhiều `SLIDE_PDF` `READY`; trong demo chọn **Slide Chương 2 – Cổng logic**.
3. Chọn số câu, độ khó, chủ đề **Cổng logic**, phạm vi trang và yêu cầu bổ sung.
4. Bấm tạo Quiz và chờ `REVIEW_REQUIRED`.

**Kết quả:** Không chọn sẵn tài liệu. AI chỉ dùng tài liệu/phạm vi Teacher chọn và sinh `MCQ_SINGLE` có nguồn.

### D2. Duyệt bản nháp

1. Mở bản nháp vừa sinh.
2. Kiểm tra mỗi câu có 4 phương án, một đáp án đúng, giải thích và citation.
3. Sửa nội dung nếu cần rồi duyệt và công bố.

**Kết quả:** AI không tự công bố hoặc chấm điểm; Java kiểm tra lại cấu trúc trước khi đổi trạng thái.

### D3. Giao Quiz thành bài tập lớp

1. Chọn **Giao thành bài tập**.
2. Chọn `KTS-01`, nhập tiêu đề, mô tả và hạn nộp.
3. Công bố bài tập.

**Kết quả:** Quiz lớp gắn với Assignment và Course Offering; chỉ Student `APPROVED` mới thấy và nộp.

## 7. Phần E — Student làm bài và xem lại câu sai

### E1. Làm và nộp Quiz

1. Đăng nhập Student, mở **Bài tập** trong `KTS-01`.
2. Chọn bài Quiz Cổng logic, trả lời và bấm **Nộp bài**.
3. Xem điểm, số câu đúng/sai và thời điểm nộp.

**Kết quả:** Java chấm điểm; client và LLM không quyết định điểm. Một lượt hợp lệ mới tạo attempt mới thay vì ghi đè lịch sử.

### E2. Xem lại câu sai của Assignment

1. Ngay tại kết quả bài tập, mở lượt làm vừa nộp.
2. Xem câu trả lời sai, giải thích và nguồn cần xem lại.
3. Bấm nguồn của câu sai để về đúng trang Slide Chương 2.

**Kết quả:** Nội dung cần xem lại chỉ lấy từ câu sai và nguồn câu hỏi, không dùng AI gán nhãn yếu/mạnh. Quiz Teacher vẫn thuộc **Bài tập**, không xuất hiện trong kho **Ôn tập** của Student.

## 8. Phần F — Teacher xem kết quả bài tập

1. Đăng nhập Teacher và mở `KTS-01 → Bài tập`.
2. Chọn bài Quiz Cổng logic.
3. Xem số đã nộp/chưa nộp, đúng hạn/nộp muộn và điểm từng Student.
4. Mở thống kê từng câu để xem tỷ lệ chọn sai.

**Kết quả:** Teacher chỉ xem kết quả bài mình giao trong lớp mình sở hữu; không xem Quiz cá nhân của Student.

## 9. Phần G — Personal Document Assistant của Student

### G1. Quản lý tài liệu cá nhân

1. Đăng nhập Student và mở **Tài liệu cá nhân**.
2. Tải một PDF cá nhân có text layer.
3. Chọn 1–10 tài liệu `READY` rồi bấm **Hỏi đáp tài liệu cá nhân**.

**Kết quả:** Khu AI nằm trong Tài liệu cá nhân, không có menu Trợ lý riêng. Personal PDF chỉ thuộc Student tải lên.

### G2. Trình diễn Single Orchestrator Agent

Trong cùng hội thoại, lần lượt nhập:

1. “Giải thích khái niệm chính trong tài liệu.”
2. “Tóm tắt các ý quan trọng và dẫn nguồn.”
3. “Tạo 5 câu trắc nghiệm mức trung bình.”
4. Một yêu cầu mơ hồ để Agent hỏi lại thay vì tự đoán.
5. Một bộ câu hỏi do Student tự dán để tạo bản nháp `IMPORTED_TEXT` không gắn citation PDF giả.

**Kết quả:** Một Agent chọn đúng một công cụ cho mỗi yêu cầu. Kết quả từ PDF có citation; Quiz nhập từ văn bản được đánh dấu chưa kiểm chứng và chờ Student duyệt.

### G3. Duyệt Quiz cá nhân

1. Mở bản nháp `REVIEW_REQUIRED`.
2. Kiểm tra câu hỏi, đáp án, giải thích và nguồn.
3. Chấp nhận vào Quiz cá nhân hoặc Course Offering có enrollment `APPROVED`.
4. Làm Quiz và kiểm tra attempt được lưu riêng.

## 10. Phần H — Dashboard, Daily Goal và Kế hoạch & Lịch

### H1. Dashboard tổng quan

1. Mở Dashboard Student.
2. Chỉ ra lớp, deadline, bài tập, Quiz, tiến độ xem học liệu, Study Streak và Daily Goal.
3. Mở/thu gọn khu vực Dashboard.

**Kết quả:** Dashboard hiển thị tiến độ tổng quan và từng lớp; không có route **Tiến độ & Thống kê** riêng.

### H2. Quy tắc Streak và Daily Goal

1. Đối chiếu hoạt động vừa thực hiện.
2. Giải thích chỉ `VIEW_PAGE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED` duy trì Streak.
3. Thay target Daily Goal và xem Java tính lại phần trăm.

**Kết quả:** Login, Note và hỏi AI không làm tăng Streak. Daily Goal chưa đủ vẫn có thể duy trì Streak nếu có hoạt động hợp lệ.

### H3. Kế hoạch & Lịch ôn tập

1. Mở **Kế hoạch & Lịch**, tạo kế hoạch cá nhân.
2. Thêm task ôn Cổng logic và lịch học bằng nút hoặc ô trống trên lịch tuần.
3. Chuyển tuần trước/tuần này/tuần sau rồi đánh dấu task hoàn thành.

**Kết quả:** Student tự quyết định kế hoạch; AI không tự điều phối hoặc tự thêm lịch.

## 11. Tình huống lỗi nên trình diễn ngắn

- Student `PENDING` mở học liệu → bị từ chối.
- PDF mã hóa/PDF scan/PPTX lỗi → từ chối an toàn.
- Student cố tải `SLIDE_PDF` → không có quyền tải.
- Hỏi Tutor ngoài phạm vi → `NO_EVIDENCE`.
- Prompt yêu cầu bỏ citation/đổi luật → system rule và scope không thay đổi.
- Teacher dùng tài liệu hoặc lớp của Teacher khác → không đủ quyền.
- Teacher chưa duyệt Quiz nhưng cố công bố → Java từ chối.
- Gửi lặp thao tác có idempotency key → không tạo dữ liệu trùng.

## 12. Tiêu chí kết thúc demo

Buổi demo đạt yêu cầu khi dữ liệu thật đi hết chuỗi:

```text
KTS-01
  → duyệt Student
  → Slide Chương 2 READY
  → công bố vào lớp
  → Student xem trang + Note + AI Tutor có citation
  → Teacher sinh và duyệt Quiz
  → giao Quiz thành bài tập
  → Student nộp và Java chấm điểm
  → Teacher xem thống kê
  → Student ôn câu sai, xem Dashboard và lập kế hoạch
```

Không kết thúc demo bằng fixture hoặc số liệu giả; mọi trạng thái hiển thị phải lấy từ Java Backend và dữ liệu đã lưu.
