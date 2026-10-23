# Docker

## PostgreSQL + pgvector cho local

Database local được tách khỏi PostgreSQL đang có trên máy và chỉ bind vào
`127.0.0.1:5433`:

```powershell
# Tạo/khởi động PostgreSQL, schema app và schema ai
.\scripts\database.ps1 start

# Chạy Flyway của Java và Alembic của Python
.\scripts\database.ps1 migrate

# Kiểm tra container, schema và số bảng
.\scripts\database.ps1 status

# Dừng nhưng giữ nguyên dữ liệu
.\scripts\database.ps1 stop
```

Script buộc Docker Compose dùng `database.defaults`, vì vậy không tự đọc `.env`.
Các mật khẩu mặc định được công khai và chỉ dành cho
máy local; truyền `-AdminPassword`, `-AppPassword` và `-AiPassword` khi cần giá
trị khác. Không mở cổng database ra mạng và không dùng các giá trị local này ở
staging/production.

Quyền sở hữu được tách rõ:

- `studyflow_app` sở hữu schema `app`; Java/Flyway chỉ làm việc tại đây.
- `studyflow_ai` sở hữu schema `ai`; Python/Alembic và pgvector chỉ làm việc tại đây.
- Tệp gốc không được lưu trong PostgreSQL; Object Storage sẽ được triển khai riêng.

Compose không có thao tác xóa volume. Nếu cần xóa toàn bộ database local, phải
xác nhận riêng và thao tác thủ công để tránh mất dữ liệu ngoài ý muốn.

## Object Storage cho PDF local

Kho tệp S3-compatible dùng SeaweedFS và chỉ bind vào loopback:

```powershell
.\scripts\storage.ps1 start
.\scripts\storage.ps1 status
.\scripts\storage.ps1 stop
```

Tệp được giữ trong named volume `studyflow-object-data`; lệnh `stop` không xóa dữ liệu.
Các giá trị trong `database.defaults` chỉ là thông tin phát triển local đã công khai. Khi dùng
môi trường khác, truyền access key/secret key riêng và không commit chúng. Java và Python chỉ
được chấp nhận HTTP local khi `AI_ALLOW_INSECURE_LOCAL_STORAGE_URL=true`; production bắt buộc
HTTPS và để cờ này là `false`.
