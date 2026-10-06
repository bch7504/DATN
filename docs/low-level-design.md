# Low-level Design — StudyFlow

## 1. Module và boundary

```text
Next.js Web
  ├─ student: dashboard, course-offerings, PDF viewer, personal assistant, review, plan
  ├─ teacher: course-offerings, enrollments, PDF library, AI Quiz Studio
  └─ admin: users, catalog, monitoring, feedback, audit, settings
        ↓ public /api/v1
Java Spring Boot
  ├─ auth/user                  ├─ academic (Subject, Semester)
  ├─ courseoffering/enrollment ├─ document/publication/page/note
  ├─ progress/study/review     └─ integration/ai, integration/storage
        ↓ internal /internal/v1
Python FastAPI
  ├─ PDF index/chunk/embed      ├─ retrieval/Single Agent/Course Material Tutor
  └─ citation validation       └─ Student/Teacher Quiz generation/evaluation
```

Web không gọi Python, database, Object Storage hoặc provider. Java là system of record; Python chỉ dùng schema `ai` và authorized scope Java gửi.

## 2. Course Offering và Enrollment

`createCourseOffering(subjectId, semesterId, name, capacity?)` nhận Teacher đã xác thực, kiểm Subject/Semester, tạo lớp `ACTIVE`, join code và audit. Teacher chỉ sửa/archive lớp mình sở hữu; Admin chỉ giám sát/lock/archive.

`requestEnrollment(joinCode)` normalize code và tạo/reuse enrollment `PENDING`. Chỉ Teacher owner chuyển sang `APPROVED|REJECTED`; chỉ `APPROVED` mở quyền Course Material.

## 3. PDF và publication

| Nguồn | Xử lý | Người dùng |
|---|---|---|
| Course Material PDF | Python extract/chunk/embed theo trang | Student Viewer/Page Note/Tutor; Teacher tạo Quiz |
| Personal PDF | Python extract/chunk/embed theo trang | Student owner hỏi, tóm tắt và tạo Quiz |

Upload flow: Java kiểm MIME/signature/size/owner → Object Storage → internal index job → Python activate index version → Java đánh dấu `READY`. Không nhận PPTX/DOCX; OCR ngoài MVP.

Publication/revoke kiểm document owner và Course Offering owner. Re-public cùng cặp cập nhật quan hệ cũ, không duplicate file.

## 4. Personal Document Assistant

Conversation lưu snapshot 1–10 Personal PDF/version `READY`. Java kiểm owner/status trước mỗi message. Python dùng một Single Orchestrator Agent:

```text
message + bounded history + authorized document versions
  → intent/tool args validation
  → ask_document | summarize_document | generate_quiz
  → retrieval một lần + evidence snapshot
  → grounded structured result
  → citation validation
  → ANSWERED | SUMMARIZED | QUIZ_CREATED | NEEDS_CLARIFICATION | NO_EVIDENCE
```

Tool contract dùng JSON Schema; không nhận map tự do. Citation trả `documentId + pageNumber + excerpt`. Agent không được đổi authorized scope hoặc tự gọi tool ngoài registry.

## 5. Course Material PDF Viewer và Tutor

Java cấp page metadata khi Student có enrollment `APPROVED`, PDF `READY` đang public và page thuộc đúng document/version.

- Note key: `(studentId, documentId, pageNumber)`.
- View event: `VIEW_PAGE`, idempotent theo Student/document/page/local date.
- Tutor input: question, current page, authorized document/version/page scope.
- Tutor output: `ANSWERED` + page citations hoặc `NO_EVIDENCE`.
- Teacher không có Tutor; panel này chỉ xuất hiện trong Student Viewer.

## 6. Quiz

### Student mode

- Personal Assistant route `CREATE_QUIZ`; thiếu count/range trả `NEEDS_CLARIFICATION`.
- Java tạo Quiz `GENERATING`, validate Python output rồi chuyển `REVIEW_REQUIRED`.
- Student accept thành `READY` hoặc reject; có thể nhóm vào Course Offering `APPROVED` mà không thay generation source.

### Teacher mode

- Form gửi `documentId`, `courseOfferingId`, `questionCount`, `difficulty`, `topic?`, `pageFrom`, `pageTo`, `instructions?`.
- Java kiểm Teacher sở hữu cả PDF và lớp, rồi gọi Python mode `COURSE_TEACHER`.
- Teacher review/edit rồi publish; AI không tự publish.

Mọi câu là `MCQ_SINGLE`, đúng 4 options, một correct index, explanation và page citation. Java tạo attempt/chấm điểm trong transaction; mỗi attempt là bản ghi mới.

## 7. Progress, Streak, Daily Goal và Plan

- Dashboard là nơi duy nhất hiển thị aggregate và progress từng Course Offering.
- Content Progress tính từ page views/learning events; không suy luận Topic Mastery.
- `recordLearningEvent(studentId,eventType,targetId,idempotencyKey)` chốt `activityDate` theo timezone; retry trả event cũ.
- Streak chỉ xét `VIEW_PAGE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED`.
- Daily Goal lưu target Page/Quiz question/Task; actual do Java tính.
- Review item là projection answer sai → question → page source.
- Student tự lập Kế hoạch & Lịch; AI không tự điều phối.

## 8. Idempotency, lỗi và quan sát

- Mutation async dùng `Idempotency-Key`; xuyên service có `X-Request-Id`, `X-Schema-Version` và service credential.
- Index/reindex activate version mới nguyên tử trước khi dọn version cũ.
- Error envelope `{code,message,details,traceId}`; không trả stack trace/storage key/provider payload.
- Log không chứa document, prompt, answer, Note, token hoặc secret.

Contract chi tiết tại [api-plan.md](api-plan.md), schema tại [database-plan.md](database-plan.md), AI tại [ai-implementation-plan.md](ai-implementation-plan.md).
