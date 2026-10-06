# KẾ HOẠCH ĐỒ ÁN TỐT NGHIỆP — STUDYFLOW MVP V2

**Trạng thái:** Phương án hiện hành  
**Thay thế:** `Ke_hoach_do_an_tot_nghiep_chot_flow_MVP_v1.md`

## 1. Mục tiêu

StudyFlow là nền tảng hỗ trợ học và ôn luyện theo Course Offering. Hệ thống quản lý học liệu PDF, hỏi đáp/tóm tắt có căn cứ, sinh Quiz và theo dõi hoạt động học tập; Java Backend kiểm soát toàn bộ quyền và luật nghiệp vụ.

## 2. Kiến trúc

```text
Next.js Web → Java Spring Boot → Python FastAPI
                          ├→ PostgreSQL schema app
                          ├→ Object Storage
                          └→ Python → pgvector schema ai → OpenRouter
```

- Browser chỉ gọi Java.
- Java sở hữu auth/RBAC, Course Offering/Enrollment, Quiz lifecycle/scoring, progress/Streak/Daily Goal và Plan.
- Python xử lý PDF, embedding, retrieval, Single Agent, Tutor, Quiz generation, citation và evaluation.

## 3. Phạm vi vai trò

### Student

- Join Course Offering và chờ Teacher approve.
- Xem Course Material PDF, ghi Note theo trang và dùng Course Material AI Tutor.
- Upload Personal PDF và dùng Trợ lý tài liệu cho ba tác vụ: hỏi đáp, tóm tắt, tạo Quiz.
- Review/accept Quiz cá nhân, làm bài, xem câu sai/page source.
- Xem Dashboard và tự quản lý Kế hoạch & Lịch.

### Teacher

- Tạo Course Offering, join code và duyệt enrollment.
- Upload/public/revoke Course Material PDF.
- Sinh Quiz AI từ PDF với số câu tùy chọn, độ khó, chủ đề và khoảng trang; review/sửa trước publish.
- Không có Personal Chatbot và không có AI Tutor.

### Admin

- Quản lý user/role, Subject/Semester, monitoring, feedback, audit và settings.
- Không mặc định đọc Personal PDF/chat/Note/Quiz result và không tạo Quiz thay Teacher.

## 4. AI đã chốt

### Personal Document Assistant

Dùng một Single Orchestrator Agent với ba tool schema:

```text
ask_document
summarize_document
generate_quiz
```

Agent hỏi lại khi thiếu tham số (`NEEDS_CLARIFICATION`), từ chối khi thiếu evidence (`NO_EVIDENCE`) và không được mở rộng authorized scope.

### Course Material AI Tutor

Chỉ Student `APPROVED` sử dụng trên Course Material PDF đã public. Retrieval ưu tiên trang hiện tại và citation theo `documentId + pageNumber + excerpt`.

### AI Quiz Generator

- `PERSONAL_STUDENT`: gọi qua tool của Personal Assistant; Student review/accept.
- `COURSE_TEACHER`: gọi qua form Teacher AI Quiz Studio; Teacher review/edit/publish.
- `MCQ_SINGLE`, đúng 4 options, một đáp án đúng, explanation và page citation.
- AI không chấm điểm hoặc tự publish.

## 5. Tài liệu và tiến độ

- Chỉ PDF có text layer; không nhận PPTX/DOCX và không OCR trong MVP.
- Course Material PDF có Viewer/Page Note/Tutor/page progress.
- Personal PDF chỉ thuộc owner và không tạo progress lớp.
- Streak chỉ tính `VIEW_PAGE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED`.
- Daily Goal gồm Page/Quiz Question/Task; Java tính actual theo local date.
- Không có Progress route riêng, Topic Mastery, recommendation tự động hoặc gamification.

## 6. Nguồn tài liệu chuẩn

Khi có khác biệt, ưu tiên theo thứ tự:

1. `AGENTS.md` — boundary và quy tắc bắt buộc.
2. `docs/specification.md` — phạm vi nghiệp vụ.
3. `docs/api-plan.md` và `docs/database-plan.md` — contract/schema.
4. `docs/ai-implementation-plan.md`, `frontend-implementation-plan.md`, `backend-implementation-plan.md` — kế hoạch triển khai.
5. Chương 1–3 và diagrams — nội dung báo cáo trình bày từ các nguồn trên.

Các file có nhãn `SUPERSEDED` chỉ dùng để đối chiếu lịch sử, không dùng triển khai.
