# API plan

Base path đề xuất: `/api/v1`.

Public API thuộc Java backend. Python AI service dùng base path `/internal/v1` và không được frontend gọi trực tiếp.

| Nhóm | Nghiệp vụ chính |
|---|---|
| Auth & Users | register, login, refresh, profile; Admin lock/unlock và role |
| Subjects & Topics | CRUD nội dung chuẩn/cá nhân, kiểm tra owner/type |
| Documents | upload, list, delete, processing status, page/slide, progress |
| AI Tutor | ask theo page/slide/document/subject, trả answer + citations |
| Quiz | generate, create, start, submit, result, history |
| Progress | document progress, topic mastery, history |
| Statistics | study time, quiz score, sessions, dashboard trends |
| Study | tasks, calendar, plans, sessions, recommendations |
| Exam | CRUD exam, topics, readiness, mock exam |
| Admin | dashboard, official content, AI/RAG usage, feedback, logs |

## Response convention

- Dùng error envelope thống nhất gồm `code`, `message`, `details`, `traceId`.
- Endpoint danh sách có pagination và filter rõ ràng.
- API AI trả `requestId`, `answer`, `citations`, `usage/status`; không trả dữ liệu provider thô.
- Upload trả document ID và processing status để frontend poll hoặc nhận event sau.

## Authorization convention

- USER chỉ đọc/sửa dữ liệu cá nhân và Official Content được publish.
- ADMIN quản lý user, nội dung chuẩn và vận hành hệ thống.
- ADMIN không mặc định được dùng Personal Document làm Official Content.

## Internal Java → Python contract

| Endpoint | Mục đích |
|---|---|
| `POST /documents/index` | Parse/chunk/embed/index một tài liệu đã được Java xác thực |
| `GET /jobs/{jobId}` | Đọc trạng thái job indexing |
| `POST /rag/ask` | Trả answer và citations theo scope truyền vào |
| `POST /quizzes/generate` | Trả bộ câu hỏi có cấu trúc để Java validate/lưu |
| `GET /health` | Health/readiness cho AI service |

Request nội bộ cần `requestId`, service token, timeout và schema version. Không gửi JWT của user sang AI service nếu không cần thiết.
