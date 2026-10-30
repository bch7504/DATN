# AI services

- `indexing.py`: PDF → pages → chunks → embedding theo lô → repository.
- `retrieval.py`: điều phối tìm kiếm hybrid và kiểm tra quyền lần nữa sau repository.
- `reranking.py`: LangChain rerank ứng viên theo độ liên quan, trang hiện tại và độ đa dạng.
- `grounded_generation.py`: hỏi đáp, tóm tắt phạm vi trang và sinh Quiz có citation.
- `orchestrator.py`: một tác nhân chọn đúng ba công cụ; thiếu thông tin phải hỏi lại.
- `assistant_runs.py`: replay theo request ID để chat không sinh Quiz trùng khi retry.
- `idempotent_quiz.py`: bảo vệ luồng sinh Quiz trực tiếp bằng operation key.

Các service trả bản nháp/kết quả AI; không cập nhật Quiz lifecycle, chấm điểm hoặc tiến độ. Java phải kiểm quyền trước và validate/revalidate sau khi nhận kết quả.

Guardrails bắt buộc: scope do Java cấp không được LLM sửa; cả vector search và full-text search đều lọc scope trước khi xếp hạng; kết quả được lọc lại sau retrieval; prompt/PDF là dữ liệu không đáng tin; output phải đúng schema và citation phải trỏ tới evidence đã cấp. Không đủ bằng chứng thì trả `NO_EVIDENCE`.
