# Teacher routes

Dashboard, Course Offering tự tạo, join code, Enrollment approval, Teacher Document Library và publication/revoke.

Dashboard lấy danh sách lớp của Teacher hiện tại qua public Java API. Khi chưa có lớp, hiển thị trạng thái trống; khi API lỗi, hiển thị lỗi và cho thử lại. Không hiển thị lớp, mã tham gia hoặc số liệu fixture trên dashboard.

Form mở lớp tự điền mã lớp theo mã môn học được chọn (ví dụ `BAS1204`), nhưng Teacher có thể sửa mã để phân biệt các nhóm trong cùng học kỳ.
