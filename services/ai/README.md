# StudyFlow AI Service — cấu trúc dự kiến

Python AI Service hiện **chưa có implementation, migration hoặc test thực thi**. Thư mục này chỉ giữ cấu trúc và boundary để chuẩn bị triển khai theo [`../../docs/ai-implementation-plan.md`](../../docs/ai-implementation-plan.md).

## Cấu trúc mục tiêu

```text
services/ai/
├── app/
│   ├── api/routes/             # internal Java → Python endpoints
│   ├── clients/                # embedding/LLM/storage adapters
│   ├── core/                   # config, error và service auth
│   ├── pipelines/parsers/      # PDF/PPTX extraction
│   ├── repositories/           # ai schema + pgvector access
│   ├── schemas/                # typed internal contracts
│   ├── services/               # RAG, Tutor, Quiz generation
│   └── workers/                # index/deindex jobs
├── migrations/versions/        # Alembic forward migrations
├── tests/                      # synthetic unit/contract tests
└── evals/                      # synthetic evaluation datasets/reports
```

## Boundary bắt buộc

- Chỉ nhận authorized scope từ Java; không nhận quyền tự suy luận.
- Personal RAG, Slide Tutor và Quiz generation trả structured result + citation.
- Tạo Quiz nhận Personal Document scope và prompt do Student tự viết; không phụ thuộc chatbot context.
- Không chấm Quiz, cập nhật progress, Study Plan, Streak hoặc Daily Goal.
- Không chứa API key, tài liệu người dùng thật, log production hoặc vector dump.

Chỉ scaffold dependency/config/code khi bắt đầu AI-M0; thay đổi wire contract phải cập nhật `docs/api-plan.md` trước.
