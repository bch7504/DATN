# StudyFlow — API Plan

Contract mục tiêu theo Course Offering baseline 2.0. Browser chỉ gọi Java tại `/api/v1`; Python chỉ mở `/internal/v1` cho Java.

## 1. Quy ước chung

- Role: `STUDENT|TEACHER|ADMIN`.
- Session: access token ngắn hạn; refresh token rotation trong cookie HttpOnly/Secure/SameSite.
- JSON camelCase; time ISO-8601 UTC; ID opaque UUID/string.
- List: `{items,page,size,totalItems,totalPages}`; `size <= 100`.
- Java kiểm role, Teacher ownership, enrollment, document ownership và publication tại application service.
- Không trả storage key, join-code hash, service token, prompt nội bộ hoặc provider payload.
- Error envelope:

```json
{
  "code": "ENROLLMENT_REQUIRED",
  "message": "Bạn chưa được duyệt vào lớp học phần",
  "details": {},
  "traceId": "req_..."
}
```

## 2. Auth và profile

| Method | Endpoint | Contract |
|---|---|---|
| POST | `/api/v1/auth/register` | `{displayName,email,password}`; Java tạo `STUDENT`; `204`, `409`, `422` |
| POST | `/api/v1/auth/login` | `{identifier,password}`; `204` + session cookie; `401|403` |
| POST | `/api/v1/auth/refresh` | Rotate refresh token; `204|401` |
| POST | `/api/v1/auth/logout` | Revoke idempotent; `204` |
| GET/PATCH | `/api/v1/me` | `{id,displayName,email,role}`; PATCH không nhận role/status |

Frontend không lưu JWT/service credential trong local storage và không nhận role từ form đăng ký.

## 3. Catalog dùng chung

### Student/Teacher read

- `GET /api/v1/catalog/subjects?status=ACTIVE`
- `GET /api/v1/catalog/semesters?status=ACTIVE|UPCOMING|CLOSED`

Chỉ trả metadata tối thiểu. Teacher create form chỉ cho chọn Semester `ACTIVE` có `offeringCreationEnabled=true`.

## 4. Student API

### 4.1 Join code và Enrollment

| Method | Endpoint | Input/Output |
|---|---|---|
| POST | `/api/v1/student/course-enrollments/join` | `{joinCode}` → `201/200` enrollment `PENDING` |
| GET | `/api/v1/student/course-enrollments` | filter `semesterId,status`; trả offering + enrollment state |
| GET | `/api/v1/student/course-offerings` | offering `APPROVED`; filter `ACTIVE|ARCHIVED` |
| GET | `/api/v1/student/course-offerings/{offeringId}` | Chi tiết lớp khi enrollment cho phép |

Business/error:

- Join code được normalize server-side, không log và không trả ở Student list.
- `404 JOIN_CODE_NOT_FOUND`; `409 JOIN_DISABLED|COURSE_NOT_JOINABLE|ENROLLMENT_ALREADY_APPROVED`; `422 INVALID_JOIN_CODE`.
- Request lặp khi đang `PENDING` trả enrollment cũ; trạng thái `REJECTED/REMOVED` chỉ được re-request theo policy Java.
- Chỉ `APPROVED` truy cập học liệu. `PENDING/REJECTED` chỉ xem trạng thái request.

### 4.2 Học liệu Course Offering

| Method | Endpoint | Quy tắc |
|---|---|---|
| GET | `/api/v1/student/course-offerings/{offeringId}/materials` | Enrollment `APPROVED`; publication active; PPTX trước PDF |
| GET | `/api/v1/student/materials/{documentId}/slides` | PPTX public/READY; artifact có kiểm quyền |
| GET | `/api/v1/student/materials/{documentId}/slides/{number}` | Một artifact/metadata slide |
| GET | `/api/v1/student/materials/{documentId}/download` | Chỉ PDF public; PPTX trả `403 FILE_TYPE_NOT_DOWNLOADABLE` |

Archive access: Student từng `APPROVED` có thể xem lớp/học liệu cũ khi offering `ARCHIVED`, trừ khi `LOCKED`, publication revoked hoặc policy retention chặn.

### 4.3 Slide Note, view event và Tutor

- `GET/PUT /api/v1/student/materials/{documentId}/slides/{number}/note`
- `POST /api/v1/student/materials/{documentId}/slides/{number}/view-events` với `Idempotency-Key`
- `POST /api/v1/student/materials/{documentId}/slides/{number}/tutor`

Tutor request:

```json
{"question":"Giải thích khái niệm trên slide này"}
```

