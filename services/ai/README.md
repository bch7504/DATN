# StudyFlow AI Service

Python AI Service xử lý PDF, hỏi đáp có nguồn, tóm tắt, Course Material AI Tutor và sinh bản nháp Quiz. Java vẫn quyết định quyền truy cập, lưu Quiz, chấm điểm, tiến độ và kế hoạch học tập.

## Trạng thái hiện tại

Đã có implementation Python và kiểm thử offline cho:

- FastAPI application factory và ASGI entry point.
- Cả 7 endpoint nội bộ: health, index, deindex, job polling, Personal Assistant, Course Material Tutor và sinh Quiz.
- Bắt buộc X-Request-Id và X-Schema-Version: 3.
- Error envelope có cấu trúc, không trả secret hoặc chi tiết nội bộ.
- Unit/contract test dùng dữ liệu tổng hợp.
- Cấu hình chỉ đọc từ process environment; ứng dụng không tự đọc file .env.
- Alembic với 5 migration tiến; bảng và version table đều thuộc schema `ai`.
- PDF có text layer → chia đoạn theo trang → embedding 1024 chiều → pgvector.
- Hàng đợi PostgreSQL, worker lease/fencing, retry có giới hạn và deindex.
- Khóa giao dịch theo tài liệu/phiên bản để tuần tự hóa index–deindex, kể cả khi chưa có bản ghi index; mọi pipeline cùng phiên bản dùng chung khóa.
- Truy xuất lọc document/version/owner/source/page trước khi xếp hạng và kiểm tra lại sau truy xuất.
- Một Orchestrator chọn hỏi đáp, tóm tắt hoặc sinh Quiz; phạm vi tài liệu luôn do Java cấp.
- Tóm tắt đọc toàn bộ phạm vi trang trong giới hạn 50 chunks; yêu cầu thu hẹp phạm vi nếu vượt giới hạn.
- Citation dựng từ nguồn đã truy xuất; có thể trả `NO_EVIDENCE` trước hoặc sau bước tạo nội dung.
- Quiz đúng 4 lựa chọn, 1 đáp án đúng, đúng số câu và nguồn; cache kết quả theo khóa yêu cầu.
- Trợ lý cá nhân chống chạy trùng theo `X-Request-Id`, kể cả khi công cụ được chọn là sinh Quiz.
- OpenRouter adapter kiểm tra cấu trúc JSON, vector và thứ tự embedding; test dùng HTTP transport giả.
- Kết quả bị cắt ngắn hoặc bị nhà cung cấp từ chối được coi là lỗi, không giả thành `NO_EVIDENCE`; chỉ mã truy vết đúng định dạng mới được trả lại trong response.
- Đếm request và latency theo route cố định trong bộ nhớ; không ghi prompt, URL tài liệu hoặc nội dung PDF.

Đã kiểm tra migration, index lặp và retrieval có giới hạn quyền với PostgreSQL/pgvector local bằng PDF tổng hợp. Chưa nghiệm thu Object Storage thật, Java hoặc OpenRouter thật. `health.readiness` hiện phản ánh **đủ cấu hình**, không phải kết quả kiểm tra kết nối từng dịch vụ. Chưa khẳng định model mặc định khả dụng hoặc đạt KPI đánh giá chất lượng.

