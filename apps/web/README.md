# StudyFlow Web — cấu trúc dự kiến

Frontend hiện **chưa triển khai Next.js**. Thư mục này chỉ giữ cấu trúc, mô tả route/component và mock giao diện [`mvp.html`](mvp.html) để thống nhất nghiệp vụ trước khi code.

## Cấu trúc mục tiêu

```text
apps/web/
├── public/branding/            # asset PTIT được phép sử dụng
├── src/
│   ├── app/                    # route Student, Teacher, Admin và auth
│   ├── components/             # UI primitive và feature component
│   ├── lib/                    # Java API client, session và helper
│   └── types/                  # public Java DTO và UI types
├── tests/                      # test FE bằng fixture tổng hợp
└── mvp.html                    # prototype tham chiếu, không phải production FE
```

## Quy ước giao diện tham chiếu từ `mvp.html`

- **Hệ nhận diện PTIT:**
  - Typography: `Be Vietnam Pro` cho nội dung thường (body), `Manrope` cho tiêu đề và số liệu (display/heading).
  - Bảng màu: Đỏ thắm PTIT (`#d71920`, `#a80f18`, nền `#fff1f2`), Vàng PTIT (`#f4c300`, `#b89c0e`), Slate (`#0f172a`, `#475569`, `#f8fafc`).
  - Biểu trưng PTIT (huy hiệu chính quy tỷ lệ 1:1) trên topbar thương hiệu.
- **Personal RAG Workspace (Bố cục 2 cột):**
  - Khung Chatbot đặt ở bên **trái** (linh hoạt độ rộng, ưu tiên trải nghiệm thảo luận).
  - Thanh phiên hội thoại (Session Bar) đặt ở đầu (header) bên trong khung chatbot, hỗ trợ chuyển nhanh giữa các phiên thảo luận hoặc bấm `+ Phiên mới`.
  - Cột chọn nguồn tài liệu cá nhân đặt gọn ở bên **phải** (~280px) kèm tìm kiếm, nút chọn tất cả / bỏ chọn và badge trạng thái `READY`.
  - **In-Chat Citation Drawer:** Click vào chip trích dẫn trong tin nhắn để mở Drawer kiểm chứng trích đoạn (excerpt), số trang, file gốc và mã đối chiếu SHA-256 ngay trong khung chatbot.
- **Ôn tập (Review Hub - 2 tầng):**
  - **Level 1 (Course Picker):** Danh sách thẻ môn học (`DBI-01`, `AI-02`, ...) và nhóm Quiz cá nhân (`PERSONAL`) kèm thống kê nhanh.
  - **Level 2 (Course Workspace):** Breadcrumb quay lại và 3 sub-tab chuyên biệt:
    1. *Quản lý Quiz:* Tạo quiz mới, danh sách bài quiz của môn, bảng lịch sử làm bài (Attempt history) **không ghi đè**, theo dõi tiến bộ điểm số.
    2. *Nội dung cần ôn lại:* Tự động tổng hợp từ các câu trả lời sai, kèm link/nút mở trực tiếp slide/trang tài liệu để ôn tập ngay.
    3. *Xem tiến độ môn học:* Tỷ lệ xem slide của môn học đó (trạng thái từng slide) và nhật ký hoạt động học gần nhất (7 ngày).

## Boundary bắt buộc

- Browser chỉ gọi public Java `/api/v1`.
- Không gọi Python, database, pgvector, Object Storage hoặc model provider trực tiếp.
- Không tính score, progress, Streak hoặc Daily Goal actual ở client.
- Dashboard hiển thị aggregate và tiến độ từng Course Offering; không có màn Progress riêng.
- Chatbot và Tạo Quiz là hai luồng riêng. Tạo Quiz cho phép Student chọn Personal Documents và tự nhập prompt.
- `mvp.html` chỉ dùng dữ liệu demo, không được xem là implementation production.

Kế hoạch triển khai nằm tại [`../../docs/frontend-implementation-plan.md`](../../docs/frontend-implementation-plan.md). Chỉ tạo lại package/config/source khi bắt đầu milestone FE-M0.
