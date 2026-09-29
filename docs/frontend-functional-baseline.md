# Baseline chức năng và giao diện Frontend StudyFlow

## 1. Quy tắc chốt

- `apps/web/mvp.html` là chuẩn tham chiếu cho tên chức năng, điều hướng, bố cục, thành phần và luồng thao tác của FE thật.
- `docs/specification.md`, `docs/api-plan.md` và `AGENTS.md` là chuẩn cho nghiệp vụ, dữ liệu, phân quyền và service boundary.
- Khi mock xung đột với nghiệp vụ, FE giữ giao diện gần mock nhưng phải tuân thủ contract và phân quyền; không thêm hành vi giả production.
- FE thật dùng Next.js trong `apps/web/src/**`; `mvp.html` chỉ là prototype và fixture demo.
- Daily Goal/Study Streak/progress nằm trên Dashboard. `Kế hoạch & Lịch` chỉ quản lý kế hoạch, task và lịch tuần.

## 2. Student

| Điều hướng | Route FE thật | Chức năng chốt theo mock |
|---|---|---|
| Tổng quan | `/dashboard` | Tiếp tục học, thống kê tổng quan, progress từng Course Offering, Study Streak, Daily Goal, Quiz cần duyệt và công việc gần nhất |
| Lớp học phần | `/course-offerings` | Join code, trạng thái enrollment, vào học liệu của lớp `APPROVED` |
| Tài liệu cá nhân | `/personal-documents` | Upload/quản lý Personal PDF và mở workspace Hỏi đáp AI tại `/chat` |
| Kế hoạch & Lịch | `/plan` | Lịch tuần Thứ 2–Chủ nhật theo khung giờ, chuyển tuần, bấm ô trống để thêm lịch, thêm task và cập nhật trạng thái task |
| Ôn tập | `/review` | Chọn Course Offering/Quiz cá nhân, tạo Quiz bằng prompt riêng, review draft, làm Quiz, xem attempt và câu sai kèm nguồn |

Các màn phụ gồm `/materials`, `/materials/{documentId}/viewer`, `/chat`, `/quiz/create` và `/review/{courseId}`. Chúng được mở từ workspace chính, không bắt buộc xuất hiện thành mục menu riêng.

## 3. Teacher

| Điều hướng | Route FE thật | Chức năng chốt theo mock |
|---|---|---|
| Tổng quan | `/teacher/dashboard` | Tổng hợp lớp active, yêu cầu tham gia, tài liệu và processing |
| Lớp học phần của tôi | `/teacher/course-offerings` | Tạo Course Offering, quản lý join code, khóa/mở và archive lớp sở hữu |
| Yêu cầu tham gia | `/teacher/enrollments` | Approve/reject enrollment `PENDING`, xem danh sách approved |
| Kho tài liệu & Public | `/teacher/documents` | Upload PDF/PPTX, theo dõi xử lý, public/revoke vào Course Offering sở hữu |

Mock tách “Kho tài liệu” và “Public & Quản lý” thành hai mục; FE thật gộp vào một workspace để tránh lặp dữ liệu và vẫn giữ đủ hai nhóm chức năng.

## 4. Admin

| Điều hướng | Route FE thật | Chức năng chốt theo mock |
|---|---|---|
| Tổng quan hệ thống | `/admin/dashboard` | Chỉ số vận hành và giám sát Course Offering |
| Người dùng & Vai trò | `/admin/users` | Quản lý trạng thái tài khoản và role hợp lệ |
| Môn học & Học kỳ | `/admin/catalog` | Quản lý Subject/Semester chuẩn |
| Feedback & Reports | `/admin/feedback` | Tiếp nhận, lọc và xử lý phản hồi/báo cáo |
| Logs & Audit | `/admin/audit` | Nhật ký metadata, không hiển thị nội dung riêng tư |
| Cấu hình | `/admin/settings` | Cấu hình vận hành không chứa secret/model key phía browser |

Route `/admin/course-offerings` là màn chi tiết giám sát được mở từ Dashboard, không phải mục menu độc lập trong mock.

## 5. Trạng thái và responsive bắt buộc

- Sidebar desktop thu gọn/mở rộng; mobile dùng drawer.
- Mọi màn có loading, empty, error, forbidden và processing khi phù hợp.
- Modal/form hỗ trợ bàn phím, focus visible và nhãn truy cập.
- Bảng rộng như lịch tuần phải cuộn ngang an toàn ở màn hình nhỏ; phần header và hành động xếp dọc từ 360px.
- Fixture chỉ dùng trong demo mode và không được mô tả như dữ liệu production.

## 6. Ngoài phạm vi MVP

Không có Topic Mastery, recommendation tự động, XP, Level, Achievement, leaderboard, DOCX, OCR, Exam, Teacher Quiz hoặc gọi trực tiếp Python/OpenRouter từ browser.
