# StudyFlow — Đồ án tốt nghiệp

Nền tảng hỗ trợ học tập và ôn luyện tích hợp AI cho ba vai trò Student, Teacher và Admin.

## Phạm vi MVP

- **Student:** nhập join code, chờ Teacher duyệt Enrollment, học theo Course Offering, xem PPTX/Note/Tutor, dùng Personal RAG và Quiz; theo dõi Dashboard, Study Streak, Daily Goal và tự quản lý lịch tuần.
- **Teacher:** tự tạo Course Offering từ Subject + Semester, quản lý join code/Enrollment, kho PDF/PPTX và publication của lớp mình sở hữu.
- **Admin:** quản lý user/role, Subject/Semester, giám sát/lock/archive Course Offering, feedback, audit và settings.

MVP không có Chapter/Topic, Quiz do Teacher tạo, Topic Mastery, Exam/Mock Exam, recommendation nâng cao, XP, Level, Achievement, badge hoặc leaderboard.

## Quy tắc học liệu

- PPTX Teacher public: xem trên web, không tải file gốc; có Note và Slide AI Tutor.
- PDF Teacher public: chỉ tải xuống; không viewer, Note hoặc AI Tutor.
- Personal Document: Student chỉ upload PDF; chatbot chỉ retrieval trên tài liệu của chính Student đã chọn.
- Quiz AI được sinh từ các Personal Document đang chọn, vào trạng thái chờ duyệt và chỉ được làm sau khi Student chấp nhận.

## Kiến trúc

```text
Next.js Web → Java Spring Boot → PostgreSQL + pgvector
                         ├────→ Object Storage
                         └────→ Python FastAPI → LLM/Embedding API
```

Frontend chỉ gọi Java. Java sở hữu luật nghiệp vụ, quyền, vòng đời Quiz và chấm điểm. Python xử lý parsing/rendering, chunking, embedding, RAG, citation, Slide AI Tutor và sinh bản nháp Quiz có nguồn.

## Xem prototype

- Mở `index.html` để xem kiến trúc, rule và demo flow.
- Mở `apps/web/mvp.html` để chạy prototype ba vai trò.

Hai file dùng fixture tổng hợp và không gọi backend thật.

## Tài liệu

- `docs/Ke_hoach_do_an_tot_nghiep_cap_nhat_Streak_Daily_Goal.md`: kế hoạch đồ án và nguồn nghiệp vụ hiện hành.
- `docs/architecture.md`: high-level architecture.
- `docs/low-level-design.md`: module, state machine và rule chi tiết.
- `docs/database-plan.md`: schema PostgreSQL + pgvector.
- `docs/api-plan.md`: public/internal API contract.
- `docs/tech-stack.md`: stack và triển khai.
- `docs/demo-flow.md`: kịch bản bảo vệ.

## Nguyên tắc cốt lõi

1. Student/Teacher/Admin chỉ thao tác đúng scope.
2. Personal Document thuộc owner; Admin/Teacher không mặc định được xem.
3. Teacher chỉ public vào Course Offering mình sở hữu; Student chỉ truy cập khi Enrollment `APPROVED`.
4. Personal RAG và Slide AI Tutor là hai scope AI tách biệt.
5. Dashboard hiển thị tổng quan; tiến độ xem chi tiết nằm trong Course Offering, không có menu Progress độc lập.
6. Study Streak chỉ tính ngày có `VIEW_SLIDE`, `STUDY_TASK_COMPLETED` hoặc `QUIZ_COMPLETED`; hoàn thành Daily Goal không phải điều kiện duy trì streak.
7. Student chỉ chỉnh target Daily Goal; Java tính actual và phần trăm từ Learning Event theo múi giờ người dùng.
8. Student chủ động quản lý kế hoạch.