Tutor response:

```json
{
  "status":"ANSWERED",
  "answer":"...",
  "citations":[{"documentId":"doc_1","slideNumber":12,"excerpt":"..."}],
  "traceId":"req_..."
}
```

Thiếu evidence trả `status=NO_EVIDENCE`, `answer=null`, `citations=[]`. Java tự dựng allowed slide scope sau khi kiểm enrollment/publication.

### 4.4 Personal Documents

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/api/v1/personal-documents` | Multipart PDF tối đa 20 MB |
| GET | `/api/v1/personal-documents` | Danh sách owner, status/page metadata |
| GET | `/api/v1/personal-documents/{id}/status` | Poll processing |
| DELETE | `/api/v1/personal-documents/{id}` | Owner delete lifecycle |

- Chỉ PDF có text layer. DOCX/PPTX trả `415`; scan/no text → job `FAILED/PDF_TEXT_REQUIRED`; encrypted → `PDF_ENCRYPTED`.
- Status `UPLOADING|PENDING_PROCESSING|PROCESSING|READY|FAILED|DELETING`.

### 4.5 Personal RAG conversation

UX và contract lấy cảm hứng từ evidence-scoped workspace của repo tham khảo nhưng mọi call vẫn qua Java.

#### `POST /api/v1/personal-rag/conversations`

- Input: `{selectedDocumentIds:[...]}` gồm 1–10 ID duy nhất.
- Preconditions: mọi document thuộc current Student, PDF, `READY` và cùng embedding index version hợp lệ.
- Output `201`: `{conversationId,title,selectedDocuments,createdAt}`.
- Errors: `404 DOCUMENT_NOT_FOUND`; `409 DOCUMENT_NOT_READY|EMBEDDING_VERSION_MISMATCH`; `422 INVALID_DOCUMENT_SCOPE`.
- Side effect: Java lưu snapshot `conversation_documents`; client không tự thêm ID ở message request.

#### `PATCH /api/v1/personal-rag/conversations/{id}`

- Input cho phép `{title?}` hoặc `{selectedDocumentIds?}`.
- Thay scope phải revalidate toàn bộ owner/READY và chỉ ảnh hưởng message tiếp theo.

#### `POST /api/v1/personal-rag/conversations/{id}/messages`

- Input: `{message}` dài 1–2.000 ký tự; không nhận model/provider/document IDs.
- Output:

```json
{
  "messageId":"msg_...",
  "status":"ANSWERED",
  "answer":"...",
  "citations":[
    {
      "documentId":"doc_...",
      "documentName":"Ghi chú chuẩn hóa dữ liệu.pdf",
      "pageNumber":12,
      "excerpt":"..."
    }
  ],
  "traceId":"req_..."
}
```

- `NO_EVIDENCE` trả answer an toàn và citations rỗng; không đoán ngoài nguồn.
- Java load conversation owner/scope, gọi Python, revalidate mọi citation rồi mới lưu User/Assistant messages.
- Errors: `404`; `409 DOCUMENT_SCOPE_CHANGED`; `422 INVALID_MESSAGE`; `503 AI_SERVICE_UNAVAILABLE`.

#### History

- `GET /api/v1/personal-rag/conversations`
- `GET /api/v1/personal-rag/conversations/{id}`
- `DELETE /api/v1/personal-rag/conversations/{id}`

History chỉ owner đọc; response có selected source metadata và messages/citations đã kiểm định, không có prompt/token/Agent Trace.

#### Quiz từ conversation

`POST /api/v1/personal-rag/conversations/{id}/quizzes`

- Input `{questionCount,difficulty}`; Java dùng scope đã lưu, không nhận thêm document IDs.
- Output `202 {quizId,status:"GENERATING"}`.
- Python trả draft; Java validate/lưu `REVIEW_REQUIRED`. Không trả Quiz làm ngay trong chat.

### 4.6 Dashboard, Study Streak và Daily Goal

Không có API/menu Progress tổng hợp độc lập. Dashboard là endpoint tổng hợp; chi tiết tiến độ đặt trong Course Offering.

#### `GET /api/v1/student/dashboard`

- **Input:** ngày hiện tại được Java xác định theo timezone tài khoản; client không truyền actual/streak.
- **Output `200`:**

```json
{
  "date": "2026-09-24",
  "timeZone": "Asia/Ho_Chi_Minh",
  "streak": {
    "currentStreak": 6,
    "longestStreak": 14,
    "activityDays": ["2026-09-18", "2026-09-19", "2026-09-20", "2026-09-22", "2026-09-23", "2026-09-24"]
  },
  "dailyGoal": {
    "slideTarget": 5,
    "slideActual": 3,
    "quizQuestionTarget": 10,
    "quizQuestionActual": 6,
    "taskTarget": 2,
    "taskActual": 1
  },
  "overview": {
    "viewedSlides": 38,
    "totalPublishedSlides": 62,
    "completedTasks": 9,
    "totalTasks": 12,
    "completedQuizzes": 7,
    "averageQuizScore": 84.0
  },
  "upcomingItems": [],
  "activeCourseOfferings": []
}
```

- **Errors:** `401 UNAUTHENTICATED`; `422 INVALID_TIME_ZONE` nếu cấu hình tài khoản hỏng và không thể fallback an toàn.

#### `GET /api/v1/student/study-streak`

- **Output `200`:** `{currentStreak,longestStreak,activityDays,timeZone,asOfDate}`.
- Chỉ `VIEW_SLIDE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED` tạo activity day. Login, Note và `ASK_AI` không được tính.
- Nhiều event hợp lệ cùng local date chỉ tính một ngày; ngày thiếu hoạt động làm đứt current streak.

#### `GET /api/v1/student/daily-goal`

- **Output `200`:** target + actual của ngày hiện tại, `date`, `timeZone` và `completed:boolean`.
- `slideActual` đếm slide phân biệt đã xem trong ngày; `quizQuestionActual` lấy từ số câu của attempt đã submit/scored; `taskActual` đếm task chuyển hoàn thành trong ngày.

#### `PUT /api/v1/student/daily-goal`

- **Input:** `{slideTarget:0..100,quizQuestionTarget:0..200,taskTarget:0..50}`; cả ba trường bắt buộc, ít nhất một target lớn hơn `0`.
- **Output `200`:** cấu hình target đã lưu và actual hiện tại được tính lại; target này tiếp tục áp dụng cho các ngày sau đến khi Student đổi.
- **Errors:** `422 INVALID_DAILY_GOAL`; caller giữ giá trị cũ và hiển thị validation.
- **Side effect:** chỉ cập nhật target; không tạo learning event và không sửa Streak.

#### Tiến độ theo Course Offering

- `GET /api/v1/student/course-offerings/{offeringId}/progress`
- **Input:** Course Offering thuộc enrollment được phép.
- **Output:** viewing progress theo PPTX/document, Quiz/Study Plan summary liên quan lớp; không có Topic Mastery.
- **Errors:** `404` ngoài scope; Teacher PDF không có page progress.

### 4.7 Study Plan, Calendar và Quiz

- CRUD `/api/v1/study-plans` và `/api/v1/study-plans/{planId}/items`.
- `GET /api/v1/calendar?from=&to=`.
- `PATCH /api/v1/study-plan-items/{id}/status` phát `STUDY_TASK_COMPLETED` idempotent khi chuyển sang completed.
- `/api/v1/review/quizzes/*` và `/api/v1/review/attempts/*`; submit/scoring thành công phát `QUIZ_COMPLETED` một lần.

Plan item optional `courseOfferingId`. Java phát hiện conflict. Không có Topic Mastery, recommendation, XP, Achievement hoặc leaderboard endpoint. Quiz `REVIEW_REQUIRED` phải accept thành `READY`; Java chấm attempt.

## 5. Teacher API

### 5.1 Course Offering

| Method | Endpoint | Contract |
|---|---|---|
| POST | `/api/v1/teacher/course-offerings` | `{subjectId,semesterId,code?,name?}` → `201` + join code |
| GET | `/api/v1/teacher/course-offerings` | Chỉ lớp current Teacher; filter semester/status |
| GET/PATCH | `/api/v1/teacher/course-offerings/{id}` | Owner-only metadata update |
| POST | `/api/v1/teacher/course-offerings/{id}/archive` | `ACTIVE → ARCHIVED` |
| POST | `/api/v1/teacher/course-offerings/{id}/join-code/regenerate` | Sinh code mới, vô hiệu code cũ |
| PATCH | `/api/v1/teacher/course-offerings/{id}/join-code` | `{enabled:boolean}` |

- Không nhận `teacherId` từ client.
- `409 SEMESTER_NOT_ACTIVE|COURSE_CODE_EXISTS|COURSE_LOCKED`; `404` nếu không phải owner.
- Join code chỉ hiển thị cho Teacher owner/Admin phù hợp; không xuất hiện trong log.

### 5.2 Enrollment management

| Method | Endpoint | Contract |
|---|---|---|
| GET | `/api/v1/teacher/course-offerings/{id}/enrollments` | filter `PENDING|APPROVED|REJECTED|REMOVED` |
| POST | `/api/v1/teacher/enrollments/{enrollmentId}/approve` | Owner; `PENDING → APPROVED` |
| POST | `/api/v1/teacher/enrollments/{enrollmentId}/reject` | Owner; optional safe reason |
| POST | `/api/v1/teacher/enrollments/approve-batch` | `{courseOfferingId,enrollmentIds}` all-or-nothing |
| DELETE | `/api/v1/teacher/enrollments/{enrollmentId}` | `APPROVED → REMOVED`, giữ history |

Student list chỉ trả account metadata tối thiểu; không trả Personal Documents, Note, chat, plan, Quiz result hoặc progress cá nhân.

### 5.3 Teacher Library và publication

- `POST/GET /api/v1/teacher/documents`
- `GET/PATCH/DELETE /api/v1/teacher/documents/{id}`
- `GET /api/v1/teacher/documents/{id}/status`
- `POST /api/v1/teacher/documents/{id}/retry`
- `POST /api/v1/teacher/documents/{id}/publications`
- `GET /api/v1/teacher/documents/{id}/publications`
- `DELETE /api/v1/teacher/publications/{publicationId}`

Publication input `{courseOfferingIds:[...]}`. Java kiểm document owner + mọi offering owner/status. PPTX phải READY; PDF READY chỉ download. Re-public re-activate row cũ.

## 6. Admin API

- Dashboard: `GET /api/v1/admin/dashboard`.
- Users/roles/status: `/api/v1/admin/users`.
- Subjects CRUD: `/api/v1/admin/subjects`.
- Semesters CRUD/status: `/api/v1/admin/semesters`.
- Monitoring: `GET /api/v1/admin/course-offerings`, `GET .../{id}`.
- Enforcement: `POST .../{id}/lock`, `POST .../{id}/archive`.
- Feedback: `/api/v1/admin/feedback-reports`.
- Audit: `GET /api/v1/admin/system-logs`.
- Settings: `GET/PATCH /api/v1/admin/system-settings`.

Admin không có endpoint tạo/phân công Teacher cho Course Offering và không cần approve lớp. Admin không mặc định đọc Personal Document/chat/Note/plan/Quiz result.

## 7. Internal Java → Python API

Header:

```text
Authorization: Bearer <service-token>
X-Request-Id: req_...
X-Schema-Version: 2
Idempotency-Key: ...   # index/deindex
```

| Endpoint | Request | Response |
|---|---|---|
| POST `/internal/v1/documents/index` | document/version, pipeline, owner?, signed URL, MIME | `202 {requestId,jobId,status}` |
| POST `/internal/v1/documents/deindex` | document/version/pipeline | Idempotent job |
| GET `/internal/v1/jobs/{jobId}` | job ID | status/attempt/error/artifact metadata |
| POST `/internal/v1/personal-rag/ask` | userId, conversationId, authorized documents, message | answer/NO_EVIDENCE + page citations |
| POST `/internal/v1/slides/ask` | user/document/current/allowed slides/question | answer/NO_EVIDENCE + slide citations |
| POST `/internal/v1/quizzes/generate` | user/conversation/authorized docs/count/difficulty | Structured `MCQ_SINGLE` draft |
| GET `/internal/v1/health` | common headers | Liveness/readiness |

### Grounding contract

- Retrieval filter được đẩy xuống repository theo document/version/owner/source; filter lại sau retrieval để defense in depth.
- Citation được dựng từ retrieved chunk, deduplicate và validate document/location/excerpt bằng code.
- Document content được delimit và xem là untrusted evidence, không phải instruction.
- Khi evidence thiếu, trả `NO_EVIDENCE` mà không gọi model để bịa.
- Reviewer nếu dùng chỉ đánh giá grounding và retry tối đa hai lần; không được mở rộng scope.
- Python response không trả provider payload, prompt, token hoặc user-visible Agent Trace.

## 8. Timeout, retry và versioning

- Poll/job GET retry có backoff giới hạn.
- Index/deindex key: `documentId:version:pipeline:operation`.
- Không retry mù LLM request sau timeout; Java dùng request/run identity để chống tạo duplicate Quiz/message.
- Thay wire shape phải tăng schema version và cập nhật contract test Java/Python.
- Job polling không trả signed URL/content; internal error chỉ có safe code + trace ID.
