# Auth routes

Login, đăng ký Sinh viên qua email `@stu.ptit.edu.vn` và OTP, refresh/session recovery và route guard cho ba role. Trang đăng ký chỉ chuyển sang đăng nhập sau khi mã 6 chữ số được xác minh; gửi lại mã theo thời gian chờ do Java trả về.

Khi request có quyền trả `401`, API client gọi `/auth/refresh` bằng refresh cookie (không gửi bearer token cũ), gộp các request đồng thời thành một lần xoay token rồi thử lại từng request đúng một lần. `401` của form đăng nhập/đăng ký không kích hoạt refresh. Nếu Java từ chối refresh, frontend xóa phiên và chuyển về đăng nhập; lỗi mạng hoặc lỗi server tạm thời không được xem là hết hạn phiên. Thời gian sống tối đa vẫn do Java và refresh cookie quyết định.
