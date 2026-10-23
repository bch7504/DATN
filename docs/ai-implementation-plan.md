# StudyFlow — Kế hoạch thay đổi và triển khai AI Service

**Trạng thái cập nhật 23/10/2026:** Python AI Service đã có Hybrid RAG, LangChain rerank và guardrails, với 85/85 kiểm thử mặc định đạt, một ca PostgreSQL/pgvector tích hợp opt-in đạt. Bốn PDF môn Kỹ thuật số đã được lập chỉ mục thật; bộ đánh giá tiếng Việt khóa có 12 ca. Lần gọi OpenRouter sau nâng cấp Hybrid RAG còn chờ key được cấp vào tiến trình, không tự đọc `.env`.
**Phạm vi:** Python AI Service và các contract Java ↔ Python liên quan đến Personal PDF Assistant, Course Material AI Tutor và AI Quiz Generator.

## 0. Trạng thái hiện tại và kế hoạch làm tiếp

### 0.1. Phần đã có

| Nhóm | Trạng thái hiện tại |
|---|---|
| API nội bộ | Đã có health, index, deindex, job polling, Personal Assistant, Course Material Tutor và Quiz Generator theo schema version 3 |
| Xử lý PDF | Đã có kiểm tra PDF có lớp văn bản, tách nội dung theo trang, chunk, embedding 1024 chiều và lưu pgvector |
| Personal Assistant | Đã có bộ điều phối một agent để chọn hỏi đáp, tóm tắt hoặc tạo Quiz; có hỏi lại khi thiếu thông tin |
| Retrieval/Grounding | Đã có vector search + full-text search, RRF, LangChain rerank, giới hạn phạm vi tài liệu, `NO_EVIDENCE`, citation theo trang và kiểm tra lại nguồn |
| Quiz | Đã kiểm tra đúng `MCQ_SINGLE`, bốn phương án, một đáp án đúng, citation và chống tạo trùng |
| Kiểm thử | Có 85 ca mặc định đạt; migration hybrid và pgvector integration test đã đạt trên PostgreSQL local; bộ 12 câu tiếng Việt đã được khóa schema/trang nguồn |

### 0.2. Thứ tự triển khai tiếp theo

| Ưu tiên | Mốc tiếp theo | Công việc | Điều kiện hoàn thành |
|---|---|---|---|
| 1 | AI-N1 — PostgreSQL thật | **Đã chạy:** 6 migration, vector 1024 chiều, HNSW cosine, `tsvector`/GIN, index lặp và Hybrid retrieval | Tiếp tục giữ role AI cô lập khỏi schema `app` |
| 2 | AI-N2 — Worker và Storage | **Đã có code/test:** signed URL, validation PDF, lease/retry/fencing, index/deindex | Còn stress test nhiều worker và revoke đồng thời |
| 3 | AI-N3 — Java contract v3 | **Đã đối chiếu:** DTO, credential, request ID, schema version, timeout và idempotency | Duy trì contract test hai phía khi schema thay đổi |
| 4 | AI-N4 — E2E Personal Assistant | **Đã có luồng và test phân quyền:** hỏi đáp, tóm tắt, tạo Quiz | Chạy lại provider thật sau Hybrid RAG |
| 5 | AI-N5 — E2E Course AI | **Đã có luồng và contract:** Tutor Student, Quiz Teacher, scope enrollment/publication | Chạy lại provider thật sau Hybrid RAG |
| 6 | AI-N6 — Provider thật | Bốn PDF đã từng chạy Java → Python → OpenRouter trước nâng cấp Hybrid | **Đang chờ:** cấp `OPENROUTER_API_KEY` vào tiến trình để chạy lại Hybrid end-to-end |
| 7 | AI-N7 — Evaluation | **Đã tạo:** 12 ca tiếng Việt theo trang (9 answerable, 3 `NO_EVIDENCE`) và live evaluator | Chạy live, sau đó người đánh giá chấm groundedness/factual correctness |
| 8 | AI-N8 — Hoàn thiện | Kiểm thử tải, crash recovery, metrics, retention, Docker và hướng dẫn demo | Demo end-to-end lặp lại được; có báo cáo latency/lỗi/chi phí và checklist vận hành |

