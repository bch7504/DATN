# Feature Specification — Progress, Study Plan và Quiz Review

## 1. Requirements

- Java tính Content Progress từ slide view và learning event có thể kiểm thử; không có Topic Mastery.
- Thống kê theo Course Offering, document và khoảng thời gian; dữ liệu lớp cũ giữ khi archive.
- Student tự CRUD task/session/calendar; liên kết Course Offering là tùy chọn và phải thuộc scope.
- Quiz AI chỉ từ Personal Documents; Student phải accept/reject ở `REVIEW_REQUIRED` trước khi attempt.
- Java chấm `MCQ_SINGLE`, lưu attempt/result và không để client/LLM quyết định điểm.

## 2. API chính

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/student/progress/course-offerings/{id}` | authorized offering | progress theo PPTX/document |
| `GET /api/v1/student/statistics` | date range, offering? | learning time, slides, quizzes |
| `GET/POST/PATCH/DELETE /api/v1/student/study-plans...` | task/session DTO | normalized calendar item |
| `POST /api/v1/student/quizzes/{id}/accept` | `REVIEW_REQUIRED` quiz | `READY` |
| `POST /api/v1/student/quizzes/{id}/reject` | optional reason | `REJECTED` |
| `POST /api/v1/student/quizzes/{id}/attempts` | start request | attempt + questions without key |
| `POST /api/v1/student/quiz-attempts/{id}/submit` | selected option IDs | score/result from Java |

## 3. Acceptance

- Event trùng idempotency key không tăng progress hai lần.
- Client sửa payload score/correct answer không ảnh hưởng kết quả Java.
- Course Offering archived vẫn hiển thị lịch sử theo policy, không bị xóa.
- Study Plan không tự động bị AI thay đổi.
