# StudyFlow — Kế hoạch triển khai Frontend

**Người phụ trách:** Chủ dự án, thực hiện theo boundary `FRONTEND_AGENT`.
**Baseline nghiệp vụ:** Semester → Course Offering → Course Enrollment.
**Trạng thái:** đã có scaffold Next.js và các màn hình demo đang được đồng bộ theo Flow MVP mới; chưa kết nối Java Backend production.

## 1. Nguyên tắc

- Next.js chỉ gọi Java `/api/v1`; không gọi Python, database, Object Storage hoặc OpenRouter.
- FE thật trong `apps/web/src/**` là baseline giao diện đã chốt, sử dụng hệ nhận diện PTIT:
  - Typography: `Be Vietnam Pro` (body text) và `Manrope` (display/heading).
  - Bảng màu: Đỏ thắm PTIT (`#d71920`, `#a80f18`, nền `#fff1f2`), Vàng PTIT (`#f4c300`, `#b89c0e`), Neutral slate (`#0f172a`, `#475569`, `#f8fafc`).
  - Biểu trưng PTIT (huy hiệu chính quy với bông lúa, bánh răng, ngọn đuốc, sách mở, cờ đỏ sao vàng) chuẩn tỷ lệ 1:1.
- Production không tự tính điểm/progress/quyền; mọi dữ liệu nghiệp vụ nhận từ Java.
- Demo fixtures chỉ hoạt động khi `NEXT_PUBLIC_DEMO_MODE=true` và luôn hiện “Dữ liệu demo”.
- Responsive từ 360px, keyboard/focus visible, WCAG AA; mọi route có loading/empty/error/forbidden/processing.
- `docs/specification.md`, `docs/api-plan.md` và `AGENTS.md` quyết định nghiệp vụ, dữ liệu, phân quyền và service boundary. UI không được tạo hành vi giả production khi API chưa có.

## 2. Route và màn hình

### Ma trận điều hướng đã chốt

| Vai trò | Điều hướng | Route | Chức năng chính |
|---|---|---|---|
| Student | Tổng quan | `/dashboard` | Progress từng Course Offering, Study Streak, Daily Goal, Quiz và công việc gần nhất |
| Student | Lớp học phần | `/course-offerings` | Join code, trạng thái enrollment và mở học liệu khi `APPROVED` |
| Student | Tài liệu cá nhân | `/personal-documents` | Upload/quản lý Personal PDF và mở Hỏi đáp AI tại `/chat` |
| Student | Kế hoạch & Lịch | `/plan` | Lịch tuần, khung giờ, thêm lịch, thêm task và cập nhật trạng thái task |
| Student | Ôn tập | `/review` | Quiz theo Course Offering/cá nhân, attempt, câu sai và nguồn |
| Teacher | Tổng quan | `/teacher/dashboard` | Lớp active, yêu cầu tham gia và trạng thái tài liệu |
| Teacher | Lớp học phần của tôi | `/teacher/course-offerings` | Tạo lớp, join code, khóa/mở và archive |
| Teacher | Yêu cầu tham gia | `/teacher/enrollments` | Approve/reject enrollment và xem danh sách approved |
| Teacher | Kho tài liệu & Public | `/teacher/documents` | Upload PDF/PPTX, processing, public/revoke |
| Admin | Tổng quan hệ thống | `/admin/dashboard` | Chỉ số vận hành và giám sát Course Offering |
| Admin | Người dùng & Vai trò | `/admin/users` | Trạng thái tài khoản và role |
| Admin | Môn học & Học kỳ | `/admin/catalog` | Subject/Semester chuẩn |
| Admin | Feedback & Reports | `/admin/feedback` | Phản hồi và báo cáo |
| Admin | Logs & Audit | `/admin/audit` | Audit metadata, không hiển thị nội dung riêng tư |
| Admin | Cấu hình | `/admin/settings` | Cấu hình vận hành, không chứa secret phía browser |

Các route `/materials`, `/materials/{documentId}/viewer`, `/chat`, `/quiz/create`, `/review/{courseId}` và `/admin/course-offerings` là màn phụ được mở từ workspace chính, không bắt buộc xuất hiện thành mục sidebar riêng. Kho tài liệu và Publication của Teacher được gộp trong một workspace để tránh lặp dữ liệu.

### Student