Chi tiết giao tiếp Python hiện thực nằm tại [CONTRACT_V3.md](CONTRACT_V3.md); các việc còn lại và trạng thái từng nhóm mốc nằm tại [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Chạy local bằng uv

Yêu cầu uv. uv sẽ quản lý Python 3.12 và dependency trong môi trường riêng của service.

1. Chuyển vào thư mục services/ai.
2. Chạy uv sync --dev.
3. Cấp các biến môi trường bên dưới bằng công cụ triển khai; không có cơ chế tự đọc `.env`.
4. Trên database dành cho dự án, chạy `uv run alembic upgrade head`. Database role cần quyền tạo schema `ai`; extension `vector` cần được quản trị cấp quyền/cài trước khi dùng role hạn chế.
5. Chạy API: `uv run uvicorn app.asgi:app --host 127.0.0.1 --port 8001 --no-access-log`.
6. Chạy worker bằng tiến trình riêng: `uv run python -m app.workers.documents`.
7. Gọi `GET http://127.0.0.1:8001/internal/v1/health` với Bearer token, `X-Request-Id` và `X-Schema-Version: 3`.

Chỉ chạy `health` cần `INTERNAL_SERVICE_TOKEN`. Các luồng AI đầy đủ cần:

| Biến | Ý nghĩa |
|---|---|
| `INTERNAL_SERVICE_TOKEN` | Token Java → Python, tối thiểu 16 ký tự không tính padding |
| `AI_DATABASE_URL` | PostgreSQL connection URL của role chỉ được dùng schema `ai` |
| `OPENROUTER_API_KEY` | Key chỉ cấp cho tiến trình Python |
| `OPENROUTER_BASE_URL` | Mặc định `https://openrouter.ai/api/v1` |
| `OPENROUTER_CHAT_MODEL` | ID theo cấu hình; mặc định theo plan hiện có, cần kiểm chứng trên tài khoản trước demo thật |
| `OPENROUTER_EMBEDDING_MODEL` | Mặc định `openai/text-embedding-3-large`, query và tài liệu phải cùng model |
| `STORAGE_ENDPOINT` | HTTPS origin cho phép tải signed URL; worker không theo redirect sang origin khác |
| `AI_JOB_MAX_ATTEMPTS` | Số lần xử lý tối đa, mặc định 3 |
| `AI_JOB_RETRY_BASE_SECONDS` | Backoff gốc, mặc định 2 giây, tăng dần và chặn ở 60 giây |
| `AI_WORKER_POLL_SECONDS` | Khoảng chờ khi hàng đợi trống, mặc định 2 giây |

Embedding hiện cố định 1024 chiều. Thay model hoặc cấu hình chỉ mục phải dùng `pipelineVersion` mới và index lại; không đổi metadata của chỉ mục cũ để giả vờ tương thích.

Worker có `--once` để xử lý tối đa một job; `--poll-seconds` ghi đè khoảng chờ. Mỗi job có lease 600 giây; job cũ mất lease hoặc bị thu hồi không được ghi kết quả. Lỗi PDF không hợp lệ/không có text layer không retry. Chỉ lỗi tải file/embedding tạm thời mới retry, không áp dụng retry này cho sinh câu trả lời/Quiz.

Chạy kiểm tra: `uv run ruff check .`, `uv run ruff format --check .`, `uv run pytest`. Chạy kiểm tra công thức đánh giá: `uv run python -m evals --synthetic`. Kết quả synthetic không phải điểm chất lượng mô hình.

Kiểm thử tích hợp pgvector là opt-in: đặt `STUDYFLOW_RUN_POSTGRES_INTEGRATION=1` cùng `AI_DATABASE_URL`, rồi chạy `pytest tests/test_postgres_pgvector_integration.py`. Test tự tạo PDF có lớp văn bản trong bộ nhớ, dùng embedding xác định và tự xóa dữ liệu kiểm thử; không đọc tài liệu thật hoặc gọi OpenRouter.

## Cấu trúc

- app/api: các địa chỉ nội bộ Java gọi Python.
- app/clients: kết nối dịch vụ tạo nội dung, tìm kiếm và kho tệp.
- app/core: cấu hình, xác thực nội bộ và lỗi an toàn.
- app/pipelines/parsers: đọc PDF theo trang.
- app/repositories: dữ liệu thuộc khu vực ai và tìm kiếm theo nội dung.
- app/schemas: cấu trúc dữ liệu vào và ra.
- app/services: hỏi đáp, tóm tắt, Tutor và sinh Quiz.
- app/workers: công việc xử lý tài liệu phía sau.
- migrations: thay đổi cơ sở dữ liệu theo từng phiên bản.
- tests và evals: kiểm thử bằng dữ liệu tổng hợp.

## Ranh giới bắt buộc

- Chỉ nhận phạm vi tài liệu đã được Java cho phép.
- Không tự đọc bảng người dùng, thành viên lớp, lượt làm Quiz hoặc kế hoạch học tập.
- Thiếu bằng chứng phải trả NO_EVIDENCE.
- Mọi câu trả lời, tóm tắt và câu hỏi phải có nguồn theo documentId và pageNumber.
- Quiz là MCQ_SINGLE: đúng bốn lựa chọn và một đáp án đúng.
- Chỉ nhận Personal PDF và Course Material PDF có text layer; không OCR, PPTX hoặc DOCX trong MVP.
- Không chấm Quiz, cập nhật progress, Study Plan, Streak hoặc Daily Goal.
- Không log document content, prompt, token, signed URL hoặc secret.
