# Kiểm tra tích hợp AI trước khi demo thật

Đây là checklist tích hợp, không phải biên bản nghiệm thu dữ liệu thật. Các test hiện tại dùng dữ liệu tổng hợp; kho S3-compatible local đã qua smoke test ghi/đọc/xóa và signed URL từ Java. Chưa gọi OpenRouter hoặc chạy tài liệu thật. Không đọc `.env`, không dùng tài liệu cá nhân thật; chuẩn bị môi trường thử nghiệm riêng qua cấu hình tiến trình.

## 1. PostgreSQL/pgvector và migration

- Người quản trị cấp database thử nghiệm và role chỉ sở hữu schema `ai`; cài extension `vector` bằng quyền phù hợp.
- Xem trước migration và xác nhận database đích trước khi `uv run alembic upgrade head`. Không chạy trên database production hoặc database chưa được phép thay đổi.
- Xác nhận cả 5 migration chạy được, version table nằm trong `ai`, vector 1024 chiều và index cosine tồn tại.
- Dùng chính role AI thử truy cập bảng nghiệp vụ mẫu thuộc schema `app`: phải bị từ chối. Không thử trên bảng chứa dữ liệu người dùng thật.
- Ghi/query embedding tổng hợp; xác nhận document/query khác model không được dùng chung index.

## 2. Index, thu hồi và chạy đồng thời

Tất cả PDF trong bước này phải do test tạo, có text layer. Dùng hai tiến trình worker để kiểm tra:

| Tình huống | Kết quả cần đạt |
|---|---|
| Gửi hai lần cùng idempotency key | Cùng job ID, không tạo bản ghi/chunk trùng |
| Dùng lại key với tài liệu khác | `409 IDEMPOTENCY_CONFLICT` |
| Worker bị dừng giữa chừng | Sau khi lease hết hạn, worker khác tiếp tục trong số lần cho phép |
| Worker cũ ghi sau khi mất lease | Không ghi index hoặc ghi đè trạng thái job mới |
| Deindex đồng thời enqueue lần đầu | Không có index được kích hoạt lại sau thu hồi; request index sau tombstone bị chặn |
| Deindex đồng thời worker ghi lần đầu | Sau khi API deindex hoàn thành, retrieval không thấy index bị thu hồi |
| Hai pipeline cùng tài liệu/phiên bản hoàn thành | Chỉ một index `ACTIVE`; không trùng chunk trong một index |
| Lỗi mạng/429/5xx khi tải hoặc embed | Retry có giới hạn; không retry PDF sai định dạng hay link bị từ chối |

Khóa advisory áp dụng theo document/version trước row lock; chạy với PostgreSQL `READ COMMITTED`. Thu hồi hiện nhắm đúng `pipelineVersion` trong contract. Java phải gửi phạm vi thu hồi phù hợp và luôn kiểm tra quyền hiện hành trước khi trả câu trả lời.

## 3. Object Storage

- Cấu hình origin được phép qua `STORAGE_ENDPOINT`; production dùng HTTPS, local HTTP chỉ bật bằng `AI_ALLOW_INSECURE_LOCAL_STORAGE_URL=true` trên literal loopback.
- Dùng signed URL của PDF tổng hợp; thử URL hết hạn, quá kích thước, redirect khác origin, PDF mã hóa và PDF không có text layer.
- Đối chiếu `pageCount` kể cả trang trắng; citation phải dùng đúng số trang PDF gốc.
- Không ghi signed URL, bytes PDF hoặc nội dung trang vào log.

## 4. Nhà cung cấp AI

- Kiểm chứng model ID thực tế trên tài khoản trước khi chạy; model mặc định trong cấu hình chưa được xác nhận khả dụng.
- Kiểm chứng hỗ trợ JSON Schema strict, embedding `dimensions=1024`, thứ tự kết quả embedding và giới hạn context.
- Chỉ gọi API thật sau khi được cho phép chi phí; cấp key vào tiến trình Python, không vào FE hoặc tài liệu.
- Kiểm tra câu trả lời thiếu bằng chứng, output bị cắt, refusal và lỗi provider. Không biến lỗi provider thành câu trả lời thành công hay `NO_EVIDENCE` giả.

## 5. Java ↔ Python

- Đối chiếu `CONTRACT_V3.md` với `docs/api-plan.md` và DTO phía Java; thay đổi contract phải có test ở cả hai phía.
- Java xác thực vai trò, enrollment/publication, document/version/page; Python không tự truy vấn các bảng nghiệp vụ đó.
- Thử hỏi đáp, tóm tắt và tạo Quiz trong Personal Documents; thử Student Tutor và Teacher Quiz. Teacher không được mở Personal Assistant hoặc Tutor chỉ nhờ đổi payload FE.
- Java validate citation/output và kiểm lại quyền sau khi Python trả kết quả. Câu hỏi/Quiz đang sinh lúc tài liệu bị thu hồi không được lọt ra FE.
- Retry cùng yêu cầu chat giữ nguyên request ID, input và scope; retry Quiz trực tiếp giữ idempotency key. Payload thay đổi dùng identity mới.
- Java quản lý bản nháp, duyệt, công bố, chấm điểm và tiến độ. Python không thay đổi các trạng thái nghiệp vụ này.

## 6. Đánh giá và vận hành

- Lập tập câu hỏi tiếng Việt tổng hợp có đáp án/nguồn tham chiếu, ca không có đáp án và ca cố vượt quyền.
- Tách tập phát triển và tập đánh giá cuối; báo cáo recall, citation location, abstention và đánh giá bám nguồn do người kiểm tra gán nhãn.
- Đo thời gian xử lý, tỷ lệ lỗi, token/chi phí và tải đồng thời trên môi trường thử nghiệm; không sử dụng kết quả fixture như KPI của mô hình.
- Kiểm tra timeout, restart và đối soát AI run còn `RUNNING`; không tự gọi lại model vô hạn sau crash.
- Dữ liệu lưu trong `ai` gồm text chunk và kết quả AI: cần chính sách retention/xóa phù hợp trước khi dùng dữ liệu thật. Khóa idempotency không thay thế kiểm quyền ở Java.

Chỉ đánh dấu từng mốc hoàn thành tích hợp khi có kết quả kiểm tra tương ứng. Không cần khởi chạy Docker để đọc hoặc dùng checklist này.
