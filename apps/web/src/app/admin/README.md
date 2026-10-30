# Admin routes

Dashboard, users/roles, Subject/Semester, Course Offering monitoring, feedback, audit và settings. Không có Teacher assignment hoặc màn quản trị AI/vector.

Khu vực Admin không dùng fixture hoặc số liệu hard-code. Dashboard, người dùng, danh mục, giám sát lớp, phản hồi, nhật ký và cài đặt đều gọi public Java `/api/v1/admin/**`. Các danh sách phân trang theo response của Backend; lỗi API hiển thị rõ ràng và thao tác xóa/khóa/lưu trữ/cài đặt có xác nhận trong ứng dụng.
