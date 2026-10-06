# Demo flow — StudyFlow MVP

## 1. Mục tiêu

Chứng minh end-to-end: `Course Offering → Enrollment → Course Material PDF → Student Tutor/Teacher Quiz → Student Personal Assistant → Review → Dashboard/Streak/Daily Goal → Plan`.

## 2. Dữ liệu chuẩn bị

- Một Admin, một Teacher và hai Student.
- Một Semester active, hai Subject và một Course Offering do Teacher sở hữu.
- Một enrollment `PENDING`, một Student `APPROVED`.
- Hai Course Material PDF và hai Personal PDF có text layer; tất cả nội dung là dữ liệu tổng hợp.
- Một conversation demo và một số Quiz/attempt/review item có page citation.

## 3. Kịch bản chính

1. **Admin** quản lý Subject/Semester và giám sát Course Offering.
2. **Teacher** tạo Course Offering; Java sinh join code.
3. **Student** nhập join code; trạng thái `PENDING` chưa mở học liệu.
4. **Teacher** approve; Student chuyển `APPROVED`.
5. **Teacher** upload Course Material PDF, chờ `READY` và public vào lớp mình sở hữu.
6. **Student** mở PDF Viewer, chuyển trang, lưu Note và hỏi Course Material AI Tutor. Câu trả lời có page citation; câu ngoài nguồn trả `NO_EVIDENCE`.
7. **Student** upload Personal PDF và mở **Trợ lý tài liệu**. Trong cùng composer:
   - hỏi một khái niệm → `ASK_DOCUMENT`;
   - yêu cầu tóm tắt → `SUMMARIZE_DOCUMENT`;
   - yêu cầu tạo 10 câu khó → `CREATE_QUIZ`;
   - yêu cầu “tạo Quiz” nhưng thiếu số câu → `NEEDS_CLARIFICATION`.
8. Student bấm citation để mở drawer document/page/excerpt. Quiz được tạo ở `REVIEW_REQUIRED`, Student duyệt/chấp nhận trước khi làm.
9. **Teacher** mở AI Quiz Studio từ một Course Material PDF, chọn 15 câu, độ khó, chủ đề và khoảng trang. Java kiểm ownership; Python sinh draft; Teacher review/sửa rồi publish.
10. **Student** vào Review Hub, làm Quiz, xem attempt mới và nội dung cần ôn từ câu sai cùng link trang PDF nguồn.
11. Dashboard hiển thị progress theo page, Study Streak và Daily Goal Page/Quiz/Task do Java tính; không có màn Progress riêng.
12. Student mở **Kế hoạch & Lịch**, chuyển tuần, thêm lịch/task và đánh dấu task hoàn thành.
13. Admin thấy audit metadata nhưng không thấy nội dung Personal PDF, conversation, Note hoặc Quiz result cá nhân.

## 4. Negative paths bắt buộc

- Join code sai/lớp khóa không tạo enrollment; `PENDING/REJECTED` không đọc Course Material.
- Teacher không public/tạo Quiz từ PDF hoặc Course Offering của Teacher khác.
- Upload PPTX/DOCX, PDF mã hóa hoặc PDF không có text layer bị từ chối/lỗi an toàn.
- Teacher không có chatbot cá nhân và không có Course Material AI Tutor.
- Citation ngoài authorized document/version/page bị Java từ chối.
- Single Agent không được gọi tool ngoài ba tool đăng ký; confidence thấp/thiếu tham số phải hỏi lại.
- Prompt/document injection không đổi system rule, tool schema, `MCQ_SINGLE`, 4 options hoặc source scope.
- Thiếu evidence trả `NO_EVIDENCE`; AI không tự publish, accept, chấm điểm hoặc cập nhật progress.

## 5. Checklist

- [ ] UI PTIT responsive; fixture luôn hiện “Dữ liệu demo”.
- [ ] Browser chỉ gọi Java; không có AI key/direct Python URL ở client.
- [ ] PDF-only policy đúng cho Course Material và Personal Document.
- [ ] Student PDF Viewer có Page Note + Tutor; Teacher không có Tutor/chatbot.
- [ ] Personal Assistant đủ ask/summary/quiz/clarification và citation drawer.
- [ ] Teacher AI Quiz Studio có count/difficulty/topic/page range và review/publish flow.
- [ ] Quiz `MCQ_SINGLE` có đúng 4 options, một đáp án đúng và page citation; Java chấm điểm.
- [ ] Review item chỉ từ answer sai; attempt mới không ghi đè lịch sử.
- [ ] Streak chỉ tính Page/Task/Quiz hợp lệ; Daily Goal chưa đủ vẫn có thể duy trì Streak.
- [ ] Kế hoạch & Lịch đúng FE mock; không có AI recommendation tự động.
- [ ] Không có PPTX/DOCX/OCR, multi-agent, Topic Mastery, Exam, XP/badge/leaderboard trong MVP.
