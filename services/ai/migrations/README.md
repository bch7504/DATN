# AI database migrations

Chuỗi migration tiến:

1. `20261012_0001`: schema `ai`, pgvector và các bảng/index ban đầu.
2. `20261012_0002`: khóa chống trùng và structured result của agent run.
3. `20261012_0003`: fingerprint ràng buộc khóa với input và authorized scope.
4. `20261012_0004`: lease/fencing token của job xử lý tài liệu.
5. `20261012_0005`: chỉ cho phép một pipeline ACTIVE trên mỗi document/version, kể cả khi hai worker hoàn tất đồng thời.

Version table là `ai.alembic_version`. Autogenerate chỉ được kiểm tra schema `ai`; không sinh thay đổi bảng nghiệp vụ Java.

Chạy `uv run alembic upgrade head` trên database thử nghiệm được cấp quyền. Extension `vector` cần quyền phù hợp hoặc quản trị viên cài trước. Không tự đọc `.env`; URL lấy từ environment của tiến trình.

Trong phiên triển khai đã kiểm tra render SQL offline bằng database URL tổng hợp, chưa apply migration lên database thật. Không sửa revision đã áp dụng ở môi trường dùng chung; bổ sung revision tiến khi thay đổi tiếp.
