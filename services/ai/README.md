# Python AI service

Service riêng cho document intelligence và các tác vụ AI. Public web không gọi trực tiếp service này; chỉ Java backend gọi qua internal API.

## Trách nhiệm

- Parse PDF/PPTX/DOCX theo page/slide/section.
- Chunk, embedding và index vào Qdrant.
- RAG retrieval, prompt, answer và citation.
- Sinh quiz có options, answer, explanation, difficulty và topic mapping.
- RAG/quiz evaluation.

## Không thuộc trách nhiệm

- Auth/RBAC người dùng cuối.
- Quiz scoring và attempt history.
- Content Progress hoặc Topic Mastery.
- Recommendation, Study Plan hoặc Exam Progress.
- Ghi trực tiếp dữ liệu nghiệp vụ vào PostgreSQL.

## Cấu trúc

```text
app/
├── main.py
├── api/routes/       # health, documents, rag, quizzes
├── core/             # settings, security, logging
├── schemas/          # internal request/response contracts
├── services/         # RAG và quiz generation use cases
├── pipelines/
│   └── parsers/      # PDF, PPTX, DOCX parsing
└── clients/          # LLM, embedding, Qdrant, storage
evals/
└── datasets/         # bộ dữ liệu tổng hợp để đánh giá
tests/
```

## API nội bộ

- `POST /internal/v1/documents/index`
- `GET /internal/v1/jobs/{jobId}`
- `POST /internal/v1/rag/ask`
- `POST /internal/v1/quizzes/generate`
- `GET /internal/v1/health`

Mọi request cần service token và request ID. Dữ liệu test/evaluation phải là dữ liệu tổng hợp hoặc đã được phép sử dụng.

