# Feature Specification — Personal Document Assistant và Student Quiz

## 1. Mục tiêu

Student quản lý Personal PDF và dùng một Single Orchestrator Agent để hỏi đáp, tóm tắt hoặc tạo Quiz có page citation.

## 2. Requirements

| ID | Requirement |
|---|---|
| PAI-FR-001 | Student upload/xem trạng thái/xóa Personal PDF của mình. |
| PAI-FR-002 | PDF hợp lệ được extract/chunk/embed bất đồng bộ. |
| PAI-FR-003 | Conversation gắn 1–10 Personal PDF `READY`. |
| PAI-FR-004 | Agent chọn đúng `ask_document|summarize_document|generate_quiz`. |
| PAI-FR-005 | Hỏi đáp/tóm tắt trả page citation hoặc `NO_EVIDENCE`. |
| PAI-FR-006 | Tạo Quiz thiếu args trả `NEEDS_CLARIFICATION`; đủ args tạo `REVIEW_REQUIRED`. |
| PAI-FR-007 | History chỉ dùng document scope của conversation và owner hiện tại. |
| PAI-FR-008 | Mỗi factual claim/câu Quiz được evidence hỗ trợ; citation phải entail nội dung. |
| PAI-BR-001 | Personal upload chỉ nhận PDF text layer tối đa 20 MB. |
| PAI-BR-002 | Quiz `MCQ_SINGLE` có đúng 4 options và một đáp án đúng. |
| PAI-BR-003 | Prompt/history/document là untrusted data, không đổi system/tool/scope. |
| PAI-BR-004 | Student accept Quiz vào Course Offering `APPROVED` hoặc giữ cá nhân. |

## 3. Personal Document API

- `POST /api/v1/personal-documents`: multipart PDF ≤ 20 MB → `202 PENDING_PROCESSING`; lỗi `FILE_TOO_LARGE|UNSUPPORTED_FILE_TYPE|INVALID_FILE`.
- `GET /api/v1/personal-documents`: chỉ metadata thuộc owner, không storage key.
- `GET /api/v1/personal-documents/{id}/status`: processing status/safe error.
- `DELETE /api/v1/personal-documents/{id}`: `202 DELETING`, loại khỏi authorization trước khi deindex/xóa object.

## 4. Personal Assistant API

### Conversation

- `POST /api/v1/student/chat/conversations`
  - Input `{selectedDocumentIds:[1..10],title?}`.
  - Java load lại owner, `READY`, version và embedding compatibility.
  - Output `201 {conversationId,selectedDocuments,createdAt}`.
- `GET/PATCH/DELETE /api/v1/student/chat/conversations/{id}`: owner-only history/scope/lifecycle.

### Message/run

`POST /api/v1/student/chat/conversations/{id}/messages`

- Input `{message}` dài 1–2.000 ký tự; không nhận model/provider/document IDs.
- Output chung:

```json
{
  "messageId": "msg_...",
  "status": "ANSWERED|SUMMARIZED|QUIZ_CREATED|NEEDS_CLARIFICATION|NO_EVIDENCE",
  "capability": "ASK_DOCUMENT|SUMMARIZE_DOCUMENT|CREATE_QUIZ|NEEDS_CLARIFICATION",
  "answer": "...",
  "missingFields": [],
  "quizDraft": null,
  "citations": [
    {"documentId":"doc_1","documentName":"notes.pdf","pageNumber":12,"excerpt":"..."}
  ],
  "traceId": "req_..."
}
```

- Java revalidate citation/structured result rồi mới lưu.
- `ASK_AI` không được tính vào Streak.

## 5. Single Agent tool contracts

| Tool | Args | Output | Errors |
|---|---|---|---|
| `ask_document` | query, authorized document/version scope, optional page range | grounded answer + citations hoặc `NO_EVIDENCE` | invalid scope/query |
| `summarize_document` | authorized scope, summary style/length, optional page range | structured summary + citations hoặc `NO_EVIDENCE` | invalid range |
| `generate_quiz` | authorized scope, `questionCount`, difficulty/topic/page range | structured Quiz draft + sources | `NEEDS_CLARIFICATION`, insufficient evidence |

Agent route confidence thấp hoặc thiếu trường quan trọng phải hỏi lại; không gọi nhiều tool chỉ để “thử”.

## 6. Quiz output và lifecycle

Mỗi question gồm `content`, đúng 4 `options`, một `correctOptionIndex`, `explanation` và `sources` theo page. Java từ chối toàn bộ batch nếu một câu malformed, trùng option hoặc citation ngoài scope.

```text
GENERATING → REVIEW_REQUIRED → READY | REJECTED
          ↘ GENERATION_FAILED
```

- `POST /api/v1/review/quizzes/{id}/accept` nhận destination approved/personal.
- `POST /api/v1/review/quizzes/{id}/reject` giữ audit history.
- `POST /api/v1/review/quizzes/{id}/regenerate` tạo Quiz mới, không overwrite.
- Java tạo attempt và chấm điểm; Python/LLM không chấm.

## 7. Internal contract

| Endpoint | Input | Output |
|---|---|---|
| `POST /internal/v1/documents/index` | document/version/source type/signed URL | idempotent job |
| `POST /internal/v1/personal-assistant/runs` | user/conversation, authorized PDF scope, bounded history, message | selected tool + structured status/result/citations |
| `POST /internal/v1/quizzes/generate` | mode `PERSONAL_STUDENT`, structured args, authorized scope | validated-shape MCQ draft |

Mọi request có service credential, `X-Request-Id`, `X-Schema-Version`, timeout và idempotency khi tạo job/draft.

## 8. Acceptance

- Student A không thể dùng document/conversation của Student B.
- Ask/summary thiếu evidence trả `NO_EVIDENCE` và không bịa citation.
- “Tạo Quiz” thiếu số câu trả `NEEDS_CLARIFICATION`; sau khi bổ sung mới gọi tool.
- Quiz đúng 4 options, một correct index và page source thuộc authorized scope.
- Xóa document lập tức loại khỏi Assistant/Quiz authorization.
- Evaluation chạy production path, cùng evidence snapshot, báo cáo riêng ask/summary/quiz routing, grounding, citation và scope violation.
