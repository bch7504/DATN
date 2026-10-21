# Web tests

Kiểm thử Route guard, role navigation, PDF-only policy, Personal Document Assistant, Quiz và Review bằng fixture tổng hợp. Giao/nộp bài, kho học liệu, kế hoạch và thông báo không trả dữ liệu demo khi API lỗi.

- `npm test`: kiểm tra frontend, gồm thực thi API client với transport giả lập để xác nhận phương thức, payload, phân trang và lỗi.
- `npm run lint` và `npm run build`: kiểm tra quy tắc code, TypeScript và build các route.
- Từ `services/backend`, chạy `.\mvnw.cmd "-Dtest=RealHttpApiTest" "-Dstudyflow.web.contract=true" test` để khởi động Java trên cổng ngẫu nhiên rồi chạy **API client frontend thật** qua HTTP. Cần Node và dependency frontend đã cài. Runner `java-integration.cjs` chỉ nhận tài khoản/tệp tổng hợp qua stdin; không đọc `.env`, không gọi SMTP/S3 thật, không ghi session ra file.
- Luồng tích hợp: sửa/công bố bài → nộp PDF → tải bài → chấm → sinh viên xem điểm; tải/công bố/gỡ PDF; tạo/sửa/hoàn thành/hủy nhiệm vụ, đọc thông báo. Backend dùng security/service/JPA thật với H2; email và storage là test double.
- Đây chưa phải kiểm thử thao tác trình duyệt hay kiểm thử PostgreSQL/S3/SMTP triển khai thật. Không chạy runner độc lập với tài khoản thực.
