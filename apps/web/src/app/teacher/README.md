# Teacher routes

Dashboard, Course Offering tự tạo, join code, Enrollment approval, Teacher Document Library và publication/revoke.

Dashboard lấy danh sách lớp của Teacher hiện tại qua public Java API. Khi chưa có lớp, hiển thị trạng thái trống; khi API lỗi, hiển thị lỗi và cho thử lại. Không hiển thị lớp, mã tham gia hoặc số liệu fixture trên dashboard.

Form mở lớp tự điền mã lớp theo mã môn học được chọn (ví dụ `BAS1204`), nhưng Teacher có thể sửa mã để phân biệt các nhóm trong cùng học kỳ.

Trang giao bài tập mặc định hiển thị bài tập của tất cả lớp do giảng viên phụ trách; bộ lọc cho phép chọn một lớp. Khi tạo bài tập, giảng viên chọn lớp cụ thể trong biểu mẫu trước khi lưu bản nháp.

Chi tiết bài tập và lớp trong kho PDF dùng URL để hỗ trợ Back/Forward về danh sách; nút quay lại trong trang không tạo thêm một bước lịch sử vòng lặp.
