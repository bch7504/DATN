# Scripts

Khu vực dành cho script setup, seed data, import tài liệu demo, warm-up backend và smoke test trước buổi bảo vệ.

## Chạy toàn bộ hệ thống local

Sau khi cấu hình `.env` tại root và mở Docker Desktop, chạy đúng một lệnh:

```powershell
.\scripts\start-all.ps1
```

Nếu terminal đang là Command Prompt (`E:\ĐATN>` không có tiền tố `PS`), dùng:

```bat
scripts\start-all.cmd
```

Script nạp biến môi trường mà không in giá trị, cài dependency, khởi động PostgreSQL/pgvector, Mailpit, chạy migration, rồi chạy Java Backend, Python AI API, AI worker và Next.js Frontend. Các tiến trình ứng dụng chạy ẩn; PID và output kỹ thuật nằm trong `.runtime/`, thư mục này không được commit.

Không cần nhập lại API key ở mỗi lần chạy. Script tự nạp `E:\ĐATN\.env` và chấp nhận cả `OPENROUTER_API_KEY=...` lẫn cú pháp PowerShell `$env:OPENROUTER_API_KEY="..."`; màn hình chỉ báo `FOUND/MISSING`, không hiện giá trị.

Những lần sau có thể bỏ qua bước đồng bộ dependency:

```powershell
.\scripts\start-all.ps1 -SkipDependencyInstall
```

Dừng toàn bộ nhưng giữ nguyên database/volume:

```powershell
.\scripts\stop-all.ps1
```

Từ Command Prompt dùng `scripts\stop-all.cmd`.

Xem tiến trình và API nào đang phản hồi:

```powershell
.\scripts\status-all.ps1
```

Từ Command Prompt dùng `scripts\status-all.cmd`.

Script không tự dựng Object Storage. Nếu `STORAGE_ENABLED=true`, endpoint S3-compatible và thông tin truy cập phải được cung cấp sẵn trong `.env`.

