# Plan and Calendar

Study Plan, task, deadline, duration, status và calendar projection. Form thêm lịch có nhãn lớp tùy chọn khi Java trả về lớp sinh viên đã được duyệt. Nhãn được lưu trong mô tả lịch; không phải liên kết `courseOfferingId` hay kiểm tra quyền lớp khi lưu lịch.

Bài tập giáo viên đã công bố của các lớp `APPROVED` được chiếu từ API Student Assignments vào lịch tuần và danh sách nhiệm vụ, kể cả khi chưa có kế hoạch cá nhân. Thời điểm bắt đầu là lúc tạo bài, hạn do giáo viên đặt; bản nháp không xuất hiện. Mục này chỉ xem và dẫn tới trang nộp bài, trạng thái lấy từ bài nộp thật, không thể sửa/xóa/đánh dấu bằng API task cá nhân. Student vẫn có thể tự thêm nhiệm vụ riêng.
