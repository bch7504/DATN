# AI services

- `indexing.py`: PDF → pages → chunks → embedding theo lô → repository.
- `retrieval.py`: kiểm tra scope và vector; kiểm tra quyền lần nữa sau repository.
- `grounded_generation.py`: hỏi đáp, tóm tắt phạm vi trang và sinh Quiz có citation.
- `orchestrator.py`: một tác nhân chọn đúng ba công cụ; thiếu thông tin phải hỏi lại.
- `assistant_runs.py`: replay theo request ID để chat không sinh Quiz trùng khi retry.
- `idempotent_quiz.py`: bảo vệ luồng sinh Quiz trực tiếp bằng operation key.

Các service trả bản nháp/kết quả AI; không cập nhật Quiz lifecycle, chấm điểm hoặc tiến độ. Java phải kiểm quyền trước và validate/revalidate sau khi nhận kết quả.
