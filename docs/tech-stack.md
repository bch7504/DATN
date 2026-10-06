# Technology Stack — StudyFlow

## Frontend

- Next.js 16, React 19, TypeScript và Tailwind/CSS tokens.
- App shell ba vai trò; API client chỉ gọi Java `/api/v1`.
- Student: Dashboard/Streak/Daily Goal, Course Offering/join, Course Material PDF Viewer/Page Note/Tutor, Personal Document Assistant, Quiz, review theo môn/câu sai và Kế hoạch & Lịch tuần theo mock.
- Teacher: tự tạo Course Offering, join code, Enrollment approval, PDF Library/publication và AI Quiz Studio.
- Admin: User/Role, Subject, Semester, Course Offering monitoring, feedback/audit/settings.
- Fixture chỉ bật qua `NEXT_PUBLIC_DEMO_MODE=true` và hiển thị nhãn demo.

## Java backend

- Spring Boot, Spring Security/JWT, Bean Validation, JPA và Flyway.
- Sở hữu auth/RBAC, Subject/Semester, Course Offering/Enrollment, document/publication, Note, Quiz lifecycle/destination/scoring/wrong-answer review, Dashboard progress, Study Streak, Daily Goal và study plan.
- Gọi Python qua internal HTTP có service credential, request ID, schema version, timeout và idempotency.

## Python AI service

- FastAPI, Pydantic, SQLAlchemy/Alembic và worker tách biệt API.
- Parsing Personal PDF và Course Material PDF; chunk/embed/retrieval; RAG/citation theo trang; Course Material Tutor; Quiz draft; evaluation.
- LangChain `create_agent` trên LangGraph runtime cho một Single Orchestrator Agent với ba tool có schema: hỏi đáp, tóm tắt và tạo Quiz. Không dùng multi-agent/Supervisor trong MVP.

## Data và storage

- Một PostgreSQL cluster, schema/role tách biệt: Java `app`, Python `ai`.
- pgvector `vector(1024)` và cosine distance trong schema `ai`.
- Object Storage giữ upload/artifact; signed URL ngắn hạn chỉ cấp sau authorization.
- Redis/queue chuyên dụng là future nếu tải vượt worker dựa trên database.

## Model provider

- OpenRouter qua adapter OpenAI-compatible trong Python.
- Chat model và embedding model chỉ cấu hình runtime; key không vào client bundle/repository/log.
- Unit test dùng fake provider; benchmark provider thật chỉ chạy trong môi trường eval kiểm soát.

## Quality và deployment

- FE: ESLint, TypeScript build, Node test và E2E theo ba role.
- Java: JUnit/MockMvc/Testcontainers; Python: pytest/contract/eval synthetic.
- Docker mới ở mức kế hoạch toàn dự án tại [docker-deployment-plan.md](docker-deployment-plan.md); chưa phải hạng mục triển khai hiện tại.
