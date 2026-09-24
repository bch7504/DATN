# Demo flow — StudyFlow Course Offering

## 1. Mục tiêu

Chứng minh luồng end-to-end `Semester → Course Offering → Enrollment → Material → AI/Quiz → Progress` với dữ liệu demo được đánh dấu rõ.

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
8. Student upload Personal PDF, chọn nhiều nguồn `READY`, tạo cuộc trò chuyện và hỏi tiếp nối; câu trả lời có citation trang.
9. Student yêu cầu Quiz; Java tạo `GENERATING`, nhận draft rồi chuyển `REVIEW_REQUIRED`; Student duyệt, làm bài và Java chấm điểm.
10. Dashboard/Progress cập nhật từ learning events; Study Plan vẫn do Student tự quyết định.
11. **Admin** thấy Course Offering, enrollment event và audit metadata nhưng không thấy nội dung tài liệu/chat/Note cá nhân.

## 4. Negative paths bắt buộc

- Join code sai hoặc lớp khóa không tạo enrollment.
- Student `PENDING/REJECTED` không xem materials.
- Teacher không public vào Course Offering của Teacher khác.
- PPTX không tải file gốc; Teacher PDF không có Viewer/Tutor.
- Personal upload không phải PDF, PDF mã hóa hoặc không có text layer bị từ chối/trạng thái lỗi an toàn.
- Citation ngoài authorized document/version/page/slide bị Java từ chối.
- Prompt injection trong tài liệu không đổi instruction/scope.
- Không đủ evidence trả `NO_EVIDENCE`, không tạo câu trả lời đoán.

## 5. Checklist bảo vệ

- [ ] UI đỏ–trắng PTIT responsive, luôn hiện “Dữ liệu demo” khi dùng fixture.
- [ ] Ba vai trò có route guard và navigation đúng phạm vi.
- [ ] Teacher tự tạo Course Offering; Admin chỉ quản lý catalog/giám sát.
- [ ] Teacher duyệt Enrollment; Student chỉ học khi `APPROVED`.
- [ ] Chính sách PPTX/PDF/Personal PDF đúng.
- [ ] Personal RAG và Slide Tutor có source scope, history, citation, loading/error/`NO_EVIDENCE`.
- [ ] Quiz phải qua `REVIEW_REQUIRED`; Java chấm điểm.
- [ ] Không có Topic Mastery, DOCX, OCR, Exam, Teacher Quiz, recommendation hoặc multi-agent trong MVP.
- [ ] Trace ID xuất hiện ở lỗi/AI response nhưng không lộ secret hay nội dung riêng tư.
