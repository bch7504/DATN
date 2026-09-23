# StudyFlow — API plan

Đây là contract mục tiêu. Browser chỉ gọi Java Spring Boot tại `/api/v1`. Python FastAPI chỉ mở internal API cho Java tại `/internal/v1`.

## Quyết định định dạng — 22/09/2026

| Nguồn upload | Định dạng | Hành vi |
|---|---|---|
| Teacher Library | PPTX | Render slide; Viewer, Note, Slide Tutor và slide progress; không tải file gốc |
| Teacher Library | PDF | Chỉ tải xuống sau kiểm quyền; không viewer, Note, Tutor, page progress hoặc AI index |
| Personal Document | PDF | Index theo trang cho Personal RAG và Quiz; chỉ owner dùng |

Teacher thực hiện upload/public. Các chức năng xem slide, Note cá nhân và Slide Tutor thuộc Student có membership hợp lệ, không thuộc Teacher.

DOCX bị loại khỏi cả hai luồng upload. Public upload giữ nguyên URL: multipart `file`, tối đa 20 MB với Personal, 50 MB với Teacher. Java kiểm extension, MIME thực và cấu trúc file; `415 UNSUPPORTED_FILE_TYPE`, `413 FILE_TOO_LARGE`, `422 INVALID_FILE` dùng error envelope chung. Chọn sai file ở Web phải hiển thị lỗi trước khi mô phỏng/gửi upload.

Contract nội bộ dùng `X-Schema-Version: 2` vì đã loại DOCX và loại citation `SECTION`. `PERSONAL_RAG` chỉ nhận `mimeType=application/pdf` và ownerId không rỗng; `TEACHER_SLIDE` chỉ nhận MIME PPTX. Sai tổ hợp pipeline/MIME trả `422 INVALID_INDEX_INPUT`. PDF Teacher không được gửi sang AI. Routes `/slides/*`, `currentSlide`, `allowedSlideNumbers`, `slideNumber` tiếp tục phục vụ PPTX.

Personal PDF không trích xuất được văn bản: job `FAILED`, `errorCode=PDF_TEXT_REQUIRED`; PDF cần mật khẩu: `PDF_ENCRYPTED`. MVP chưa có OCR. Java phản ánh lỗi qua status API, UI hướng dẫn chọn PDF có lớp văn bản. PDF Teacher chỉ tải xuống nên không bắt buộc lớp văn bản cho RAG.

**Bàn giao implementation:** Java chưa scaffold endpoint/migration; Python mới có health và schema. Khi triển khai, cần test hợp lệ/sai MIME/output schema hai phía, kiểm quyền download PDF, chặn PDF trên Slide/Note/Tutor API và kiểm tra nội dung file ở server. Không xem kiểm tra file trong HTML prototype là validation production.

## 1. Quy ước chung

- Auth: access JWT ngắn hạn; refresh token luân phiên trong cookie HttpOnly/Secure/SameSite.
- Role: `STUDENT`, `TEACHER`, `ADMIN`.
- List API có `page`, `size`, `sort` và filter tường minh.
- Error envelope:

```json
{
  "code": "DOCUMENT_NOT_READY",
  "message": "Tài liệu đang được xử lý",
  "details": {},
  "traceId": "req_..."
}
```

- Java kiểm RBAC, membership, assignment, ownership và publication trong application service.
- Không trả object key, service token, provider payload hoặc raw internal error cho browser.

## 2. Auth và profile

| Method | Endpoint | Vai trò | Mục đích |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Tự đăng ký tài khoản Student; không nhận role từ client |
| POST | `/api/v1/auth/login` | Public | Đăng nhập |
| POST | `/api/v1/auth/refresh` | Session | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Authenticated | Thu hồi phiên |
| GET/PATCH | `/api/v1/me` | Authenticated | Xem/cập nhật profile |

Contract FE-M1:

- `POST /api/v1/auth/register` nhận `{"displayName":"...","email":"...","password":"..."}`; không nhận trường role. Java luôn tạo `STUDENT`, thiết lập session cookie và trả `204`; email trùng trả `409` với error envelope chung.
- `POST /api/v1/auth/login` nhận `{"identifier":"...","password":"..."}`. Thành công trả `204`, thiết lập session cookie HttpOnly theo chính sách ở trên; sai thông tin trả `401` với error envelope chung. Web không tự nhận hoặc lưu role từ form.
- `GET /api/v1/me` trả `{"id":"...","displayName":"...","email":"...","role":"STUDENT|TEACHER|ADMIN"}`. Web dùng response này cho route guard; `401` phải điều hướng về `/login`, role không khớp trả giao diện forbidden.
- `POST /api/v1/auth/logout` trả `204` sau khi thu hồi phiên và xóa cookie. Frontend không giữ JWT/service credential trong local storage.

## 3. Student API

### 3.1 Lớp học và học liệu

