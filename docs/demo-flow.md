# Luồng demo khi bảo vệ

1. Student đăng nhập, chọn/tạo Subject và Topic, mở Official Document hoặc upload Personal Document.
2. Mở PDF/PPTX, đọc page/slide, ghi Note/Bookmark và hỏi AI Tutor về nội dung hiện tại; mở được citation.
3. Tạo Quiz từ topic/tài liệu, làm bài, backend chấm điểm; Content Progress và Topic Mastery cập nhật.
4. Xem Statistics và Study Recommendation, chứng minh lý do topic được ưu tiên.
5. Tạo Study Session/Task và đưa vào Calendar/Study Plan.
6. Tạo Exam, chọn phạm vi topic, xem countdown/readiness, làm Mock Exam và xem phân tích.
7. Chuyển sang Admin, xem user, Official Documents, parsing/indexing, AI usage, feedback và system logs.
8. Chứng minh toàn bộ luồng chạy trên môi trường deploy.

## Dữ liệu demo cần seed

- Một Student và một Admin.
- Hai môn học, mỗi môn từ ba đến năm topic.
- Ít nhất một PDF và một PPTX đã index thành công.
- Một tài liệu lỗi để trình bày trạng thái/retry nếu cần.
- Quiz history đủ tạo topic mạnh/yếu.
- Một kỳ thi gần ngày với Study Plan và Calendar liên quan.
- AI request, feedback và system log mẫu.

## Phương án dự phòng

- Chuẩn bị tài liệu đã index và dữ liệu seed để tránh chờ pipeline trong buổi demo.
- Warm up backend trước buổi bảo vệ nếu dùng free tier.
- Có response demo dự phòng nhưng phải phân biệt rõ với kết quả live.
- Ghi lại video luồng hoàn chỉnh để dự phòng sự cố mạng/deployment.

