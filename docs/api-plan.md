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
  "details": [],
  "traceId": "req_..."
}
```

## 2. Auth và profile

| Method | Endpoint | Contract |
|---|---|---|
| POST | `/api/v1/auth/register` | `{displayName,email,password}`; chỉ nhận đúng miền `@ptit.edu.vn`; gửi OTP và trả `{status,expiresAt,resendAvailableAt}`; `202`, `409`, `422`, `429` |
| POST | `/api/v1/auth/verify-registration` | `{email,verificationCode}`; OTP gồm 6 chữ số; tạo tài khoản `STUDENT` sau khi xác minh; `204`, `409`, `410`, `422`, `429` |
| POST | `/api/v1/auth/resend-verification` | `{email}`; thay OTP cũ sau thời gian chờ và trả thời hạn mới; `202`, `409`, `422`, `429` |
| POST | `/api/v1/auth/login` | `{identifier,password}`; `204` + session cookie; `401|403` |
| POST | `/api/v1/auth/refresh` | Rotate refresh token; `204|401` |
| POST | `/api/v1/auth/logout` | Revoke idempotent; `204` |
| GET | `/api/v1/me` | Trả `{id,displayName,email,username,timeZone,role}` của tài khoản `ACTIVE`; `200`, `401`, `403` |
| PATCH | `/api/v1/me` | Nhận `{displayName?,timeZone?}` và trả profile đã cập nhật; không nhận email/username/role/status; `200`, `401`, `403`, `422` |

Luồng đăng ký chưa tạo người dùng ngay. Hệ thống lưu tạm hash của mật khẩu và OTP; OTP có hiệu lực 10 phút, chỉ được yêu cầu gửi lại sau 60 giây và tối đa 5 lần nhập sai cho mỗi mã. So khớp miền email không phân biệt chữ hoa/thường nhưng phải là chính xác `ptit.edu.vn`, không chấp nhận miền con.

Response `202` của register/resend:

```json
{
  "status": "VERIFICATION_REQUIRED",
  "expiresAt": "2026-10-13T08:10:00Z",
  "resendAvailableAt": "2026-10-13T08:01:00Z"
}
```

Các lỗi auth dùng error envelope chung: `VALIDATION_FAILED`, `EMAIL_DOMAIN_NOT_ALLOWED`, `ACCOUNT_ALREADY_EXISTS`, `REGISTRATION_NOT_PENDING`, `VERIFICATION_INVALID`, `VERIFICATION_EXPIRED`, `VERIFICATION_ALREADY_USED`, `VERIFICATION_RESEND_TOO_SOON`, `VERIFICATION_ATTEMPTS_EXHAUSTED`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `INVALID_SESSION`.

Access token và refresh token được đặt trong cookie `HttpOnly`, `Secure`, `SameSite=Strict`; refresh token được xoay vòng và database chỉ lưu hash. Frontend không lưu JWT/service credential trong local storage và không nhận role từ form đăng ký.

Java ánh xạ claim `role` đã ký trong access JWT thành authority `ROLE_STUDENT|ROLE_TEACHER|ROLE_ADMIN`. Các route `/api/v1/student/**`, `/api/v1/teacher/**`, `/api/v1/admin/**` yêu cầu đúng role tương ứng; thiếu phiên trả `401 UNAUTHENTICATED`, sai role trả `403 FORBIDDEN` theo error envelope chung. `PATCH /me` kiểm múi giờ theo IANA và trả `INVALID_TIME_ZONE`, `INVALID_DISPLAY_NAME`, `PROFILE_UPDATE_EMPTY` hoặc `UNKNOWN_FIELD` khi dữ liệu không hợp lệ.

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
| GET | `/api/v1/student/materials` | Trả `{items,page,size,totalItems,totalPages}` gồm PDF đã công bố cho lớp Student được duyệt |
| GET | `/api/v1/student/course-offerings/{offeringId}/materials` | Enrollment `APPROVED`; chỉ publication active trong lớp đó |
| GET | `/api/v1/student/materials/{documentId}/download` | Stream inline sau khi kiểm enrollment + publication; `?download=true` dùng attachment; không trả storage key/URL |

Course Material MVP hiện hỗ trợ quản lý file PDF, công bố/gỡ công bố theo lớp, xem/tải PDF và hỏi đáp bằng AI Tutor qua Java → Python. Page metadata, ghi chú theo trang và ghi nhận lượt xem chưa được nối; không hiển thị dữ liệu giả thay cho các phần đó.

Archive access: Student từng `APPROVED` có thể xem lớp/học liệu cũ khi offering `ARCHIVED`, trừ khi `LOCKED`, publication revoked hoặc policy retention chặn.

### 4.3 Page Note, view event và Course Material AI Tutor

- `GET/PUT /api/v1/student/materials/{documentId}/pages/{number}/note`
- `POST /api/v1/student/materials/{documentId}/pages/{number}/view-events` với `Idempotency-Key`
- `POST /api/v1/student/materials/{documentId}/pages/{number}/tutor`

Trạng thái triển khai: endpoint Tutor đã có ở Java. Frontend chỉ gọi endpoint Java này; Java xác thực Student, enrollment `APPROVED`, publication và trạng thái Course Offering trước khi chuyển phạm vi tài liệu tối thiểu sang Python `/internal/v1/course-materials/ask`. Java kiểm tra lại `documentId`, `documentVersion` và `pageNumber` của mọi citation trước khi trả về trình duyệt.

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

- Thành công: `200` với `ANSWERED|NO_EVIDENCE`.
- Body không hợp lệ hoặc trang ngoài PDF: `422` với error envelope chuẩn.
- Không có enrollment/publication hợp lệ: `403`; tài liệu không tồn tại: `404`.
- Python chưa được cấu hình/không khả dụng: `503 AI_SERVICE_UNAVAILABLE`.
- Python trả citation vượt phạm vi Java đã cấp: `502 AI_INVALID_CITATION` và kết quả không được chuyển cho Frontend.

### 4.4 Personal Documents

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/api/v1/personal-documents` | Multipart PDF tối đa 20 MB |
| GET | `/api/v1/personal-documents` | Danh sách owner, status/page metadata |
| GET | `/api/v1/personal-documents/{id}/status` | Poll processing |
| DELETE | `/api/v1/personal-documents/{id}` | Owner delete lifecycle |

- Chỉ PDF có text layer. DOCX/PPTX trả `415`; PDF scan/không có text hoặc bị mã hóa bị từ chối trước khi lưu. Upload hợp lệ trả `201` với `PENDING_PROCESSING`; Java worker gửi signed URL sang Python và poll job đến `READY|FAILED`. Production bắt buộc HTTPS; local development chỉ được dùng HTTP khi bật `AI_ALLOW_INSECURE_LOCAL_STORAGE_URL=true` và host là literal loopback (`localhost`, `127.0.0.1`, `::1`).
- Status `UPLOADING|PENDING_PROCESSING|PROCESSING|READY|FAILED|DELETING`.

### 4.5 Personal Document Assistant

UX và contract lấy cảm hứng từ evidence-scoped workspace của repo tham khảo nhưng mọi call vẫn qua Java.

#### `POST /api/v1/student/chat/conversations`

- Input: `{selectedDocumentIds:[...]}` gồm 1–10 ID duy nhất.
- Preconditions: mọi document thuộc current Student, PDF, `READY` và cùng embedding index version hợp lệ.
- Output `201`: `{id,title,selectedDocumentIds,messages:[],createdAt,updatedAt}`.
- Errors: `404 DOCUMENT_NOT_FOUND`; `409 DOCUMENT_NOT_READY|EMBEDDING_VERSION_MISMATCH`; `422 INVALID_DOCUMENT_SCOPE`.
- Side effect: Java lưu snapshot `conversation_documents`; client không tự thêm ID ở message request.

#### `POST /api/v1/student/chat/conversations/{id}/messages`

- Input: `{message}` dài 1–2.000 ký tự; không nhận model/provider/document IDs.
- Output:

```json
{
  "id":"msg_...",
  "role":"assistant",
  "status":"ANSWERED",
  "capability":"ASK_DOCUMENT",
  "content":"...",
  "citations":[
    {
      "documentId":"doc_...",
      "documentName":"Ghi chú chuẩn hóa dữ liệu.pdf",
      "pageNumber":12,
      "excerpt":"..."
    }
  ],
  "createdAt":"2026-10-22T00:00:00Z"
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
- Header `Idempotency-Key` cho mỗi lần gửi chủ động; retry cùng thao tác phải giữ key. Java tạo cùng một Quiz ID từ actor + request đã chuẩn hóa + key, nên retry trả lại draft đã lưu và không gọi Python lần hai.
- Java gọi Python đồng bộ trong request này. Output `200 QuizDraft` ở trạng thái `REVIEW_REQUIRED`; nếu không đủ bằng chứng trả `422 NO_EVIDENCE` và không lưu draft giả.
- `GET /api/v1/review/quizzes/{id}`: owner-only, output `200 QuizDraft` gồm `{id,prompt,sourceDocumentIds,status,questions,createdAt}`. Luồng hiện tại sinh đồng bộ nên draft được lưu trực tiếp ở `REVIEW_REQUIRED`; mỗi câu có `{id,type:"MCQ_SINGLE",questionText,options:[{id,text}],correctOptionId,explanation,citation:{documentId,documentName,pageNumber,excerpt}}`, đúng 4 options và đúng một ID đáp án thuộc options.
- Errors dùng error envelope chung: `401`, `404 QUIZ_NOT_FOUND`, `409 DOCUMENT_NOT_READY|DOCUMENT_SCOPE_CHANGED`, `422 INVALID_QUIZ_PROMPT|INVALID_DOCUMENT_SELECTION|NO_EVIDENCE`, `503 AI_SERVICE_UNAVAILABLE`. FE giữ input và cho thử lại; không tự tạo câu trả lời production.
- Java dựng scope và gọi pipeline sinh Quiz nội bộ; không tạo conversation. Cùng lifecycle review/accept/attempt với Quiz sinh từ hỏi đáp. Regenerate trả ID mới, FE tiếp tục theo dõi ID đó.
- Java đã triển khai owner scope, revalidate citation, lưu conversation/Quiz và gọi đúng internal Python API; fixture demo vẫn chỉ dùng khi `NEXT_PUBLIC_DEMO_MODE=true`.

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

- `POST /api/v1/study-plans` nhận `{title,description?,startDate,endDate}` và trả `201` cùng kế hoạch `ACTIVE` mới.
- `GET /api/v1/study-plans?status=ACTIVE|COMPLETED|ARCHIVED&page=0&size=20` trả page kế hoạch của chính Student; bỏ `status` để lấy tất cả, `size <= 100`.
- `GET /api/v1/study-plans/{planId}` trả kế hoạch thuộc Student hiện tại; kế hoạch của người khác cũng trả `404 STUDY_PLAN_NOT_FOUND` để không lộ dữ liệu.
- `PUT /api/v1/study-plans/{planId}` nhận đầy đủ `{title,description?,startDate,endDate,status}` và trả kế hoạch đã cập nhật.
- `DELETE /api/v1/study-plans/{planId}` chuyển kế hoạch sang `ARCHIVED`, không xóa lịch sử; trả `204` và lặp lại an toàn.
- `POST /api/v1/study-plans/{planId}/items` nhận `{title,description?,type,scheduledStart?,scheduledEnd?,dueAt?,reminderMinutesBefore?}` và trả `201`. Khi có `dueAt`, hệ thống mặc định nhắc trước 1440 phút; cho phép cấu hình `0..10080` phút. Mỗi item tạo thành công phát một `STUDY_PLAN_ITEM_CREATED` cho chính Student (chuông + email qua outbox); request lỗi không phát thông báo. POST này không có idempotency key, nên gửi lại sẽ tạo item mới.
- `GET /api/v1/study-plans/{planId}/items?page=0&size=50` trả page item thuộc kế hoạch theo thời gian tăng dần, `size <= 100`.
- `PUT /api/v1/study-plans/{planId}/items/{itemId}` thay đầy đủ nội dung/lịch của item chưa bị hủy, trừ item `lateCompleted=true`; trường hợp này trả `409 STUDY_PLAN_ITEM_LATE_COMPLETED_LOCKED`. Deadline đã qua được giữ nguyên khi chỉ sửa nội dung của item chưa bị khóa; deadline mới phải ở tương lai.
- `DELETE /api/v1/study-plans/{planId}/items/{itemId}` chuyển item sang `CANCELLED`, không xóa lịch sử; trả `204`. Item đã hoàn thành muộn không được hủy bằng route này (`409 STUDY_PLAN_ITEM_LATE_COMPLETED_LOCKED`), chỉ được ẩn bằng `/remove` hoặc xóa vĩnh viễn bằng `/permanently`.
- `DELETE /api/v1/study-plans/{planId}/items/{itemId}/remove` ẩn item khỏi lịch/danh sách (`DELETED`) nhưng giữ bản ghi, `completedAt` và learning event; trả `204`, kể cả với item hoàn thành muộn. Gọi lặp idempotent.
- `DELETE /api/v1/study-plans/{planId}/items/{itemId}/permanently` xóa vật lý item, `STUDY_TASK_COMPLETED` learning event, mọi thông báo và email-outbox có cùng Student + nguồn `STUDY_PLAN_ITEM` trong cùng transaction. Trả `204`; gọi lại sau khi xóa là no-op `204`, cả khi item không tồn tại hoặc không thuộc Student để tránh tiết lộ dữ liệu. Plan không thuộc Student hoặc item thuộc plan khác của cùng Student trả `404`; plan đang archive trả `409` khi item còn tồn tại. Chỉ gọi sau xác nhận rõ trong UI; thao tác không thể hoàn tác. Email đã gửi không thể thu hồi; streak/thống kê dựa trên learning event có thể thay đổi sau khi xóa.
- `GET /api/v1/calendar?from=<UTC instant>&to=<UTC instant>` trả `{from,to,items}` gồm các item có lịch giao với khoảng hoặc có deadline nằm trong khoảng; `from < to`, cửa sổ tối đa 31 ngày.
- `PATCH /api/v1/study-plan-items/{id}/status` nhận `{status:"TODO|COMPLETED"}`. Khi chuyển sang `COMPLETED`, header `Idempotency-Key` dài 8–100 ký tự là bắt buộc và Java chỉ phát một learning event `STUDY_TASK_COMPLETED` cho item đó. Nếu thời điểm hoàn thành **sau** `dueAt`, Java phát `STUDY_PLAN_ITEM_LATE_COMPLETED` một lần; sau đó chỉ cho gửi lặp trạng thái `COMPLETED`, hủy mềm `/remove` hoặc xóa vĩnh viễn `/permanently`, còn chuyển lại `TODO` trả `409 STUDY_PLAN_ITEM_LATE_COMPLETED_LOCKED`.

Kiểu item là `STUDY_SESSION|TASK|QUIZ`. Item phải có ít nhất một trong `scheduledStart` hoặc `dueAt`; nếu có lịch thì `scheduledStart` và `scheduledEnd` phải cùng tồn tại, `scheduledEnd > scheduledStart`. Mọi thời điểm phải nằm trong khoảng ngày của kế hoạch theo múi giờ IANA của Student; các lịch chưa hủy của cùng Student không được chồng nhau. Bản triển khai độc lập ban đầu chỉ tạo item cá nhân; `courseOfferingId` sẽ được bổ sung sau khi module Course Offering có access policy production.

Response kế hoạch: `{id,title,description,startDate,endDate,status,createdAt,updatedAt}`. Response item/lịch: `{id,planId,title,description,type,scheduledStart,scheduledEnd,dueAt,reminderAt,status,completedAt,lateCompleted,createdAt,updatedAt,courseOfferingId}`; `lateCompleted=true` chỉ khi `status=COMPLETED` và `completedAt > dueAt`. Các endpoint chỉ cho `ROLE_STUDENT`; lỗi dùng envelope chung với `401 UNAUTHENTICATED`, `403 ACCOUNT_UNAVAILABLE`, `404 STUDY_PLAN_NOT_FOUND|STUDY_PLAN_ITEM_NOT_FOUND`, `409 STUDY_PLAN_ARCHIVED|STUDY_SCHEDULE_CONFLICT|STUDY_PLAN_ITEM_LATE_COMPLETED_LOCKED`, `422 VALIDATION_FAILED|INVALID_STUDY_PLAN_RANGE|INVALID_STUDY_PLAN_ITEM_TIME|INVALID_REMINDER|IDEMPOTENCY_KEY_REQUIRED`.

#### Thông báo hạn nhiệm vụ

- Background job mỗi phút lấy tối đa 200 item `TODO` thuộc kế hoạch chưa archive, có `reminderAt <= now < dueAt` và chưa gửi nhắc; job retry an toàn vì database chỉ cho một thông báo `STUDY_PLAN_DEADLINE` trên mỗi item.
- Cùng job quét tối đa 200 item chưa hủy/ẩn có `dueAt <= now` và chưa có `STUDY_PLAN_ITEM_EXPIRED`. Thông báo trạng thái **tại hạn**: `Đã hoàn thành` nếu `completedAt <= dueAt`, ngược lại `Chưa hoàn thành`; đánh dấu muộn sau hạn phát sự kiện riêng. Khóa unique người nhận/type/nguồn chống phát trùng khi retry. Thông báo được lưu trong ứng dụng và Student hợp lệ được xếp hàng email; chu kỳ quét mặc định 60 giây.
- Các type Student mới `STUDY_PLAN_ITEM_CREATED|STUDY_PLAN_ITEM_EXPIRED|STUDY_PLAN_ITEM_LATE_COMPLETED` đều có `sourceType=STUDY_PLAN_ITEM`, `sourceId=itemId`, `dueAt` theo item (có thể null khi tạo lịch không đặt hạn); GET/PATCH thông báo giữ nguyên schema, status và lỗi.
- `GET /api/v1/student/notifications?unreadOnly=false&page=0&size=20` trả page thông báo của Student hiện tại; `size <= 100`.
- `PATCH /api/v1/student/notifications/{notificationId}/read` không nhận body, đánh dấu đã đọc idempotent và trả thông báo cập nhật; thông báo của người khác trả `404 NOTIFICATION_NOT_FOUND`.
- Response thông báo: `{id,type,title,message,sourceId,dueAt,readAt,createdAt}`. Student đủ điều kiện có thể nhận thêm email từ outbox SMTP; Teacher chỉ nhận trong ứng dụng, không gửi push.
- `GET /api/v1/teacher/notifications?unreadOnly=false&page=0&size=20` trả `200 {items,page,size,totalItems,totalPages}` cho giảng viên đang hoạt động; `page >= 0`, `1 <= size <= 100`. `PATCH /api/v1/teacher/notifications/{notificationId}/read` không nhận body, trả `200` cùng schema thông báo và idempotent; ID không thuộc giảng viên trả `404 NOTIFICATION_NOT_FOUND`. Hai API chỉ nhận `ROLE_TEACHER`, lỗi `401 UNAUTHENTICATED|INVALID_SESSION`, `403 FORBIDDEN|ACCOUNT_UNAVAILABLE`, `422 VALIDATION_FAILED` theo envelope lỗi chung.
- Thông báo giảng viên có type `TEACHER_ENROLLMENT_REQUESTED|TEACHER_ASSIGNMENT_SUBMITTED|TEACHER_MATERIAL_UPLOADED|TEACHER_MATERIAL_PUBLISHED|TEACHER_MATERIAL_REVOKED|TEACHER_ASSIGNMENT_PUBLISHED|TEACHER_ASSIGNMENT_EXPIRED`. Teacher nhận trong ứng dụng khi có yêu cầu vào lớp, bài nộp đầu tiên, PDF được lưu vào kho riêng, PDF được công bố/thu hồi theo lớp, bài tập được giao hoặc đã hết hạn. Không xếp hàng gửi email cho Teacher.
- Thông báo Student có thêm `STUDENT_MATERIAL_PUBLISHED|STUDENT_MATERIAL_REVOKED|STUDENT_ASSIGNMENT_EXPIRED|STUDENT_ASSIGNMENT_SUBMITTED|STUDENT_ENROLLMENT_REQUESTED|STUDENT_ENROLLMENT_APPROVED|STUDENT_ENROLLMENT_REJECTED|STUDENT_ENROLLMENT_REMOVED`. Chỉ Student đang `APPROVED` trong lớp tại thời điểm công bố/thu hồi PDF nhận sự kiện học liệu; upload vào kho riêng không phát cho Student. Thông báo bài hết hạn chỉ phát tới Student hiện `APPROVED` chưa nộp ở lần quét hết hạn; Teacher nhận số chưa nộp của roster hiện tại. Quyết định ghi danh và xác nhận nộp bài chỉ gửi đến chính Student liên quan. Student đủ điều kiện được xếp hàng email như các thông báo cũ.
- Mỗi cặp người nhận/type/nguồn chỉ tạo một bản ghi; gửi lặp không làm mất trạng thái đã đọc. `sourceId` với loại cũ là ID item/assignment/enrollment/submission; với sự kiện publication/decision mới là UUID ổn định cho một lần chuyển trạng thái, không phải ID tài liệu để browser đoán quyền. `dueAt` chỉ có ở sự kiện bài tập/hạn; các loại khác `null`. Response và lỗi của GET/PATCH giữ nguyên.
- `/api/v1/review/quizzes/*` và `/api/v1/review/attempts/*`; submit/scoring thành công phát `QUIZ_COMPLETED` một lần.

#### Quiz review và workspace ôn tập

- `POST /api/v1/review/quizzes/{id}/regenerate`
  - Input `{prompt}` mới; giữ nguyên snapshot nguồn của Quiz Student hiện tại.
  - Output `200 QuizDraft` mới ở `REVIEW_REQUIRED`; không ghi đè draft/attempt cũ.
  - Errors: `404 QUIZ_NOT_FOUND`; `422 INVALID_QUIZ_PROMPT|NO_EVIDENCE`; `503 AI_SERVICE_UNAVAILABLE`.
- `POST /api/v1/review/quizzes/{id}/reject`
  - Không nhận body; Quiz hiện tại thuộc owner và ở `REVIEW_REQUIRED`.
  - Output `204`; giữ draft để audit, không tạo attempt.
  - Errors: `404 QUIZ_NOT_FOUND`; `409 QUIZ_NOT_REVIEWABLE`.
- `POST /api/v1/review/quizzes/{id}/accept`
  - Input `{destinationType:"COURSE_OFFERING"|"PERSONAL",courseOfferingId?}`.
  - `COURSE_OFFERING` yêu cầu enrollment `APPROVED`; `PERSONAL` yêu cầu `courseOfferingId=null`.
  - Output `200 AcceptedQuiz` với `status` được Java lưu là `READY`; errors `404`, `409 QUIZ_NOT_REVIEWABLE|ENROLLMENT_REQUIRED`, `422 INVALID_DESTINATION`.
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

- `POST /api/v1/teacher/documents` — multipart `{file,title}`, PDF text-layer tối đa 20 MiB → `201 TeacherDocument`; kiểm định cấu trúc, số trang và nội dung text trước khi lưu; lỗi `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `422 INVALID_PDF|PDF_TEXT_REQUIRED|INVALID_TITLE`, `502 DOCUMENT_STORAGE_FAILED`, `503 STORAGE_NOT_CONFIGURED`.
- `GET /api/v1/teacher/documents` — `{items,page,size,totalItems,totalPages}` theo owner; mỗi item có danh sách publication đang hiệu lực.
- `GET /api/v1/teacher/documents/{id}/download` — stream PDF cho Teacher owner.
- `POST /api/v1/teacher/documents/{id}/publications` — `{courseOfferingIds:[...]}`; chọn danh sách đồng nghĩa gỡ khỏi lớp đã bỏ chọn; lớp phải ACTIVE và thuộc Teacher.
- `DELETE /api/v1/teacher/documents/{id}/publications?offeringId=...` — gỡ một publication, thao tác lặp idempotent.

Teacher document response: `{id,title,fileName,fileType:"PDF",fileSize,status,totalPages,publishedOfferings:[{offeringId,offeringCode,offeringName,publishedAt}],createdAt}`; `status` đi qua `PENDING_PROCESSING → PROCESSING → READY|FAILED`. Student response dùng cùng metadata nhưng chỉ liệt kê publication nằm trong các lớp Student đã được duyệt. Download trả `application/pdf` với `Content-Disposition: inline`; Student có thể truyền `?download=true` để nhận `attachment`.

Bản hiện tại trả toàn bộ học liệu trong một page metadata (`page=0`, `totalPages=0|1`). Frontend duyệt theo `totalPages` thay vì giả định chỉ có một trang, áp dụng cả danh sách lớp. Upload trả `PENDING_PROCESSING`; worker Java gửi PDF sang Python để lập chỉ mục và chỉ cho phép publish/Tutor khi `READY`. Publish/revoke thành công trả `204` không body.

Chỉ nhận PDF có text layer. Hệ thống kiểm document owner và ownership/trạng thái của mọi lớp; publication được lưu theo lớp và re-public kích hoạt lại row cũ. Student `APPROVED` mới xem/tải được PDF. Upload thành công tạo thông báo kho riêng cho Teacher; chỉ lần công bố/re-public mới thông báo Student đã duyệt trong lớp, thao tác giữ nguyên selection không phát lại. Thu hồi phát thông báo mất quyền truy cập mới. Tệp nằm trong private Object Storage; object key không xuất hiện trong response. Storage chưa cấu hình trả `503`, không tạo fixture.

### 5.4 Teacher AI Quiz Generator

- `POST /api/v1/teacher/quizzes/generations`
  - Input `{documentIds:[...],courseOfferingId,questionCount:1..30,difficulty,topic?,pageFrom,pageTo,instruction}`.
  - Java kiểm Teacher sở hữu document và Course Offering, PDF `READY`, page range hợp lệ; gửi structured request sang Python.
  - Java kiểm lại kết quả trước khi lưu: đúng `MCQ_SINGLE`, đúng số câu đã chọn, mỗi câu đúng 4 phương án khác nhau, chỉ một đáp án đúng và mọi citation đều nằm trong đúng tài liệu/phiên bản/khoảng trang Teacher đã cấp.
  - Output `200 QuizDraft` với `REVIEW_REQUIRED`; mutation bắt buộc có `Idempotency-Key`.
- `GET /api/v1/review/quizzes/{quizId}` trả draft/status cho đúng Teacher owner.
- `POST /api/v1/teacher/quizzes/{quizId}/publish` revalidate Teacher/lớp, chuyển draft sang `PUBLISHED` và trả `200 QuizDraft`.
- Teacher không có Personal Document chatbot và không gọi Course Material AI Tutor.

### 5.5 Giao và nộp bài tập theo lớp

| Method | Endpoint | Contract |
|---|---|---|
| POST | `/api/v1/teacher/course-offerings/{offeringId}/assignments` | `{title,description,dueAt}` → `201` bản nháp; lớp phải thuộc Teacher và đang hoạt động |
| PUT | `/api/v1/teacher/assignments/{assignmentId}` | Thay toàn bộ `{title,description,dueAt}` khi còn `DRAFT` → `200` |
| POST | `/api/v1/teacher/assignments/{assignmentId}/publish` | `DRAFT → PUBLISHED`; sinh viên `APPROVED` trong lớp được thông báo bài mới và nhận nhắc hạn trước 24 giờ |
| GET | `/api/v1/teacher/course-offerings/{offeringId}/assignments` | Danh sách bản nháp/đã công bố của lớp do Teacher sở hữu |
| GET | `/api/v1/teacher/assignments/{assignmentId}/submissions` | `200` tổng số đúng hạn/nộp muộn/chưa nộp và danh sách mọi Student hiện `APPROVED` trong lớp; người được duyệt sau hạn mà chưa nộp vẫn thuộc nhóm chưa nộp |
| GET | `/api/v1/student/assignments` | Bài đã công bố thuộc lớp Student `APPROVED`, kèm trạng thái nộp của chính mình |
| POST | `/api/v1/student/assignments/{assignmentId}/submissions` | `{answerText}` → `200`; cho phép nộp/cập nhật câu trả lời dạng văn bản, tự ghi `ON_TIME` hoặc `LATE` |
| POST | `/api/v1/student/assignments/{assignmentId}/submissions/attachments` | `multipart/form-data`: `answerText?`, 1–5 phần `files`; ảnh/tệp được kiểm tra và lưu riêng tư, trả metadata attachment |
| GET | `/api/v1/student/assignments/{assignmentId}/submissions/attachments/{attachmentId}/download` | Student chỉ tải tệp thuộc bài nộp của chính mình; Java kiểm tra enrollment và stream nội dung |
| GET | `/api/v1/teacher/assignments/{assignmentId}/submissions/{studentId}/attachments/{attachmentId}/download` | Teacher owner tải tệp của bài nộp trong lớp mình |

- Thành công: tạo bản nháp `201 Assignment`; các GET, PUT, publish, submit và download trả `200` với DTO/stream tương ứng; lỗi `401` phiên không hợp lệ, `403` sai quyền/không có enrollment, `404` không tìm thấy hoặc không thuộc owner, `409` sai trạng thái lớp/bản nháp, `413 ATTACHMENT_REQUEST_TOO_LARGE`, `422` body/file không hợp lệ, `502 ATTACHMENT_STORAGE_FAILED`, `503 STORAGE_NOT_CONFIGURED`. Không có API chấm điểm bài tập.
- `Assignment` response gồm `{id,courseOfferingId,title,description,dueAt,status,publishedAt,createdAt,updatedAt,submission}`; `submission` chỉ có trong danh sách Student và chứa `{id,answerText,submittedAt,status,attachments[]}` của chính Student. `AssignmentStats` gồm `{assignmentId,title,dueAt,approvedStudentCount,submittedCount,onTimeCount,lateCount,notSubmittedCount,students[]}`; mỗi phần tử `students[]` có `{studentId,fullName,email,submissionState,submittedAt,status,answerText,attachments[]}`. `approvedStudentCount` là số Student hiện `APPROVED` trong lớp, không phụ thuộc thời điểm duyệt. Người được duyệt sau `dueAt` mà chưa nộp có `submissionState=NOT_SUBMITTED` và được tính vào `notSubmittedCount`; nếu đã nộp sau hạn thì thuộc nhóm `LATE`. `submittedCount = onTimeCount + lateCount`; các số đếm phản ánh bài nộp hiện tại, không giữ lịch sử lần nộp. Mỗi attachment trả `{id,fileName,contentType,sizeBytes}`; không trả khóa hoặc URL lưu trữ.
- DTO giới hạn: `title` 1–200 ký tự, `description` 1–10.000 ký tự, `answerText` 1–20.000 ký tự; `dueAt` là ISO-8601 và phải ở tương lai khi tạo/sửa.
- Không nhận `teacherId`/`studentId` từ body; danh tính lấy từ JWT. Chỉ câu trả lời của Student thuộc enrollment `APPROVED` được chấp nhận.
- Nhận PDF, PNG, JPG/JPEG, DOCX, XLSX, PPTX; tối đa 10 MB/tệp, 5 tệp/bài nộp và 25 MB tổng. Server kiểm tra phần mở rộng + signature đầu tệp, không tin MIME type client gửi; file trả về dưới dạng attachment với `nosniff`.
- Object lưu trong S3-compatible storage qua `integration.storage`; cần cấu hình `STORAGE_ENABLED=true` cùng `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`. Không trả storage key hoặc URL trực tiếp; download đi qua Java để kiểm tra quyền.
- Hạn nộp phải ở tương lai khi tạo/sửa bản nháp. Công bố bài tập báo Teacher và mỗi Student đã duyệt; nhắc hạn chỉ gửi trước `dueAt` tới Student hiện `APPROVED` chưa nộp, tối đa một lần cho mỗi sinh viên/bài tập. Nếu job quét sau hạn thì bỏ qua nhắc trước hạn, rồi phát mốc hết hạn riêng cho Teacher và những Student đã duyệt chưa nộp; marker `expiry_notified_at` cùng unique source ngăn gửi lặp. Nộp thành công báo Teacher lần đầu và xác nhận cho Student. Unique source bảo đảm retry không tạo thông báo trùng.
- Sau hạn, Teacher xem số lượng và danh sách cụ thể đúng hạn, nộp muộn, chưa nộp của mọi Student hiện được duyệt vào lớp, kể cả người được duyệt sau hạn. Sinh viên được duyệt sau hạn mà chưa nộp được tính vào nhóm chưa nộp; nếu nộp sau hạn thì được ghi `LATE`. Nộp lại cập nhật câu trả lời hiện tại. Các lỗi dùng envelope chuẩn: `404 ASSIGNMENT_NOT_FOUND|COURSE_NOT_FOUND`, `403 FORBIDDEN|ENROLLMENT_REQUIRED`, `409 ASSIGNMENT_NOT_DRAFT|COURSE_NOT_ACTIVE`, `422 INVALID_DUE_AT` hoặc lỗi validation DTO.

### 5.6 Trạng thái nối giao diện cho BE2-F01/F02/F03

- F01: giao diện dùng POST/PUT bản nháp, publish và báo cáo ba nhóm bài nộp; Student gửi văn bản/multipart và tải tệp qua Java. Không chấm điểm hoặc nhận xét bài tập.
- F02: kho riêng → công bố theo lớp → Student được duyệt xem/tải → gỡ công bố. Không tạo dữ liệu mẫu hoặc giả trạng thái thành công khi API/storage lỗi.
- F03: Student tạo/chọn/đổi tên/lưu trữ kế hoạch; lịch tuần và nhiệm vụ gọi Java để tạo/sửa/hoàn thành/hủy. Hủy giữ lịch sử; thao tác **Xóa vĩnh viễn** yêu cầu xác nhận trong ứng dụng và xóa item cùng completion event/thông báo liên quan. Sửa/xóa luôn dùng `planId` của từng item. Lịch mới lấy giờ kết thúc làm hạn, nhắc trước 60 phút; task mặc định nhắc trước 1440 phút. Đây là giá trị form gửi qua contract sẵn có, không đổi luật nhắc của backend.
- F03 cũng hiển thị tự động các bài tập Teacher đã **công bố** thuộc lớp Student đang `APPROVED` trong lịch tuần và danh sách nhiệm vụ, kể cả khi Student chưa tạo kế hoạch cá nhân. Frontend lấy từ `GET /api/v1/student/assignments` (response `Assignment` có `createdAt`, `publishedAt`, `dueAt`, `submission`), chiếu khoảng từ thời điểm tạo bài đến hạn nộp; bản nháp không hiện. Mục bài tập là dữ liệu lớp chỉ đọc, không sao chép thành `StudyPlanItem` và không dùng API sửa/xóa/đánh dấu hoàn thành của kế hoạch cá nhân. Trạng thái được suy ra từ `submission` và `dueAt`; nút hành động mở `/assignments` để nộp bài. Sinh viên vẫn tự tạo/sửa/xóa task riêng qua API F03 như trước. `GET /api/v1/student/assignments` giữ nguyên status `200`/error envelope `401|403`; không đổi public API, chỉ bổ sung cách dùng ở giao diện.
- Chuông Student/Teacher hiển thị mọi type ở mục thông báo trên, phân trang và đánh dấu đã đọc qua Java. Liên kết mở `/plan` cho kế hoạch, `/assignments` hoặc `/teacher/assignments` cho bài tập, `/materials` hoặc `/teacher/documents` cho PDF, `/course-offerings` cho trạng thái ghi danh và `/teacher/enrollments` cho yêu cầu tham gia.
- Kiểm thử `RealHttpApiTest` với `-Dstudyflow.web.contract=true` chạy API client frontend qua HTTP thật bằng tài khoản/tệp tổng hợp; không thay thế kiểm thử trình duyệt hoặc dịch vụ triển khai thật.

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

Quy tắc `signedUrl` của endpoint index:

- URL phải tuyệt đối, không chứa user info hoặc fragment. Query của chữ ký tạm thời được phép.
- Staging/production chỉ chấp nhận HTTPS.
- Local development có thể chấp nhận HTTP khi cả Java và Python cùng bật `AI_ALLOW_INSECURE_LOCAL_STORAGE_URL=true`; host bắt buộc là literal loopback, không phân giải DNS để suy đoán loopback.
- Python còn đối chiếu scheme/host/port của URL với `STORAGE_ENDPOINT`, không theo redirect sang origin khác.
- Cấu hình kho tệp chưa sẵn sàng trả `503 STORAGE_NOT_READY`; URL sai chính sách trả `422 INVALID_SIGNED_URL` từ Python hoặc bị Java chặn trước khi gửi.

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
