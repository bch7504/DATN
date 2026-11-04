# Trạng thái triển khai AI Service — 03/11/2026

Phạm vi: Python AI Service và trạng thái tích hợp Java/Object Storage liên quan. Tài liệu này ghi nhận phần đã hiện thực và kiểm tra; không thay thế tiêu chí nghiệm thu bằng dữ liệu thật của kế hoạch toàn dự án.

| Nhóm mốc | Đã hiện thực trong Python | Còn thiếu để nghiệm thu |
|---|---|---|
| M0 — Nền tảng | FastAPI, service auth, cấu hình, model/repository, 6 migration, OpenRouter adapter, LangChain Core và dependency injection; migration và role isolation đã kiểm tra trên PostgreSQL/pgvector local | Đối chiếu cấu hình môi trường triển khai thực tế |
| M1 — Contract/vận hành nền | Schema v3, camelCase, error envelope, request ID, counters, DTO Java và contract test hai phía | Export metrics vào hệ thống giám sát nếu cần |
| M2 — Tài liệu | PDF parser, chunking không mất chữ, đọc block theo bố cục, tách bảng Markdown, giữ công thức LaTeX, page-level Vision cho ảnh nhúng/sơ đồ vector, embedding batch, index/deindex API, hàng đợi, worker lease/retry/fencing, lưu vector, chống trùng; live đạt 48/48 trang, 354 block, 7 bảng và 40 trang có LaTeX trên bốn Slide PDF Kỹ thuật số | Integration test cạnh tranh nhiều worker/revoke; đánh giá thủ công chất lượng kỹ thuật của mẫu caption/bảng/công thức |
| M3 — Hỏi đáp/tóm tắt/Tutor | Hybrid search (cosine + full-text), RRF, LLM reranker theo batch có schema và giảm trùng lặp, lọc quyền hai lớp, ưu tiên trang hiện tại, citation, NO_EVIDENCE, hỏi đáp và tóm tắt trong Personal Assistant | Live 04/11/2026: 12 ca, recall@8 100%, citation precision 60%, NO_EVIDENCE 100%; còn human groundedness và thử thu hồi quyền Java → Python |
| M4 — Quiz | Student/Teacher scope, đúng 4 phương án, một đáp án, số câu, nguồn, replay theo key; nhập Quiz từ văn bản có nguồn IMPORTED_TEXT và hỏi lại khi thiếu dữ liệu; Java đã có lưu bản nháp, duyệt/công bố và validate output | Import văn bản đã pass OpenRouter live 04/11/2026; còn cạnh tranh request trên DB thật và E2E Quiz Assignment |
| M5 — Quan sát/đánh giá | Metadata an toàn, safe error, kiểm tra input/output; 12 ca live: recall@8 100%, citation location 64,29%, `NO_EVIDENCE` 100% | Tách final holdout và người đánh giá chấm groundedness/factual correctness |
| M6 — Hoàn thiện | Test hồi quy offline cho phân quyền, nguồn, PDF, vector, retry, schema và migration; CLI nghiệm thu Vision không in nội dung tài liệu | Hybrid RAG live sau nâng cấp, kiểm thử tải và hoàn thiện triển khai |

## Giới hạn hiện tại

### Kiểm tra offline mới nhất

- `uv run --offline ruff check .` và `uv run --offline ruff format --check .`.
- `pytest`: 104 ca đạt; một ca PostgreSQL/pgvector opt-in được bỏ qua trong lượt mặc định.
- Migration hybrid search đã chạy bằng role `studyflow_ai`; kiểm tra `vector(1024)`, HNSW cosine, generated `tsvector`, GIN, chống chunk trùng và retrieval tích hợp đều đạt.
- `uv run --offline python -m app.workers.documents --help`: CLI worker nạp được; không khởi chạy worker hoặc kết nối database.
- `python -m evals --synthetic`: kiểm tra công thức đánh giá; không phải số đo chất lượng mô hình thật.
- `python -m evals --live-vietnamese --k 8`: 12 ca đã chạy thật với GPT-5.6 Luna và Text Embedding 3 Large; recall@8 = 1,0, citation location precision = 0,6429, `NO_EVIDENCE` accuracy = 1,0; human groundedness chưa chấm.
- `python -m evals --live-vision ...`: bốn Slide PDF Kỹ thuật số, 48 trang, 48 lượt page-level Vision thành công và 0 lỗi bằng GPT-5.6 Luna; báo cáo không chứa nội dung PDF hoặc caption.
- Cùng lượt live Vision: 354 block bố cục, 7 bảng Markdown và 40/48 trang có LaTeX; không lưu nội dung trích xuất trong báo cáo.

