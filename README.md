# StudyFlow — Đồ án tốt nghiệp

Nền tảng hỗ trợ học tập và ôn luyện tích hợp AI cho ba vai trò Student, Teacher và Admin.

## Phạm vi MVP

- **Student:** học theo Class → ClassSubject, xem PPTX Teacher public, lưu Note theo slide, dùng Slide AI Tutor, quản lý PDF cá nhân và Personal RAG, tạo/duyệt/làm Quiz trong Ôn tập, xem Tiến độ & Thống kê và quản lý Kế hoạch & Lịch theo bảng tuần.
- **Teacher:** xem lớp/môn được phân công, quản lý kho PDF/PPTX, public hoặc thu hồi tài liệu theo ClassSubject.
- **Admin:** quản lý user/role, Class, Subject, Student membership, Teacher assignment, feedback, audit và settings.

MVP không có Chapter/Topic, Quiz do Teacher tạo, Topic Mastery, Exam/Mock Exam hoặc recommendation nâng cao.

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

- `docs/Plan_do_an_tot_nghiep_dong_bo_toan_bo_kien_truc_CSDL_API.docx`: tài liệu yêu cầu nguồn.
- `docs/architecture.md`: high-level architecture.
- `docs/low-level-design.md`: module, state machine và rule chi tiết.
- `docs/database-plan.md`: schema PostgreSQL + pgvector.
- `docs/api-plan.md`: public/internal API contract.
- `docs/tech-stack.md`: stack và triển khai.
- `docs/demo-flow.md`: kịch bản bảo vệ.

## Nguyên tắc cốt lõi

1. Student/Teacher/Admin chỉ thao tác đúng scope.
2. Personal Document thuộc owner; Admin/Teacher không mặc định được xem.
3. Teacher chỉ public vào ClassSubject được phân công.
4. Personal RAG và Slide AI Tutor là hai scope AI tách biệt.
5. Progress đo hoạt động học; MVP không suy ra Topic Mastery.
6. Student chủ động quản lý kế hoạch.
