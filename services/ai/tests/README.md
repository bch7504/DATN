# AI tests

Đã có test cho:

- Service token, request ID, schema version, endpoint input/output và lỗi an toàn.
- PDF tổng hợp, trang trắng, encrypted/text-layer, chia đoạn không mất nội dung.
- Owner/document/version/page isolation, SQL giữ đầy đủ filter và model embedding.
- Citation từ evidence, NO_EVIDENCE, summary không cắt ngầm tài liệu dài.
- Router hỏi đáp/tóm tắt/Quiz, thiếu options thì hỏi lại.
- MCQ_SINGLE, replay/identity conflict, request đang xử lý, không gọi LLM lặp mù.
- Storage origin, giới hạn file, redirect, worker lease/fencing và retry policy.
- OpenRouter request/response bằng HTTP transport giả, JSON Schema và thứ tự embedding.
- Toàn bộ chuỗi migration render offline; công thức đánh giá và telemetry an toàn.
- PDF tổng hợp → parser/chunk/embedding → retrieval → provider adapter → HTTP response cho hỏi đáp cá nhân, tóm tắt, Quiz trong chat, Course Tutor và Teacher Quiz; API retry của chat không gọi model lần nữa. Storage/database/model đều giả lập, không phải E2E thật.
- Thứ tự khóa giao dịch trước khi kiểm tra thu hồi, không ghi dữ liệu khi worker mất lease; hủy Quiz request có đánh dấu thất bại.
- Provider bị cắt output/refusal không trả thành `NO_EVIDENCE`; header không hợp lệ không được phản chiếu ra response.

Mọi test dùng dữ liệu/cấu hình tổng hợp; không đọc `.env`, gọi OpenRouter thật hoặc dùng tài liệu người dùng. Chạy `uv run pytest`. Test hiện chưa kiểm chứng transaction/concurrency trên PostgreSQL thật và chưa phải demo Java–Python end-to-end.
