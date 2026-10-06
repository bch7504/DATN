# StudyFlow — Kế hoạch triển khai Frontend

**Người phụ trách:** Chủ dự án, thực hiện theo boundary `FRONTEND_AGENT`.
**Trạng thái:** Next.js demo đã được thiết kế lại theo phương án PDF + Single Agent; chưa kết nối đầy đủ Java Backend production.

## 1. Nguyên tắc

- Next.js chỉ gọi Java `/api/v1`; không gọi Python, database, Object Storage hoặc OpenRouter.
- Production không tự tính score, progress, Streak, quyền hoặc Quiz lifecycle.
- Fixture chỉ hoạt động khi `NEXT_PUBLIC_DEMO_MODE=true` và phải hiện “Dữ liệu demo”.
- Giao diện PTIT đỏ–trắng, responsive từ 360px, keyboard/focus visible và đủ loading/empty/error/forbidden/processing.
- `AGENTS.md`, `specification.md` và `api-plan.md` là nguồn nghiệp vụ chuẩn; không tạo workflow production khi contract chưa có.

## 2. Route và chức năng đã chốt

| Vai trò | Route | Chức năng |
|---|---|---|
| Student | `/dashboard` | Toàn bộ progress, Daily Goal theo page/Quiz/task và Study Streak |
| Student | `/course-offerings` | Join code, enrollment, mở Course Material PDF |
| Student | `/materials/{documentId}/viewer` | PDF Viewer, Note theo trang và Course Material AI Tutor |
| Student | `/personal-documents` | Mặc định là kho PDF; bấm **Hỏi đáp tài liệu cá nhân** mới mở khu vực AI, có nút quay lại kho |
| Student | `/quiz/create` | Form sinh đề riêng từ Personal PDF + prompt; xem bản nháp và chọn nơi lưu khi accept, không chuyển sang chatbot |
| Student | `/review` | Quiz theo lớp/cá nhân, attempt và nội dung cần ôn từ câu sai |
| Student | `/plan` | Kế hoạch & Lịch tuần theo FE mock |
| Teacher | `/teacher/course-offerings` | Tạo/quản lý lớp và join code |
| Teacher | `/teacher/enrollments` | Approve/reject enrollment |
| Teacher | `/teacher/documents` | Upload/public Course Material PDF và mở AI Quiz Studio |
| Teacher | `/teacher/quizzes/create` | Chọn PDF, trang, số câu, độ khó, chủ đề để tạo Quiz draft |
| Admin | `/admin/*` | User/role, catalog, monitoring, feedback, audit và settings |

Chỉ `/chat` giữ redirect tương thích tới `/personal-documents#personal-ai-assistant`. `/quiz/create` là form độc lập thuộc luồng Ôn tập; sidebar không có mục Trợ lý tài liệu độc lập.

## 3. Student UX

### 3.1 Course Material PDF

- Chỉ hiển thị Course Material PDF `READY` đã public cho Course Offering mà Student có enrollment `APPROVED`.
- Viewer gồm thumbnail trang, vùng đọc PDF và panel Note/AI Tutor.
- Note gắn `student + document + pageNumber`.
- Tutor ưu tiên trang hiện tại, citation theo trang và hiển thị `NO_EVIDENCE` khi thiếu căn cứ.
- Daily Goal dùng `targetPages/actualPages`; learning event tương ứng là `VIEW_PAGE`.

### 3.2 Personal Document Assistant

- Chỉ mở khi bấm **Hỏi đáp tài liệu cá nhân** trong kho; không render sẵn chat dưới danh sách PDF.
- **Quay lại kho tài liệu** đóng khu vực hỏi đáp; phiên được lưu bởi Java và tải lại khi mở.
- Bố cục 2 cột: hội thoại bên trái, nguồn Personal PDF bên phải.
- Một composer nhận prompt tự nhiên và hiển thị capability đã chọn:
  - `ASK_DOCUMENT` — hỏi đáp có citation;
  - `SUMMARIZE_DOCUMENT` — tóm tắt có citation;
  - `CREATE_QUIZ` — tạo Quiz draft;
  - `NEEDS_CLARIFICATION` — hỏi lại tham số còn thiếu.
