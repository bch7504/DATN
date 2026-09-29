# Cấu trúc repository StudyFlow

Đây là cấu trúc repository theo baseline Course Offering. Frontend đã có scaffold Next.js, các màn hình demo và test; chưa kết nối Java Backend production. Backend và AI hiện chủ yếu giữ cấu trúc, README và kế hoạch, chưa có runtime/migration hoàn chỉnh. Cây dưới đây kết hợp phần đã có với cấu trúc đích, không mặc định mọi module đã được triển khai.

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
│   ├── bao-cao/Ke_hoach_do_an_tot_nghiep_chot_flow_MVP_v1.md
│   ├── architecture.md
│   ├── low-level-design.md
│   ├── backend-implementation-plan.md
│   ├── database-plan.md
│   ├── api-plan.md
│   ├── frontend-functional-baseline.md
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
| Java `progress/study/review` | Dashboard/Streak/Daily Goal, Kế hoạch & Lịch tuần, Quiz destination, attempt/scoring và wrong-answer review |
| Python `pipelines` | Personal PDF indexing và Teacher PPTX render/index |
| Python `services` | Retrieval, RAG, Slide AI Tutor, citation và sinh Quiz draft |
| PostgreSQL `app` | Dữ liệu nghiệp vụ do Java sở hữu |
| PostgreSQL `ai` | Job/chunk/vector do Python sở hữu |

Không tạo module Topic, Quiz Teacher, Mastery, Exam/Mock Exam hoặc Recommendation trong MVP hiện tại.