- Dashboard: Course Offering đang học, deadline, đầy đủ viewing progress theo từng lớp, Quiz/Task, Study Streak và Daily Goal.
- Daily Goal editor: target Slide/câu Quiz/Study Task; chỉ gửi target, không tự tính actual hoặc Streak.
- Course Offerings: nhập join code; danh sách `PENDING`, `APPROVED`, `ARCHIVED`; mở học liệu khi được phép, không có màn tiến độ riêng.
- Materials: PPTX **Xem slide**; Teacher PDF **Tải PDF**.
- Slide Viewer: thumbnail, slide canvas, Note, Tutor bên phải, citation theo slide và `NO_EVIDENCE`.
- Personal Documents: upload PDF, trạng thái xử lý, chọn 1–10 nguồn `READY`.
- Chatbot (Personal RAG):
  - Bố cục workspace 2 cột: Chatbot ở bên **trái** (linh hoạt, tối đa không gian đọc/soạn tin); Cột chọn tài liệu nguồn PDF cá nhân được tinh gọn ở bên **phải** (~280px) với tìm kiếm, toggle chọn tất cả / bỏ chọn, badge trạng thái `READY`/`PROCESSING`.
  - Thanh phiên trò chuyện (Session Bar) đặt ở đầu (header) bên trong khung chatbot, cho phép chuyển đổi nhanh các phiên trò chuyện hoặc bấm `+ Phiên mới`.
  - In-Chat Citation Inspector: Nhấn trực tiếp vào chip trích dẫn trong tin nhắn để mở **Drawer trích dẫn tương tác** trượt ngay bên trong khung chatbot, hiển thị trích đoạn chi tiết, số trang, tên tài liệu và mã đối chiếu grounding SHA-256.
- Tạo Quiz: luồng riêng không phụ thuộc Chatbot; chọn Personal Documents `READY`, nhập prompt trống theo ý Student, theo dõi `GENERATING`, review/regenerate toàn bộ draft.
- Accept Quiz: chọn Course Offering có enrollment `APPROVED` hoặc Quiz cá nhân; UI không trộn nguồn sinh với nơi ôn tập.
- Ôn tập (Review Hub): Cấu trúc 2 tầng:
  - **Level 1 (Course Picker):** Course Offering có enrollment `APPROVED` và nhóm Quiz cá nhân (`PERSONAL`), kèm số Quiz, điểm trung bình và số nội dung cần ôn lại.
  - **Level 2 (Course Workspace):** Tổng quan ôn tập, danh sách Quiz `READY`, lịch sử attempt không ghi đè, nội dung cần ôn tổng hợp từ câu sai và link mở nguồn trang/slide.
  - Không hiển thị viewing progress hoặc nhật ký học trong Review Hub; toàn bộ tiến độ tổng quan và theo Course Offering nằm trên Dashboard.
- Kế hoạch & Lịch (`/plan`): lịch tuần Thứ 2–Chủ nhật theo khung giờ, chuyển tuần, bấm ô trống/thêm lịch, thêm task ôn tập và cập nhật trạng thái task. Không hiển thị Daily Goal, Streak hoặc progress trong màn này vì các số liệu đó thuộc Dashboard.
- Không tạo nav/route/màn `Progress` riêng; Dashboard hiển thị cả aggregate và tiến độ từng Course Offering.

### Teacher

- Dashboard: lớp active, request chờ duyệt, tài liệu/processing.
- Course Offerings: form tạo từ Subject + Semester, join code copy/regenerate/enable/disable, archive.
- Enrollments: xem `PENDING`, approve/reject; danh sách approved read-only.
- Library/publications: upload PDF/PPTX, trạng thái, public/revoke chỉ vào lớp mình sở hữu.

### Admin

- User/Role; Subject; Semester.
- Giám sát Course Offering theo Teacher/Subject/Semester/status; lock/archive khi cần.
- Feedback, audit và settings. Không phân công từng lớp, không quản Quiz/Progress cá nhân.

## 3. Chatbot UX tham khảo

Áp dụng các pattern đã chốt trong FE thật:

