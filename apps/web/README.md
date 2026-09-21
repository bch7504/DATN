# StudyFlow Web

Khu vực Next.js cho Student, Teacher và Admin.

## Prototype HTML

Mở `mvp.html` để chạy prototype độc lập:

- Student: Class/Subject materials, Slide Viewer + Note + Tutor, Personal Documents + RAG, AI Quiz review/attempt, Progress & Statistics và lịch tuần.
- Teacher: assignments, document library, public/revoke.
- Admin: users/roles, classes/subjects, Teacher assignment, feedback, logs, settings.

Prototype dùng fixture tổng hợp, không gọi backend. Có thể mở trực tiếp:

- `mvp.html#student-dashboard`
- `mvp.html#teacher-dashboard`
- `mvp.html#admin-dashboard`

## Route group

- `(auth)`
- `(student)`
- `teacher`
- `admin`

## Quy ước

- Frontend chỉ gọi public Java API.
- Không gọi Python, pgvector, Object Storage hoặc model provider trực tiếp.
- Không tính progress hay chấm Quiz ở client.
- PPTX lớp chỉ xem; PDF lớp chỉ download.
- Personal upload chỉ nhận PDF/DOCX.
- Personal RAG và Slide Tutor không dùng chung scope.
- Quiz draft sinh từ Personal RAG phải được Student chấp nhận trước khi bắt đầu attempt.
