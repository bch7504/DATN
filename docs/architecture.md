# Kiến trúc hệ thống

## Tổng quan

```text
Next.js Web
    │ HTTPS / JSON
    ▼
Java Spring Boot Backend ──internal HTTP──▶ Python AI Service
    │                                      ├── Parse / Chunk / Embed
    ├── Auth / RBAC                        ├── RAG Tutor / Citation
    ├── Business rules                     └── Quiz Generator / Evaluation
    ├── Quiz scoring                              │
    ├── Progress / Mastery                        ├── Qdrant
    └── PostgreSQL / Object Storage               └── LLM / Embedding API
```

Frontend tách giao diện Student/Admin nhưng chỉ gọi Java backend có RBAC. Java backend giữ toàn bộ luật nghiệp vụ và gọi Python AI qua internal API.

## Quyết định: tách Python AI service

AI được triển khai bằng Python nên có project, dependency, test và container riêng. Hai service vẫn nằm cùng monorepo để chia sẻ tài liệu hợp đồng và thuận tiện tích hợp.

### Java backend sở hữu

- Auth/RBAC, user ownership và public API.
- PostgreSQL transaction và dữ liệu nguồn đáng tin cậy.
- Quiz scoring, Content Progress, Topic Mastery, recommendation và exam countdown.
- Validate/lưu kết quả AI và ghi Learning Events/system logs.

### Python AI service sở hữu

- Parsing PDF/PPTX/DOCX, chunking, embedding và Qdrant indexing.
- Retrieval theo scope Java đã cấp, prompt orchestration và citation.
- Sinh quiz có cấu trúc và RAG/quiz evaluation.
- Adapter cho LLM/Embedding, Qdrant và đọc file qua signed URL.

### Không cho phép

- Frontend gọi trực tiếp Python service.
- Python tự xác định quyền user hoặc truy cập tùy ý database nghiệp vụ.
- Python tự ghi quiz score, mastery, recommendation hoặc exam progress.

## Luồng document processing

```text
Web → Java validate/upload → Object Storage
                         └→ Python parse theo page/slide
                              → chunk → embedding → Qdrant
                         ← processing result / error
Java → cập nhật READY/FAILED trong PostgreSQL
```

Job xử lý cần idempotent, có retry giới hạn và ghi lỗi có thể quan sát. Java gửi document ID, signed file URL và metadata cần thiết; Python không cần quyền database nghiệp vụ. Metadata vector phải đủ để filter theo scope và context hiện tại.

## Internal API tối thiểu

- `POST /internal/v1/documents/index`
- `GET /internal/v1/jobs/{jobId}`
- `POST /internal/v1/rag/ask`
- `POST /internal/v1/quizzes/generate`
- `GET /internal/v1/health`

Mọi request cần service credential, `requestId`, timeout và retry policy. API phải idempotent cho thao tác indexing.

## Luồng học tập

```text
Document → Notes/Session → Tutor/Quiz → Assessment
         → Progress/Mastery → Statistics/Recommendation
         → Study Plan/Exam → Re-assessment
```

## Deployment MVP

- Web: Vercel hoặc môi trường hỗ trợ Next.js.
- Java Spring Boot: Render, Railway, VPS hoặc container platform tương đương.
- Python AI: container/service riêng, chỉ mở internal API.
- PostgreSQL/Storage: Supabase hoặc dịch vụ tương đương.
- Vector database: Qdrant Cloud.
- CI: lint/test/build cho web; test/package riêng cho Java và Python trước khi deploy.
