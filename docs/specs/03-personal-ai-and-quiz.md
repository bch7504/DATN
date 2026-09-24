# Feature Specification — Personal AI và Quiz Generation

## 1. Mục tiêu

Cho phép Student quản lý PDF cá nhân, hỏi đáp trên đúng tài liệu đã chọn và tạo Quiz nhiều lựa chọn có một đáp án đúng kèm citation.

## 2. Functional requirements

| ID | Priority | Requirement |
|---|---|---|
| PAI-FR-001 | MUST | Student upload, xem trạng thái và xóa Personal Document của mình. |
| PAI-FR-002 | MUST | PDF hợp lệ được extract, chunk, embed và lưu pgvector bất đồng bộ. |
| PAI-FR-003 | MUST | Student tạo conversation với một hoặc nhiều document `READY`. |
| PAI-FR-004 | MUST | RAG trả `ANSWERED` hoặc `NO_EVIDENCE` cùng citation đúng scope. |
| PAI-FR-005 | MUST | Student yêu cầu sinh Quiz từ document scope của conversation. |
| PAI-FR-006 | MUST | Quiz sinh bất đồng bộ và xuất hiện ở Ôn tập khi `REVIEW_REQUIRED`. |
| PAI-FR-007 | MUST | Chatbot giữ history theo conversation và chỉ dùng các document đã chọn trong scope đó. |
| PAI-FR-008 | MUST | Mỗi factual claim phải được evidence hỗ trợ; citation phải entail claim thay vì chỉ có ID hợp lệ. |
| PAI-BR-001 | MUST | Personal upload chỉ nhận PDF tối đa 20 MB. |
| PAI-BR-002 | MUST | Client không được thêm document ngoài conversation khi hỏi hoặc sinh Quiz. |
| PAI-BR-003 | MUST | Quiz dùng `MCQ_SINGLE`: nhiều lựa chọn nhưng chỉ một đáp án đúng. |
| PAI-SEC-001 | MUST | Java và Python đều filter owner/document/version; citation sai scope bị từ chối. |

## 3. Personal Document contracts

### `POST /api/v1/personal-documents`

- **Args/input:** multipart `file`; PDF, MIME thực khớp extension, `size <= 20 MB`.
- **Output:** `202` với `{documentId, fileName, fileType, processingStatus:"PENDING_PROCESSING"}`.
- **Errors:** `413 FILE_TOO_LARGE`; `415 UNSUPPORTED_FILE_TYPE`; `422 INVALID_FILE`; `503 STORAGE_UNAVAILABLE`.
- **Side effect:** lưu object, document metadata và enqueue index idempotent.

### `GET /api/v1/personal-documents`

- **Input:** pagination, optional `status`.
- **Output:** danh sách metadata thuộc current Student; không trả storage key.
- **Errors:** `401 UNAUTHENTICATED`.

### `GET /api/v1/personal-documents/{id}/status`

- **Output:** `{documentId, status, progress?, errorCode?, updatedAt}`.
- **Errors:** `404` khi không phải owner.

### `DELETE /api/v1/personal-documents/{id}`

- **Output:** `202` với `{documentId, status:"DELETING"}`; thao tác idempotent.
- **Side effect:** lập tức loại khỏi authorized scope, deindex rồi xóa object/metadata bằng job có retry.

## 4. Personal RAG contracts

### `POST /api/v1/personal-rag/conversations`

- **Input:** `{selectedDocumentIds:[...]}` có 1–10 ID duy nhất.
- **Output:** `201` với `{conversationId, selectedDocuments, createdAt}`.
- **Errors:** `404 DOCUMENT_NOT_FOUND`; `409 DOCUMENT_NOT_READY`; `422 EMPTY_OR_DUPLICATE_SCOPE`.
- **Rule:** Java load lại toàn bộ document theo owner; request bị từ chối toàn bộ nếu một ID sai.

### `POST /api/v1/personal-rag/conversations/{id}/messages`

- **Input:** `{question}` 1–2.000 ký tự; scope lấy từ conversation do Java sở hữu.
- **Output:** `{messageId, status:"ANSWERED|NO_EVIDENCE", answer, citations, traceId}`.
- **Citation:** `{documentId, location:{kind:"PAGE", value}, excerpt}`; `value` là số trang PDF bắt đầu từ 1.
- **Errors:** `404 CONVERSATION_NOT_FOUND`; `409 DOCUMENT_NOT_READY`; `503 AI_SERVICE_UNAVAILABLE`.
- **Side effect:** lưu message/citation có retention; ghi event `ASK_AI`.
- **Grounding:** Python retrieval đúng một lần, generation và reviewer dùng cùng evidence snapshot. Claim `UNSUPPORTED`/`CONTRADICTED` phải bị loại hoặc viết lại; reviewer chỉ retry tối đa một lần.

### `GET /api/v1/personal-rag/conversations/{id}`

- **Output:** conversation, selected document metadata và message history của owner.
- **Errors:** `404` ngoài ownership.

## 5. Quiz generation contract

### `POST /api/v1/personal-rag/conversations/{id}/quizzes`

