# StudyFlow Web

Ứng dụng Next.js cho Student, Teacher và Admin. Giao diện thật nằm trong `src/app`; `mvp.html` được giữ làm tài liệu tham chiếu luồng và prototype offline.

## Chạy ứng dụng

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Mọi môi trường chỉ dùng fixture khi `NEXT_PUBLIC_DEMO_MODE=true`; nếu không, login/session/route guard gọi Java qua `NEXT_PUBLIC_API_URL`.

```bash
npm run lint
npm test
npm run build
```

FE-M0 và FE-M1 đã hoàn thành. Các màn hình Course Offering/chatbot hiện là fixture UI có nhãn rõ; chưa được xem là tích hợp production cho đến khi Java public API tương ứng sẵn sàng.

Các route kiểm tra nhanh:

- `/student/dashboard`
- `/student/course-offerings`
- `/student/materials`
- `/student/viewer`
- `/student/personal-documents`
- `/teacher/documents`
- `/teacher/course-offerings`
- `/teacher/enrollments`
- `/admin/dashboard`
- `/admin/course-offerings`

## Prototype HTML

Mở `mvp.html` để chạy prototype độc lập:

- Student: join/enrollment, Course Offering materials, Slide Viewer + Note + Tutor, Personal Documents + chatbot theo nguồn, Quiz review, Dashboard/Streak/Daily Goal và lịch tuần.
- Teacher: tự tạo Course Offering, join code, duyệt Enrollment, document library và publication.
- Admin: users/roles, Subject/Semester, Course Offering monitoring, feedback, logs và settings.

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
- Teacher hợp lệ tự tạo Course Offering; Admin quản lý catalog/giám sát, không phân công từng lớp.
- Student chỉ mở học liệu khi Enrollment `APPROVED` hoặc historical access policy cho phép.
- Không gọi Python, pgvector, Object Storage hoặc model provider trực tiếp.
- Không tính progress hay chấm Quiz ở client.
- Không có route/menu Progress độc lập; Dashboard nhận aggregate, Streak và Daily Goal từ Java, còn tiến độ chi tiết nằm trong Course Offering.
- Student chỉ gửi target Daily Goal. Actual, phần trăm và streak do Java tính; không triển khai XP, Level, Achievement, badge hoặc leaderboard.
- PPTX lớp chỉ xem; PDF lớp chỉ download.
- Personal upload chỉ nhận PDF.
- Teacher upload PDF/PPTX; Student xem slide PPTX, ghi Note và dùng Tutor. PDF Teacher public chỉ có tải xuống.
- Personal RAG và Slide AI Tutor không dùng chung scope.
- Chatbot hiển thị selected sources, history, retrieval state, citation và `NO_EVIDENCE`; không có model selector/Agent Trace.
- Quiz draft sinh từ Personal RAG phải được Student chấp nhận trước khi bắt đầu attempt.

Kiểm tra prototype: `node --test apps/web/tests/pdf-policy.test.cjs` từ root. Upload trong HTML chỉ kiểm tra extension/MIME/header/size tại máy và hiển thị mô phỏng; kiểm tra cấu trúc PDF/PPTX và xử lý AI thật cần Java/Python. Không gửi file đã chọn lên server.
