# Feature Specification — Progress, Plan và Quiz Review

## 1. Mục tiêu

Cho phép Student xem hoạt động học, lập lịch theo tuần, duyệt Quiz AI và làm bài trắc nghiệm một đáp án đúng với scoring xác định tại Java.

## 2. Functional requirements

| ID | Priority | Requirement |
|---|---|---|
| PLAN-FR-001 | MUST | Student xem progress/statistics của chính mình. |
| PLAN-FR-002 | MUST | Student CRUD Study Plan và plan item. |
| PLAN-FR-003 | MUST | Calendar hiển thị Thứ 2–Chủ nhật theo khung giờ từ plan items. |
| PLAN-FR-004 | MUST | Tạo/sửa lịch phát hiện xung đột và yêu cầu xác nhận nếu vẫn lưu. |
| QUIZ-FR-001 | MUST | Student xem Quiz theo trạng thái và nguồn. |
| QUIZ-FR-002 | MUST | Owner chấp nhận hoặc từ chối Quiz `REVIEW_REQUIRED`. |
| QUIZ-FR-003 | MUST | Chỉ Quiz `READY` được bắt đầu attempt. |
| QUIZ-FR-004 | MUST | Student chọn tối đa một option cho từng question. |
| QUIZ-FR-005 | MUST | Java submit idempotent, khóa answer và so sánh với answer key. |
| QUIZ-BR-001 | MUST | Mỗi question có đúng một answer key; câu bỏ trống hoặc chọn sai nhận 0 điểm. |

## 3. Progress contracts

| Endpoint | Input | Output |
|---|---|---|
| `GET /api/v1/student/progress/overview` | current Student | slide progress, plan completion, Quiz summary |
| `GET /api/v1/student/progress/class-subjects/{id}` | ClassSubject thuộc membership | progress theo PPTX/document |
| `GET /api/v1/student/statistics?from=&to=` | ISO date range tối đa 366 ngày | time/activity series, Personal AI usage, Quiz attempts |

- **Errors:** `404` ngoài membership; `422 INVALID_DATE_RANGE`.
- Không trả Topic Mastery hoặc suy luận mức hiểu.
- PDF/DOCX Teacher download không tạo page progress.

## 4. Study Plan và Calendar contracts

### Study Plan

- `POST /api/v1/study-plans`: input `{title, description?, startDate, endDate}`; output `201` plan `ACTIVE`.
- `GET /api/v1/study-plans`: pagination/status; chỉ plan của owner.
- `GET/PATCH/DELETE /api/v1/study-plans/{planId}`: ownership bắt buộc; delete dùng archive/soft delete khi có history.
- Errors: `404`; `409 PLAN_HAS_ACTIVE_ITEMS`; `422 INVALID_DATE_RANGE`.

### Plan item

- `POST /api/v1/study-plans/{planId}/items`.
- `PATCH/DELETE /api/v1/study-plans/{planId}/items/{itemId}`.
- Input: `{title, description?, scheduledStart?, scheduledEnd?, deadline?, durationMinutes?, classSubjectId?, allowConflict:false}`.
- Output: item normalized theo UTC và optional `warnings`.
- Rule: `scheduledEnd > scheduledStart`; item có lịch phải nằm trong plan date range.
- Conflict mặc định trả `409 SCHEDULE_CONFLICT` kèm `{conflictingItemIds}`; retry với `allowConflict:true` lưu item và trả warning.

### Calendar

`GET /api/v1/calendar?from=&to=`

- **Input:** range tối đa 31 ngày; giao diện MVP truy vấn từng tuần.
- **Output:** normalized items gồm ID, title, start/end, status, plan và ClassSubject metadata tối thiểu.
- **Rule:** calendar là projection của `study_plan_items`, không có bảng calendar riêng.

### Item status

`PATCH /api/v1/study-plan-items/{id}/status`

- Input `{status:"PENDING|IN_PROGRESS|COMPLETED|CANCELLED"}`.
- Output item mới; completion ghi event idempotent.
- Invalid transition trả `409 INVALID_ITEM_TRANSITION`.

