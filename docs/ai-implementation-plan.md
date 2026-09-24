# StudyFlow — Kế hoạch triển khai AI Service

**Người phụ trách:** Chủ dự án, đồng thời phụ trách Frontend nhưng thực hiện theo boundary `AI_AGENT` trong `AGENTS.md`.

> **Trạng thái 24/09/2026:** mới chốt cấu trúc và kế hoạch; chưa scaffold dependency, code, migration hoặc test. Bắt đầu từ AI-M0 khi triển khai.

## 1. Mục tiêu và boundary

- Xây dựng Python FastAPI internal service cho document intelligence, RAG, citation và Quiz generation.
- Chỉ nhận authorized scope từ Java; không nhận quyền do browser tự khai báo.
- Không truy cập bảng user, Course Enrollment, Note, progress, study plan, Quiz attempt hoặc result.
- Không chấm Quiz và không cập nhật Content Progress.
- Teacher PDF không index AI; Personal chỉ PDF; Teacher Slide chỉ PPTX.

## 2. Model và OpenRouter

### Model sinh nội dung

```text
OPENROUTER_CHAT_MODEL=openai/gpt-5.6-luna
```

Dùng cho Personal RAG, Slide Tutor, giải thích/tóm tắt và sinh Quiz `MCQ_SINGLE`. Quiz phải dùng structured output theo JSON Schema. Tham chiếu: [OpenRouter — GPT-5.6 Luna](https://openrouter.ai/openai/gpt-5.6-luna).

### Model embedding

```text
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-large
EMBEDDING_DIMENSIONS=1024
EMBEDDING_DISTANCE=cosine
```

- Model phù hợp retrieval đa ngôn ngữ: [OpenRouter model page](https://openrouter.ai/openai/text-embedding-3-large).
- OpenAI công bố chất lượng MIRACL cao hơn bản `small`: [embedding announcement](https://openai.com/index/new-embedding-models-and-api-updates/).
- Rút xuống 1024 chiều bằng tham số `dimensions`: [embedding guide](https://developers.openai.com/api/docs/guides/embeddings).
- `vector(1024)` nằm trong giới hạn HNSW của pgvector: [pgvector documentation](https://github.com/pgvector/pgvector).
- Query và document chunk phải dùng cùng model, dimensions và index version; đổi cấu hình bắt buộc reindex.

### Cấu hình

```text
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=<secret>
OPENROUTER_CHAT_MODEL=openai/gpt-5.6-luna
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-large
EMBEDDING_DIMENSIONS=1024
```

- Dùng OpenAI Python SDK với `base_url` của OpenRouter.
- API key chỉ nằm trong runtime environment; không log hoặc trả về response.
- Unit test dùng fake provider và không gọi mạng thật.

## 3. Pipeline

### Personal PDF

```text
PDF → validation → extract theo trang → chunk
    → embedding 1024 chiều → pgvector → activate version
```

- PDF mã hóa trả `PDF_ENCRYPTED`; PDF không có lớp văn bản trả `PDF_TEXT_REQUIRED`.
- Chunk giữ documentId, version, ownerId, pageNumber và chunkIndex.

### Teacher PPTX

```text
PPTX → extract text + render slide → chunk theo slide
     → embedding 1024 chiều → pgvector → activate version
```

- Artifact slide lưu Object Storage và trả metadata cho Java qua job result.
- Chunk giữ documentId, version, slideNumber và source type `TEACHER_SLIDE`.

### Retrieval, RAG và Quiz

- Filter document/version/owner/source/location trước vector ranking.
- Dùng cosine distance; không đủ evidence trả `NO_EVIDENCE` và không gọi model để đoán.
- Query rewrite, retrieval, generation và reviewer dùng cùng một request trace; evidence snapshot được giữ để đánh giá đúng context thực sự đã dùng.
- Generation nội bộ trả `claims[].text + claims[].chunkIds`. Claim reviewer phân loại `SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`, `CONTRADICTED` và chỉ cho phép ghép câu trả lời khi không còn claim quan trọng thiếu nguồn.
- Citation chỉ được tạo từ chunk đã retrieval và phải entail claim gắn với nó; không chỉ kiểm tra ID hợp lệ.
- Reviewer/rewrite tối đa một lần. Nếu vẫn thiếu bằng chứng, trả `NO_EVIDENCE` thay vì mở rộng bằng kiến thức model.
- Personal citation: document + page; Slide citation: document + slide.
- Quiz nhận `userPrompt` tự do như dữ liệu không tin cậy nhưng chỉ sinh `MCQ_SINGLE` với 4 options, đúng một `correctOptionIndex`, explanation và source.
- System prompt/schema/authorized scope luôn ưu tiên hơn user prompt; yêu cầu đổi format, bỏ citation hoặc truy cập nguồn khác phải bị bỏ qua.
- Java revalidate toàn bộ output trước khi lưu.

### Pattern chatbot tham khảo

Từ repo [Multi-Agent Document Intelligence Assistant](https://github.com/bch7504/Multi-Agent-Document-Intelligence-Assistant), StudyFlow chỉ áp dụng các pattern phù hợp với boundary hiện tại:

- chọn nhiều document `READY`, hiển thị evidence scope và giữ conversation history;
- trạng thái truy xuất/đối chiếu nguồn, citation card document + page/excerpt;
- citation được tạo/validate bằng code từ retrieved chunk;
- guardrail cho prompt injection và reviewer/retry có giới hạn.

Không sao chép frontend gọi FastAPI, model/provider selector, Supervisor/auto routing, Agent Trace, Milvus/BM25/RRF, single-user authorization hoặc Quiz làm trực tiếp trong chat. StudyFlow giữ `Web → Java → Python`, PostgreSQL + pgvector và Java sở hữu Quiz lifecycle.

## 4. Internal contract

- `POST /internal/v1/documents/index`
- `POST /internal/v1/documents/deindex`
- `GET /internal/v1/jobs/{jobId}`
- `POST /internal/v1/personal-rag/ask`
- `POST /internal/v1/slides/ask`
- `POST /internal/v1/quizzes/generate`
- `GET /internal/v1/health`

Mỗi request có service credential, `X-Request-Id`, `X-Schema-Version: 3`, authorized scope tối thiểu và timeout. Version 3 thay form Quiz count/difficulty bằng `userPrompt`. Index/deindex yêu cầu `Idempotency-Key`; không retry mù LLM request sau timeout.

Job result của `TEACHER_SLIDE` cần trả danh sách artifact có schema rõ để Java lưu slide metadata. Contract này phải được cập nhật trong `docs/api-plan.md` trước khi triển khai hai phía.

## 5. Persistence và worker

- Alembic sở hữu schema `ai`.
- `ai.index_jobs`: idempotency, status, attempts, next retry và safe error code.
- `ai.document_indexes`: model, dimensions, version và active status.
- `ai.document_chunks`: scope metadata, content và `vector(1024)`.
- Worker claim job bằng row lock/`SKIP LOCKED`, retry tối đa ba lần với backoff.
- Reindex ghi version mới, activate nguyên tử rồi mới dọn version cũ.
- Xóa tài liệu phải loại khỏi retrieval scope trước khi deindex.

## 6. Milestone

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| AI-M0 | Config, service auth, error mapping, provider adapter | Health/schema test đạt, không lộ secret |
| AI-M1 | Alembic, pgvector repository và job worker | Job idempotent, retry không tạo dữ liệu trùng |
| AI-M2 | Personal PDF và Teacher PPTX pipeline | Page/slide metadata và vector đúng 1024 chiều |
| AI-M3 | Retrieval, Personal RAG và Slide Tutor | Scope isolation, citation và `NO_EVIDENCE` đúng |
| AI-M4 | Free-prompt structured Quiz generation | Mọi câu hợp lệ, đúng một đáp án, có nguồn và prompt không vượt system rule |
| AI-M5 | Eval v2, metrics và hardening | Đạt KPI theo từng flow/nhóm case trong kế hoạch evaluation |

## 7. Kiểm thử và kế hoạch đánh giá chatbot

### 7.1 Nguyên tắc đo lường

Không kết luận chất lượng chỉ từ một điểm `factual_correctness` hoặc vài câu hỏi. Personal RAG và Slide Tutor được báo cáo riêng vì có authorized scope và đơn vị citation khác nhau.

```text
authorized scope → query/history normalization → retrieval một lần
                 → lưu evidence snapshot → generation có claim-source mapping
                 → claim reviewer → sửa tối đa một lần → response
```

- Evaluator gọi đúng entry point production, không gọi hàm QA rút gọn.
- Context dùng để chấm là chính evidence snapshot đã truyền vào generation; không retrieval lần hai.
- Reviewer phân loại claim thành `SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`, `CONTRADICTED`.
- Claim quan trọng chưa được hỗ trợ phải bị xóa/viết lại hoặc response chuyển thành `NO_EVIDENCE`.
- Nội dung tài liệu là dữ liệu không tin cậy; prompt injection trong tài liệu không được thay đổi instruction, scope hay tool behavior.

### 7.2 Unit, integration và contract test

- Contract test có input hợp lệ, input sai và output schema cho mọi boundary.
- Parser test bằng PDF/PPTX tổng hợp; không dùng upload thật.
- Test PDF mã hóa, PDF không text và pipeline/MIME sai.
- Test owner/document/version/source/Course Offering isolation và citation đúng trang/slide.
- Test vector đúng 1024 chiều, embedding version khớp và reindex an toàn.
- Test index/deindex idempotent, retry tối đa ba lần và không tạo chunk trùng.
- Test Quiz malformed, prompt injection, option trùng, answer index sai và citation ngoài scope.
- Test claim reviewer loại `UNSUPPORTED`/`CONTRADICTED`, retry đúng một lần và fallback `NO_EVIDENCE`.
- Không log document content, prompt, answer, signed URL, token hoặc provider payload.

### 7.3 Dataset evaluation v2

- Pilot: 50–100 case do người duyệt; trước production rộng: 150–300 case.
- `development set` dùng tuning; `locked test set` không dùng tuning; `production regression set` bổ sung case tổng hợp/ẩn danh tái hiện lỗi thật.

| Nhóm case | Tỷ lệ mục tiêu |
|---|---:|
| Một chunk/slide trực tiếp | 15% |
| Tổng hợp nhiều chunk/slide | 20% |
| Nhiều Personal Document | 15% |
| Câu hỏi nối tiếp dùng history | 10% |
| Không đủ bằng chứng | 15% |
| Mơ hồ hoặc ngoài phạm vi | 10% |
| Tiếng Việt/đa ngôn ngữ | 10% |
| Prompt injection trong tài liệu | 5% |

Slide Tutor có thêm case hỏi slide hiện tại/lân cận, citation sai slide và câu ngoài PPTX. Personal RAG có case nhiều PDF và owner/document/version isolation.

Mỗi case có schema rõ:

```json
{
  "id": "slide-followup-001",
  "flow": "SLIDE_TUTOR",
  "question": "Vậy bất thường thứ hai gây hậu quả gì?",
  "conversationHistory": [],
  "authorizedScope": {
    "documentIds": ["synthetic-pptx-01"],
    "currentSlide": 3
  },
  "expectedStatus": "ANSWERED",
  "referenceAnswer": "...",
  "requiredClaims": ["..."],
  "forbiddenClaims": ["..."],
  "relevantChunkIds": ["synthetic-pptx-01:v1:s3:c0"],
  "questionType": "FOLLOW_UP",
  "difficulty": "MEDIUM",
  "language": "vi"
}
```

Dataset chỉ dùng PDF/PPTX tổng hợp hoặc dữ liệu đã được phép; không đưa upload thật vào repository/CI.

### 7.4 Metric

- Retrieval: `context_precision@k`, `context_recall@k`, duplicate context rate và `scope_violation_rate`.
- Answer: claim precision, claim recall, factual correctness F1, faithfulness và answer relevancy.
- Citation: citation validity và citation entailment ở cấp từng claim.
- Behavior: refusal accuracy, false refusal và history resolution accuracy.
- Operation: latency theo rewrite/retrieval/generation/reviewer, token usage và chi phí ước tính.

`factual_correctness_f1` là harmonic mean của claim precision/recall, không được dùng một mình để kết luận. Citation phải chứng minh claim gắn với nó, không chỉ có document/page/slide ID hợp lệ.

### 7.5 Ngưỡng chất lượng

| Chỉ số | Pilot nội bộ | Mục tiêu production |
|---|---:|---:|
| Faithfulness | ≥ 0,90 | ≥ 0,95 |
| Answer relevancy | ≥ 0,85 | ≥ 0,90 |
| Factual correctness F1 | ≥ 0,70 | ≥ 0,80 |
| Context precision | ≥ 0,70 | ≥ 0,80 |
| Citation validity | ≥ 98% | 100% |
| Citation entailment | ≥ 0,90 | ≥ 0,95 |
| Từ chối đúng câu ngoài phạm vi | ≥ 90% | ≥ 95% |
| Scope violation | 0 | 0 |

Không nhóm quan trọng nào dưới `0,70`; không có hallucination nghiêm trọng; kết quả phải ổn định qua ba lần chạy. Lỗi production phải được thêm vào regression set.

### 7.6 Cách chạy và báo cáo

Mỗi benchmark chạy ba lần với cùng dataset snapshot và lưu:

- commit/build, dataset version và SHA-256;
- chat/embedding model, temperature, provider route;
- prompt/schema/retrieval/reranker version và `topK`;
- evidence/chunk ID thực sự đã dùng, không log nội dung tài liệu production;
- latency từng stage, token/cost; điểm theo flow, question type, language, difficulty cùng độ dao động.

LLM-as-judge chỉ là một tín hiệu. Case fail, từ chối sai, citation entailment thấp và hallucination nghiêm trọng phải được người đánh giá xem lại.

### 7.7 Lộ trình cải thiện và CI

1. Siết prompt để chỉ trả lời điều được hỏi và không thêm kiến thức model.
2. Benchmark `topK`, loại chunk gần trùng, metadata heading/page/slide và sub-query cho câu nhiều ý.
3. Thử reranker; chỉ giữ nếu chất lượng tăng đáng kể sau khi tính latency/chi phí.
4. Đánh giá claim reviewer và giới hạn một lần rewrite.
5. Pull request chạy contract/unit + smoke set bằng fake provider; full locked test chạy nightly/manual trong môi trường eval.
6. Chỉ qua release gate khi đạt ngưỡng pilot, scope violation bằng 0 và không có hallucination nghiêm trọng.
7. Chưa tuyên bố production-ready nếu dataset chưa đủ độ phủ hoặc evaluator chưa đi qua toàn pipeline production.

## 8. Dependency và bàn giao

- Java phải xác minh ownership hoặc Course Enrollment `APPROVED` cùng publication trước khi gọi Python.
- Java revalidate citation và Quiz output; Python không phải system of record.
- Object Storage artifact handoff cho PPTX là dependency contract cần hoàn tất trước AI-M2.
- Mọi thay đổi wire shape phải tăng schema version hoặc có migration tương thích và cập nhật `docs/api-plan.md`.

## 9. Kế hoạch đóng gói Docker

- Phần Docker của AI Service được quản lý trong [kế hoạch Docker toàn dự án](docker-deployment-plan.md); hiện chưa triển khai hoặc chạy container.
- `ai-api` và `ai-worker` dùng chung một Python image nhưng chạy command riêng; chỉ `ai-api` mở port trong mạng service nội bộ.
- Alembic migration chạy thành bước riêng trước API/Worker, chỉ sở hữu schema `ai`; PostgreSQL image phải hỗ trợ pgvector.
- OpenRouter key và service credential chỉ được inject khi runtime, không nằm trong image, Compose YAML hoặc client bundle.
- Bắt đầu Dockerfile AI sau AI-M1; nghiệm thu bằng health check, migration idempotent, worker restart an toàn và kiểm tra không lộ secret.
