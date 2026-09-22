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

Chỉ health endpoint đã được implement trong scaffold hiện tại. Các route còn lại là boundary cho implementation sau; không có response mock giả production.

Schema v2 giới hạn `PERSONAL_RAG` ở PDF và `TEACHER_SLIDE` ở PPTX; PDF Teacher không gửi sang AI. Citation chỉ còn `PAGE` hoặc `SLIDE`. Header version và ánh xạ lỗi API sẽ được thực thi khi triển khai route theo `docs/api-plan.md`.

## Data

Python/Alembic sở hữu schema `ai` trong PostgreSQL và dùng pgvector. Mọi retrieval và Quiz generation phải filter theo document/version/source/owner scope Java đã cấp. Test/eval chỉ dùng dữ liệu tổng hợp.