- **Input:** `{title?, questionCount:1..50=10, difficulty:"EASY|MEDIUM|HARD|MIXED"="MIXED"}`.
- **Output:** `202` với `{quizId, status:"GENERATING", sourceDocumentIds, createdAt}`.
- **Errors:** `404 CONVERSATION_NOT_FOUND`; `409 DOCUMENT_NOT_READY|QUIZ_GENERATION_IN_PROGRESS`; `422 INVALID_QUESTION_COUNT`.
- **Side effect:** Java tạo Quiz `GENERATING`, phát job có idempotency key và gọi Python bằng authorized scope đã load lại.

### Structured AI output

Mỗi question Python trả về:

```json
{
  "content": "Mục đích của tính cô lập giữa các transaction là gì?",
  "options": [
    {"id": "A", "text": "Giảm ảnh hưởng giữa transaction"},
    {"id": "B", "text": "Luôn loại bỏ mọi anomaly"},
    {"id": "C", "text": "Xóa toàn bộ ràng buộc dữ liệu"}
  ],
  "correctOptionIndex": 0,
  "explanation": "...",
  "sources": [
    {"documentId": "doc_1", "location": {"kind": "PAGE", "value": "12"}, "excerpt": "..."}
  ]
}
```

Validation tại Java:

- Có ít nhất hai option, text không rỗng và không trùng sau normalize.
- `correctOptionIndex` là một số nguyên duy nhất nằm trong phạm vi options.
- Có ít nhất một distractor và một source thuộc đúng authorized document/version.
- Toàn bộ batch bị từ chối nếu một question malformed hoặc citation sai scope.
- Thành công: `GENERATING → REVIEW_REQUIRED`; thất bại: `GENERATING → GENERATION_FAILED` với safe error code.

## 6. Internal Java → Python contracts

| Endpoint | Args/input | Output | Errors/retry |
|---|---|---|---|
| `POST /internal/v1/documents/index` | requestId, document/version, pipeline, ownerId, signed URL, MIME | `202 {jobId,status}` | Idempotent; retry tối đa 3 |
| `GET /internal/v1/jobs/{jobId}` | job ID + service credential | status, attempts, errorCode | `404`; poll có backoff |
| `POST /internal/v1/personal-rag/ask` | userId, conversationId, authorized document/version scope, history window, question | `ANSWERED|NO_EVIDENCE`, answer, claim-grounded citations, traceId | Không retry mù sau timeout |
| `POST /internal/v1/quizzes/generate` | userId, authorized IDs, count, difficulty | structured questions + sources | Job idempotent; malformed output không lưu |

Mọi request có `X-Request-Id`, `X-Schema-Version`, service credential và timeout. Python không nhận user JWT.

## 7. Acceptance criteria

### PAI-AC-001 — Owner isolation

- **Given** Student A gửi ID tài liệu của Student B
- **When** tạo conversation, hỏi RAG hoặc tạo Quiz
- **Then** Java trả `404`, Python không nhận ID trái phép và log không lộ metadata của Student B.

### PAI-AC-002 — Không đủ bằng chứng

- **Given** authorized chunks không đủ trả lời câu hỏi
- **When** Student hỏi RAG
- **Then** response là `NO_EVIDENCE`, không bịa answer hoặc citation.

### PAI-AC-003 — Quiz một đáp án đúng

- **Given** AI trả question có nhiều lựa chọn và một `correctOptionIndex`
- **When** Java validate structured output
- **Then** Java lưu đúng một answer key, source đúng scope và đặt Quiz `REVIEW_REQUIRED`.

### PAI-AC-004 — Xóa tài liệu

- **Given** Personal Document đã được index
- **When** owner yêu cầu xóa
- **Then** tài liệu lập tức không còn dùng được cho RAG/Quiz và job dọn vector/object có thể retry an toàn.

### PAI-AC-005 — Định dạng PDF và lớp văn bản

- **Given** Student upload file không phải PDF hoặc đổi đuôi file khác thành `.pdf`
- **When** Java kiểm extension, MIME thực và cấu trúc file
- **Then** từ chối bằng `415 UNSUPPORTED_FILE_TYPE` hoặc `422 INVALID_FILE`.
- PDF cá nhân không có văn bản trích xuất được chuyển `FAILED` với `PDF_TEXT_REQUIRED`; chưa hỗ trợ OCR trong MVP. File mã hóa cần mật khẩu trả `PDF_ENCRYPTED`. UI hướng dẫn upload bản PDF có lớp văn bản, không cho dùng tài liệu lỗi để hỏi hoặc sinh Quiz.

### PAI-AC-006 — Citation theo claim

- **Given** answer draft chứa nhiều factual claim
- **When** claim reviewer đối chiếu evidence snapshot đã dùng để generation
- **Then** mỗi claim được phân loại; response chỉ giữ claim được hỗ trợ và citation trỏ đúng trang/chunk chứng minh claim đó.

### PAI-AC-007 — Evaluation phản ánh production

- **Given** một case trong locked test set
- **When** chạy benchmark
- **Then** evaluator đi qua đúng pipeline production, không retrieval lần hai, ghi dataset/prompt/model/retrieval version và chấm riêng Personal RAG với Slide Tutor theo [kế hoạch AI](../ai-implementation-plan.md#7-kiểm-thử-và-kế-hoạch-đánh-giá-chatbot).
