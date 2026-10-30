# Core

Đã triển khai:

- Settings bất biến; local tự đọc `.env` ở root repository, còn biến môi trường tiến trình có ưu tiên cao hơn.
- So sánh service credential an toàn.
- Kiểm tra X-Request-Id và X-Schema-Version.
- Structured error envelope không lộ secret hoặc chi tiết kiểm tra nội bộ.
- Chỉ phản chiếu request ID hợp lệ trong header/body; không trả lại header sai định dạng.
- Engine dùng `READ COMMITTED` để truy vấn sau khi chờ khóa tài liệu nhìn thấy giao dịch vừa commit.
- Đếm request/latency trong bộ nhớ theo route cố định, không dùng prompt/document ID làm nhãn.