Đã bổ sung khóa giao dịch theo document/version trước khi nhận job, thu hồi và ghi chỉ mục; test offline xác nhận câu SQL/thứ tự khóa, **chưa chứng minh concurrency trên PostgreSQL thật**. Hủy yêu cầu sinh Quiz có ghi trạng thái thất bại; output bị provider cắt ngắn/refusal bị chặn. Không thay endpoint/schema thành công trong đợt củng cố này; error response bỏ `requestId` nếu header không đúng định dạng.

### Các giới hạn cần nghiệm thu tiếp

- Bốn Course Material PDF môn Kỹ thuật số đã chạy Hybrid RAG live sau nâng cấp. Chưa chạy đủ 56 PDF của bảy môn.
- Đã chạy PostgreSQL/pgvector và Object Storage bằng Docker local; chưa kiểm tra cạnh tranh nhiều worker/thu hồi đồng thời.
- Python không tự truy vấn dữ liệu enrollment/publication; Java phải dựng scope và kiểm tra lại quyền trước khi trả nội dung hoặc lưu Quiz.
- Model Vision mặc định là `openai/gpt-5.6-luna`, đã xác minh nhận ảnh trên tài khoản OpenRouter bằng 48 trang Kỹ thuật số. Model chat/structured output vẫn cần được kiểm lại khi nhà cung cấp thay đổi catalog.
- `health.readiness` mới kiểm tra sự hiện diện của cấu hình. Một giá trị `READY` không chứng minh kết nối provider/database hoạt động.
- Tóm tắt giới hạn 50 chunks để không cắt ngầm nội dung. Với tài liệu dài cần chọn phạm vi trang hẹp hơn; chưa có tóm tắt phân cấp cho toàn bộ giáo trình dài.
- Index worker giữ tối đa một PDF đã giới hạn 50 MiB/500 trang/2 triệu ký tự trích xuất trong bộ nhớ. Chưa benchmark PDF phức tạp, thời gian render/parse và nhiều worker cùng lúc.
- Index job có lease và khôi phục sau worker crash. Run tạo câu trả lời/Quiz đang `RUNNING` khi tiến trình bị kill cần được đối soát bằng metadata; không tự gọi LLM lại vì có thể sinh kết quả khác. Java phải quản lý timeout và tạo operation identity mới khi người dùng thực sự thử lại.
- Structured output/citation validation kiểm tra hình dạng và nguồn hợp lệ; không chứng minh mọi phát biểu đều đúng về ngữ nghĩa. Cần đánh giá groundedness độc lập.
- Runtime dùng LLM reranker qua OpenRouter, chia tối đa 12 ứng viên mỗi structured call và kiểm tra chính xác evidence ID theo batch lẫn toàn bộ tập. Test ngoại tuyến dùng scorer xác định và không gọi OpenRouter thật.
- Counters trong bộ nhớ mất khi restart và không tổng hợp xuyên nhiều process.

## Trạng thái contract Java ↔ Python

Xem [CONTRACT_V3.md](CONTRACT_V3.md). DTO Java, policy signed URL và `docs/api-plan.md` đã được đồng bộ với schema v3.

Danh sách nghiệm thu còn lại: [INTEGRATION_CHECKLIST.md](INTEGRATION_CHECKLIST.md).

Contract test hiện đã bao phủ wrapper `result`, `generationArgs`, scope theo trang, API index trả `202`, polling, `pipelineVersion` và chính sách URL local/production. Việc còn lại là nghiệm thu end-to-end với provider thật và bộ dữ liệu được phép sử dụng.
