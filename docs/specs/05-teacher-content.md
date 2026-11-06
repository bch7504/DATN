# Feature Specification — Teacher Course Offering, kho học liệu, Quiz và Assignment

## 1. Requirements

| ID | Requirement |
|---|---|
| TCH-FR-001 | Teacher tự tạo Course Offering từ Subject + Semester active. |
| TCH-FR-002 | Hệ thống sinh join code; owner regenerate/enable/disable. |
| TCH-FR-003 | Owner approve/reject enrollment `PENDING`. |
| TCH-FR-004 | Mỗi Teacher có một kho `DEFAULT` tên **Tài liệu tải lên**; upload không chọn kho khác tự vào kho này. |
| TCH-FR-005 | Teacher tạo kho theo môn/kho riêng và chỉ xem nội dung sau khi mở route chi tiết của kho. |
| TCH-FR-006 | Teacher upload PDF có text layer hoặc PPTX; Java chuyển PPTX thành PDF và kiểm tra text layer trước khi lưu/index. |
| TCH-FR-007 | Owner public/revoke PDF vào Course Offering mình sở hữu mà không sao chép tệp gốc. |
| TCH-FR-008 | Teacher xóa học liệu gốc bằng luồng thu hồi publication, deindex, bỏ liên kết kho và xóa object an toàn. |
| TCH-FR-009 | AI Quiz Studio cho phép chọn 1–10 `SLIDE_PDF` `READY` đã công bố trong lớp, rồi chọn số câu, độ khó, chủ đề và page range. |
| TCH-FR-010 | Teacher review/sửa Quiz AI trước khi publish; AI không tự publish/chấm. |
| TCH-FR-011 | Teacher gắn Quiz `PUBLISHED` thành Assignment của đúng lớp, đặt hạn và công bố cho Student. |
| TCH-FR-012 | Teacher xem số đã nộp/chưa nộp, đúng hạn/nộp muộn, điểm từng Student và tỷ lệ sai từng câu. |
| TCH-BR-001 | Teacher không có Personal Chatbot hoặc Course Material AI Tutor. |

## 2. API Course Offering/content

- `POST /api/v1/teacher/course-offerings`: `{subjectId,semesterId,code?,name?}` → lớp `ACTIVE` + join code.
- `GET/PATCH /api/v1/teacher/course-offerings/{id}`: owner-only.
- `POST /api/v1/teacher/course-offerings/{id}/join-code/regenerate` và `PATCH .../join-code`.
- `GET /api/v1/teacher/course-offerings/{id}/enrollments`.
- `POST /api/v1/teacher/enrollments/{id}/approve|reject`.
- `GET /api/v1/teacher/resource-libraries`: trả các thẻ kho và bảo đảm đúng một kho `DEFAULT` tên **Tài liệu tải lên**.
- `POST /api/v1/teacher/resource-libraries`: tạo kho theo môn hoặc kho riêng; nội dung chỉ hiện sau khi mở `/teacher/documents/libraries/{libraryId}`.
- `DELETE /api/v1/teacher/resource-libraries/{libraryId}`: xóa cách phân loại, không xóa tài nguyên gốc; kho `DEFAULT` không thể xóa.
- `POST /api/v1/teacher/documents`: multipart PDF/PPTX ≤20 MiB, nhận `libraryId?`; Java chuẩn hóa thành PDF → processing status. Bỏ `libraryId` thì tự vào kho `DEFAULT`.
- `POST /api/v1/teacher/documents/{id}/publications`: `{courseOfferingIds}` owner-only.
- `DELETE /api/v1/teacher/documents/{id}/publications?offeringId=...`: revoke idempotent.
- `DELETE /api/v1/teacher/documents/{id}`: deindex `SLIDE_PDF`, thu hồi publication, bỏ liên kết kho, xóa mềm metadata rồi xóa object an toàn.

## 3. Teacher AI Quiz API

### Generate

`POST /api/v1/teacher/quizzes/generations`

- Input `{documentIds:[1..10],courseOfferingId,questionCount:1..30,difficulty,topic?,pageFrom,pageTo,instruction?}`.
- Preconditions: current Teacher sở hữu Course Offering; mọi nguồn là `SLIDE_PDF` `READY` đã công bố trong đúng lớp; page range hợp lệ.
- Output `200 QuizDraft` với `REVIEW_REQUIRED`; bắt buộc `Idempotency-Key`.
- Errors: `404`; `409 DOCUMENT_NOT_READY|GENERATION_IN_PROGRESS`; `422 INVALID_PAGE_RANGE|INVALID_QUESTION_COUNT|INVALID_DOCUMENT_SELECTION`.

### Review/publish

- `GET /api/v1/review/quizzes/{quizId}`: owner-only draft/status.
- Màn review cho phép kiểm tra bản nháp và chỉ gửi thay đổi qua contract review được Java cho phép; Java revalidate toàn bộ trước khi công bố.
- `POST /api/v1/teacher/quizzes/{quizId}/publish`: Java validate toàn bộ draft rồi chuyển `PUBLISHED`.
- `POST /api/v1/review/quizzes/{quizId}/reject`: chuyển `REJECTED`, giữ audit.

## 4. Gắn Quiz thành Assignment và xem kết quả

- `POST /api/v1/teacher/course-offerings/{offeringId}/assignments`: `{title,description,dueAt,type:"QUIZ",quizId}` → Assignment `DRAFT`; Quiz phải `PUBLISHED` trong đúng lớp.
- `POST /api/v1/teacher/assignments/{assignmentId}/publish`: công bố Assignment cho Student `APPROVED`.
- `GET /api/v1/teacher/course-offerings/{offeringId}/assignments`: danh sách bài của lớp.
- `GET /api/v1/teacher/assignments/{assignmentId}/submissions`: tổng hợp đã nộp, đúng hạn, nộp muộn, chưa nộp, điểm và tỷ lệ sai từng câu.
- `GET /api/v1/teacher/assignments/{assignmentId}/submissions/{studentId}/quiz-attempt`: chi tiết lượt làm hiện tại.

Quiz Teacher không xuất hiện như Quiz tự luyện của Student. Student chỉ bắt đầu và nộp Quiz lớp qua Assignment; Java tạo attempt và chấm điểm.

## 5. Acceptance

- Teacher không sửa/public/tạo Quiz từ tài nguyên Teacher khác.
- Upload DOCX/PDF scan bị từ chối; PPTX lỗi, PDF mã hóa hoặc PDF đầu ra không có text layer trả safe error và không tạo object/metadata.
- Upload không chỉ định kho luôn xuất hiện trong **Tài liệu tải lên**; kho mặc định không thể xóa.
- Danh sách kho chỉ hiển thị thẻ; tài nguyên và hành động chỉ hiện trong route chi tiết của kho.
- Một PDF public nhiều lớp không nhân bản object/index.
- Quiz chỉ dùng 1–10 nguồn đã chọn và page trong authorized scope, đúng 4 options và một đáp án đúng.
- Prompt injection trong PDF/instructions không đổi schema/scope.
- Teacher phải review/publish; AI không tự tạo attempt hoặc score.
- Assignment Quiz chỉ dùng Quiz đã công bố trong đúng lớp; thống kê không đếm lặp attempt cũ.
- Teacher UI không hiển thị chatbot/Tutor.
