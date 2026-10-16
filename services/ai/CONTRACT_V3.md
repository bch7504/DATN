# Python internal API — schema 3

Đây là wire shape đang hiện thực trong Python, cần đối chiếu DTO Java và cập nhật `docs/api-plan.md` khi tích hợp. Không coi việc test Python đạt là đã kiểm thử cả hai service.

Tất cả đường dẫn bắt đầu bằng `/internal/v1`. Header bắt buộc: `Authorization: Bearer <service token>`, `X-Request-Id` và `X-Schema-Version: 3`. Index/deindex/Quiz trực tiếp bắt buộc `Idempotency-Key` dài 8–255 ký tự.

## Phạm vi tài liệu

Java chỉ gửi document/version mà actor hiện tại được dùng. `PERSONAL_PDF` bắt buộc owner trùng actor. Course Material được Java kiểm tra enrollment/publication hoặc quyền Teacher trước khi gửi.

```json
{
  "documentId": "00000000-0000-0000-0000-000000000002",
  "documentVersion": 1,
  "ownerId": "00000000-0000-0000-0000-000000000001",
  "sourceType": "PERSONAL_PDF",
  "allowedPages": [1, 2, 3]
}
```

`allowedPages: null` cho phép mọi trang của **đúng document/version** đã cấp; `[]` không cho phép trang nào. Không dùng danh sách trang thay cho bộ lọc document/owner. Danh sách tối đa 20 document, mỗi document chỉ xuất hiện một lần.

## Index/deindex và polling

`POST /documents/index`:

```json
{
  "documentId": "00000000-0000-0000-0000-000000000002",
  "documentVersion": 1,
  "pipelineVersion": "pdf-v1",
  "ownerId": "00000000-0000-0000-0000-000000000001",
  "sourceType": "PERSONAL_PDF",
  "signedUrl": "https://storage.example.invalid/synthetic.pdf?signature=example-only",
  "mimeType": "application/pdf"
}
```

`POST /documents/deindex` nhận `documentId`, `documentVersion`, `pipelineVersion`. Index/deindex trả `202 {requestId, jobId, status}` sau khi ghi nhận job. Deindex vô hiệu hóa chỉ mục và hủy job index đang chờ/chạy ngay khi nhận; worker dọn chunks sau. Muốn dựng lại chỉ mục đã thu hồi phải dùng phiên bản phù hợp mới, không tái sử dụng operation cũ.

`GET /jobs/{jobId}` trả:

```json
{
  "requestId": "req-poll-001",
  "jobId": "00000000-0000-0000-0000-000000000003",
  "status": "SUCCEEDED",
  "attempt": 1,
  "errorCode": null,
  "artifact": {
    "pageCount": 3,
    "chunkCount": 6,
    "embeddingModel": "openai/text-embedding-3-large",
    "embeddingDimensions": 1024,
    "pipelineVersion": "pdf-v1"
  }
}
```

Job status: `PENDING | RUNNING | SUCCEEDED | FAILED`. Polling không trả signed URL, văn bản PDF hoặc vector. Java chỉ chuyển tài liệu sang trạng thái dùng được khi job thành công và metadata hợp lệ.

## Personal Assistant

`POST /personal-assistant/runs` nhận:

```json
{
  "userId": "00000000-0000-0000-0000-000000000001",
  "conversationId": null,
  "documents": [{
    "documentId": "00000000-0000-0000-0000-000000000002",
    "documentVersion": 1,
    "ownerId": "00000000-0000-0000-0000-000000000001",
    "sourceType": "PERSONAL_PDF",
    "allowedPages": [1, 2, 3]
  }],
  "history": [{"role": "USER", "content": "Tôi đang ôn phần ACID"}],
  "message": "Tạo 10 câu hỏi khó về phần này"
}
```

Các ID trong ví dụ là dữ liệu tổng hợp; Java phải gửi scope thực tế đã kiểm quyền. Tối đa 12 lượt history, mỗi lượt tối đa 4.000 ký tự; chỉ `USER` hoặc `ASSISTANT`, không nhận system instruction từ history.

Trả `200 {requestId, result}`. `result` gồm `selectedTool`, `status`, `answer`, `citations`, `quiz`, `clarificationQuestion`; field không áp dụng là null hoặc danh sách rỗng. Tool chỉ có `ASK_DOCUMENT`, `SUMMARIZE_DOCUMENT`, `GENERATE_QUIZ`, `NEEDS_CLARIFICATION`. Status: `ANSWERED | SUMMARIZED | QUIZ_CREATED | NEEDS_CLARIFICATION | NO_EVIDENCE`.

