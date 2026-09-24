# Feature Specification — Dashboard, Streak, Daily Goal, Plan và Quiz Review

## 1. Requirements

| ID | Requirement |
|---|---|
| DASH-FR-001 | Student Dashboard hiển thị Course Offering, deadline, viewing progress, task, Quiz, Study Streak và Daily Goal. |
| DASH-FR-002 | Không có menu/route/màn `Tiến độ & Thống kê` độc lập; Dashboard hiển thị đầy đủ tiến độ theo từng Course Offering. |
| DASH-FR-003 | Java tính `currentStreak`, `longestStreak`, `activityDays`; client không tự tính. |
| DASH-FR-004 | Streak chỉ dùng `VIEW_SLIDE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED`, không dùng login/Note/ASK_AI. |
| DASH-FR-005 | Student cấu hình target Slide/câu Quiz/Study Task; Java tính actual theo local date. |
| DASH-BR-001 | Daily Goal completion không quyết định Streak; một hoạt động hợp lệ là đủ duy trì ngày học. |
| PLAN-FR-001 | Student tự CRUD Study Plan/task/deadline/calendar; AI không tự điều phối. |
| QUIZ-FR-001 | Quiz AI phải được accept ở `REVIEW_REQUIRED` trước attempt; Java chấm điểm. |
| QUIZ-FR-002 | Màn Ôn tập bắt đầu bằng Course Offering được phép và nhóm Quiz cá nhân. |
| QUIZ-FR-003 | “Nội dung cần ôn lại” chỉ tổng hợp từ câu trả lời sai và `quiz_question_sources`, không dùng AI suy đoán năng lực. |
| QUIZ-FR-004 | Mỗi lần làm tạo attempt mới; lịch sử không bị ghi đè và cho phép so sánh kết quả. |

## 2. Dashboard contract

### `GET /api/v1/student/dashboard`

- **Args/input:** current Student; ngày/timezone do Java xác định, không nhận số liệu actual từ client.
- **Output:** `{date,timeZone,streak,dailyGoal,overview,upcomingItems,activeCourseOfferings}`.
- **Errors:** `401 UNAUTHENTICATED`; `422 INVALID_TIME_ZONE` nếu không thể dùng timezone hợp lệ/fallback.
- **Side effect:** không có; endpoint read-only.

`activeCourseOfferings` trong Dashboard chứa progress theo PPTX/document cùng Quiz/Study Plan summary của từng lớp được phép. Teacher PDF không có page progress. Viewing Progress không đồng nghĩa hiểu/thành thạo; không có Topic Mastery.

## 3. Study Streak contract

### `GET /api/v1/student/study-streak`

- **Output:** `{currentStreak,longestStreak,activityDays,timeZone,asOfDate}`.
- Mỗi local date có ít nhất một event hợp lệ chỉ tính một activity day.
- Một ngày không có event hợp lệ làm ngắt current streak; longest streak không giảm.
- Login, `NOTE_SAVED`, `ASK_AI`, upload/index không được tính.

## 4. Daily Goal contract

### `GET /api/v1/student/daily-goal`

- **Output:** target/actual, `completed`, `date`, `timeZone`.
- `slideActual`: số slide phân biệt đã xem trong ngày.
- `quizQuestionActual`: số câu thuộc attempt đã submit/scored trong ngày.
- `taskActual`: số Study Task chuyển completed trong ngày.

### `PUT /api/v1/student/daily-goal`

- **Input:** `{slideTarget:0..100,quizQuestionTarget:0..200,taskTarget:0..50}`; bắt buộc đủ ba trường và tổng target > 0.
- **Output:** target mới cùng actual do Java tính lại.
- **Errors:** `422 INVALID_DAILY_GOAL`; caller giữ target cũ.
- **Side effect:** cập nhật cấu hình lặp cho các ngày sau; không tạo learning event và không sửa Streak.

## 5. Study Plan và Quiz

| Endpoint | Input | Output/rule |
|---|---|---|
| `GET/POST/PATCH/DELETE /api/v1/study-plans...` | task/session DTO | normalized calendar item |
| `PATCH /api/v1/study-plan-items/{id}/status` | owner + target state | phát `STUDY_TASK_COMPLETED` idempotent khi hoàn thành |
| `POST /api/v1/review/quizzes/{id}/accept` | destination Course Offering approved hoặc personal | Quiz `READY` được gắn đúng nơi ôn tập |
| `POST /api/v1/review/quizzes/{id}/reject` | optional reason | Quiz `REJECTED` |
| `POST /api/v1/review/quizzes/{id}/regenerate` | prompt mới | generation mới, giữ lịch sử draft cũ |
| `POST /api/v1/review/quizzes/{id}/attempts` | Quiz `READY` | attempt, không trả answer key |
| `POST /api/v1/review/attempts/{id}/submit` | selected option IDs | Java score/result và một `QUIZ_COMPLETED` |
| `GET /api/v1/review/course-offerings` | current Student | các lớp được phép + Quiz count/average score |
| `GET /api/v1/review/course-offerings/{id}` | enrollment/historical access hợp lệ | overview, Quiz, wrong-answer review items, attempt history |
| `GET /api/v1/review/personal-quizzes` | current Student | Quiz cá nhân `courseOfferingId=null` |

## 6. Acceptance criteria

- Retry cùng view/task/Quiz idempotency key không tăng actual hoặc progress hai lần.
- Xem lại cùng slide trong một ngày chỉ tăng `slideActual` một lần; vẫn giữ view timestamp cần thiết.
- Hoạt động hợp lệ ngày hôm nay duy trì Streak dù Daily Goal chưa đạt 100%.
- Chỉ login, lưu Note hoặc hỏi AI không duy trì Streak.
- Client sửa actual/currentStreak/score trong payload không ảnh hưởng kết quả Java.
- Dashboard không có link sang trang Progress riêng và hiển thị trực tiếp tiến độ đúng enrollment của từng Course Offering.
- MVP không xuất hiện XP, Level, Achievement, badge hoặc leaderboard.
- Nội dung cần ôn lại trỏ đúng document + page/slide của câu sai; không xuất hiện nhãn “yếu/mạnh” do AI suy luận.
- Làm lại Quiz tạo attempt mới và giữ nguyên các attempt trước để so sánh.
