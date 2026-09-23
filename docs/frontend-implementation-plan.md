# StudyFlow — Kế hoạch triển khai Frontend

**Người phụ trách:** Chủ dự án, đồng thời phụ trách AI nhưng thực hiện theo boundary `FRONTEND_AGENT` trong `AGENTS.md`.

> **Trạng thái 23/09/2026:** FE-M0 và FE-M1 đã hoàn thành, lint/test/build đạt. Dừng trước FE-M2 theo phạm vi hiện tại.

## 1. Mục tiêu và boundary

- Xây dựng Next.js Web cho Student, Teacher và Admin.
- Luồng chức năng bám theo `apps/web/mvp.html`, giao diện thiết kế lại theo nhận diện đỏ–trắng PTIT.
- Chỉ gọi public Java API tại `/api/v1`.
- Không gọi Python, OpenRouter, pgvector, database hoặc Object Storage trực tiếp.
- Không tính progress, không chấm Quiz và không tự tạo authorized document scope ở client.
- Không triển khai DOCX, Exam, Topic Mastery, recommendation hoặc Teacher Quiz.

## 2. Nhận diện và design system

### Logo và màu sắc

- Asset logo chính thức đặt trong `apps/web/public/branding/` và hiển thị bằng `object-fit: contain`.
- Không đổi màu hoặc bóp méo logo; biểu tượng được đặt trong khung tròn viền đỏ để dùng thống nhất trên sidebar và trang đăng nhập.

```text
Primary red:       #D71920
Primary dark:      #A80F18
Primary soft:      #FFF1F2
Accent yellow:     #F4C300
Background:        #F8FAFC
Surface:           #FFFFFF
Main text:         #172033
Secondary text:    #64748B
Border:            #E5E7EB
```

### Component nền tảng

- App shell: sidebar desktop, drawer mobile, topbar, breadcrumb và profile menu.
- Button, FormField, Select, Modal, Drawer, Table, Card, Tabs và StatusBadge.
- CitationCard, Toast, Skeleton, EmptyState, ErrorState và ForbiddenState.
- Responsive từ 360px, focus visible, keyboard navigation và WCAG AA.
- Mọi dữ liệu fixture phải hiện nhãn **Dữ liệu demo**; production chỉ bật khi `NEXT_PUBLIC_DEMO_MODE=true`.

## 3. Màn hình và hành vi

### Auth

- Login, đăng ký Student, phục hồi session, logout và profile.
- Route guard theo `STUDENT`, `TEACHER`, `ADMIN` dựa trên session Java trả về.

### Student

- Dashboard: lớp/môn gần đây, tiến độ nội dung, lịch và Quiz gần nhất.
- Lớp & Môn: chỉ ClassSubject thuộc membership hiện tại.
- Materials: PPTX hiển thị trước PDF.
- Slide Viewer: thumbnail, slide hiện tại, Note, view event và Tutor bên phải; không có download PPTX.
- Teacher PDF: chỉ có action tải xuống, không Viewer/Note/Tutor.
- Personal Documents: chỉ nhận PDF tối đa 20 MB, hiển thị processing/error và cho chọn 1–10 tài liệu `READY`.
- Personal RAG: conversation, citation theo trang và trạng thái `NO_EVIDENCE`.
- Quiz: tạo từ conversation, polling `GENERATING`, review, accept/reject, attempt và result.
- Progress & Statistics: chỉ hiển thị số liệu Java trả về, không suy luận Topic Mastery.
- Study Plan & Calendar: bảng tuần, form item và xác nhận conflict khi Java trả `409`.

### Teacher

- Dashboard, ClassSubject được phân công và danh sách Student read-only.
- Library chỉ nhận PDF/PPTX tối đa 50 MB.
- Theo dõi processing/retry, public cho ClassSubject hợp lệ và revoke publication.

### Admin

- Dashboard, user/role/status, Class, Subject, membership và Teacher assignment.
- Feedback, audit log và typed system settings.
- Không có màn quản trị AI/vector hoặc xem Personal Document/chat/Quiz result của Student.

## 4. Public interface và cấu trúc code

- `src/lib/api-client.ts`: client duy nhất trỏ Java, xử lý cookie và error envelope.
- `src/types/`: typed DTO khớp `docs/api-plan.md`.
- `src/components/`: design system và app shell dùng chung.
- `src/app/(student)`, `src/app/teacher`, `src/app/admin`: route theo role.
- Upload dùng `FormData`; request JSON dùng `Content-Type: application/json`.
- Không chứa OpenRouter URL, model ID, API key hoặc internal Python route trong client bundle.

## 5. Milestone

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| FE-M0 | Scaffold Next.js, TypeScript, Tailwind, API client | Build/lint đạt, API base chỉ trỏ Java |
| FE-M1 | UI PTIT, app shell, component system, auth | Ba role có navigation responsive |
| FE-M2 | Student materials, Viewer, Note, Tutor và Personal Documents | Đúng action matrix PDF/PPTX |
| FE-M3 | Personal RAG, citation và Quiz flow | `NO_EVIDENCE` và Quiz state hiển thị đúng |
| FE-M4 | Progress, Plan, Calendar | Không tính nghiệp vụ tại client |
| FE-M5 | Teacher và Admin | Đúng boundary privacy và assignment |
| FE-M6 | Accessibility, E2E và demo hardening | Hoàn thành luồng `docs/demo-flow.md` |

## 6. Kiểm thử

- Unit/component test cho route guard, form validation, upload policy và status rendering.
- Test PPTX có Viewer/Tutor nhưng không download; Teacher PDF chỉ download; Personal chỉ PDF.
- Test citation, `NO_EVIDENCE`, review gate và client không tự chấm điểm.
- Test calendar conflict và các trạng thái loading/empty/error/forbidden.
- Kiểm tra viewport 360px, bàn phím, focus và độ tương phản.
- E2E cho Student, Teacher và Admin bằng dữ liệu tổng hợp.
- Kiểm tra client bundle không chứa Python/OpenRouter/storage endpoint hoặc AI credential.

## 7. Dependency và bàn giao

- Java public API là dependency bắt buộc; endpoint chưa có không được thay bằng mock giả production.
- Fixture chỉ phục vụ development/demo và phải được đánh dấu rõ.
- Khi public DTO thay đổi, cập nhật type, API client test và `docs/api-plan.md` trong cùng task.

## 8. Kế hoạch đóng gói Docker

- Phần Docker của Frontend được quản lý trong [kế hoạch Docker toàn dự án](docker-deployment-plan.md); hiện chưa triển khai hoặc chạy container.
- Web sẽ dùng Next.js standalone multi-stage image, non-root runtime và `.dockerignore` loại secret/cache/build output.
- Chỉ inject `NEXT_PUBLIC_API_URL` và cờ demo hợp lệ vào build; tuyệt đối không đưa OpenRouter key, service credential hoặc database URL vào browser image.
- Container Web chỉ giao tiếp public Java API, không kết nối trực tiếp AI API, PostgreSQL hoặc Object Storage.
- Bắt đầu Dockerfile Web sau FE-M1; nghiệm thu bằng reproducible build, health check và smoke test Web → Java.
