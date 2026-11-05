# StudyFlow AI Service

Python AI Service xử lý PDF, hỏi đáp có nguồn, tóm tắt, Course Material AI Tutor và sinh bản nháp Quiz. Java vẫn quyết định quyền truy cập, lưu Quiz, chấm điểm, tiến độ và kế hoạch học tập.

## Trạng thái hiện tại

Đã có implementation Python và kiểm thử offline cho:

- FastAPI application factory và ASGI entry point.
- Cả 7 endpoint nội bộ: health, index, deindex, job polling, Personal Assistant, Course Material Tutor và sinh Quiz.
- Bắt buộc X-Request-Id và X-Schema-Version: 4.
- Error envelope có cấu trúc, không trả secret hoặc chi tiết nội bộ.
- Unit/contract test dùng dữ liệu tổng hợp.
- Khi chạy local, cấu hình tự đọc file `.env` ở root repository; biến môi trường của tiến trình luôn ưu tiên cao hơn.
- Alembic với 6 migration tiến; bảng và version table đều thuộc schema `ai`.
- PDF có text layer → chia đoạn theo trang → embedding 1024 chiều → pgvector.
- Trang có ảnh nhúng hoặc sơ đồ vector được render toàn trang và gọi Vision tối đa một lần;
  giới hạn số trang/pixel/context/caption và timeout chặn chi phí không giới hạn; lỗi Vision
  không làm mất text layer. Caption Vision không thể thay thế text layer bắt buộc của PDF.
- Chữ được đọc theo thứ tự block của trang; vùng bảng được tách khỏi chữ thường và chuyển
  thành Markdown có giới hạn số bảng/số ô; công thức do Vision trả về giữ delimiter LaTeX.
- Hàng đợi PostgreSQL, worker lease/fencing, retry có giới hạn và deindex.
- Khóa giao dịch theo tài liệu/phiên bản để tuần tự hóa index–deindex, kể cả khi chưa có bản ghi index; mọi pipeline cùng phiên bản dùng chung khóa.
- Truy xuất hybrid kết hợp pgvector cosine và PostgreSQL full-text search, hợp nhất bằng Reciprocal Rank Fusion (RRF), sau đó dùng LLM reranker qua OpenRouter để chấm từng đoạn theo cấu trúc cố định; LangChain kết hợp điểm này với RRF, trang hiện tại và độ đa dạng.
- Truy xuất lọc document/version/owner/source/page trước cả hai nhánh tìm kiếm và kiểm tra lại sau rerank.
- Một Orchestrator chọn đúng một trong bốn tool: hỏi đáp PDF, tóm tắt PDF, sinh Quiz có nguồn hoặc nhập Quiz từ văn bản; phạm vi PDF luôn do Java cấp.
- Course Material Tutor nhận tối đa 12 lượt short-term memory do Java cấp, viết lại câu hỏi
  nối tiếp thành truy vấn độc lập và dùng current page + authorized evidence làm working memory.
  Long-term memory thuộc Java; Python không lưu hoặc tự tải lịch sử người dùng.
- Tóm tắt đọc toàn bộ phạm vi trang trong giới hạn 50 chunks; yêu cầu thu hẹp phạm vi nếu vượt giới hạn.
- Citation dựng từ nguồn đã truy xuất; có thể trả `NO_EVIDENCE` trước hoặc sau bước tạo nội dung.
- Guardrails chặn mở rộng scope từ prompt, tách system rule khỏi prompt/PDF không đáng tin, giới hạn input/context, bắt buộc structured output và kiểm tra lại citation bằng code.
- Quiz đúng 4 lựa chọn, 1 đáp án đúng, đúng số câu và nguồn; cache kết quả theo khóa yêu cầu.
- Trợ lý cá nhân chống chạy trùng theo `X-Request-Id`, kể cả khi công cụ được chọn là sinh Quiz.
- OpenRouter adapter kiểm tra cấu trúc JSON, vector và thứ tự embedding; test dùng HTTP transport giả.
- Kết quả bị cắt ngắn hoặc bị nhà cung cấp từ chối được coi là lỗi, không giả thành `NO_EVIDENCE`; chỉ mã truy vết đúng định dạng mới được trả lại trong response.
- Đếm request và latency theo route cố định trong bộ nhớ; không ghi prompt, URL tài liệu hoặc nội dung PDF.

