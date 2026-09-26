# Low-level Design — StudyFlow Course Offering

**Baseline:** 24/09/2026
**Nguồn nghiệp vụ:** `Ke_hoach_do_an_tot_nghiep_chot_flow_MVP_v1.md`

## 1. Module và boundary

```text
Next.js Web
  ├─ student: dashboard, course-offerings, materials, viewer, personal-documents, review, plan
  ├─ teacher: course-offerings, enrollments, documents, publications
  └─ admin: users, catalog, course-offerings, feedback, audit, settings
        ↓ public /api/v1
Java Spring Boot
  ├─ auth/user                  ├─ academic (Subject, Semester)
  ├─ courseoffering/enrollment ├─ document/publication/slide/note
  ├─ progress/study/review     └─ integration/ai, integration/storage
        ↓ internal /internal/v1
Python FastAPI
  ├─ document indexing/render  ├─ retrieval/RAG/Slide Tutor
  └─ claim/citation validation └─ Quiz draft generation/evaluation
```

Web không gọi Python, database, Object Storage hoặc model provider trực tiếp. Java là system of record; Python chỉ dùng schema `ai` và authorized scope Java gửi.

## 2. Course Offering

### Tạo lớp học phần

`createCourseOffering(subjectId, semesterId, name, capacity?)`:

- Input: Teacher đã xác thực; Subject/Semester phải active; semester cho phép tạo lớp.
- Output: Course Offering `ACTIVE` và join code duy nhất dạng dễ nhập.
- Errors: `403 ROLE_REQUIRED`, `404 SUBJECT_OR_SEMESTER_NOT_FOUND`, `409 OFFERING_CONFLICT`, `422 INVALID_CAPACITY`.
- Side effect: lưu hash/hint của join code và audit `COURSE_OFFERING_CREATED`.

Teacher chỉ sửa/khóa/archive Course Offering mình sở hữu. Admin có quyền khóa/archive để vận hành nhưng không tạo hoặc duyệt từng lớp.

### Tham gia lớp

`requestEnrollment(joinCode)`:

- Java normalize code, tìm lớp còn mở và tạo quan hệ Student–Course Offering `PENDING`.
- Không lộ lớp khi code sai; request lặp không tạo duplicate.
- Teacher owner duyệt `APPROVED` hoặc `REJECTED`; chỉ `APPROVED` mở quyền học liệu.
- Khi học kỳ kết thúc, Course Offering chuyển `ARCHIVED`; enrollment và lịch sử không bị xóa.

## 3. Học liệu lớp học phần

Teacher Library sở hữu file một lần; publication liên kết document với Course Offering của chính Teacher.

| Loại | Xử lý | Student |
|---|---|---|
| Teacher PPTX | Python extract/render/index theo slide | Viewer web, Note, Tutor; không tải file gốc |
| Teacher PDF | Java/Object Storage, không index AI | Chỉ download sau authorization |
| Personal PDF | Python extract/chunk/embed theo trang | Owner dùng Personal RAG và sinh Quiz |

Publication/revoke kiểm document owner và Course Offering owner. Re-public cùng cặp document/offering cập nhật quan hệ cũ, không tạo duplicate.

## 4. Personal RAG workspace

UI gồm source panel và conversation workspace. Student chỉ chọn 1–10 PDF `READY`; conversation lưu snapshot document/version. Java load lại ownership/status trước mỗi message.

```text
question + bounded history + authorized versions
  → Python retrieval một lần
  → evidence snapshot
  → grounded generation với claims[].chunkIds
  → claim reviewer + citation validator
  → ANSWERED hoặc NO_EVIDENCE
```

Citation trả `documentId + pageNumber + excerpt`. Prompt injection trong document là dữ liệu, không phải instruction. Không có model selector, provider selector, Agent Trace hoặc gọi AI trực tiếp từ browser.

## 5. Slide Viewer và Tutor

Java cấp slide metadata/artifact khi:

1. Student có enrollment `APPROVED` hoặc quyền lịch sử hợp lệ;
2. PPTX đang được public và không bị revoke/lock;
3. slide thuộc đúng document/version.

Note key là `(studentId, slideId)`. View progress idempotent theo event/key. Slide Tutor nhận current slide, authorized document/version và bounded history; citation dùng `slideNumber`. Thiếu evidence trả `NO_EVIDENCE`.

## 6. Quiz, Dashboard, Streak và Daily Goal

- Quiz AI chỉ lấy Personal PDF `READY` Student chủ động chọn, không phụ thuộc chatbot; nhận prompt tự do như untrusted input và dùng `MCQ_SINGLE` 4 options có citation.
- `REVIEW_REQUIRED` cho phép regenerate toàn bộ hoặc accept vào Course Offering `APPROVED`/Quiz cá nhân; generation source độc lập destination.
- Workspace Ôn tập nhóm theo Course Offering và Quiz cá nhân. Nội dung cần ôn là projection từ answer sai → question source; mỗi lượt làm tạo attempt mới, không overwrite.
- Python sinh draft có source; Java validate rồi chuyển `GENERATING → REVIEW_REQUIRED`.
- Student chấp nhận hoặc từ chối draft trước khi làm; Java chấm điểm và lưu attempt/result.
- Không tạo route/menu Progress hoặc màn tiến độ Course Offering riêng. Dashboard lấy aggregate và viewing progress theo từng lớp từ Java.
- Content Progress tính từ slide view/learning event có thể kiểm thử; không suy luận Topic Mastery.
- `recordLearningEvent(studentId,eventType,targetId,idempotencyKey)` chốt `activityDate` theo timezone tài khoản; output là event đã tạo hoặc event cũ khi retry, lỗi scope/validation không tạo event.
- Streak chỉ xét `VIEW_SLIDE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED`; distinct local date quyết định chuỗi hiện tại/kỷ lục.
- Daily Goal lưu ba target và Java tính actual: slide phân biệt, số câu Quiz đã chấm, task hoàn thành trong ngày. Client không gửi actual.
- Daily Goal và Streak độc lập; chưa có XP, Level, Achievement hoặc leaderboard.
- Study Plan/Calendar do Student chủ động tạo; AI không tự điều phối.

## 7. Idempotency, lỗi và quan sát

- Mutation async dùng `Idempotency-Key`; request đi xuyên service có `X-Request-Id` và `X-Schema-Version`.
- Index/reindex dùng version; activate version mới nguyên tử trước khi dọn version cũ.
- Public error envelope: `{code,message,details,traceId}`; không trả stack trace/storage key/provider payload.
- Log chỉ metadata an toàn; không log document, prompt, answer, Note, token hoặc secret.
- Contract chi tiết tại [api-plan.md](api-plan.md); schema tại [database-plan.md](database-plan.md); đánh giá AI nằm trong [ai-implementation-plan.md](ai-implementation-plan.md).
