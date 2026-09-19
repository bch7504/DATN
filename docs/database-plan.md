# StudyFlow — Database plan

Thiết kế có **hai PostgreSQL riêng trên cùng VPS**. PostgreSQL nghiệp vụ do Java sở hữu và là system of record; PostgreSQL vector do Python sở hữu, bật extension `vector` cho pgvector. Không có foreign key, transaction hoặc kết nối ứng dụng đi xuyên hai database. Xem [low-level-design.md](low-level-design.md) cho luồng đồng bộ bất đồng bộ.

## 1. PostgreSQL nghiệp vụ — Java/Flyway

### Identity và nội dung

- `users`: tài khoản, profile, role, status.
- `subjects`: môn chuẩn hoặc cá nhân; owner, type, status.
- `topics`: topic, subject, order, importance.

### Documents và annotation

- `documents`: ID, owner, loại `OFFICIAL`/`PERSONAL`, subject, object key, MIME, `document_version`, `processing_status` (`UPLOADING`, `PENDING_INDEX`, `INDEXING`, `READY`, `FAILED`, `DELETING`, `DELETED`), job ID, số page/slide và trạng thái publish. Official Content có thể không có owner cá nhân; Personal Document bắt buộc có owner.
- `document_progress`: user/document, vị trí đọc hiện tại và phần đã xem.
- `topic_content_progress`: user/topic, mức hoàn thành nội dung tính từ read events; **không** chứa mastery.
- `notes`, `bookmarks`: ghi chú/đánh dấu theo subject/topic/document/PAGE/SLIDE/SECTION với owner rõ ràng.

### Quiz và mức hiểu

- `quizzes`, `quiz_questions`: cấu hình, câu hỏi và đáp án đã được Java validate.
- `quiz_attempts`, `quiz_answers`: lần làm, câu trả lời và điểm do Java chấm.
- `topic_mastery`: user/topic, trạng thái `NO_DATA`, `LEARNING`, `WEAK` hoặc trạng thái mạnh hơn theo rule có bằng chứng; không suy từ tỷ lệ đã đọc.
- `mastery_history`: lịch sử thay đổi và evidence; append-oriented.
- `learning_events`: read, session, quiz, exam events để cập nhật progress/statistics và audit; append-oriented.

### Study, Exam và vận hành

- `tasks`, `study_plans`, `study_sessions`: Task, lịch và kế hoạch do Student quản lý.
- `exams`, `exam_topics`: ngày thi, target, phạm vi, countdown/readiness và Mock Exam liên quan.
- `ai_requests`, `ai_feedback`, `system_logs`: loại request, scope ID, trạng thái, độ trễ, token usage, feedback và lỗi đã chuẩn hóa; không lưu prompt nhạy cảm, document content hoặc API key.

Mọi bảng dữ liệu cá nhân có owner trực tiếp hoặc đường liên kết xác định owner. Tạo migration Flyway mới khi schema thay đổi; không sửa migration đã chạy. Java không lưu embedding.

## 2. PostgreSQL vector — Python/Alembic

| Bảng | Dữ liệu chính | Ghi chú |
|---|---|---|
| `document_indexes` | `document_id`, `active_version`, embedding model, dimensions, trạng thái | Chỉ một version active cho mỗi document. |
| `document_chunks` | document ID/version/chunk number, owner/source type, subject/topic, PAGE/SLIDE/SECTION, chunk text, `embedding vector(1536)` | Unique `(document_id, document_version, chunk_no)`; chỉ active version được truy hồi. |
| `index_jobs` | job ID, request ID, idempotency key, document/version, loại INDEX/DEINDEX, status, attempts, thời điểm retry và error code | Unique idempotency key; worker claim có khóa hàng. Signed URL đầu vào chỉ giữ tới khi tải xong, không log. |

Bật `CREATE EXTENSION vector` bằng migration của Python chỉ trên vector DB. Tạo B-tree index cho document/version/scope metadata; giai đoạn đầu tìm kiếm cosine chính xác trên danh sách document Java đã cho phép. Chưa tạo HNSW cho bộ dữ liệu demo. Model embedding mặc định là `text-embedding-3-small` với 1536 chiều; đổi model hoặc chiều yêu cầu version mới và reindex, không trộn vector khác chiều. [pgvector](https://github.com/pgvector/pgvector) hỗ trợ tìm kiếm chính xác mặc định và các index gần đúng khi sau này cần đo tải.

## 3. Tính nhất quán và vòng đời

- Java lưu document và job ID/trạng thái; Python lưu job/chunks. Java poll job để cập nhật `READY`/`FAILED`. Không giả định hai DB commit cùng lúc.
- Khi reindex, Python ghi version mới rồi đổi `active_version` trong transaction vector DB; version cũ chỉ dọn sau đó. Java chỉ cho phép hỏi AI với tài liệu `READY`.
- Khi xóa, Java chuyển `DELETING` để loại tài liệu khỏi authorized scope trước; Python deindex, Java xóa object và metadata sau khi job hoàn tất. Tác vụ dọn lỗi có retry.
- Backup và thử restore **cả hai PostgreSQL và SeaweedFS**; lưu bản sao ngoài VPS. Xóa dữ liệu cá nhân phải đi qua cả metadata, object và chunks.