- Bố cục 2 cột: Khung Chatbot chiếm phần lớn diện tích bên trái; Cột chọn tài liệu nguồn PDF thu gọn bên phải (~280px).
- Quản lý phiên hội thoại ngay đầu khung chat: Tabs chuyển đổi nhanh giữa các phiên thảo luận và nút tạo phiên mới đặt ở header của chatbot.
- Evidence scope rõ ràng: Chỉ cho phép chọn tài liệu trạng thái `READY`, hỗ trợ tìm kiếm nhanh, nút chọn tất cả / bỏ chọn và hiển thị badge đếm số nguồn đang áp dụng.
- Empty state có câu hỏi gợi ý; composer hỗ trợ phím Enter để gửi và Shift+Enter để xuống dòng.
- Trạng thái “Đang truy xuất và đối chiếu nguồn...” hiển thị trực quan trong khi chờ phản hồi.
- In-Chat Citation Drawer: Click trực tiếp vào chip trích dẫn trong bubble câu trả lời để mở drawer chi tiết ngay trong khung chat, hiển thị trích đoạn (excerpt), tên tài liệu, số trang và mã đối chiếu SHA-256.
- `NO_EVIDENCE` là trạng thái rõ, không giả tạo câu trả lời khi thiếu căn cứ.

Không đưa model/provider selector, Agent Trace, Supervisor/multi-agent hoặc gọi FastAPI trực tiếp vào FE. Quiz là workflow riêng do Java sở hữu.

## 4. Milestone

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| FE-M0 | Next.js/TS, API client, env validation | Build/lint/test đạt |
| FE-M1 | PTIT shell (font Be Vietnam Pro + Manrope, màu đỏ-trắng-vàng PTIT, logo SVG), auth/session, role guard, component states | Responsive 3 role; không lộ key |
| FE-M2 | Course Offering/Enrollment cho 3 role | Create/join/approve/monitor đúng quyền |
| FE-M3 | Materials, Viewer, Note và Personal Documents | Policy PPTX/PDF đúng |
| FE-M4 | Personal Chat 2 cột (Chat bên trái + Session bar header, Source compact bên phải, In-chat Citation Drawer) + Slide Tutor UX | History/scope/citation/NO_EVIDENCE đủ trạng thái |
| FE-M5 | Quiz prompt/review/destination, Ôn tập 2 tầng theo môn, Dashboard chứa toàn bộ progress/Streak/Daily Goal, Kế hoạch & Lịch tuần theo mock | Client không tính Streak/actual/điểm/progress/review inference; `/plan` không lặp Daily Goal |
| FE-M6 | Accessibility/E2E/hardening | Demo flow và negative paths đạt |

## 5. Kiểm thử

- Route guard và navigation theo role.
- Join code/enrollment state; `PENDING` không mở materials.
- Teacher chỉ thao tác lớp mình sở hữu; Admin UI không còn assignment.
- Upload policy: Teacher PDF/PPTX, Personal PDF; trạng thái error/processing.
- PPTX viewer/no-download; Teacher PDF download-only.
- Chatbot Personal RAG: Bố cục 2 cột (Chat bên trái, chọn tài liệu bên phải ~280px); thanh phiên hội thoại ở header chuyển đúng conversation; click citation mở In-Chat Drawer với excerpt, page và SHA-256 grounding; trạng thái loading/`NO_EVIDENCE`; không có model selector hoặc direct AI URL.
- Quiz prompt tự do `GENERATING → REVIEW_REQUIRED`; regenerate toàn bộ; accept bắt buộc destination hợp lệ; không có scoring/progress formula trong client.
- Ôn tập: Level 1 chỉ liệt kê Course Offering được phép và Quiz cá nhân; Level 2 chỉ chứa Quiz, attempt history và nội dung cần ôn từ câu sai kèm link nguồn. Không lặp viewing progress của Dashboard và không suy luận “yếu/mạnh” ở client.
- Dashboard không có menu Progress riêng; hiển thị `currentStreak`, `longestStreak`, activity week và ba Daily Goal progress từ Java.
- PUT Daily Goal chỉ gửi target hợp lệ; UI không coi hoàn thành 100% goal là điều kiện giữ Streak.
- Kế hoạch & Lịch có đủ chuyển tuần, thêm lịch, thêm task, click ô trống và trạng thái task; bảng cuộn ngang an toàn ở mobile.
- Không có XP, Level, Achievement, badge hoặc leaderboard trong UI MVP.
- 360px, keyboard, focus, contrast và loading/empty/error/forbidden.

## 6. Bàn giao

Mỗi mốc ghi file đổi, command kiểm tra và public API phụ thuộc. Contract thiếu phải cập nhật `docs/api-plan.md`, không tạo mock giả production. Kế hoạch AI tách riêng tại [ai-implementation-plan.md](ai-implementation-plan.md).
