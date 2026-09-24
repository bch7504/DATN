# StudyFlow — Kế hoạch triển khai Frontend

**Người phụ trách:** Chủ dự án, thực hiện theo boundary `FRONTEND_AGENT`.
**Baseline nghiệp vụ:** Semester → Course Offering → Course Enrollment.

## 1. Nguyên tắc

- Next.js chỉ gọi Java `/api/v1`; không gọi Python, database, Object Storage hoặc OpenRouter.
- UI bám `apps/web/mvp.html`, dùng phong cách đỏ–trắng PTIT và logo đúng tỷ lệ.
- Production không tự tính điểm/progress/quyền; mọi dữ liệu nghiệp vụ nhận từ Java.
- Demo fixtures chỉ hoạt động khi `NEXT_PUBLIC_DEMO_MODE=true` và luôn hiện “Dữ liệu demo”.
- Responsive từ 360px, keyboard/focus visible, WCAG AA; mọi route có loading/empty/error/forbidden/processing.

## 2. Route và màn hình

### Student

- Dashboard: hoạt động gần đây, lịch, Content Progress.
- Course Offerings: nhập join code; danh sách `PENDING`, `APPROVED`, `ARCHIVED`; mở học liệu chỉ khi được phép.
- Materials: PPTX **Xem slide**; Teacher PDF **Tải PDF**.
- Slide Viewer: thumbnail, slide canvas, Note, Tutor bên phải, citation theo slide và `NO_EVIDENCE`.
- Personal Documents: upload PDF, trạng thái xử lý, chọn 1–10 nguồn `READY`.
- Chatbot: source panel, selected count, history/new conversation, suggested prompt, retrieval state, citation card theo claim và trace ID.
- Quiz/Progress/Plan: review draft trước khi làm; hiển thị dữ liệu Java tính; Calendar do Student chủ động.

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

Áp dụng các pattern phù hợp từ workspace hỏi đáp tài liệu tham khảo:

- evidence scope hiển thị rõ, chọn nhiều tài liệu và chỉ dùng nguồn `READY`;
- empty state có câu hỏi gợi ý; lịch sử và nút tạo cuộc trò chuyện mới;
- trạng thái “đang truy xuất/đối chiếu nguồn”;
- citation mở rộng hiển thị document, page/slide và excerpt;
- `NO_EVIDENCE` là trạng thái rõ, không giả câu trả lời.

Không đưa model/provider selector, Agent Trace, Supervisor/multi-agent hoặc gọi FastAPI trực tiếp vào FE. Quiz là workflow riêng do Java sở hữu.

## 4. Milestone

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| FE-M0 | Next.js/TS, API client, env validation | Build/lint/test đạt |
| FE-M1 | PTIT shell, auth/session, role guard, component states | Responsive 3 role; không lộ key |
| FE-M2 | Course Offering/Enrollment cho 3 role | Create/join/approve/monitor đúng quyền |
| FE-M3 | Materials, Viewer, Note và Personal Documents | Policy PPTX/PDF đúng |
| FE-M4 | Personal Chat + Slide Tutor UX | History/scope/citation/NO_EVIDENCE đủ trạng thái |
| FE-M5 | Quiz, Progress, Plan/Calendar | Client không chấm hoặc suy luận progress |
| FE-M6 | Accessibility/E2E/hardening | Demo flow và negative paths đạt |

## 5. Kiểm thử

- Route guard và navigation theo role.
- Join code/enrollment state; `PENDING` không mở materials.
- Teacher chỉ thao tác lớp mình sở hữu; Admin UI không còn assignment.
- Upload policy: Teacher PDF/PPTX, Personal PDF; trạng thái error/processing.
- PPTX viewer/no-download; Teacher PDF download-only.
- Chat source selection/history/retrieval/citation/`NO_EVIDENCE`; không có model selector hoặc direct AI URL.
- Quiz `GENERATING → REVIEW_REQUIRED`; không có scoring/progress formula trong client.
- 360px, keyboard, focus, contrast và loading/empty/error/forbidden.

## 6. Bàn giao

Mỗi mốc ghi file đổi, command kiểm tra và public API phụ thuộc. Contract thiếu phải cập nhật `docs/api-plan.md`, không tạo mock giả production. Kế hoạch AI tách riêng tại [ai-implementation-plan.md](ai-implementation-plan.md).
