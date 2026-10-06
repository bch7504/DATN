# StudyFlow — API Plan

Contract mục tiêu theo Flow MVP v1.0. Browser chỉ gọi Java tại `/api/v1`; Python chỉ mở `/internal/v1` cho Java.

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
| GET | `/api/v1/student/course-offerings/{offeringId}/materials` | Enrollment `APPROVED`; publication active; chỉ Course Material PDF `READY` |
| GET | `/api/v1/student/materials/{documentId}/pages` | Metadata các trang PDF có kiểm quyền |
| GET | `/api/v1/student/materials/{documentId}/pages/{number}` | Một trang/metadata PDF trong authorized scope |

Archive access: Student từng `APPROVED` có thể xem lớp/học liệu cũ khi offering `ARCHIVED`, trừ khi `LOCKED`, publication revoked hoặc policy retention chặn.

### 4.3 Page Note, view event và Course Material AI Tutor

- `GET/PUT /api/v1/student/materials/{documentId}/pages/{number}/note`
- `POST /api/v1/student/materials/{documentId}/pages/{number}/view-events` với `Idempotency-Key`
- `POST /api/v1/student/materials/{documentId}/pages/{number}/tutor`

Tutor request:

```json
{"question":"Giải thích khái niệm trên trang này"}
```

Tutor response:

```json
{
  "status":"ANSWERED",
  "answer":"...",
  "citations":[{"documentId":"doc_1","pageNumber":12,"excerpt":"..."}],
  "traceId":"req_..."
}
```

Thiếu evidence trả `status=NO_EVIDENCE`, `answer=null`, `citations=[]`. Java tự dựng allowed page/document scope sau khi kiểm enrollment/publication. Teacher không sử dụng endpoint Tutor này.

