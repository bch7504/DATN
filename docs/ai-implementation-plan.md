# StudyFlow — Kế hoạch triển khai AI Service

**Người phụ trách:** Chủ dự án, đồng thời phụ trách Frontend nhưng thực hiện theo boundary `AI_AGENT` trong `AGENTS.md`.

> **Trạng thái 23/09/2026:** AI-M0 và AI-M1 đã hoàn thành; 25 test đạt và Alembic sinh SQL migration hợp lệ. Dừng trước AI-M2 theo phạm vi hiện tại.

## 1. Mục tiêu và boundary

- Xây dựng Python FastAPI internal service cho document intelligence, RAG, citation và Quiz generation.
- Chỉ nhận authorized scope từ Java; không nhận quyền do browser tự khai báo.
- Không truy cập bảng user, membership, Note, progress, study plan, Quiz attempt hoặc result.
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
- Citation chỉ được tạo từ chunk đã retrieval.
- Personal citation: document + page; Slide citation: document + slide.
- Quiz chỉ sinh `MCQ_SINGLE`, tối thiểu hai option, đúng một `correctOptionIndex`, explanation và source.
- Java revalidate toàn bộ output trước khi lưu.

## 4. Internal contract

- `POST /internal/v1/documents/index`
- `POST /internal/v1/documents/deindex`
- `GET /internal/v1/jobs/{jobId}`
- `POST /internal/v1/personal-rag/ask`
- `POST /internal/v1/slides/ask`
- `POST /internal/v1/quizzes/generate`
- `GET /internal/v1/health`

Mỗi request có service credential, `X-Request-Id`, `X-Schema-Version: 2`, authorized scope tối thiểu và timeout. Index/deindex yêu cầu `Idempotency-Key`; không retry mù LLM request sau timeout.

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
| AI-M4 | Structured Quiz generation | Mọi câu hợp lệ, đúng một đáp án và có nguồn |
| AI-M5 | Eval, metrics và hardening | Đạt KPI retrieval/citation/latency đã định nghĩa |

## 7. Kiểm thử và evaluation

- Contract test có input hợp lệ, input sai và output schema cho mọi boundary.
- Parser test bằng PDF/PPTX tổng hợp; không dùng upload thật.
- Test PDF mã hóa, PDF không text và pipeline/MIME sai.
- Test owner/document/version/source isolation và citation đúng trang/slide.
- Test vector đúng 1024 chiều, embedding version khớp và reindex an toàn.
- Test index/deindex idempotent, retry tối đa ba lần và không tạo chunk trùng.
- Test Quiz malformed, option trùng, answer index sai và citation ngoài scope.
- Eval tiếng Việt cho retrieval relevance, groundedness, citation correctness, `NO_EVIDENCE` và latency.
- Không log document content, prompt, answer, signed URL, token hoặc provider payload.

## 8. Dependency và bàn giao

- Java phải xác minh ownership/membership/publication trước khi gọi Python.
- Java revalidate citation và Quiz output; Python không phải system of record.
- Object Storage artifact handoff cho PPTX là dependency contract cần hoàn tất trước AI-M2.
- Mọi thay đổi wire shape phải tăng schema version hoặc có migration tương thích và cập nhật `docs/api-plan.md`.

## 9. Kế hoạch đóng gói Docker

- Phần Docker của AI Service được quản lý trong [kế hoạch Docker toàn dự án](docker-deployment-plan.md); hiện chưa triển khai hoặc chạy container.
- `ai-api` và `ai-worker` dùng chung một Python image nhưng chạy command riêng; chỉ `ai-api` mở port trong mạng service nội bộ.
- Alembic migration chạy thành bước riêng trước API/Worker, chỉ sở hữu schema `ai`; PostgreSQL image phải hỗ trợ pgvector.
- OpenRouter key và service credential chỉ được inject khi runtime, không nằm trong image, Compose YAML hoặc client bundle.
- Bắt đầu Dockerfile AI sau AI-M1; nghiệm thu bằng health check, migration idempotent, worker restart an toàn và kiểm tra không lộ secret.