## 5. Quiz review contracts

### Query và review

| Endpoint | Input | Output | Errors |
|---|---|---|---|
| `GET /api/v1/review/quizzes` | page, size, status | Quiz summary của owner | `401` |
| `GET /api/v1/review/quizzes/{id}` | Quiz owner | questions, options, sources; answer key chỉ hiện trong review draft | `404` |
| `POST .../{id}/accept` | `REVIEW_REQUIRED` | `200 {status:"READY"}` | `409 INVALID_QUIZ_STATE` |
| `POST .../{id}/reject` | `REVIEW_REQUIRED`, optional reason | `200 {status:"REJECTED"}` | `409` |

Sau accept, Student không chỉnh câu hỏi/answer key trong MVP.

## 6. Quiz attempt và scoring contracts

### `POST /api/v1/review/quizzes/{quizId}/attempts`

- **Input:** Quiz owner ở `READY`; optional `Idempotency-Key`.
- **Output:** `201 {attemptId,status:"IN_PROGRESS",questions}`; không trả answer key/explanation.
- **Errors:** `409 QUIZ_NOT_READY|ATTEMPT_ALREADY_ACTIVE`; `404` ngoài owner.

### `PUT /api/v1/review/attempts/{attemptId}/answers/{questionId}`

- **Input:** `{selectedOptionId}`; nhận một option ID hoặc `null` để bỏ chọn.
- **Output:** `200` answer snapshot; chưa trả correctness.
- **Errors:** `409 ATTEMPT_LOCKED`; `422 OPTION_NOT_IN_QUESTION`.
- **Side effect:** upsert theo `(attemptId, questionId)`.

### `POST /api/v1/review/attempts/{attemptId}/submit`

- **Input:** attempt `IN_PROGRESS`, header `Idempotency-Key`.
- **Output:** `{attemptId,status:"SCORED",correctCount,totalQuestions,scorePercent,submittedAt}`.
- **Scoring:** một câu đúng khi `selectedOptionId == correctOptionId`; câu bỏ trống/sai nhận 0 điểm.
- **Errors:** `409 ATTEMPT_NOT_ACTIVE`; request lặp lại trả cùng result.
- **Side effect:** khóa answers, chấm trong transaction, ghi `QUIZ_COMPLETED`.

### `GET /api/v1/review/attempts/{attemptId}/result`

- **Output:** summary và từng câu gồm lựa chọn đã chọn, đáp án đúng, explanation, citation và correctness.
- **Errors:** `404` ngoài owner; result chỉ có sau submit.

## 7. Acceptance criteria

### PLAN-AC-001 — Lịch tuần

- **Given** Student có plan items trong nhiều ngày
- **When** mở tuần tương ứng
- **Then** Web hiển thị đúng cột Thứ 2–Chủ nhật và khung giờ từ `scheduledStart/scheduledEnd`.

### PLAN-AC-002 — Xung đột lịch

- **Given** một item đã chiếm 19:00–20:00
- **When** Student tạo item chồng thời gian và chưa cho phép conflict
- **Then** Java trả `409` với item xung đột; chỉ lưu khi Student xác nhận lại.

### QUIZ-AC-001 — Review gate

- **Given** Quiz ở `REVIEW_REQUIRED`
- **When** Student cố tạo attempt
- **Then** Java trả `409 QUIZ_NOT_READY`; sau accept thì tạo attempt được.

### QUIZ-AC-002 — Chấm một đáp án đúng

- **Given** đáp án đúng là `A`
- **When** Student lần lượt chọn `A`, chọn `B` hoặc bỏ trống
- **Then** Java lần lượt chấm `đúng`, `sai`, `sai`.

### QUIZ-AC-003 — Submit idempotent

- **Given** attempt đã được submit thành công
- **When** client gửi lại cùng idempotency key
- **Then** Java trả đúng result cũ và không ghi answer/event lần hai.
