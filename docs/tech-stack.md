# Technology Stack — StudyFlow

## Frontend

- Next.js 16, React 19, TypeScript và Tailwind/CSS tokens.
- App shell ba vai trò; API client chỉ gọi Java `/api/v1`.
- Student: Dashboard/Streak/Daily Goal, Course Offering/join, materials, Viewer/Note/Tutor, Personal RAG, Quiz và Plan.
- Teacher: tự tạo Course Offering, join code, Enrollment approval, Library/publication.
- Admin: User/Role, Subject, Semester, Course Offering monitoring, feedback/audit/settings.
- Fixture chỉ bật qua `NEXT_PUBLIC_DEMO_MODE=true` và hiển thị nhãn demo.

## Java backend

- Spring Boot, Spring Security/JWT, Bean Validation, JPA và Flyway.
- Sở hữu auth/RBAC, Subject/Semester, Course Offering/Enrollment, document/publication, Note, Quiz lifecycle/scoring, Dashboard progress, Study Streak, Daily Goal và study plan.
- Gọi Python qua internal HTTP có service credential, request ID, schema version, timeout và idempotency.

## Python AI service

- FastAPI, Pydantic, SQLAlchemy/Alembic và worker tách biệt API.
- Parsing Personal PDF và Teacher PPTX; chunk/embed/retrieval; RAG/citation; Slide Tutor; Quiz draft; evaluation.
- Không dùng multi-agent trong MVP. Pipeline code-first có claim reviewer giới hạn thay vì Supervisor/auto routing.

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