- Source selector chỉ cho chọn 1–10 Personal PDF `READY`.
- Citation drawer hiển thị document, page, excerpt và hash nếu contract trả về.
- Quiz tạo thành công hiển thị card `REVIEW_REQUIRED` và link sang Review Hub; FE không chấm điểm.

### 3.3 Review, Dashboard và Plan

- Review Hub không lặp progress; nội dung cần ôn chỉ lấy từ answer sai và page citation.
- Dashboard là nơi duy nhất hiển thị aggregate và progress từng Course Offering.
- Study Streak chỉ phản ánh dữ liệu Java đã tính từ `VIEW_PAGE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED`.
- `/plan` giữ lịch tuần Thứ 2–Chủ nhật, thêm lịch/task, chuyển tuần và hoàn tất task như FE mock; không có AI recommendation tự động.

## 4. Teacher UX

### 4.1 Course Material PDF

- Upload chỉ nhận PDF có text layer; không nhận PPTX/DOCX/PDF scan.
- Card hiển thị processing status, số trang, publication và hai CTA: `Công bố`, `Tạo Quiz bằng AI`.
- Teacher không có Personal Chatbot hoặc AI Tutor.

### 4.2 AI Quiz Studio

- Form chọn một PDF `READY`, Course Offering sở hữu, số câu 5–30, độ khó, chủ đề, khoảng trang và yêu cầu bổ sung.
- Sidebar nhắc các invariant: `MCQ_SINGLE`, đúng 4 options, một đáp án đúng, page citation và Teacher phải duyệt.
- Production gửi Java; khi contract chưa triển khai, không gọi Python trực tiếp. Demo phải ghi rõ fixture.
- Luồng kế tiếp: `GENERATING → REVIEW_REQUIRED → Teacher review/edit → PUBLISHED|REJECTED`.

## 5. Component và trạng thái

- Chuẩn hóa AppShell, Button, Form, Modal, Drawer, Card, Tabs, StatusBadge, CitationCard, Toast, Skeleton, EmptyState và ErrorState.
- CTA chính màu đỏ PTIT; secondary action dùng outline đỏ hoặc neutral theo ngữ nghĩa.
- Không dùng hover làm dịch chuyển/kéo giãn phần tử; focus visible phải rõ.
- Trạng thái bắt buộc:
  - PDF: uploading, processing, ready, failed, forbidden;
  - Assistant: routing, retrieving, answering, summarizing, clarification, quiz created, no evidence;
  - Teacher Quiz: invalid scope/range, generating, review required, publish failure/success.

## 6. Milestone

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| FE-M0 | Next.js/TS, API client, env validation | Build/lint/test đạt |
| FE-M1 | PTIT shell, auth/session, role guard, responsive component states | Ba role dùng được, không lộ key |
| FE-M2 | Course Offering/Enrollment | Create/join/approve/monitor đúng quyền |
| FE-M3 | PDF Library, Viewer, page Note và Personal Documents | PDF-only policy và scope đạt |
| FE-M4 | Personal Assistant + Student Course Material Tutor | Ba tool, clarification, citation và `NO_EVIDENCE` đủ trạng thái |
| FE-M5 | Student/Teacher Quiz UX, Review, Dashboard, Plan | Client không sở hữu rule/scoring/progress |
| FE-M6 | Accessibility/E2E/hardening | Demo flow và negative paths đạt |

## 7. Kiểm thử

- Role guard/navigation; Student không thấy Teacher AI Quiz Studio.
- Teacher/Personal upload từ chối PPTX/DOCX và file vượt giới hạn.
- Enrollment/publication/page scope cho PDF Viewer, Note và Tutor.
- Assistant route đúng ask/summary/quiz, hỏi lại khi thiếu tham số, citation đúng source và không có direct AI URL.
- Teacher Quiz chỉ dùng PDF/Course Offering sở hữu; page range và count hợp lệ; không tự publish.
- Quiz review/attempt/scoring không được tính ở client.
- Daily Goal payload chỉ gửi target Page/Quiz/Task; Review Hub không lặp progress.
- Responsive 360px, bàn phím, focus, contrast và các trạng thái lỗi.

Kế hoạch AI chi tiết tại [ai-implementation-plan.md](ai-implementation-plan.md). Toàn bộ khung màn hình, modal, điều hướng và quy tắc cập nhật nằm tại [ui-design.md](ui-design.md).
