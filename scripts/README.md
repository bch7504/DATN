# Scripts

Thư mục này chỉ chứa các script hỗ trợ riêng lẻ đã được kiểm soát phạm vi.

## Trạng thái chạy toàn hệ thống

Bộ launcher local `start-all`, `stop-all` và `status-all` đã được loại bỏ. Cách chạy
một lệnh cho toàn bộ Next.js, Java Backend, Python AI và hạ tầng sẽ chỉ được bổ
sung khi các service đã hoàn thiện Dockerfile và có Docker Compose thống nhất.

Không sử dụng ánh xạ ổ đĩa hoặc giả định repository nằm tại một ổ cố định. Cấu
hình Docker sau này phải chạy được từ mọi đường dẫn hợp lệ trên máy phát triển.

## Script hiện có

- `database.ps1`: quản lý PostgreSQL/pgvector phục vụ phát triển local.
- `storage.ps1`: quản lý kho PDF S3-compatible local trên `127.0.0.1:8333`; dừng service không xóa named volume.
- `backend-e2e.ps1`: chạy kiểm thử end-to-end của Java Backend theo contract được
  mô tả trong chính script.

Đọc phần contract ở đầu từng script trước khi chạy. Các script không được đọc hoặc
in giá trị bí mật từ `.env` ra terminal.
