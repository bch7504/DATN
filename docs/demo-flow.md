# Demo flow — StudyFlow MVP v1.0

## 1. Mục tiêu

Chứng minh luồng end-to-end `Semester → Course Offering → Enrollment → Material → AI Quiz prompt → Review → Wrong-answer review → Dashboard/Streak/Daily Goal` với dữ liệu demo được đánh dấu rõ.

## 2. Dữ liệu chuẩn bị

- Admin, một Teacher và hai Student.
- Một Semester active; hai Subject.
- Một Course Offering do Teacher tạo, một join code và một request `PENDING`.
- Một Teacher PPTX `READY`, một Teacher PDF, hai Personal PDF text-layer.
- Dataset/evidence tổng hợp; không dùng tài liệu cá nhân thật.

## 3. Kịch bản chính

1. **Admin** tạo Subject và Semester; mở trang giám sát Course Offering.
2. **Teacher** chọn Subject + Semester, tự tạo Course Offering; hệ thống sinh join code.
3. **Student** nhập join code; UI hiện enrollment `PENDING`, chưa xem được học liệu.
4. **Teacher** mở yêu cầu tham gia và duyệt Student; enrollment thành `APPROVED`.
5. **Teacher** upload PPTX/PDF vào Library và public vào Course Offering mình sở hữu.
6. **Student** mở lớp: PPTX có nút **Xem slide**, PDF chỉ có **Tải PDF**.
7. Trong Slide Viewer, Student ghi Note và hỏi Slide Tutor; câu trả lời có citation slide. Câu ngoài nguồn trả `NO_EVIDENCE`.
8. Student mở **Personal RAG**: Giao diện chia 2 cột với Chatbot bên trái và bảng chọn tài liệu tinh gọn bên phải (~280px). Student chọn các nguồn PDF `READY`, chuyển đổi phiên hội thoại từ thanh session bar ở đầu khung chat, gửi câu hỏi; câu trả lời hiển thị chip trích dẫn trang. Nhấn trực tiếp vào chip trích dẫn để mở Drawer chi tiết trích dẫn đối chiếu grounding SHA-256 ngay trong khung chat.
9. Student mở luồng Tạo Quiz riêng, chọn Personal Documents và tự nhập prompt; Java tạo `GENERATING`, nhận draft rồi chuyển `REVIEW_REQUIRED`. Student có thể regenerate toàn bộ rồi chọn nơi ôn. Chatbot context không được dùng làm điều kiện tạo Quiz.
10. Student vào **Ôn tập**: Màn hình cấp 1 liệt kê các môn học được duyệt (`DBI-01`, `AI-02`) và Quiz cá nhân. Student chọn một môn để vào Workspace cấp 2 với 3 sub-tab:
    - *Quản lý Quiz:* làm bài Quiz, Java chấm điểm, bảng lịch sử lưu attempt mới không ghi đè và so sánh điểm.
    - *Nội dung cần ôn lại:* xem tổng hợp câu sai và bấm link nhảy trực tiếp đến slide bài giảng để ôn lại.
    - *Xem tiến độ môn học:* theo dõi tỷ lệ xem slide và nhật ký hoạt động học tập gần đây của riêng môn đó.
11. Dashboard hiển thị viewing progress đầy đủ theo từng Course Offering, Study Streak và Daily Goal; Student chỉnh ba target rồi hoàn thành một hoạt động hợp lệ để thấy actual/Streak do Java cập nhật. Không có màn Progress riêng.
12. **Admin** thấy Course Offering, enrollment event và audit metadata nhưng không thấy nội dung tài liệu/chat/Note cá nhân.

## 4. Negative paths bắt buộc

- Join code sai hoặc lớp khóa không tạo enrollment.
- Student `PENDING/REJECTED` không xem materials.
- Teacher không public vào Course Offering của Teacher khác.
- PPTX không tải file gốc; Teacher PDF không có Viewer/Tutor.
- Personal upload không phải PDF, PDF mã hóa hoặc không có text layer bị từ chối/trạng thái lỗi an toàn.
- Citation ngoài authorized document/version/page/slide bị Java từ chối.
- Prompt injection trong tài liệu không đổi instruction/scope.
- Prompt tạo Quiz không thể bỏ citation, đổi schema hoặc truy cập tài liệu ngoài scope; Course Offering ngoài enrollment không thể làm destination.
- Không đủ evidence trả `NO_EVIDENCE`, không tạo câu trả lời đoán.

## 5. Checklist bảo vệ

- [ ] UI chuẩn nhận diện PTIT (font Be Vietnam Pro + Manrope, màu đỏ thắm & vàng PTIT, huy hiệu chuẩn 1:1), responsive, luôn hiện “Dữ liệu demo” khi dùng fixture.
- [ ] Ba vai trò có route guard và navigation đúng phạm vi.
- [ ] Teacher tự tạo Course Offering; Admin chỉ quản lý catalog/giám sát.
- [ ] Teacher duyệt Enrollment; Student chỉ học khi `APPROVED`.
- [ ] Chính sách PPTX/PDF/Personal PDF đúng.
- [ ] Personal RAG (bố cục 2 cột: Chatbot bên trái, source compact bên phải, session bar ở header chat, in-chat citation drawer) và Slide Tutor có source scope, history, citation, loading/error/`NO_EVIDENCE`.
- [ ] Quiz dùng prompt tự do, phải qua `REVIEW_REQUIRED`; destination hợp lệ và Java chấm điểm.
- [ ] Ôn tập 2 cấp độ (chọn môn → workspace 3 sub-tab: Quiz/Attempt history, Nội dung cần ôn lại từ câu sai kèm link tài liệu/slide, Tiến độ slide môn học); attempt mới không ghi đè lịch sử.
- [ ] Streak chỉ tính Slide/Task/Quiz hợp lệ; Daily Goal chưa đạt 100% vẫn có thể duy trì Streak.
- [ ] Không có menu Progress riêng hoặc XP/Level/Achievement/leaderboard.
- [ ] Không có Topic Mastery, DOCX, OCR, Exam, Teacher Quiz, recommendation hoặc multi-agent trong MVP.
- [ ] Trace ID xuất hiện ở lỗi/AI response nhưng không lộ secret hay nội dung riêng tư.
