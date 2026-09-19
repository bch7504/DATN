# StudyFlow — API plan

Đây là **contract mục tiêu** cho kiến trúc trong [architecture.md](architecture.md), chưa phải mô tả endpoint đã triển khai. Public API thuộc Java với base path `/api/v1`. Python chỉ có internal API `/internal/v1`, không public cho browser.

## 1. Public Java API

| Nhóm | Hành vi cần có |
|---|---|
| Auth & Users | Register/login/refresh/logout/profile; Admin lock/unlock user và quản lý role. |
| Subjects & Topics | CRUD subject/topic chuẩn và cá nhân, kiểm tra owner/type/publish. |
| Documents | Upload, list/detail, xóa, processing status, nội dung viewer có kiểm quyền, document progress. |
| AI Tutor | Ask theo document/subject/topic/page/slide; trả answer hoặc `NO_EVIDENCE` và citation mở được trong viewer. |
| Quiz | Generate, create, start, submit, result và history; Java chấm điểm. |
| Progress & Statistics | Content Progress, Topic Mastery/history, thời gian học, điểm Quiz và xu hướng dashboard. |
| Study & Exam | Task, Calendar, Study Plan, Session, recommendation có lý do, Exam, countdown/readiness và Mock Exam. |
| Admin | Dashboard, Official Content, trạng thái AI/RAG, feedback và system logs; không quản lý Quiz/Exam/Progress cá nhân. |

Các endpoint quan trọng để nối demo: `POST /api/v1/documents` trả `documentId` và `processingStatus`; `GET /api/v1/documents/{documentId}/status` để poll; `GET /api/v1/documents/{documentId}/content` phục vụ viewer qua Java; `POST /api/v1/tutor/ask` trả answer/citations; `POST /api/v1/quizzes/generate` tạo Quiz qua Python nhưng Java validate/lưu; `POST /api/v1/quizzes/{quizId}/attempts` và `POST /api/v1/attempts/{attemptId}/submit` do Java chấm.

### Quy ước chung

- Spring Security xác thực người dùng. Access JWT ngắn hạn; refresh token luân phiên trong cookie HttpOnly/Secure/SameSite. Java kiểm RBAC, owner và publish ở application service, không tin document scope client tự khai.
- Endpoint danh sách dùng pagination và filter rõ ràng. Không trả raw provider payload, signed URL nội bộ hoặc object key cho browser.
- Lỗi dùng envelope `{ "code", "message", "details", "traceId" }`; `traceId` nối với `requestId` xuyên service. Truy cập Personal Document không có quyền không tiết lộ nội dung/metadata.
- `USER` chỉ dùng dữ liệu cá nhân và Official Content đã publish. `ADMIN` quản lý vận hành/Official Content, không tự có quyền biến Personal Document thành Official Content.

## 2. Internal Java → Python API

Mọi request cần `Authorization: Bearer <service-token>`, `X-Request-Id` và `X-Schema-Version: 1`; job mutation cần thêm `Idempotency-Key`. Java đặt timeout theo thao tác, không chuyển JWT của Student. Python echo `requestId` trong response và trả lỗi chuẩn hóa, không đưa lỗi OpenAI hoặc nội dung file vào response. Internal health cũng chỉ truy cập trong mạng Compose.

| Endpoint | Request chính | Response chính |
|---|---|---|
| `POST /internal/v1/documents/index` | `documentId`, `documentVersion`, `sourceType`, `ownerId?`, `subjectId`, `topicIds?`, `signedFileUrl`, `mimeType` | `202 {requestId, jobId, status: QUEUED}`. |
| `POST /internal/v1/documents/deindex` | `documentId`, `documentVersion` | `202 {requestId, jobId, status: QUEUED}`; thao tác idempotent. |
| `GET /internal/v1/jobs/{jobId}` | Job ID | `{requestId, jobId, documentId, documentVersion, kind, status, attempts, errorCode?}`; status `QUEUED/RUNNING/SUCCEEDED/FAILED`. |
| `POST /internal/v1/rag/ask` | `userId`, `authorizedDocumentIds`, `question`, `subjectId?`, `topicId?`, `location?` | `{requestId, status: ANSWERED/NO_EVIDENCE, answer?, citations[], usage?}`. |
| `POST /internal/v1/quizzes/generate` | `userId`, `authorizedDocumentIds`, `subjectId`, `topicId`, `questionCount`, `difficulty` | `{requestId, questions[]}`; mỗi question có prompt, options, correctOptionIndex, explanation, topicId, difficulty và sources. |
| `GET /internal/v1/health` | Header chung | Liveness/readiness và trạng thái phụ thuộc đã rút gọn. |

### Authorized scope và citation

- `authorizedDocumentIds` là danh sách ID **Java đã xác thực** cho request hiện tại. Python phải filter đúng danh sách đó và active index version; danh sách rỗng trả `NO_EVIDENCE` hoặc lỗi scope rỗng theo endpoint, không tìm toàn cục.
- `location` là `{kind: PAGE|SLIDE|SECTION, value}`. Mỗi citation trả `chunkId`, `documentId`, `location`, `excerpt`; câu hỏi Quiz trả `sources` với document ID và location. Python chỉ xuất source từ chunk đã truy hồi. Java đối chiếu document ID với scope trước khi trả/lưu và tự bổ sung document name từ DB nghiệp vụ.
- `sourceType` là `OFFICIAL` hoặc `PERSONAL`; `ownerId` bắt buộc cho Personal Document và có thể null cho Official Content. Python không tự quyết định publish status.
- Indexing/deindexing dùng key `documentId:documentVersion:INDEX|DEINDEX`. Gọi lại cùng key trả cùng job; khi job retryable bị lỗi do URL hết hạn, request lặp có thể cập nhật URL mới và xếp lại job, không tạo bản index trùng.

### Timeout, retry và tương thích

- Java dùng timeout ngắn cho enqueue/poll job; Tutor/Quiz có timeout inference riêng. Không retry Tutor/Quiz tự động vì có thể phát sinh request model lặp. Retry GET an toàn và POST job có idempotency key với backoff giới hạn.
- Thay đổi wire shape cần tăng `X-Schema-Version`, cập nhật tài liệu này và contract test ở cả Java/Python trong cùng task. Code scaffold Python hiện có `requestId` trong body, chưa có job/deindex/authorized document list; khi triển khai phải đưa schema về contract này trước khi tích hợp Java.
- Java validate mọi field AI trước khi lưu. `correctOptionIndex` phải nằm trong `options`; topic/document/source phải thuộc scope; câu hỏi trùng hoặc malformed bị từ chối. Java là nơi duy nhất chấm Quiz và cập nhật Mastery.