Đã kiểm tra migration, index lặp và Hybrid retrieval có giới hạn quyền với PostgreSQL/pgvector local. Ngày 04/11/2026, pipeline hiện tại được lập chỉ mục lại từ đủ bốn chương Kỹ thuật số (139 trang, 345 chunk) và chạy 12 ca tiếng Việt: retrieval recall@8 = 100%, citation location precision = 60% và `NO_EVIDENCE` accuracy = 100%. Human groundedness vẫn cần người đánh giá độc lập nên chưa công bố KPI factual correctness. `health.readiness` phản ánh **đủ cấu hình**, không phải kết quả kiểm tra kết nối từng dịch vụ.

Nghiệm thu Vision ngày 03/11/2026 trên bốn Slide PDF môn Kỹ thuật số đạt 48/48
trang được mô tả thành công, không có lỗi provider, bằng `openai/gpt-5.6-luna`. Báo cáo
chỉ lưu số liệu xử lý, không in nội dung PDF, prompt hoặc caption. Kết quả này xác nhận
đường xử lý ảnh/vector hoạt động; chất lượng kỹ thuật của từng caption vẫn cần đánh giá mẫu
độc lập trước khi dùng làm KPI nội dung.

Cùng bộ tài liệu trên, bộ trích xuất layout ghi nhận 354 block theo thứ tự đọc, 7 bảng
Markdown và 40/48 trang có công thức LaTeX; cả bốn tài liệu đều hoàn tất mà không vượt
giới hạn tài nguyên. Đây là nghiệm thu kỹ thuật trích xuất, không phải điểm đánh giá tính đúng
ngữ nghĩa của từng bảng hoặc công thức.

Ngày 04/11/2026, luồng nhập Quiz từ văn bản được gọi live qua OpenRouter với một đề đầy
đủ và một đề thiếu đáp án. Ca đầy đủ trả 2 câu MCQ_SINGLE, mỗi câu đúng 4 phương án,
một đáp án, citation rỗng và nguồn `IMPORTED_TEXT`; ca thiếu đáp án trả câu hỏi làm rõ.
Báo cáo không lưu hoặc in nội dung Quiz do mô hình trả về.