| Method | Endpoint | Quy tắc |
|---|---|---|
| GET | `/api/v1/student/classes` | Chỉ lớp Student đang tham gia |
| GET | `/api/v1/student/classes/{classId}/subjects` | Trả ClassSubject và Teacher |
| GET | `/api/v1/student/class-subjects/{id}/materials` | Chỉ publication hiệu lực; PPTX trước PDF |
| GET | `/api/v1/student/materials/{documentId}/slides` | Chỉ PPTX đã public và READY |
| GET | `/api/v1/student/materials/{documentId}/slides/{number}` | Artifact xem có kiểm quyền |
| GET | `/api/v1/student/materials/{documentId}/download` | Chỉ PDF public; không cung cấp download PPTX |

PDF Teacher không có viewer API, Note hoặc Tutor API.

### 3.2 Slide Note và Tutor

| Method | Endpoint | Mục đích |
|---|---|---|
| GET/PUT | `/api/v1/student/materials/{documentId}/slides/{number}/note` | Note của Student hiện tại |
| POST | `/api/v1/student/materials/{documentId}/slides/{number}/view-events` | Ghi nhận xem slide idempotent |
| POST | `/api/v1/student/materials/{documentId}/slides/{number}/tutor` | Hỏi đúng Slide/PPTX đang xem |

Tutor response:

```json
{
  "status": "ANSWERED",
  "answer": "...",
  "citations": [
    {"documentId": "doc_1", "slideNumber": 12, "excerpt": "..."}
  ],
  "traceId": "req_..."
}
```

`NO_EVIDENCE` được dùng khi không đủ nguồn.

