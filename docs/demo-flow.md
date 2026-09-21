# StudyFlow — Luồng demo khi bảo vệ

## 1. Mục tiêu demo

Chứng minh một luồng end-to-end có ba vai trò, phân quyền đúng và các tác vụ AI được giới hạn scope:

- Personal RAG chỉ dùng PDF/DOCX của chính Student đã chọn.
- Slide AI Tutor chỉ dùng PPTX Teacher đã public cho đúng lớp/môn.

## 2. Kịch bản chính

### Bước 1 — Student: lớp học và môn học

1. Đăng nhập bằng tài khoản Student.
2. Mở **Lớp học & Môn học**.
3. Chọn lớp `KTPM-K21`, sau đó chọn môn `Cơ sở dữ liệu`.
4. Danh sách học liệu Teacher public hiển thị PPTX trước PDF.
5. Giải thích rằng hệ thống không phân Chapter/Topic trong MVP.

Kỳ vọng:

- Student chỉ thấy lớp mình tham gia.
- Học liệu đã bị thu hồi không xuất hiện.
- PPTX có nút **Xem Slide**; PDF có nút **Tải PDF**.

### Bước 2 — Student: Personal Document RAG

1. Mở **Tài liệu cá nhân**.
2. Upload một PDF hoặc DOCX; quan sát `PROCESSING → READY`.
3. Chọn hai tài liệu Personal đã READY.
4. Chuyển sang tab **Hỏi đáp AI**, đặt câu hỏi.
5. Mở citation để thấy đúng tài liệu/trang nguồn.

Kỳ vọng:

- UI từ chối PPTX trong Personal Documents.
- Chỉ document của Student hiện tại được chọn.
- Chat không lấy học liệu Teacher trong lớp.
- Nếu nguồn không đủ, trả `NO_EVIDENCE`.

### Bước 3 — Student: Slide Viewer, Note và AI Tutor

1. Quay lại môn Cơ sở dữ liệu, mở PPTX `Thiết kế ERD`.
2. Chuyển slide; tiến độ xem được cập nhật.
3. Lưu Note tại slide hiện tại, chuyển slide rồi quay lại để chứng minh Note được giữ.
4. Hỏi Slide AI Tutor và mở citation.

Kỳ vọng:

- Không có nút tải file PPTX gốc.
- Tutor citation trỏ đúng document/slide.
- PDF/DOCX Teacher không mở viewer, không có Note/Tutor.

### Bước 4 — Student: Tiến độ & Thống kê

Mở trang gộp **Tiến độ & Thống kê** và trình bày:

- Slide đã xem theo môn/lớp.
- Personal Documents và AI questions.
- Study plan items đã hoàn thành.
- Số Quiz đã chấp nhận, đã làm và điểm trung bình.

Không trình bày Topic Mastery vì ngoài phạm vi MVP.

### Bước 5 — Student: Kế hoạch & Lịch

1. Tạo kế hoạch ôn Cơ sở dữ liệu.
2. Mở lịch tuần dạng bảng: cột Thứ 2–Chủ nhật, hàng là các khung giờ.
3. Chọn một ô trống hoặc nút **Thêm lịch**, nhập nội dung, ngày và giờ bắt đầu/kết thúc.
4. Lưu lịch, kiểm tra item xuất hiện đúng ô; thử tạo lịch trùng giờ để thấy cảnh báo.
5. Đánh dấu một task hoàn thành và xem số liệu cập nhật.

Student chủ động quản lý kế hoạch; không có recommendation tự động trong MVP.

### Bước 6 — Student: tạo và duyệt Quiz trong Ôn tập

1. Tại chatbot của **Tài liệu cá nhân**, giữ hai tài liệu READY đang được chọn và bấm **Tạo Quiz**.
2. Chuyển sang **Ôn tập → Quản lý Quiz**; Quiz mới có trạng thái **Chờ duyệt**.
3. Mở bản nháp, kiểm tra câu hỏi và nguồn page/document rồi chọn **Chấp nhận Quiz**.
4. Mở Quiz trạng thái **Sẵn sàng**, làm bài và nộp.
5. Xem đáp án, điểm và kết quả do Java lưu.

Quiz chỉ được làm sau khi Student chấp nhận. Python sinh bản nháp có nguồn; Java kiểm quyền, lưu trạng thái và chấm điểm.

### Bước 7 — Teacher

1. Chuyển sang Teacher.
2. Xem ClassSubject được Admin phân công.
3. Mở danh sách Student read-only của một ClassSubject được phân công.
4. Upload PDF/PPTX/DOCX vào **Kho tài liệu**.
5. Chọn một tài liệu READY, chọn đúng Lớp + Môn và public.
6. Public một DOCX và xác minh Student chỉ có action tải xuống.
7. Xem nơi đã public rồi thực hiện thu hồi.

Kỳ vọng:

- File mới upload chưa tự xuất hiện cho Student.
- Teacher không public được vào ClassSubject không được phân công.
- Một file có thể public cho nhiều lớp/môn mà không nhân bản.

### Bước 8 — Admin

1. Chuyển sang Admin.
2. Xem/tạo/khóa user và gán role.
3. Quản lý Class, danh sách Student, Subject và ClassSubject trên khu vực **Lớp học & Môn học**.
4. Phân công Teacher cho từng ClassSubject.
5. Xem Feedback/Reports, audit log và settings.

Admin không có màn pgvector/RAG và không mặc định xem Personal Document, chat, plan hoặc Quiz result cá nhân.

### Bước 9 — Deployment

Thực hiện các bước chính trên URL public, chỉ ra:

- Frontend chỉ gọi Java API.
- Java gọi Python qua internal API.
- Health check, log trace ID và pipeline status.

## 3. Seed data bắt buộc

- 1 Student, 1 Teacher, 1 Admin.
- 1 lớp chính và ít nhất 2 môn; mỗi môn có Teacher assignment.
- 1 PPTX Teacher đã READY/public, 1 PDF và 1 DOCX Teacher đã public.
- 1 Teacher Document chưa public và 1 job FAILED có thể retry.
- 2 Personal Documents READY, 1 Personal Document PROCESSING.
- Slide Note và learning progress mẫu.
- Study Plan + items có lịch trong nhiều khung giờ của tuần.
- 1 Quiz `REVIEW_REQUIRED`, 1 Quiz `READY` và 1 attempt đã chấm.
- Feedback, audit log và system setting mẫu.

## 4. Phương án dự phòng

- Seed sẵn tài liệu READY để không phải chờ pipeline.
- Warm up service trước buổi bảo vệ.
- Chuẩn bị response fixture nhưng gắn nhãn **Dữ liệu demo**, không trình bày như live.
- Có video luồng end-to-end và bản HTML prototype chạy offline.

## 5. Checklist rule khi demo

- [ ] Ba role Student/Teacher/Admin.
- [ ] Không có Topic, Quiz do Teacher tạo, Topic Mastery, Exam/Mock Exam hoặc recommendation.
- [ ] PPTX lớp: xem web + Note + Tutor, không download.
- [ ] PDF/DOCX lớp: download, không viewer/Note/Tutor.
- [ ] Personal: PDF/DOCX, owner isolation, multi-document RAG.
- [ ] Quiz sinh từ Personal RAG phải được Student chấp nhận trước khi làm; Java chấm điểm.
- [ ] Kế hoạch & Lịch hiển thị bảng tuần và cảnh báo trùng giờ.
- [ ] Teacher public đúng assignment.
- [ ] Admin quản trị user/lớp/môn/assignment, không quản trị AI.
