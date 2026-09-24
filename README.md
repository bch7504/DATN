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
- Quiz AI được sinh khi Student chủ động chọn Personal Documents và tự nhập prompt, không phụ thuộc chatbot. Student review/regenerate rồi chọn nơi ôn trước khi làm.

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

## Trạng thái triển khai

- Frontend hiện chỉ có cấu trúc route dự kiến, README và HTML mock; chưa có mã Next.js hay dependency để build.
- AI Service hiện chỉ có cấu trúc module, README và kế hoạch; chưa có mã FastAPI, migration hoặc test thực thi.
- Việc triển khai sẽ bắt đầu lại từ milestone M0 trong từng kế hoạch tương ứng.

## Tài liệu

- `docs/Ke_hoach_do_an_tot_nghiep_chot_flow_MVP_v1.md`: kế hoạch đồ án và flow MVP v1.0 hiện hành.
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
5. Dashboard hiển thị đầy đủ tổng quan và tiến độ theo từng Course Offering; không có menu/màn Progress độc lập.
6. Study Streak chỉ tính ngày có `VIEW_SLIDE`, `STUDY_TASK_COMPLETED` hoặc `QUIZ_COMPLETED`; hoàn thành Daily Goal không phải điều kiện duy trì streak.
7. Student chỉ chỉnh target Daily Goal; Java tính actual và phần trăm từ Learning Event theo múi giờ người dùng.
8. Student chủ động quản lý kế hoạch.
9. Nội dung cần ôn lại lấy từ câu sai và citation; mỗi lượt làm Quiz tạo attempt mới, không ghi đè lịch sử.
