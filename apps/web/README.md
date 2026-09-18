# Web application

Khu vực dành cho Next.js Student UI và Admin UI.

## HTML MVP tạm thời

Mở trực tiếp `mvp.html` bằng trình duyệt để xem prototype Student UI. File chạy độc lập, dùng dữ liệu demo và chưa gọi backend thật.

## Route groups dự kiến

- `(auth)`: login, register, forgot password.
- `(student)`: dashboard, subjects, documents, viewer, tutor, quiz, progress, study plan, calendar, exams, statistics.
- `admin`: dashboard, users, subjects/topics, official documents, AI/RAG, feedback, logs.

## Quy ước

- `components/ui`: component dùng lại, không chứa nghiệp vụ.
- `components/features`: component theo feature như quiz, viewer, exam.
- `lib`: API client, auth session, query keys, formatter và helpers.
- `types`: API DTO và kiểu dùng chung phía client.
- Không tính scoring, mastery hoặc recommendation trong frontend.
