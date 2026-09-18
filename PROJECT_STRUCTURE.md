# Cấu trúc repository đề xuất

```text
DATN/
├── index.html
├── README.md
├── AGENTS.md
├── PROJECT_STRUCTURE.md
├── Plan_do_an_tot_nghiep_hoan_chinh_theo_chuc_nang.docx
├── apps/
│   └── web/
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   ├── (student)/
│       │   │   └── admin/
│       │   ├── components/
│       │   │   ├── ui/
│       │   │   └── features/
│       │   ├── lib/
│       │   └── types/
│       └── tests/
├── services/
│   ├── backend/
│       ├── src/main/java/com/studyflow/
│       │   ├── common/
│       │   ├── config/
│       │   ├── security/
│       │   ├── auth/
│       │   ├── user/
│       │   ├── subject/
│       │   ├── document/
│       │   ├── note/
│       │   ├── quiz/
│       │   ├── progress/
│       │   ├── study/
│       │   ├── exam/
│       │   ├── event/
│       │   ├── admin/
│       │   └── integration/
│       │       ├── ai/
│       │       └── storage/
│       ├── src/main/resources/
│       │   └── db/migration/
│       └── src/test/java/com/studyflow/
│   └── ai/
│       ├── app/
│       │   ├── api/routes/
│       │   ├── core/
│       │   ├── schemas/
│       │   ├── services/
│       │   ├── pipelines/parsers/
│       │   └── clients/
│       ├── evals/datasets/
│       └── tests/
├── docs/
│   ├── architecture.md
│   ├── database-plan.md
│   ├── api-plan.md
│   └── demo-flow.md
├── infrastructure/
│   ├── docker/
│   └── github/workflows/
└── scripts/
```

## Quy ước backend Java

Backend được chia theo feature/domain thay vì chia toàn cục thành `controller`, `service`, `repository`. Bên trong mỗi module có thể dùng cấu trúc:

```text
quiz/
├── QuizController.java
├── QuizApplicationService.java
├── Quiz.java
├── QuizRepository.java
├── QuizJpaRepository.java
├── QuizMapper.java
└── dto/
```

Cách chia này giúp code của một nghiệp vụ nằm gần nhau, giảm việc đi qua nhiều thư mục khi đọc hoặc sửa tính năng.

## Ranh giới module chính

| Module | Trách nhiệm |
|---|---|
| Java `document` | Upload, metadata, quyền sở hữu và processing status |
| Python `pipelines` | Parsing, chunking, embedding và indexing theo page/slide |
| Python `services.rag` | Retrieval, prompt, LLM call, answer và citation |
| Python `services.quiz` | Sinh câu hỏi có cấu trúc; không chấm điểm |
| `quiz` | Quiz, question, attempt, answer và backend scoring |
| `progress` | Content Progress, Topic Mastery, mastery history |
| `study` | Task, Calendar, Study Plan, Study Session, recommendation |
| `exam` | Exam, exam topics, countdown, Mock Exam |
| `event` | Learning Events phục vụ cập nhật progress, statistics và audit |
| `admin` | User/content management, AI/RAG status, feedback và logs |
| Java `integration.ai` | Internal API client gọi Python AI service |
| Python `clients` | Adapter cho Qdrant, object storage và LLM/Embedding provider |

## Ranh giới Java ↔ Python

- Browser chỉ gọi Java backend; không public AI service trực tiếp cho frontend.
- Java xác thực user, kiểm tra quyền tài liệu và gửi một scope tối thiểu sang Python.
- Python trả kết quả AI, citation và trạng thái xử lý; Java validate rồi mới lưu dữ liệu nghiệp vụ.
- Python không chấm quiz, cập nhật Topic Mastery, tính recommendation hoặc đọc/ghi tùy ý vào PostgreSQL.
- Mỗi request có `requestId` để nối log giữa hai service.
- MVP có thể dùng HTTP nội bộ; thêm queue khi indexing thực sự cần chạy nền hoặc retry dài.