### 4.4 Personal Documents

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/api/v1/personal-documents` | Multipart PDF tối đa 20 MB |
| GET | `/api/v1/personal-documents` | Danh sách owner, status/page metadata |
| GET | `/api/v1/personal-documents/{id}/status` | Poll processing |
| DELETE | `/api/v1/personal-documents/{id}` | Owner delete lifecycle |

- Chỉ PDF có text layer. DOCX/PPTX trả `415`; scan/no text → job `FAILED/PDF_TEXT_REQUIRED`; encrypted → `PDF_ENCRYPTED`.
- Status `UPLOADING|PENDING_PROCESSING|PROCESSING|READY|FAILED|DELETING`.

### 4.5 Personal Document Assistant

UX và contract lấy cảm hứng từ evidence-scoped workspace của repo tham khảo nhưng mọi call vẫn qua Java.

#### `POST /api/v1/student/chat/conversations`

- Input: `{selectedDocumentIds:[...]}` gồm 1–10 ID duy nhất.
- Preconditions: mọi document thuộc current Student, PDF, `READY` và cùng embedding index version hợp lệ.
- Output `201`: `{conversationId,title,selectedDocuments,createdAt}`.
- Errors: `404 DOCUMENT_NOT_FOUND`; `409 DOCUMENT_NOT_READY|EMBEDDING_VERSION_MISMATCH`; `422 INVALID_DOCUMENT_SCOPE`.
- Side effect: Java lưu snapshot `conversation_documents`; client không tự thêm ID ở message request.

#### `PATCH /api/v1/student/chat/conversations/{id}`

- Input cho phép `{title?}` hoặc `{selectedDocumentIds?}`.
- Thay scope phải revalidate toàn bộ owner/READY và chỉ ảnh hưởng message tiếp theo.

#### `POST /api/v1/student/chat/conversations/{id}/messages`

- Input: `{message}` dài 1–2.000 ký tự; không nhận model/provider/document IDs.
- Output:

```json
{
  "messageId":"msg_...",
  "status":"ANSWERED",
  "capability":"ASK_DOCUMENT",
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

- `capability` là `ASK_DOCUMENT|SUMMARIZE_DOCUMENT|CREATE_QUIZ|NEEDS_CLARIFICATION`; cùng một composer được Single Agent định tuyến sang đúng tool.
- `NO_EVIDENCE` trả answer an toàn và citations rỗng; không đoán ngoài nguồn. Yêu cầu thiếu tham số trả `NEEDS_CLARIFICATION` cùng `missingFields`.
- Với `CREATE_QUIZ`, response trả `quizDraft:{quizId,questionCount,status:"REVIEW_REQUIRED"}`; Java validate/lưu draft trước khi trả.
- Java load conversation owner/scope, gọi Python, revalidate mọi citation và structured output rồi mới lưu User/Assistant messages.
- Errors: `404`; `409 DOCUMENT_SCOPE_CHANGED`; `422 INVALID_MESSAGE`; `503 AI_SERVICE_UNAVAILABLE`.

#### History

- `GET /api/v1/student/chat/conversations`
- `GET /api/v1/student/chat/conversations/{id}`
- `DELETE /api/v1/student/chat/conversations/{id}`

History chỉ owner đọc; response có selected source metadata và messages/citations đã kiểm định, không có prompt/token/Agent Trace.

#### Quiz từ Personal Documents trong khu vực hỏi đáp

- Student nhập prompt tự do trong conversation đã gắn 1–10 Personal PDF `READY`; Agent nhận diện ý định và gọi tool `generate_quiz` bằng structured args.
- Nếu thiếu `questionCount` hoặc phạm vi cần thiết, trả `NEEDS_CLARIFICATION`; không tự đoán giá trị quan trọng.
- Prompt và conversation là dữ liệu không tin cậy, không được thay system instruction, schema `MCQ_SINGLE`, authorized scope hoặc citation rule.
- Tạo thành công trả Quiz `REVIEW_REQUIRED`; Student mở Review Hub để duyệt/chấp nhận. AI không chấm điểm.

#### Sinh đề trực tiếp từ form `/quiz/create` (không qua conversation)

- Nút **Sinh đề thi trắc nghiệm AI** trong Ôn tập mở form riêng, không redirect sang hỏi đáp.
- `POST /api/v1/quizzes`: input `{selectedDocumentIds:string[],prompt:string}`; 1–10 ID duy nhất, PDF `READY` thuộc Student, prompt trim 1–500 ký tự. Số câu/độ khó/chủ đề được Student diễn đạt trong prompt; Java/Python phải validate, không coi prompt là system instruction.
- Header `Idempotency-Key` cho mỗi lần gửi chủ động; retry cùng thao tác phải giữ key.
- Output `202 {quizId,status:"GENERATING"}`; FE lấy trạng thái qua `GET /api/v1/review/quizzes/{id}`. Adapter cũng hỗ trợ response bản nháp đầy đủ khi generation hoàn tất đồng bộ.
- `GET /api/v1/review/quizzes/{id}`: owner-only, output `200 QuizDraft` gồm `{id,prompt,sourceDocumentIds,status,questions,createdAt}`. `questions` rỗng khi `GENERATING`; khi `REVIEW_REQUIRED`, mỗi câu có `{id,type:"MCQ_SINGLE",questionText,options:[{id,text}],correctOptionId,explanation,citation:{documentId,documentName,pageNumber,excerpt}}`, đúng 4 options và đúng một ID đáp án thuộc options.
- Errors dùng error envelope chung: `401`, `404 QUIZ_NOT_FOUND`, `409 DOCUMENT_NOT_READY|DOCUMENT_SCOPE_CHANGED`, `422 INVALID_QUIZ_PROMPT|INVALID_DOCUMENT_SELECTION|NO_EVIDENCE`, `503 AI_SERVICE_UNAVAILABLE`. FE giữ input và cho thử lại; không tự tạo câu trả lời production.
- Java dựng scope và gọi pipeline sinh Quiz nội bộ; không tạo conversation. Cùng lifecycle review/accept/attempt với Quiz sinh từ hỏi đáp. Regenerate trả ID mới, FE tiếp tục theo dõi ID đó.
- Phạm vi lần cập nhật này: FE và tài liệu contract. Implementation/contract test Java–Python còn phải được xác nhận trong task tích hợp; không xem demo là API đã vận hành.

### 4.6 Dashboard, Study Streak và Daily Goal

Không có API/menu/màn Progress độc lập. Dashboard là endpoint duy nhất trả tổng quan và tiến độ theo từng Course Offering.

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
    "pageTarget": 5,
    "pageActual": 3,
    "quizQuestionTarget": 10,
    "quizQuestionActual": 6,
    "taskTarget": 2,
    "taskActual": 1
  },
  "overview": {
    "viewedPages": 38,
    "totalPublishedPages": 62,
    "completedTasks": 9,
    "totalTasks": 12,
    "completedQuizzes": 7,
    "averageQuizScore": 84.0
  },
  "upcomingItems": [],
  "activeCourseOfferings": [
    {
      "courseOfferingId": "offering_dbi_01",
      "code": "DBI-01",
      "name": "Cơ sở dữ liệu",
      "viewedPages": 18,
      "totalPublishedPages": 28,
      "progressPercent": 64,
      "completedQuizzes": 3,
      "averageQuizScore": 78.0,
      "completedTasks": 5,
      "totalTasks": 7
    }
  ]
}
```

- **Errors:** `401 UNAUTHENTICATED`; `422 INVALID_TIME_ZONE` nếu cấu hình tài khoản hỏng và không thể fallback an toàn.

#### `GET /api/v1/student/study-streak`

- **Output `200`:** `{currentStreak,longestStreak,activityDays,timeZone,asOfDate}`.
- Chỉ `VIEW_PAGE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED` tạo activity day. Login, Note và `ASK_AI` không được tính.
- Nhiều event hợp lệ cùng local date chỉ tính một ngày; ngày thiếu hoạt động làm đứt current streak.

#### `GET /api/v1/student/daily-goal`

- **Output `200`:** target + actual của ngày hiện tại, `date`, `timeZone` và `completed:boolean`.
- `pageActual` đếm trang Course Material PDF phân biệt đã xem trong ngày; `quizQuestionActual` lấy từ số câu của attempt đã submit/scored; `taskActual` đếm task chuyển hoàn thành trong ngày.

#### `PUT /api/v1/student/daily-goal`

- **Input:** `{pageTarget:0..100,quizQuestionTarget:0..200,taskTarget:0..50}`; cả ba trường bắt buộc, ít nhất một target lớn hơn `0`.
- **Output `200`:** cấu hình target đã lưu và actual hiện tại được tính lại; target này tiếp tục áp dụng cho các ngày sau đến khi Student đổi.
- **Errors:** `422 INVALID_DAILY_GOAL`; caller giữ giá trị cũ và hiển thị validation.
- **Side effect:** chỉ cập nhật target; không tạo learning event và không sửa Streak.

### 4.7 Study Plan, Calendar và Quiz

Frontend thể hiện nhóm này dưới tên **Kế hoạch & Lịch** theo `frontend-implementation-plan.md`: lịch tuần Thứ 2–Chủ nhật, task, deadline và các khung giờ. Daily Goal/Streak/progress không thuộc response của màn lịch và chỉ hiển thị trên Dashboard.

- CRUD `/api/v1/study-plans` và `/api/v1/study-plans/{planId}/items`.
- `GET /api/v1/calendar?from=&to=`.
- `PATCH /api/v1/study-plan-items/{id}/status` phát `STUDY_TASK_COMPLETED` idempotent khi chuyển sang completed.
- `/api/v1/review/quizzes/*` và `/api/v1/review/attempts/*`; submit/scoring thành công phát `QUIZ_COMPLETED` một lần.

#### Quiz review và workspace ôn tập

- `POST /api/v1/review/quizzes/{id}/regenerate`
  - Input `{prompt,selectedDocumentIds?}` mới; Quiz hiện tại thuộc Student và ở trạng thái cho phép tạo lại.
  - Output `202 {quizId,status:"GENERATING",regeneratedFromQuizId}`; không ghi đè draft/attempt cũ.
  - Errors: `404 QUIZ_NOT_FOUND`; `409 INVALID_QUIZ_STATE|GENERATION_IN_PROGRESS`; `422 INVALID_QUIZ_PROMPT`.
- `POST /api/v1/review/quizzes/{id}/reject`
  - Input `{reason?}`; Quiz hiện tại thuộc Student và ở `REVIEW_REQUIRED`.
  - Output `200 {quizId,status:"REJECTED"}`; giữ generation/draft để audit, không tạo attempt.
  - Errors: `404 QUIZ_NOT_FOUND`; `409 INVALID_QUIZ_STATE`; `422 INVALID_REJECT_REASON`.
- `POST /api/v1/review/quizzes/{id}/accept`
  - Input `{destinationType:"COURSE_OFFERING"|"PERSONAL",courseOfferingId?}`.
  - `COURSE_OFFERING` yêu cầu enrollment `APPROVED`; `PERSONAL` yêu cầu `courseOfferingId=null`.
  - Output `200 {quizId,status:"READY",courseOfferingId}`; errors `404`, `409 INVALID_QUIZ_STATE`, `422 INVALID_DESTINATION`.
- `GET /api/v1/review/course-offerings`: danh sách Course Offering được phép cùng `quizCount`, `averageScore`, `latestAttemptAt`.
- `GET /api/v1/review/course-offerings/{id}`: overview, Quiz READY/history, attempt history và review items từ câu sai.
- `GET /api/v1/review/personal-quizzes`: Quiz có `courseOfferingId=null` của current Student.
- Review item có `{questionId,wrongCount,contentLabel,sources:[{documentId,documentName,location}]}`; chỉ tổng hợp từ answer sai và question source, không gọi AI suy đoán Topic Mastery.
- Start attempt luôn tạo record mới; submit không overwrite attempt `COMPLETED` và trả chuỗi kết quả để UI so sánh.

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

### 5.3 Teacher Course Material PDF và publication

- `POST/GET /api/v1/teacher/documents`
- `GET/PATCH/DELETE /api/v1/teacher/documents/{id}`
- `GET /api/v1/teacher/documents/{id}/status`
- `POST /api/v1/teacher/documents/{id}/retry`
- `POST /api/v1/teacher/documents/{id}/publications`
- `GET /api/v1/teacher/documents/{id}/publications`
- `DELETE /api/v1/teacher/publications/{publicationId}`

Chỉ nhận PDF có text layer. Publication input `{courseOfferingIds:[...]}`. Java kiểm document owner + mọi offering owner/status; document phải `READY`. Student `APPROVED` được xem web, ghi Note theo trang và dùng Course Material AI Tutor. Re-public re-activate row cũ.

### 5.4 Teacher AI Quiz Generator

- `POST /api/v1/teacher/quizzes/generations`
  - Input `{documentId,courseOfferingId,questionCount:5..30,difficulty,topic?,pageFrom,pageTo,instructions?}`.
  - Java kiểm Teacher sở hữu document và Course Offering, PDF `READY`, page range hợp lệ; gửi structured request sang Python.
  - Output `202 {quizId,status:"GENERATING"}`; mutation bắt buộc có `Idempotency-Key`.
- `GET /api/v1/teacher/quizzes/{quizId}` trả draft/status cho đúng Teacher owner.
- `PATCH /api/v1/teacher/quizzes/{quizId}` cho phép sửa title/question/options/đáp án/giải thích trong `REVIEW_REQUIRED`.
- `POST /api/v1/teacher/quizzes/{quizId}/publish` chuyển Quiz đã duyệt sang `PUBLISHED` và gắn Course Offering nguồn.
- Teacher không có Personal Document chatbot và không gọi Course Material AI Tutor.

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
X-Schema-Version: 3
Idempotency-Key: ...   # index/deindex/Quiz generation
```

| Endpoint | Request | Response |
|---|---|---|
| POST `/internal/v1/documents/index` | document/version, pipeline, owner?, signed URL, MIME | `202 {requestId,jobId,status}` |
| POST `/internal/v1/documents/deindex` | document/version/pipeline | Idempotent job |
| GET `/internal/v1/jobs/{jobId}` | job ID | status/attempt/error/artifact metadata |
| POST `/internal/v1/personal-assistant/runs` | userId, conversationId, authorized Personal PDF/version scope, history window, untrusted message | selected tool + `ANSWERED|SUMMARIZED|QUIZ_CREATED|NEEDS_CLARIFICATION|NO_EVIDENCE`, page citations và structured payload |
| POST `/internal/v1/course-materials/ask` | user/document/current page/allowed page scope/question | `ANSWERED|NO_EVIDENCE` + page citations |
| POST `/internal/v1/quizzes/generate` | actorId, mode `PERSONAL_STUDENT|COURSE_TEACHER`, authorized document/version/page scope, structured generation args | Structured `MCQ_SINGLE` draft; mỗi câu đúng 4 options, một correctOptionIndex và page citation |
| GET `/internal/v1/health` | common headers | Liveness/readiness |

### Grounding contract

- Index/deindex trả `202 {requestId,jobId,status}` sau khi nhận job, không giữ request chờ xử lý xong. Java poll `GET /internal/v1/jobs/{jobId}` với backoff; cập nhật document `READY` khi index thành công hoặc `FAILED` với safe error code khi thất bại. Browser chỉ poll trạng thái document qua Java.
- Contract trên là schema version mới thay cho hai endpoint `personal-rag/ask` và `slides/ask`. Contract test Java/Python phải bao phủ tool routing, scope của hai chế độ Quiz, output 4 options và vòng đời job.

- Retrieval filter được đẩy xuống repository theo document/version/owner/source; filter lại sau retrieval để defense in depth.
- Citation được dựng từ retrieved chunk, deduplicate và validate document/location/excerpt bằng code.
- Document content được delimit và xem là untrusted evidence, không phải instruction.
- Khi evidence thiếu, trả `NO_EVIDENCE` mà không gọi model để bịa.
- Single Orchestrator Agent chỉ được gọi tool đã đăng ký. Router confidence thấp hoặc thiếu trường bắt buộc phải trả `NEEDS_CLARIFICATION`, không tự mở rộng scope.
- Reviewer nếu dùng chỉ đánh giá grounding trên cùng evidence snapshot; rewrite tối đa một lần theo kế hoạch AI, sau đó trả kết quả có căn cứ hoặc `NO_EVIDENCE`; không được mở rộng scope.
- Python response không trả provider payload, prompt, token hoặc user-visible Agent Trace.

## 8. Timeout, retry và versioning

- Poll/job GET retry có backoff giới hạn.
- Index/deindex key: `documentId:version:pipeline:operation`.
- Không retry mù LLM request sau timeout; Java dùng request/run identity để chống tạo duplicate Quiz/message.
- Thay wire shape phải tăng schema version và cập nhật contract test Java/Python.
- Job polling không trả signed URL/content; internal error chỉ có safe code + trace ID.
