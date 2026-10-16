# Document worker

Worker nhận công việc index/deindex cho hai loại nguồn:

- PERSONAL_PDF của Sinh viên.
- COURSE_MATERIAL_PDF do Giảng viên công bố.

Chạy `uv run python -m app.workers.documents` sau khi đã migrate database và cấp environment cho Python. Thêm `--once` để xử lý tối đa một job; dùng `--poll-seconds` nếu cần ghi đè khoảng chờ mặc định.

Worker claim job bằng `FOR UPDATE SKIP LOCKED`, có lease 600 giây và token riêng. Trước khi lưu chunks phải khóa và kiểm tra lại token/lease. Thu hồi tài liệu sẽ vô hiệu hóa index và hủy claim cũ; worker cũ không được ghi kết quả sau đó.

Chỉ retry lỗi transport, HTTP 429 và 5xx của download/embedding; backoff tăng dần, tối đa 60 giây, tổng lần xử lý theo `AI_JOB_MAX_ATTEMPTS`. PDF không có text layer, encrypted, sai định dạng hoặc link hết quyền là lỗi terminal. Không dùng policy này cho LLM tạo câu trả lời/Quiz.

Job thành công lưu metadata và dọn signed URL. Chỉ có index/deindex data thuộc schema `ai` bị thay đổi. Exit code: 0 hoàn tất, 1 lỗi khởi động/phụ thuộc, 130 bị ngắt. Không in secret hoặc exception chứa nội dung tài liệu.
