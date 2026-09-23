# StudyFlow Python AI service

Internal service cho hai pipeline tài liệu và một tác vụ sinh nội dung:

1. `PERSONAL_RAG`: PDF của Student → extract/chunk/embed → pgvector → answer + citation.
2. `TEACHER_SLIDE`: PPTX của Teacher → extract/render/index → Slide AI Tutor + slide citation.
3. `QUIZ_GENERATION`: các Personal Document đã được Java cấp quyền → câu hỏi có đáp án, giải thích và nguồn.

PDF Teacher public không index AI. Service không xử lý Class/Subject/publication, Note, progress, plan, vòng đời Quiz hoặc scoring.

## Cấu trúc

```text
app/
├── main.py
├── api/routes/
│   ├── health.py
│   ├── documents.py
│   ├── jobs.py
│   ├── personal_rag.py
│   ├── slides.py
│   └── quizzes.py
├── core/
├── schemas/
├── pipelines/
│   └── parsers/
├── services/
├── workers/
└── clients/
migrations/
evals/
tests/
```

## Contract

- `POST /internal/v1/documents/index`
- `POST /internal/v1/documents/deindex`
- `GET /internal/v1/jobs/{jobId}`
- `POST /internal/v1/personal-rag/ask`
- `POST /internal/v1/slides/ask`
- `POST /internal/v1/quizzes/generate`
- `GET /internal/v1/health`

AI-M0 và AI-M1 đã hoàn thành:

- Health, service credential, request ID, schema version 2 và safe error envelope.
- OpenRouter embedding adapter cấu hình `text-embedding-3-large` với 1024 chiều.
- `documents/index`, `documents/deindex` và `jobs/{jobId}` dùng durable idempotent job.
- Alembic tạo schema `ai`, pgvector/HNSW, job, index version và chunk repository.
- Worker claim bằng `SKIP LOCKED`, retry tối đa theo cấu hình và không log signed URL/nội dung.

Các route Personal RAG, Slide Tutor và Quiz chưa có operation production vì thuộc AI-M2–M4. Worker M1 chỉ cung cấp lifecycle và processor contract; parser PDF/PPTX chưa được triển khai.

Schema v2 giới hạn `PERSONAL_RAG` ở PDF và `TEACHER_SLIDE` ở PPTX; PDF Teacher không gửi sang AI. Citation chỉ còn `PAGE` hoặc `SLIDE`. Header version và ánh xạ lỗi API sẽ được thực thi khi triển khai route theo `docs/api-plan.md`.

## Data

Python/Alembic sở hữu schema `ai` trong PostgreSQL và dùng pgvector. Mọi retrieval và Quiz generation phải filter theo document/version/source/owner scope Java đã cấp. Test/eval chỉ dùng dữ liệu tổng hợp.

## Cài đặt và kiểm tra M1

```bash
python -m pip install -e ".[test]"
python -m pytest
python -m alembic -c alembic.ini upgrade head --sql
```

Lệnh test dùng fake provider, không gọi OpenRouter thật. Chỉ chạy `alembic upgrade head` không có `--sql` khi PostgreSQL/pgvector và database role của AI đã được cấu hình đúng ở runtime.