Chi tiết giao tiếp Python hiện thực nằm tại [CONTRACT_V3.md](CONTRACT_V3.md); các việc còn lại và trạng thái từng nhóm mốc nằm tại [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Chạy local bằng uv

Yêu cầu uv. uv sẽ quản lý Python 3.12 và dependency trong môi trường riêng của service.

1. Chuyển vào thư mục services/ai.
2. Chạy uv sync --dev.
3. Local: sao chép `.env.example` thành `.env` ở root và điền cấu hình. Deployment/Docker có thể cấp biến môi trường trực tiếp; giá trị này sẽ ghi đè giá trị trong file.
4. Trên database dành cho dự án, chạy `uv run alembic upgrade head`. Database role cần quyền tạo schema `ai`; extension `vector` cần được quản trị cấp quyền/cài trước khi dùng role hạn chế.
5. Chạy API: `uv run uvicorn app.asgi:app --host 127.0.0.1 --port 8001 --no-access-log`.
6. Chạy worker bằng tiến trình riêng: `uv run python -m app.workers.documents`.
7. Gọi `GET http://127.0.0.1:8001/internal/v1/health` với Bearer token, `X-Request-Id` và `X-Schema-Version: 4`.

Chỉ chạy `health` cần `INTERNAL_SERVICE_TOKEN`. Các luồng AI đầy đủ cần:

| Biến | Ý nghĩa |
|---|---|
| `INTERNAL_SERVICE_TOKEN` | Token Java → Python, tối thiểu 16 ký tự không tính padding |
| `AI_DATABASE_URL` | PostgreSQL connection URL của role chỉ được dùng schema `ai` |
| `OPENROUTER_API_KEY` | Key chỉ cấp cho tiến trình Python |
| `OPENROUTER_BASE_URL` | Mặc định `https://openrouter.ai/api/v1` |
| `OPENROUTER_CHAT_MODEL` | ID theo cấu hình; mặc định theo plan hiện có, cần kiểm chứng trên tài khoản trước demo thật |
| `AI_VISION_MODEL` | Model OpenRouter nhận ảnh; mặc định `openai/gpt-5.6-luna` |
| `AI_ENABLE_IMAGE_EXTRACTION` | Bật/tắt enrichment ảnh; mặc định `true` |
| `AI_VISION_MAX_PAGES_PER_DOCUMENT` | Số trang Vision tối đa mỗi PDF; mặc định 100 |
| `AI_VISION_TIMEOUT_SECONDS` | Timeout từng trang Vision; mặc định 20 giây |
| `AI_VISION_MAX_CONTEXT_CHARACTERS` | Text context tối đa gửi kèm một trang; mặc định 400 ký tự |
| `AI_VISION_MAX_CAPTION_CHARACTERS` | Caption tối đa được đưa vào index; mặc định 4.000 ký tự |
| `AI_VISION_MAX_RENDER_PIXELS` | Số pixel render tối đa mỗi trang; mặc định 4.000.000 |
| `OPENROUTER_EMBEDDING_MODEL` | Mặc định `openai/text-embedding-3-large`, query và tài liệu phải cùng model |
| `AI_RETRIEVAL_CANDIDATE_LIMIT` | Số ứng viên hybrid trước rerank, mặc định 32 |
| `AI_RETRIEVAL_MINIMUM_RELEVANCE` | Ngưỡng bằng chứng tối thiểu, mặc định 0.3 |
| `AI_RETRIEVAL_RRF_K` | Hằng số làm mượt Reciprocal Rank Fusion, mặc định 60 |
| `AI_RERANK_DIVERSITY_PENALTY` | Mức giảm điểm đoạn gần trùng nhau sau khi LLM chấm, mặc định 0.15 |
| `STORAGE_ENDPOINT` | Origin kho tệp cho phép tải signed URL; production dùng HTTPS, worker không theo redirect sang origin khác |
| `AI_ALLOW_INSECURE_LOCAL_STORAGE_URL` | Mặc định `false`; chỉ bật local để chấp nhận HTTP trên `localhost`, `127.0.0.1` hoặc `::1` |
| `AI_JOB_MAX_ATTEMPTS` | Số lần xử lý tối đa, mặc định 3 |
| `AI_JOB_RETRY_BASE_SECONDS` | Backoff gốc, mặc định 2 giây, tăng dần và chặn ở 60 giây |
| `AI_WORKER_POLL_SECONDS` | Khoảng chờ khi hàng đợi trống, mặc định 2 giây |

LLM reranker dùng chính `OPENROUTER_CHAT_MODEL`. Ứng viên đã lọc quyền được chia thành batch tối đa 12 đoạn để structured output ổn định; mỗi batch trả điểm 0..1 cho đúng toàn bộ evidence ID, sau đó code kiểm tra lại cả từng batch và toàn bộ tập. Reranker không được trả lời câu hỏi hoặc thêm evidence ID. Embedding hiện cố định 1024 chiều. Thay model hoặc cấu hình chỉ mục phải dùng `pipelineVersion` mới và index lại; không đổi metadata của chỉ mục cũ để giả vờ tương thích.

Worker có `--once` để xử lý tối đa một job; `--poll-seconds` ghi đè khoảng chờ. Mỗi job có lease 600 giây; job cũ mất lease hoặc bị thu hồi không được ghi kết quả. Lỗi PDF không hợp lệ/không có text layer không retry. Chỉ lỗi tải file/embedding tạm thời mới retry, không áp dụng retry này cho sinh câu trả lời/Quiz.

Chạy kiểm tra: `uv run ruff check .`, `uv run ruff format --check .`, `uv run pytest`. Kiểm tra công thức: `uv run python -m evals --synthetic`. Đánh giá RAG thật: `uv run python -m evals --live-vietnamese --k 8`. Đánh giá Vision thật trên thư mục đã được cấp quyền: `uv run python -m evals --live-vision --document-dir <thu-muc-pdf>`; local tự đọc cấu hình từ `.env` ở root. Kết quả synthetic không phải điểm chất lượng mô hình.

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
- Mọi câu trả lời, tóm tắt và câu hỏi sinh từ PDF phải có nguồn theo documentId và pageNumber. Quiz nhập từ văn bản phải mang nguồn `IMPORTED_TEXT`, không có citation và không được coi là đã kiểm chứng.
- Quiz là MCQ_SINGLE: đúng bốn lựa chọn và một đáp án đúng.
- Chỉ nhận Personal PDF và Course Material `SLIDE_PDF` có text layer từ Java; `REFERENCE_PDF` không được gửi sang Python để lập chỉ mục/Tutor/Quiz. Không OCR, PPTX hoặc DOCX trong MVP.
- Không chấm Quiz, cập nhật progress, Study Plan, Streak hoặc Daily Goal.
- Không log document content, prompt, token, signed URL hoặc secret.
