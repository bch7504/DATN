# AI-owned repositories

`models.py` định nghĩa bảng trong schema `ai`: index jobs, document indexes, chunks và agent runs. Java-owned schema `app` không xuất hiện trong truy vấn repository.

- `chunk_repository.py`: cosine retrieval hoặc lấy tuần tự toàn phạm vi tóm tắt; bắt buộc active index và cùng model/dimensions.
- `index_repository.py`: lưu chunks trong một transaction, unique index identity và chunk index, thay pipeline active một cách nguyên tử.
- `job_repository.py`: enqueue chống trùng, polling an toàn, lease/fencing, backoff, thu hồi và dọn chunks.
- `document_lock.py`: PostgreSQL transaction advisory lock theo document/version trước row lock; ngăn enqueue hoặc worker insert cạnh tranh với deindex khi index chưa tồn tại. Cần isolation `READ COMMITTED` (mặc định PostgreSQL); khóa tự nhả khi commit/rollback.
- `run_repository.py`, `assistant_run_repository.py`: reserve key/request ID, chặn input/scope khác và replay kết quả.

Đã có test cấu trúc SQL, fencing và logic bằng synthetic doubles. Cần integration test PostgreSQL thật để xác nhận unique constraint, row locks, rollback và chạy nhiều worker.
