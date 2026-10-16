# Core

Đã triển khai:

- Settings bất biến, đọc từ process environment và không tự đọc file .env.
- So sánh service credential an toàn.
- Kiểm tra X-Request-Id và X-Schema-Version.
- Structured error envelope không lộ secret hoặc chi tiết kiểm tra nội bộ.
- Chỉ phản chiếu request ID hợp lệ trong header/body; không trả lại header sai định dạng.
- Engine dùng `READ COMMITTED` để truy vấn sau khi chờ khóa tài liệu nhìn thấy giao dịch vừa commit.
- Đếm request/latency trong bộ nhớ theo route cố định, không dùng prompt/document ID làm nhãn.