### 0.3. Phạm vi của đợt triển khai gần nhất

Mốc gần nhất là hoàn tất `AI-N6 → AI-N7`: cấp key vào tiến trình chạy, chạy 12 ca tiếng Việt trên bốn chỉ mục Kỹ thuật số, lưu các chỉ số retrieval/citation/abstention và tổ chức chấm groundedness độc lập. Unit test vẫn không gọi OpenRouter và không dùng tài liệu người dùng.

## 1. Quyết định đã chốt

### 1.1. Nguồn tài liệu

- Personal Document chỉ nhận PDF có lớp văn bản.
- Course Material của Teacher chỉ nhận PDF; Teacher phải xuất slide thành PDF trước khi tải lên.
- Không xử lý PPTX, không render slide artifact và không dùng `slideNumber` trong pipeline AI mới.
- Citation của mọi luồng AI thống nhất theo `documentId + documentVersion + pageNumber + chunkId`.
- Hai loại PDF dùng chung parser/chunker/embedding nhưng luôn tách bằng `sourceType` và authorized scope.

### 1.2. Chức năng AI theo vai trò

| Chức năng | Student | Teacher |
|---|---:|---:|
| Hỏi đáp Personal PDF bằng RAG | Có | Không |
| Tóm tắt Personal PDF | Có | Không |
| Tạo Personal Quiz trong giao diện chatbot | Có | Không |
| Course Material AI Tutor | Có, khi enrollment `APPROVED` | Không |
| Sinh Quiz từ Course Material PDF | Không | Có, với Course Offering mình sở hữu |
| Chấm điểm, publish và cập nhật progress | Java xử lý | Java xử lý |

Teacher không có Personal PDF Chatbot và không có AI Tutor. Trong phạm vi AI, Teacher chỉ sử dụng AI Quiz Generator.

### 1.3. Cách điều phối

Personal PDF Assistant dùng **một Single Orchestrator Agent**, không dùng multi-agent:

```text
Personal Document Assistant
        └→ Single Orchestrator Agent
              ├→ ask_document
              ├→ summarize_document
              └→ generate_quiz
```

- Agent đọc prompt tự nhiên và tự chọn đúng một tool cho mỗi lượt trong MVP.
- Agent chỉ chọn tool và trích xuất tham số; không quyết định quyền, lifecycle hoặc kết quả học tập.
- Java là system of record và bộ não nghiệp vụ.
- Python thực hiện document intelligence, retrieval, generation, citation và evaluation.
- Single Orchestrator dùng bộ phân loại structured output và allowlist ba công cụ. LangChain Core hiện được dùng trong pipeline rerank; chưa đưa LangGraph vào runtime vì luồng chỉ cho phép đúng một công cụ mỗi lượt và không cần graph nhiều bước.
- Không dùng Deep Agents, sub-agent hoặc Supervisor nhiều agent trong MVP.

## 2. Kiến trúc mục tiêu

```text
Next.js Web
    ↓ public /api/v1
Java Spring Boot
    ├→ xác thực, RBAC, ownership/enrollment
    ├→ authorized scope
    ├→ conversation và Quiz lifecycle
    ├→ scoring, attempt, progress
    └→ internal /internal/v1
            ↓
Python FastAPI
    ├→ Single Orchestrator Agent
    │    ├→ ask_document
    │    ├→ summarize_document
    │    └→ generate_quiz
    ├→ Course Material Tutor workflow
    ├→ Teacher Quiz Generation workflow
    ├→ PDF indexing worker
    ├→ validation/reviewer/evaluation
    └→ PostgreSQL schema ai + pgvector
            ↓
        OpenRouter
```

Frontend không gọi Python, database, pgvector hoặc OpenRouter trực tiếp.

## 3. Công nghệ AI

