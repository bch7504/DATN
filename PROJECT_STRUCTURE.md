# Cấu trúc repository StudyFlow

Các thư mục boundary đã được tạo để code triển khai sau bám đúng kiến trúc hiện tại. Route con của Next.js sẽ được tạo trong các group tương ứng khi scaffold ứng dụng thật.

```text
DATN/
├── index.html
├── README.md
├── AGENTS.md
├── PROJECT_STRUCTURE.md
├── apps/
│   └── web/
│       ├── mvp.html
│       ├── README.md
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   ├── (student)/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── classes/
│       │   │   │   ├── materials/
│       │   │   │   ├── personal-documents/
│       │   │   │   ├── progress/
│       │   │   │   ├── plan/
│       │   │   │   └── review/
│       │   │   ├── teacher/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── assignments/
│       │   │   │   ├── documents/
│       │   │   │   └── publications/
│       │   │   └── admin/
│       │   │       ├── dashboard/
│       │   │       ├── users/
│       │   │       ├── academics/
│       │   │       ├── feedback/
│       │   │       ├── logs/
│       │   │       └── settings/
│       │   ├── components/
│       │   ├── lib/
│       │   └── types/
│       └── tests/
├── services/
│   ├── backend/
│   │   ├── README.md
│   │   ├── src/main/java/com/studyflow/
│   │   │   ├── auth/
│   │   │   ├── user/
│   │   │   ├── classroom/
│   │   │   ├── subject/
│   │   │   ├── document/
│   │   │   ├── publication/
│   │   │   ├── slide/
│   │   │   ├── note/
│   │   │   ├── progress/
│   │   │   ├── study/
│   │   │   ├── review/
│   │   │   ├── feedback/
│   │   │   ├── audit/
│   │   │   ├── settings/
│   │   │   └── integration/
│   │   │       ├── ai/
│   │   │       └── storage/
│   │   ├── src/main/resources/db/migration/
│   │   └── src/test/java/com/studyflow/
│   └── ai/
│       ├── app/
│       │   ├── api/routes/      # health, documents, personal_rag, slides, quizzes
│       │   ├── pipelines/
│       │   ├── services/
│       │   ├── workers/
│       │   └── clients/
│       ├── evals/
│       └── tests/
├── docs/
│   ├── Plan_do_an_tot_nghiep_dong_bo_toan_bo_kien_truc_CSDL_API.docx
│   ├── architecture.md
│   ├── low-level-design.md
│   ├── database-plan.md
│   ├── api-plan.md
│   ├── tech-stack.md
│   └── demo-flow.md
├── infrastructure/
│   ├── docker/
│   └── github/workflows/
└── scripts/
```

## Ranh giới

| Vùng | Trách nhiệm |
|---|---|
| Web | UI ba vai trò; chỉ gọi Java |
| Java `classroom/subject` | Class, membership, ClassSubject, Teacher assignment |
| Java `document/publication` | Kho tài liệu, ownership, public/revoke |
| Java `slide/note` | Slide access, Note và view event |
| Java `progress/study/review` | Progress/Statistics, Plan/Calendar, Quiz review/attempt/scoring |
| Python `pipelines` | Personal PDF/DOCX indexing và Teacher PPTX render/index |
| Python `services` | Retrieval, RAG, Slide Tutor, citation và sinh Quiz draft |
| PostgreSQL `app` | Dữ liệu nghiệp vụ do Java sở hữu |
| PostgreSQL `ai` | Job/chunk/vector do Python sở hữu |

Không tạo module Topic, Quiz Teacher, Mastery, Exam/Mock Exam hoặc Recommendation trong MVP hiện tại.
