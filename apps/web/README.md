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
- Personal upload chỉ nhận PDF.
- Teacher upload PDF/PPTX; Student xem slide PPTX, ghi Note và dùng Tutor. PDF Teacher public chỉ có tải xuống.
- Personal RAG và Slide AI Tutor không dùng chung scope.
- Quiz draft sinh từ Personal RAG phải được Student chấp nhận trước khi bắt đầu attempt.

Kiểm tra prototype: `node --test apps/web/tests/pdf-policy.test.cjs` từ root. Upload trong HTML chỉ kiểm tra extension/MIME/header/size tại máy và hiển thị mô phỏng; kiểm tra cấu trúc PDF/PPTX và xử lý AI thật cần Java/Python. Không gửi file đã chọn lên server.
