# Cấu trúc repository StudyFlow

Đây là cấu trúc đích theo baseline Course Offering. Frontend và AI hiện chỉ giữ cấu trúc thư mục, README, kế hoạch và HTML mock; chưa có source triển khai, dependency, migration hay test thực thi. Backend được quản lý theo `docs/backend-implementation-plan.md`. Cây dưới đây là cấu trúc dự kiến, không phải xác nhận rằng các module đã được code.

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
│       │   │   │   ├── course-offerings/
│       │   │   │   ├── materials/
│       │   │   │   ├── personal-documents/
│       │   │   │   ├── plan/
│       │   │   │   └── review/
│       │   │   ├── teacher/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── course-offerings/
│       │   │   │   ├── enrollments/
│       │   │   │   ├── documents/
│       │   │   │   └── publications/
│       │   │   └── admin/
│       │   │       ├── dashboard/
│       │   │       ├── users/
│       │   │       ├── catalog/
│       │   │       ├── course-offerings/
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
│   │   │   ├── academic/
│   │   │   ├── courseoffering/
│   │   │   ├── enrollment/
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
│       │   ├── core/
│       │   ├── schemas/
│       │   ├── repositories/
│       │   ├── pipelines/
│       │   ├── services/
│       │   ├── workers/
│       │   └── clients/
│       ├── migrations/
│       ├── evals/
│       └── tests/
├── docs/
│   ├── Ke_hoach_do_an_tot_nghiep_chot_flow_MVP_v1.md
│   ├── architecture.md
│   ├── low-level-design.md
│   ├── backend-implementation-plan.md
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
| Java `academic` | Subject và Semester do Admin quản lý |
| Java `courseoffering/enrollment` | Teacher tự tạo Course Offering/join code; Teacher duyệt Enrollment; Admin giám sát |
| Java `document/publication` | Kho tài liệu, ownership, public/revoke |
| Java `slide/note` | Slide access, Note và view event |
| Java `progress/study/review` | Dashboard/Streak/Daily Goal, Plan/Calendar, Quiz destination, attempt/scoring và wrong-answer review |
| Python `pipelines` | Personal PDF indexing và Teacher PPTX render/index |
| Python `services` | Retrieval, RAG, Slide AI Tutor, citation và sinh Quiz draft |
| PostgreSQL `app` | Dữ liệu nghiệp vụ do Java sở hữu |
| PostgreSQL `ai` | Job/chunk/vector do Python sở hữu |

Không tạo module Topic, Quiz Teacher, Mastery, Exam/Mock Exam hoặc Recommendation trong MVP hiện tại.
