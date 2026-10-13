# Trạng thái triển khai AI Service — 12/10/2026

Phạm vi: `AI_AGENT`, chỉ code và tài liệu trong `services/ai`. Tài liệu này ghi nhận phần đã hiện thực và kiểm tra; không thay thế tiêu chí nghiệm thu tích hợp của kế hoạch toàn dự án.

| Nhóm mốc | Đã hiện thực trong Python | Còn thiếu để nghiệm thu |
|---|---|---|
| M0 — Nền tảng | FastAPI, service auth, cấu hình, model/repository, 5 migration, OpenRouter adapter, dependency injection | Chạy migration trên PostgreSQL thử nghiệm có pgvector; kiểm tra role không có quyền schema `app` |
| M1 — Contract/vận hành nền | Schema v3, camelCase, error envelope, request ID, counters và latency không chứa dữ liệu nhạy cảm | Đối chiếu DTO và chạy contract test phía Java; export metrics vào hệ thống giám sát nếu cần |
| M2 — Tài liệu | PDF parser, chunking không mất chữ, embedding batch, index/deindex API, hàng đợi, worker lease/retry/fencing, lưu vector, chống trùng | Integration test transaction/concurrency/revoke trên PostgreSQL thật; thử signed URL từ Storage của dự án |
| M3 — Hỏi đáp/tóm tắt/Tutor | Lọc quyền hai lớp, ưu tiên trang hiện tại, citation, NO_EVIDENCE, hỏi đáp và tóm tắt trong Personal Assistant, lịch sử hội thoại có giới hạn | Đánh giá tiếng Việt với mô hình thật; điều chỉnh ngưỡng retrieval; thử thu hồi quyền trong luồng Java → Python |
| M4 — Quiz | Student/Teacher scope, đúng 4 phương án, một đáp án, số câu, nguồn, replay theo key; chat cũng chống chạy trùng theo request ID | Tích hợp Java lưu bản nháp/duyệt/công bố; kiểm thử provider và cạnh tranh request trên DB thật |
| M5 — Quan sát/đánh giá | Metadata an toàn, safe error, kiểm tra input/output, bộ tính recall/citation/abstention, điểm grounding chỉ dùng khi có nhãn người đánh giá | Chuẩn bị tập kiểm chứng tiếng Việt đủ đại diện; latency dưới tải, theo dõi lỗi thật |
| M6 — Hoàn thiện | Test hồi quy offline cho phân quyền, nguồn, PDF, vector, retry, schema và migration | Demo end-to-end, đánh giá chất lượng thật, kiểm thử tải và hoàn thiện triển khai |

## Giới hạn hiện tại

### Kiểm tra offline mới nhất

- `uv run --offline ruff check .` và `uv run --offline ruff format --check .`.
- `uv run --offline pytest`: bộ kiểm thử có 76 ca, bao gồm 5 luồng xuyên qua các thành phần Python với PDF tổng hợp và HTTP provider giả lập.
- `uv run --offline python -m app.workers.documents --help`: CLI worker nạp được; không khởi chạy worker hoặc kết nối database.
- `uv run --offline python -m evals --synthetic`: kiểm tra công thức đánh giá; không phải số đo chất lượng mô hình thật.

Đã bổ sung khóa giao dịch theo document/version trước khi nhận job, thu hồi và ghi chỉ mục; test offline xác nhận câu SQL/thứ tự khóa, **chưa chứng minh concurrency trên PostgreSQL thật**. Hủy yêu cầu sinh Quiz có ghi trạng thái thất bại; output bị provider cắt ngắn/refusal bị chặn. Không thay endpoint/schema thành công trong đợt củng cố này; error response bỏ `requestId` nếu header không đúng định dạng.

### Các giới hạn cần nghiệm thu tiếp

- Chưa gọi API AI thật hoặc sử dụng tài liệu người dùng; chưa đo độ chính xác trả lời hay chất lượng câu hỏi của model.
- Chưa chạy PostgreSQL/Storage/Docker trong phiên triển khai này. Test SQL hiện gồm kiểm tra câu truy vấn, test repository bằng double và render migration offline; chưa thay thế integration test PostgreSQL.
- Python không tự truy vấn dữ liệu enrollment/publication; Java phải dựng scope và kiểm tra lại quyền trước khi trả nội dung hoặc lưu Quiz.
- ID model chat mặc định giữ theo cấu hình kế hoạch; chưa xác minh model đó có trên tài khoản OpenRouter hoặc hỗ trợ toàn bộ schema hiện dùng.
- `health.readiness` mới kiểm tra sự hiện diện của cấu hình. Một giá trị `READY` không chứng minh kết nối provider/database hoạt động.
- Tóm tắt giới hạn 50 chunks để không cắt ngầm nội dung. Với tài liệu dài cần chọn phạm vi trang hẹp hơn; chưa có tóm tắt phân cấp cho toàn bộ giáo trình dài.
- Index worker giữ tối đa một PDF đã giới hạn 50 MiB/500 trang/2 triệu ký tự trích xuất trong bộ nhớ. Chưa benchmark PDF phức tạp, thời gian render/parse và nhiều worker cùng lúc.
- Index job có lease và khôi phục sau worker crash. Run tạo câu trả lời/Quiz đang `RUNNING` khi tiến trình bị kill cần được đối soát bằng metadata; không tự gọi LLM lại vì có thể sinh kết quả khác. Java phải quản lý timeout và tạo operation identity mới khi người dùng thực sự thử lại.
- Structured output/citation validation kiểm tra hình dạng và nguồn hợp lệ; không chứng minh mọi phát biểu đều đúng về ngữ nghĩa. Cần đánh giá groundedness độc lập.
- Counters trong bộ nhớ mất khi restart và không tổng hợp xuyên nhiều process.

## Bàn giao contract cho phía Java

Xem [CONTRACT_V3.md](CONTRACT_V3.md). Chưa sửa source Java, FE hoặc tài liệu ngoài quyền `AI_AGENT`.

Danh sách nghiệm thu còn lại: [INTEGRATION_CHECKLIST.md](INTEGRATION_CHECKLIST.md).

Cần cập nhật/đối chiếu `docs/api-plan.md` với các field cụ thể trong file contract này và bổ sung contract test Java trước khi ghép end-to-end. Đặc biệt lưu ý wrapper `result`, `generationArgs`, lỗi `409`, scope theo trang, API index trả `202`, polling và `pipelineVersion`.

Không có commit/push trong task triển khai hiện tại.