### 3.1. Thành phần

- FastAPI: internal HTTP API.
- Pydantic v2: request, tool args, tool result và model output schema.
- LangChain Core Runnable/Document: chuẩn hóa pipeline rerank và dữ liệu evidence.
- Single Orchestrator Agent: phân loại structured output rồi gọi đúng một công cụ trong allowlist; không dùng multi-agent.
- SQLAlchemy/Alembic: schema `ai`.
- PostgreSQL + pgvector: chunk, metadata và embedding.
- PostgreSQL full-text search + GIN: nhánh tìm kiếm từ khóa cho Hybrid RAG.
- OpenRouter: chat model và embedding model.

Tham khảo:

- [LangChain Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangChain Tools](https://docs.langchain.com/oss/python/langchain/tools)
- [LangGraph workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [OpenRouter Tool Calling](https://openrouter.ai/docs/guides/features/tool-calling)
- [OpenRouter Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs)

### 3.2. Model

```text
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_CHAT_MODEL=openai/gpt-5.6-luna
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-large
EMBEDDING_DIMENSIONS=1024
EMBEDDING_DISTANCE=cosine
```

- Chat model phải hỗ trợ tool calling và structured output.
- Query và document chunk bắt buộc dùng cùng embedding model, dimensions và index version.
- Thay embedding model/dimensions phải tăng index version và reindex.
- API key chỉ tồn tại trong Python runtime; không log hoặc trả về client.
- Unit test dùng fake provider, không gọi OpenRouter thật.

## 4. Authorized Agent Context

Java dựng context từ dữ liệu đã xác minh; browser và LLM không được tự khai báo quyền:

```json
{
  "requestId": "req-...",
  "actorId": "student-...",
  "actorRole": "STUDENT",
  "sourceType": "PERSONAL_PDF",
  "documentScopes": [
    {
      "documentId": "doc-...",
      "documentVersion": 3,
      "pageCount": 82,
      "allowedPageFrom": 1,
      "allowedPageTo": 82
    }
  ]
}
```

Quy tắc:

- `documentIds`, version, owner và page limit nằm trong runtime context, không nằm trong tool args do LLM tự tạo.
- Python đối chiếu mọi tool call với context trước retrieval.
- Tool call vượt scope trả `SCOPE_VIOLATION`; không tự thu hẹp rồi âm thầm tiếp tục.
- Conversation history không được dùng để mở rộng document scope.

### 4.1. Guardrails bắt buộc

Guardrails không giao hoàn toàn cho mô hình mà được kiểm tra bằng code tại từng ranh giới:

| Lớp bảo vệ | Cách thực hiện |
|---|---|
| Quyền truy cập | Java cấp danh sách tài liệu, phiên bản và trang được phép; Python không nhận phạm vi mới do prompt hoặc LLM tự tạo |
| Cô lập dữ liệu | Cả nhánh vector và từ khóa đều lọc scope trước khi xếp hạng; Python kiểm tra lại từng evidence sau retrieval/rerank |
| Prompt injection | Câu hỏi và nội dung PDF luôn nằm trong vùng dữ liệu không đáng tin; system rule cố định yêu cầu bỏ qua mọi chỉ dẫn nằm trong tài liệu |
| Thiếu bằng chứng | Evidence dưới ngưỡng hoặc không đủ hỗ trợ phải trả `NO_EVIDENCE`; không dùng kiến thức bên ngoài để bù |
| Đầu ra mô hình | OpenRouter phải trả JSON theo schema đóng; trường lạ, output bị cắt hoặc refusal đều bị coi là lỗi |
| Citation | LLM chỉ chọn `evidenceId`; Python tự dựng `documentId`, phiên bản, trang và trích đoạn từ evidence đã xác minh |
| Quiz | Đúng số câu được yêu cầu, mỗi câu đúng 4 lựa chọn khác nhau, đúng một đáp án và có citation hợp lệ |
| Giới hạn tài nguyên | Giới hạn độ dài prompt, số tài liệu, số trang/chunk, số ứng viên và timeout; không log prompt, nội dung PDF, signed URL hoặc secret |

Guardrails trên bảo vệ quyền, cấu trúc và tính bám nguồn. Chúng không tự chứng minh mọi câu trả lời đúng về ngữ nghĩa; phần đó phải được đo riêng bằng bộ đánh giá groundedness/factual correctness.

## 5. Tool của Personal Document Assistant

### 5.1. `ask_document`

**Args**

```json
{
  "question": "ACID là gì?",
  "pageFrom": null,
  "pageTo": null
}
```

**Workflow**

```text
normalize query có giới hạn
→ vector search + full-text search trong authorized Personal PDF
→ Reciprocal Rank Fusion (RRF)
→ LangChain rerank và giảm evidence gần trùng
→ evidence gate
→ grounded generation
→ claim/citation validation
→ ANSWERED hoặc NO_EVIDENCE
```

**Output** gồm `status`, `answer`, `citations[]` và safe metadata. Citation chỉ được dựng từ evidence snapshot đã retrieval.

### 5.2. `summarize_document`

**Args**

```json
{
  "instruction": "Tóm tắt thành các ý chính",
  "pageFrom": 10,
  "pageTo": 25,
  "style": "BULLET"
}
```

**Workflow**

```text
load toàn bộ chunk trong phạm vi theo thứ tự trang
→ chọn single-pass hoặc bounded map/reduce
→ synthesis
→ citation validation
→ SUMMARIZED hoặc NO_EVIDENCE
```

Tóm tắt không dùng top-k retrieval làm nguồn duy nhất vì phải bao phủ toàn bộ phạm vi được chọn.

### 5.3. `generate_quiz`

**Args**

```json
{
  "instruction": "Tập trung vào ACID và Isolation Level",
  "questionCount": 15,
  "pageFrom": 10,
  "pageTo": 25,
  "difficulty": "HARD"
}
```

**Workflow**

```text
retrieval đúng phạm vi
→ evidence sufficiency check
→ structured MCQ_SINGLE generation
→ deterministic validation
→ grounding reviewer
→ bounded retry
→ trả Quiz draft cho Java
```

- Student tự chọn số câu qua prompt; agent trích xuất `questionCount`.
- Giới hạn kỹ thuật dự kiến `1..30`, chốt trong specification/API trước khi code.
- Mỗi câu giữ đúng bốn options, một `correctOptionIndex`, explanation và sources.
- Nếu thiếu số câu hoặc phạm vi mơ hồ, agent trả clarification thay vì tự đoán.
- Quiz không lấy câu trả lời trước trong chat làm evidence.
- Java lưu Quiz ở `REVIEW_REQUIRED`; Student phải accept trước attempt.

## 6. Quy tắc Single Orchestrator Agent

### 6.1. Agent được phép

- Hiểu prompt và chọn một trong ba tool.
- Trích xuất instruction, page range, question count, difficulty và summary style.
- Hỏi lại khi thiếu tham số hoặc prompt có nhiều mục tiêu.
- Dùng history gần đây để hiểu câu hỏi nối tiếp của RAG.

### 6.2. Agent không được phép

- Tự tạo hoặc thay đổi `actorId`, `documentId`, document version hay authorized scope.
- Gọi nhiều tool trong một lượt ở MVP.
- Dùng câu trả lời trong history làm nguồn cho Summary hoặc Quiz.
- Truy cập database trực tiếp ngoài repository/service đã kiểm soát.
- Accept, reject, publish, chấm Quiz hoặc cập nhật progress.
- Làm theo instruction nằm trong nội dung PDF.

### 6.3. Kết quả điều phối

```json
{
  "selectedTool": "generate_quiz",
  "status": "READY_TO_EXECUTE",
  "arguments": {
    "questionCount": 15,
    "pageFrom": 10,
    "pageTo": 25,
    "difficulty": "HARD"
  },
  "missingFields": []
}
```

Kết quả phải qua Pydantic validation. Tool name ngoài allowlist, tham số sai hoặc tool call thứ hai đều bị từ chối.

## 7. Course Material PDF và AI Tutor

Teacher tải Course Material dưới dạng PDF vào Course Offering. Student có enrollment `APPROVED` được dùng viewer, note và AI Tutor theo trang.

```text
Student mở trang PDF
→ Java kiểm enrollment + publication + version READY
→ Java cấp document/page scope
→ Python retrieval trong Course Material PDF
→ answer + citation theo pageNumber
```

- Đây là workflow trực tiếp, không đi qua Personal Document Agent.
- Chỉ Student sử dụng Course Material AI Tutor.
- Teacher không có AI Tutor.
- Tên nghiệp vụ mới: `Course Material AI Tutor`; không dùng `Slide AI Tutor` trong contract mới.

## 8. Teacher AI Quiz Generator

Teacher chỉ có một chức năng AI: sinh Quiz từ Course Material PDF thuộc Course Offering mình sở hữu.

```text
Teacher chọn Course Offering
→ chọn PDF và phạm vi trang
→ chọn số câu, độ khó, chủ đề/prompt
→ Java kiểm ownership + document READY
→ Python sinh Quiz draft có citation
→ Teacher review/chỉnh sửa
→ Teacher publish
→ Student làm bài
→ Java chấm điểm
```

- Teacher tự chọn số câu trong giới hạn hệ thống; không cố định 15.
- Teacher flow dùng form rõ ràng, không dùng chatbot hoặc agent auto-routing.
- Python không publish Quiz và không chấm điểm.
- Thiếu evidence để tạo đủ số câu phải trả `INSUFFICIENT_EVIDENCE` hoặc số câu thực tế theo policy đã chốt; không dùng kiến thức ngoài PDF để bù.

## 9. Pipeline PDF thống nhất

```text
PDF
→ kiểm MIME/signature/kích thước/mã hóa
→ extract text theo trang
→ normalize
→ chunk giữ page metadata
→ embedding 1024 chiều
→ pgvector
→ activate index version
```

Metadata tối thiểu:

```text
documentId
documentVersion
sourceType: PERSONAL_PDF | COURSE_MATERIAL_PDF
ownerId hoặc courseOffering scope do Java cấp
pageNumber
chunkIndex
embeddingModel
embeddingDimensions
indexVersion
```

- PDF mã hóa: `PDF_ENCRYPTED`.
- PDF không có text layer: `PDF_TEXT_REQUIRED`.
- OCR ngoài phạm vi MVP.
- Reindex tạo version mới và activate nguyên tử; không trộn vector giữa các version.

## 10. Contract Java ↔ Python cần thay đổi

Danh sách mục tiêu để cập nhật `docs/api-plan.md` trước khi code:

- Giữ `POST /internal/v1/documents/index`.
- Giữ `POST /internal/v1/documents/deindex`.
- Giữ `GET /internal/v1/jobs/{jobId}`.
- Thêm `POST /internal/v1/personal-assistant/runs` cho Single Agent.
- Đổi `POST /internal/v1/slides/ask` thành `POST /internal/v1/course-materials/ask`.
- Giữ hoặc version lại `POST /internal/v1/quizzes/generate` để hỗ trợ:
  - `PERSONAL_STUDENT` từ tool của agent;
  - `COURSE_TEACHER` từ form Teacher.
- Giữ `GET /internal/v1/health`.

Mọi request cần:

- service credential;
- `X-Request-Id`;
- schema version mới;
- authorized scope do Java dựng;
- timeout;
- `Idempotency-Key` cho mutation/job.

Mọi response phải có schema rõ, safe error code và không trả prompt nội bộ/provider payload.

## 11. Persistence dự kiến

- `ai.index_jobs`: job indexing/deindexing idempotent.
- `ai.document_indexes`: active version, model, dimensions và source type.
- `ai.document_chunks`: text, page metadata và vector.
- `ai.agent_runs`: request ID, selected tool, status, latency, token summary và safe error code; không lưu document content trong log.
- `ai.evidence_snapshots`: danh sách chunk ID thực tế dùng cho generation/evaluation.
- Conversation, message, Quiz lifecycle, question, attempt và score vẫn thuộc schema `app` do Java sở hữu.

## 12. Milestone triển khai

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| AI-M0 | Chốt specification, API vNext, error code và schema tool | Contract test fixture được hai phía thống nhất |
| AI-M1 | FastAPI foundation, service auth, provider adapter, Pydantic schema | Health và schema tests đạt; không lộ secret |
| AI-M2 | PDF parser, chunker, pgvector, index/deindex worker | Personal/Course PDF index đúng page, version và source scope |
| AI-M3 | Retrieval, evidence gate, citation validator | Scope violation bằng 0; `NO_EVIDENCE` đúng |
| AI-M4 | Single Orchestrator Agent + `ask_document` | Agent chọn đúng tool; RAG có citation và history giới hạn |
| AI-M5 | `summarize_document` | Tóm tắt bao phủ đúng phạm vi, map/reduce ổn định |
| AI-M6 | `generate_quiz` cho Student | Đúng số câu/schema/source; Java nhận `REVIEW_REQUIRED` |
| AI-M7 | Course Material AI Tutor cho Student | Enrollment/publication/page scope được cô lập |
| AI-M8 | Teacher Quiz Generator | Ownership, số câu tùy chọn, review/publish flow đạt contract |
| AI-M9 | Evaluation, tracing, hardening và Docker readiness | KPI đạt; retry/idempotency/latency được kiểm chứng |

## 13. Kiểm thử

### 13.1. Agent và tool routing

- Prompt hỏi kiến thức chọn `ask_document`.
- Prompt tóm tắt chọn `summarize_document`.
- Prompt tạo câu hỏi chọn `generate_quiz`.
- Prompt mơ hồ trả clarification.
- Prompt có hai hành động không chạy hai tool.
- Tool name ngoài allowlist bị từ chối.
- Tool args sai schema hoặc vượt giới hạn bị từ chối.
- Agent không thể thay đổi document scope qua prompt injection.

### 13.2. PDF và retrieval

- PDF hợp lệ, mã hóa, không text, MIME giả và file quá giới hạn.
- Personal owner isolation.
- Course Offering/enrollment/publication isolation.
- Document version isolation.
- Vector đúng 1024 chiều và index version.
- Citation đúng document/version/page/chunk.
- Index/deindex idempotent và không tạo chunk trùng.

### 13.3. Hỏi đáp và tóm tắt

- `ANSWERED` và `NO_EVIDENCE`.
- Follow-up dùng history nhưng không mở rộng scope.
- Summary đọc đủ chunk trong page range theo thứ tự.
- Tài liệu dài đi qua bounded map/reduce.
- Claim không được evidence hỗ trợ bị loại hoặc sửa tối đa theo retry policy.

### 13.4. Quiz

- Đúng `questionCount` đã chọn.
- Mỗi câu có đúng bốn options và một đáp án đúng.
- Không trùng câu/options.
- Explanation và citation thuộc authorized scope.
- `INSUFFICIENT_EVIDENCE` khi không đủ nguồn.
- Student Quiz đi vào `REVIEW_REQUIRED` và chỉ Student accept.
- Teacher Quiz chỉ Teacher sở hữu Course Offering mới review/publish.
- Python không chấm điểm hoặc ghi progress.

## 14. Evaluation

Đánh giá riêng từng flow:

| Flow | Chỉ số chính |
|---|---|
| Tool routing | intent/tool accuracy, clarification accuracy, unsafe tool-call rate |
| Personal RAG | context precision/recall, faithfulness, answer relevancy, citation entailment |
| Summary | coverage, factual consistency, citation coverage, compression ratio |
| Student Quiz | count/schema validity, uniqueness, groundedness, citation correctness |
| Course Tutor | page-scope correctness, faithfulness, citation correctness |
| Teacher Quiz | count/schema validity, difficulty fit, groundedness, publication safety |

Điều kiện bắt buộc:

- `scope_violation_rate = 0`;
- citation validity mục tiêu `100%`;
- không có hallucination nghiêm trọng trong locked test set;
- lỗi production được thêm vào regression set;
- evaluator dùng đúng evidence snapshot của production flow, không retrieval lại để chấm.

## 15. Tài liệu cần đồng bộ sau khi duyệt kế hoạch

Kế hoạch này đang thay đổi các quyết định cũ. Trước khi triển khai code phải đồng bộ:

1. `AGENTS.md`: bỏ PPTX/slide-specific rule; thêm PDF Course Material, Single Agent và Teacher Quiz.
2. `docs/specification.md`: cập nhật role/function/source matrix.
3. `docs/specs/02-student-learning.md`: PDF Viewer, Page Note và Course Material Tutor.
4. `docs/specs/03-personal-ai-and-quiz.md`: agent ba tool, Summary và Quiz trong chat.
5. `docs/specs/05-teacher-content.md`: PDF-only và Teacher Quiz Generator.
6. `docs/api-plan.md`: endpoint/schema version mới.
7. `docs/database-plan.md`: source type, page metadata, agent run/evidence snapshot nếu lưu.
8. `docs/architecture.md` và `docs/low-level-design.md`: bỏ PPTX pipeline và multi-agent wording.
9. `docs/frontend-implementation-plan.md` và `docs/demo-flow.md`: UI chatbot ba chức năng, PDF viewer và Teacher Quiz form.
10. Báo cáo Chương 1–3 và toàn bộ diagram có nhắc PPTX, slide citation hoặc Teacher không có Quiz.

Không sửa code trước khi specification và API contract mới được duyệt, vì thay đổi này đi qua Frontend, Java Backend, Python AI Service và database metadata.

## 16. Ngoài phạm vi MVP

- Multi-agent/sub-agent delegation.
- Teacher Personal PDF Chatbot.
- Teacher AI Tutor.
- PPTX/DOCX/OCR.
- Nhiều tool call trong cùng một lượt chat.
- Agent tự lập kế hoạch học tập.
- AI grading, tự publish Quiz hoặc tự cập nhật progress.
- Dùng conversation answer làm nguồn Quiz.

## 17. Rủi ro và biện pháp

| Rủi ro | Biện pháp |
|---|---|
| Agent chọn sai tool | Tool description rõ, test tiếng Việt, clarification và chế độ chọn thủ công dự phòng |
| Tool call vượt scope | Scope do Java dựng, tool không nhận owner/document ID từ LLM |
| Summary bỏ sót nội dung | Load toàn bộ chunk trong range, map/reduce có giới hạn |
| Quiz không đủ số câu có nguồn | Evidence sufficiency gate và `INSUFFICIENT_EVIDENCE` |
| Chi phí/độ trễ tăng | Một tool/lượt, giới hạn số câu/trang, token budget và metrics theo stage |
| Prompt injection trong PDF | Tài liệu là untrusted data, system/tool policy bất biến |
| LangChain/LangGraph thay đổi API | Pin dependency, adapter riêng và contract tests không phụ thuộc framework internals |

## 18. Definition of Done

- Ba tool của Personal Document Assistant có schema và contract test đầy đủ.
- Agent chọn đúng một tool hoặc clarification; không có tool call ngoài allowlist.
- Personal/Course PDF được cô lập đúng owner, enrollment, publication và version.
- Student Course Material Tutor chỉ dùng PDF và citation theo trang.
- Teacher chỉ có AI Quiz Generator, số câu tùy chọn trong giới hạn đã chốt.
- Java vẫn là nơi duy nhất quản lý Quiz lifecycle, scoring và progress.
- Evaluation đạt ngưỡng đã duyệt và scope violation bằng 0.
- Không có secret, prompt, document content hoặc dữ liệu người dùng thật trong log/test.