Retry cùng yêu cầu phải giữ nguyên `X-Request-Id`, nội dung, history và scope. Python replay kết quả đã hoàn tất; request ID cũ với input/scope khác trả `409`. Một message mới phải dùng request ID mới. Run đang chạy trả `409 ASSISTANT_RUN_IN_PROGRESS`.

## Course Material Tutor

`POST /course-materials/ask` nhận `userId`, `courseOfferingId`, `document` (scope với `sourceType: COURSE_MATERIAL_PDF`), `currentPageNumber` và `question`. Trang hiện tại phải nằm trong phạm vi được phép.

Trả `200 {requestId, result: {status, answer, citations}}`, status `ANSWERED | NO_EVIDENCE`. Java phải bảo đảm caller là Student có quyền trước khi gọi endpoint này; Teacher không có Tutor.

Citation luôn có `documentId`, `documentVersion`, `pageNumber`, `excerpt`; excerpt được lấy từ chunk đã cấp cho mô hình, giới hạn 1.200 ký tự.

## Sinh Quiz trực tiếp

`POST /quizzes/generate` nhận:

```json
{
  "actorId": "00000000-0000-0000-0000-000000000001",
  "mode": "PERSONAL_STUDENT",
  "documents": [{
    "documentId": "00000000-0000-0000-0000-000000000002",
    "documentVersion": 1,
    "ownerId": "00000000-0000-0000-0000-000000000001",
    "sourceType": "PERSONAL_PDF",
    "allowedPages": [1, 2, 3]
  }],
  "instruction": "Tạo câu hỏi ôn tập về ACID",
  "generationArgs": {"questionCount": 10, "difficulty": "HARD", "topic": "ACID"}
}
```

Trong request thật cần ít nhất một document scope. Mode `PERSONAL_STUDENT` chỉ dùng Personal PDF của actor; `COURSE_TEACHER` chỉ dùng Course Material PDF do Java cấp quyền. `questionCount` 1–30; `difficulty` là `EASY | MEDIUM | HARD | MIXED`. `topic` tùy chọn. Phạm vi trang nằm trong scope document, không nhận từ model để nới rộng quyền.

Trả `200 {requestId, status: DRAFT_CREATED|NO_EVIDENCE, quiz}`. Quiz có `quizType: MCQ_SINGLE`, `title`, `questions`. Mỗi question có `question`, `options` đúng 4 phần tử, `correctOptionIndex` 0–3, `explanation`, `citations`.

`Idempotency-Key` gắn với actor, instruction, generationArgs và toàn bộ scope. Cùng key/input trả lại bản nháp đã tạo; input khác trả `409 IDEMPOTENCY_CONFLICT`; đang chạy trả `409 QUIZ_GENERATION_IN_PROGRESS`. Không tự retry LLM sau timeout. Java quyết định review, accept/reject, publish, attempt và scoring.

## Lỗi

```json
{"error":{"code":"INVALID_REQUEST","message":"Safe message","requestId":"req-001"}}
```

`error.requestId` chỉ xuất hiện khi header có định dạng hợp lệ (3–128 ký tự ASCII, bắt đầu bằng chữ/số, sau đó chỉ chữ/số/dấu chấm/gạch dưới/hai chấm/gạch ngang). Header thiếu hoặc sai định dạng không được phản chiếu. Response bị provider cắt ngắn/refusal trả lỗi `502`, không phải `NO_EVIDENCE`.

| HTTP | Tình huống |
|---|---|
| 400 | Schema version không được hỗ trợ |
| 401 | Thiếu/sai service token |
| 404 | Job không tồn tại |
| 409 | Trùng identity nhưng khác input; request đang xử lý; version index đã thu hồi |
| 422 | Body/header/scope không hợp lệ hoặc phạm vi tóm tắt vượt giới hạn |
| 502 | Provider hoặc quá trình sinh nội dung lỗi |
| 503 | Thiếu cấu hình hoặc database không sẵn sàng |

Job lỗi PDF có mã như `PDF_ENCRYPTED`, `PDF_TEXT_REQUIRED`, `PDF_INVALID`, `PDF_TOO_MANY_PAGES`, `PDF_TEXT_TOO_LARGE`; lỗi retry hết lượt là `INDEX_RETRIES_EXHAUSTED`. Không trả thông điệp chứa token, signed URL, raw provider response hoặc connection string.
