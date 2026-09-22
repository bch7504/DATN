# StudyFlow — Tech stack mục tiêu

> Trạng thái: stack cho MVP Student–Teacher–Admin. Phiên bản cụ thể phải được khóa khi tạo project và kiểm tra compatibility trong CI.

## 1. Stack

| Lớp | Công nghệ | Mục đích |
|---|---|---|
| Web | Next.js, TypeScript, Tailwind CSS | Student/Teacher/Admin UI, SSR/client interaction |
| API nghiệp vụ | Java, Spring Boot, Spring Security, JPA/Hibernate | Public API, RBAC, transaction, business rules |
| Migration nghiệp vụ | Flyway | Schema `app` |
| AI API/worker | Python, FastAPI, Pydantic | Parsing, rendering, RAG, Slide AI Tutor |
| Migration AI | Alembic | Schema `ai` |
| Database | PostgreSQL | System of record |
| Vector search | pgvector | Embedding cho Personal RAG và Slide AI Tutor |
| Storage | S3-compatible Object Storage | PDF/PPTX, slide render và preview |
| Model | OpenAI hoặc Gemini theo quota | Chat/embedding qua Python adapter |
| Container/CI | Docker, GitHub Actions | Local parity và quality gate |
| Deploy | Vercel + Render/Railway hoặc nền tảng tương đương | Public demo end-to-end |

Không dùng Qdrant/Milvus trong thiết kế hiện tại.

## 2. Frontend

Next.js có ba route group:

- `(student)`: dashboard, classes/subjects/materials, slide viewer, personal documents/RAG + Quiz generation, progress/statistics, plan/weekly calendar, review/Quiz.
- `teacher`: dashboard, assignments, document library, publications.
- `admin`: dashboard, users/roles, classes/subjects/assignments, feedback, logs, settings.

Frontend chỉ gọi Java. Client không tự chấm Quiz, không tính progress và không tạo authorization scope cho AI.

Nên dùng:

- TanStack Query hoặc cơ chế tương đương cho server state.
- React Hook Form + schema validation cho form.
- PDF download qua Java; Slide Viewer dùng artifact, không expose PPTX gốc.
- SSE chỉ khi cần cập nhật job; MVP có thể poll status.

## 3. Spring Boot

Module theo feature:

```text
auth, user, classroom, subject, assignment,
document, publication, slide, note,
progress, study, review, feedback, audit, settings,
integration.ai, integration.storage
```

Spring Security xử lý JWT/RBAC. Application service kiểm ownership/membership/assignment. JPA/Flyway quản lý schema nghiệp vụ. Internal AI client có timeout, request ID, schema version và service credential.

## 4. FastAPI và document processing

Pipeline:

- Personal PDF: extract text theo page → chunk → embed → pgvector.
- Teacher PPTX: extract text + render slide → chunk/embed phần cần Tutor.
- Teacher PDF: không AI index trong MVP.

Thư viện parser/render phải được chọn sau spike với fixture tiếng Việt. LibreOffice headless có thể dùng để chuyển PPTX sang artifact, nhưng cần test font và layout. Adapter model giúp đổi OpenAI/Gemini mà không ảnh hưởng contract Java.

## 5. PostgreSQL và pgvector

- Một PostgreSQL cluster, schema `app` và `ai`.
- Database role riêng cho Java và Python.
- Exact cosine search đủ cho seed demo; thêm HNSW/IVFFlat sau benchmark.
- Dimension gắn với embedding model trong index version; đổi model cần reindex.
- Metadata filter theo document, owner/source type và location trước vector ranking.

## 6. Object Storage

- Bucket/object prefix tách Teacher Library, Personal Documents và slide artifacts.
- Browser không nhận object key nội bộ.
- Java phát download hoặc signed URL ngắn hạn sau kiểm quyền.
- Python nhận signed URL ngắn hạn để xử lý; URL không được log/lưu lâu dài.

## 7. Test và chất lượng

| Phần | Kiểm tra tối thiểu |
|---|---|
| Web | route guard, role navigation, weekly timetable, Slide/Personal RAG → Quiz review flows |
| Java | unit rule, repository integration, security/ownership, API contract |
| Python | parser fixture, scope isolation, citation correctness, job idempotency |
| E2E | Student → Teacher → Admin demo flow với dữ liệu tổng hợp |

AI eval tập trung relevance, faithfulness, citation correctness, owner isolation và latency. Không dùng tài liệu người dùng thật trong test/eval.

## 8. Observability và deployment

- Structured log với `traceId/requestId`, actor ID, action, status, duration và safe error code.
- Metric: processing backlog/failure, Tutor/RAG latency, `NO_EVIDENCE` rate, token usage tổng hợp.
- Không log prompt, document text, token, password hoặc signed URL.
- CI chạy lint/test/build cho phần thay đổi.
- Deploy có health check, HTTPS, CORS đúng origin, migration forward và backup/restore PostgreSQL + Object Storage.
