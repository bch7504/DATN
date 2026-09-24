# Non-functional Specification

## 1. Performance và capacity

| ID | Priority | Target |
|---|---|---|
| NFR-PERF-001 | MUST | Public API không AI đạt p95 ≤ 1 giây khi service warm và 50 user đồng thời. |
| NFR-PERF-002 | MUST | RAG/Slide AI Tutor đạt p95 ≤ 20 giây, không tính cold start platform. |
| NFR-PERF-003 | MUST | Tạo Quiz trả `202` ≤ 1 giây; 95% job hoàn tất ≤ 60 giây. |
| NFR-PERF-004 | SHOULD | Index file trong giới hạn kích thước hoàn tất ≤ 5 phút ở 95th percentile. |
| NFR-PERF-005 | MUST | List API phân trang; mặc định 20, tối đa 100 item/page. |

Đo latency từ Java API boundary. Metric AI tách queue time, retrieval, provider và total duration.

## 2. Security

| ID | Priority | Requirement |
|---|---|---|
| NFR-SEC-001 | MUST | HTTPS cho public/internal traffic ngoài local. |
| NFR-SEC-002 | MUST | Access token 15 phút; refresh token 7 ngày, rotate và reuse detection. |
| NFR-SEC-003 | MUST | Signed object URL tối đa 5 phút và chỉ tạo sau authorization. |
| NFR-SEC-004 | MUST | Internal API dùng service credential riêng, request ID và schema version. |
| NFR-SEC-005 | MUST | Upload kiểm extension, MIME thực, kích thước và file name; file không được thực thi. |
| NFR-SEC-006 | MUST | Password hash bằng BCrypt cost tối thiểu 12 hoặc thuật toán tương đương được cấu hình. |
| NFR-SEC-007 | MUST | Nội dung trong tài liệu luôn được xem là dữ liệu, không được phép thay đổi system instruction, authorized scope hoặc tool behavior. |

- Personal upload tối đa 20 MB; Teacher upload tối đa 50 MB.
- CORS chỉ cho Web origin cấu hình; production không dùng wildcard với credential.
- Không gửi JWT người dùng sang Python nếu authorized scope đã đủ.
- Rate limit tối thiểu: login 10 request/phút/IP; AI 20 request/phút/user; upload 10 request/phút/user.

## 3. Privacy và logging

| ID | Priority | Requirement |
|---|---|---|
| NFR-PRI-001 | MUST | Không log document content, prompt, Note, answer, password, token hoặc API key. |
| NFR-PRI-002 | MUST | Log chỉ gồm trace/request ID, actor ID, action, target ID, status, duration và safe error code. |
| NFR-PRI-003 | MUST | Chat history giữ tối đa 90 ngày mặc định và có thể cấu hình ngắn hơn. |
| NFR-PRI-004 | MUST | Xóa Personal Document loại khỏi authorization trước khi dọn vector/object. |

Test/eval chỉ dùng dữ liệu tổng hợp. Admin dashboard/audit không hiển thị nội dung học tập cá nhân.

## 4. Reliability và consistency

| ID | Priority | Requirement |
|---|---|---|
| NFR-REL-001 | MUST | Mutation có khả năng lặp dùng idempotency key. |
| NFR-REL-002 | MUST | Index/deindex retry tối đa 3 lần với exponential backoff + jitter. |
| NFR-REL-003 | MUST | Không retry mù LLM generation sau timeout khi chưa xác định kết quả request trước. |
| NFR-REL-004 | MUST | Quiz submit và Java scoring chạy trong một transaction. |
| NFR-REL-005 | MUST | Reindex activate version mới nguyên tử trước khi dọn version cũ. |
| NFR-REL-006 | SHOULD | Backup PostgreSQL/Object Storage hằng ngày trong môi trường demo; thử restore trước bảo vệ. |

Timeout mặc định:

- Web → Java: 30 giây cho AI request; 10 giây cho request thường.
- Java → Python RAG/Tutor: 25 giây.
- AI Quiz worker/provider: 60 giây/job.
- Signed URL fetch trong worker: 30 giây.

## 5. Accessibility và compatibility

| ID | Priority | Requirement |
|---|---|---|
| NFR-UX-001 | MUST | UI dùng được từ viewport rộng 360px và không mất thao tác chính. |
| NFR-UX-002 | MUST | Form control có label, focus visible và dùng được bằng bàn phím. |
| NFR-UX-003 | SHOULD | Màu chữ/control chính đạt WCAG 2.1 AA. |
| NFR-UX-004 | MUST | Hỗ trợ hai phiên bản mới nhất của Chrome, Edge và Firefox. |

## 6. Observability

- Health: Java, Python API, worker, PostgreSQL/pgvector và Object Storage.
- Metric vận hành: request latency/error, queue depth, processing failure, retry count, `NO_EVIDENCE` rate, citation rejection và token usage tổng hợp.
- Metric evaluation: context precision/recall, claim precision/recall, faithfulness, answer relevancy, citation entailment/validity, refusal accuracy và scope violation; báo cáo riêng cho Personal RAG và Slide Tutor.
- Alert demo: health down 2 phút, failure rate > 10% trong 5 phút hoặc queue job cũ nhất > 10 phút.
- Trace ID đi xuyên Web-facing response, Java log và Python log.

## 7. Acceptance criteria

### NFR-AC-001 — Không rò nội dung

- **Given** RAG/Quiz request chứa nội dung Personal Document
- **When** request thành công hoặc lỗi
- **Then** application/system log chỉ chứa ID, status, latency và safe error code.

### NFR-AC-002 — Retry idempotent

- **Given** cùng index idempotency key được gửi ba lần
- **When** worker xử lý
- **Then** chỉ có một logical job/version active và không có chunk trùng.

### NFR-AC-003 — Evaluation ổn định và chống scope leakage

- **Given** locked test set có câu nhiều tài liệu, câu nối tiếp, thiếu bằng chứng và prompt injection trong tài liệu
- **When** benchmark chạy ba lần qua pipeline production
- **Then** `scope_violation_rate = 0`, không có hallucination nghiêm trọng và các ngưỡng tại [kế hoạch AI](../ai-implementation-plan.md#7-kiểm-thử-và-kế-hoạch-đánh-giá-chatbot) được báo cáo theo từng nhóm case.

### NFR-AC-004 — Responsive

- **Given** viewport 360px
- **When** Student mở navigation, lịch tuần và Quiz
- **Then** mọi action chính truy cập được; bảng lịch có thể cuộn ngang mà không làm trang vỡ layout.
