# Feature Specification — Teacher Course Offering, PDF và AI Quiz

## 1. Requirements

| ID | Requirement |
|---|---|
| TCH-FR-001 | Teacher tự tạo Course Offering từ Subject + Semester active. |
| TCH-FR-002 | Hệ thống sinh join code; owner regenerate/enable/disable. |
| TCH-FR-003 | Owner approve/reject enrollment `PENDING`. |
| TCH-FR-004 | Teacher chỉ upload Course Material PDF có text layer. |
| TCH-FR-005 | Owner public/revoke PDF vào Course Offering mình sở hữu. |
| TCH-FR-006 | Teacher chọn PDF, số câu, độ khó, chủ đề và page range để sinh Quiz. |
| TCH-FR-007 | Teacher review/sửa Quiz AI trước khi publish; AI không tự publish/chấm. |
| TCH-BR-001 | Teacher không có Personal Chatbot hoặc Course Material AI Tutor. |

## 2. API Course Offering/content

- `POST /api/v1/teacher/course-offerings`: `{subjectId,semesterId,code?,name?}` → lớp `ACTIVE` + join code.
- `GET/PATCH /api/v1/teacher/course-offerings/{id}`: owner-only.
- `POST /api/v1/teacher/course-offerings/{id}/join-code/regenerate` và `PATCH .../join-code`.
- `GET /api/v1/teacher/course-offerings/{id}/enrollments`.
- `POST /api/v1/teacher/enrollments/{id}/approve|reject`.
- `POST /api/v1/teacher/documents`: PDF có text layer ≤ giới hạn hệ thống → processing status.
- `POST /api/v1/teacher/documents/{id}/publications`: `{courseOfferingIds}` owner-only.
- `DELETE /api/v1/teacher/publications/{publicationId}`: revoke idempotent.

## 3. Teacher AI Quiz API

### Generate

`POST /api/v1/teacher/quizzes/generations`

- Input `{documentId,courseOfferingId,questionCount:5..30,difficulty,topic?,pageFrom,pageTo,instructions?}`.
- Preconditions: current Teacher sở hữu document/Course Offering; PDF `READY`; page range hợp lệ.
- Output `202 {quizId,status:"GENERATING"}`; bắt buộc `Idempotency-Key`.
- Errors: `404`; `409 DOCUMENT_NOT_READY|GENERATION_IN_PROGRESS`; `422 INVALID_PAGE_RANGE|INVALID_QUESTION_COUNT`.

### Review/publish

- `GET /api/v1/teacher/quizzes/{quizId}`: owner-only draft/status.
- `PATCH /api/v1/teacher/quizzes/{quizId}`: sửa title/question/options/correct answer/explanation khi `REVIEW_REQUIRED`.
- `POST /api/v1/teacher/quizzes/{quizId}/publish`: Java validate toàn bộ draft rồi chuyển `PUBLISHED`.
- `POST /api/v1/teacher/quizzes/{quizId}/reject`: chuyển `REJECTED`, giữ audit.

## 4. Acceptance

- Teacher không sửa/public/tạo Quiz từ tài nguyên Teacher khác.
- Upload PPTX/DOCX/PDF scan bị từ chối; PDF mã hóa/no text trả safe error.
- Một PDF public nhiều lớp không nhân bản object/index.
- Quiz chỉ dùng page trong authorized PDF/range, đúng 4 options và một đáp án đúng.
- Prompt injection trong PDF/instructions không đổi schema/scope.
- Teacher phải review/publish; AI không tự tạo attempt hoặc score.
- Teacher UI không hiển thị chatbot/Tutor.