### 3.3 Personal Documents và RAG

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/api/v1/personal-documents` | Upload PDF |
| GET | `/api/v1/personal-documents` | Danh sách của owner |
| GET | `/api/v1/personal-documents/{id}/status` | Poll processing |
| DELETE | `/api/v1/personal-documents/{id}` | Xóa theo lifecycle |
| POST | `/api/v1/personal-rag/conversations` | Tạo hội thoại với selectedDocumentIds |
| POST | `/api/v1/personal-rag/conversations/{id}/messages` | Hỏi đáp có citation |
| GET | `/api/v1/personal-rag/conversations/{id}` | Lịch sử của owner |
| POST | `/api/v1/personal-rag/conversations/{id}/quizzes` | Trả `202` và Quiz `GENERATING`; sinh bản nháp từ document đã chọn |

Java bắt buộc xác minh mọi `selectedDocumentIds` thuộc Student và `READY`. Danh sách rỗng hoặc có document không thuộc owner bị từ chối. API này không nhận Teacher Document.

### 3.4 Tiến độ & Thống kê

- `GET /api/v1/student/progress/overview`
- `GET /api/v1/student/progress/class-subjects/{id}`
- `GET /api/v1/student/statistics?from=&to=`

Chỉ số: slide đã xem, tỷ lệ tài liệu Slide, Personal Document, plan item hoàn thành, thời gian/hoạt động và lịch sử Quiz. Không trả Topic Mastery.

### 3.5 Kế hoạch & Lịch

- CRUD `/api/v1/study-plans`
- CRUD `/api/v1/study-plans/{planId}/items`
- `GET /api/v1/calendar?from=&to=`
- `PATCH /api/v1/study-plan-items/{id}/status`

Web hiển thị calendar theo bảng tuần (cột ngày, hàng khung giờ). Tạo item gửi `scheduledStart`, `scheduledEnd` hoặc `durationMinutes`; Java validate thời gian và trả cảnh báo conflict nếu trùng lịch. Student là người tạo và chỉnh kế hoạch. Không có endpoint recommendation trong MVP.

### 3.6 Ôn tập và Quiz

- `GET /api/v1/review/quizzes`: danh sách Quiz theo status/history của Student.
- `GET /api/v1/review/quizzes/{quizId}`: bản nháp, câu hỏi và nguồn.
- `POST /api/v1/review/quizzes/{quizId}/accept`: `REVIEW_REQUIRED → READY`.
- `POST /api/v1/review/quizzes/{quizId}/reject`: từ chối bản nháp.
- `POST /api/v1/review/quizzes/{quizId}/attempts`: chỉ Quiz `READY`.
- `PUT /api/v1/review/attempts/{attemptId}/answers/{questionId}`.
- `POST /api/v1/review/attempts/{attemptId}/submit`.
- `GET /api/v1/review/attempts/{attemptId}/result`.

Request tạo Quiz không trả Quiz làm được ngay: Java kiểm ownership/scope, gọi Python, validate structured questions/sources và lưu `REVIEW_REQUIRED`. Student phải chấp nhận. Java chấm attempt; LLM không chấm điểm.

Quiz dùng `MCQ_SINGLE`: mỗi câu có nhiều lựa chọn và đúng một `correctOptionIndex`. Sinh thành công chuyển `GENERATING → REVIEW_REQUIRED`; lỗi chuyển `GENERATION_FAILED`. Answer API nhận một `selectedOptionId`; Java so sánh trực tiếp với answer key.

## 4. Teacher API

### 4.1 Phạm vi giảng dạy

- `GET /api/v1/teacher/class-subjects`
- `GET /api/v1/teacher/class-subjects/{id}/students`: danh sách Student read-only của ClassSubject được phân công; không trả dữ liệu học tập cá nhân.

Teacher chỉ nhận ClassSubject đang được phân công.

### 4.2 Kho tài liệu

- `POST /api/v1/teacher/documents`: upload PDF/PPTX.
- `GET /api/v1/teacher/documents`
- `GET /api/v1/teacher/documents/{id}`
- `GET /api/v1/teacher/documents/{id}/status`
- `DELETE /api/v1/teacher/documents/{id}`

Upload response trả `documentId`, `processingStatus`, `fileType`; không trả storage key.

### 4.3 Public và thu hồi

- `POST /api/v1/teacher/documents/{documentId}/publications`
- `GET /api/v1/teacher/documents/{documentId}/publications`
- `DELETE /api/v1/teacher/publications/{publicationId}`

Request public chứa `classSubjectIds`. Java kiểm document owner, trạng thái và Teacher assignment cho từng ID. PPTX chưa READY không được public. PDF public để Student tải xuống; chỉ PPTX có Viewer/Note/Tutor.

## 5. Admin API

- Dashboard: `GET /api/v1/admin/dashboard`.
- Users/roles: CRUD/status dưới `/api/v1/admin/users`.
- Classes/membership: `/api/v1/admin/classes`, `/students`.
- Subjects: `/api/v1/admin/subjects`.
- ClassSubjects/assignment: `/api/v1/admin/class-subjects`, `PATCH .../{id}/teacher`.
- Feedback/reports: `/api/v1/admin/feedback-reports`.
- Audit: `GET /api/v1/admin/system-logs`.
- Settings: `GET/PATCH /api/v1/admin/system-settings`.

Admin API không có màn quản trị pgvector/RAG và không mặc định đọc Personal Document, chat, plan hoặc kết quả Quiz cá nhân.

## 6. Internal Java → Python API

Header chung:

```text
Authorization: Bearer <service-token>
X-Request-Id: req_...
X-Schema-Version: 2
Idempotency-Key: ...   # với job mutation
```

| Endpoint | Request chính | Response chính |
|---|---|---|
| POST `/internal/v1/documents/index` | document/version, pipelineType, ownerId?, signedFileUrl, mimeType | `202 {requestId, jobId, status}` |
| POST `/internal/v1/documents/deindex` | document/version/pipelineType | Job idempotent |
| GET `/internal/v1/jobs/{jobId}` | Job ID | status, attempts, errorCode |
| POST `/internal/v1/personal-rag/ask` | userId, authorizedDocumentIds, question, conversationId? | answer/NO_EVIDENCE, citations |
| POST `/internal/v1/quizzes/generate` | userId, authorizedDocumentIds, questionCount, difficulty? | `MCQ_SINGLE` questions, options, `correctOptionIndex`, explanation + sources |
| POST `/internal/v1/slides/ask` | userId, documentId, allowedSlideNumbers/currentSlide, question | answer/NO_EVIDENCE, slide citations |
| GET `/internal/v1/health` | Header chung | Liveness/readiness rút gọn |

Job mutation trả `202` với `requestId`, `jobId` và trạng thái hiện tại. Gửi lại cùng `Idempotency-Key` và cùng mutation trả đúng job đã có; dùng lại key cho document/version/pipeline/operation khác trả `409 IDEMPOTENCY_CONFLICT`. Thiếu key trả `422 IDEMPOTENCY_KEY_REQUIRED`. Job polling không trả signed URL, nội dung tài liệu hoặc provider payload.

### Index pipeline

- `PERSONAL_RAG`: chỉ PDF Personal; ownerId bắt buộc.
- `TEACHER_SLIDE`: chỉ PPTX Teacher; tạo render/extracted text/chunk cho viewer và Tutor.
- PDF Teacher không gọi AI indexing.

### Citation và scope

- Personal citation: `documentId`, `pageNumber`, `excerpt`.
- Slide citation: `documentId`, `slideNumber`, `excerpt`.
- Python filter active version và đúng source type.
- Java đối chiếu mọi document/citation với scope đã cấp trước khi trả browser.
- Personal RAG không nhận Teacher Document ID; Slide AI Tutor không nhận Personal Document ID.
- Quiz generation chỉ nhận Personal Document ID đã được Java xác thực; mỗi câu hỏi phải có source thuộc scope.

## 7. Timeout, retry và versioning

- GET/poll retry với backoff giới hạn.
- Index/deindex retry nhờ idempotency key `documentId:version:pipeline:operation`.
- Không tự động retry request LLM sau timeout nếu có nguy cơ tạo request trùng.
- Thay đổi wire shape cần tăng schema version, cập nhật tài liệu và contract test hai phía.
- Internal error không chứa nội dung file, prompt hoặc provider payload.
