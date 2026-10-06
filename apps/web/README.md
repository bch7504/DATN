# StudyFlow Web

Frontend Next.js hiện là baseline giao diện đã chốt cho ba vai trò. Fixture chỉ hoạt động khi demo mode được bật; route/chức năng được mô tả tại [`../../docs/frontend-implementation-plan.md`](../../docs/frontend-implementation-plan.md).

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
```

## Quy ước giao diện

- **Hệ nhận diện PTIT:**
  - Typography: `Be Vietnam Pro` cho nội dung thường (body), `Manrope` cho tiêu đề và số liệu (display/heading).
  - Bảng màu: Đỏ thắm PTIT (`#d71920`, `#a80f18`, nền `#fff1f2`), Vàng PTIT (`#f4c300`, `#b89c0e`), Slate (`#0f172a`, `#475569`, `#f8fafc`).
  - Biểu trưng PTIT (huy hiệu chính quy tỷ lệ 1:1) trên topbar thương hiệu.
- **Personal Document Assistant (Bố cục 2 cột):**
  - Khung Chatbot đặt ở bên **trái** (linh hoạt độ rộng, ưu tiên trải nghiệm thảo luận).
  - Thanh phiên hội thoại (Session Bar) đặt ở đầu (header) bên trong khung chatbot, hỗ trợ chuyển nhanh giữa các phiên thảo luận hoặc bấm `+ Phiên mới`.
  - Cột chọn nguồn tài liệu cá nhân đặt gọn ở bên **phải** (~280px) kèm tìm kiếm, nút chọn tất cả / bỏ chọn và badge trạng thái `READY`.
  - Single Orchestrator Agent tự chọn đúng một trong ba tool: hỏi đáp, tóm tắt hoặc tạo Quiz; khi thiếu tham số phải hỏi lại.
  - **In-Chat Citation Drawer:** Click vào chip trích dẫn trong tin nhắn để mở Drawer kiểm chứng trích đoạn (excerpt), số trang, file gốc và mã đối chiếu SHA-256 ngay trong khung chatbot.
- **Course Material PDF:** Student xem PDF theo trang, ghi chú và dùng AI Tutor; Teacher chỉ upload/public PDF và dùng AI Quiz Studio, không có chatbot/Tutor.
- **Ôn tập (Review Hub - 2 tầng):**
  - **Level 1:** Course Offering được phép và Quiz cá nhân, kèm số Quiz, điểm trung bình và số câu cần ôn.
  - **Level 2:** Quiz `READY`, attempt history không ghi đè và nội dung cần ôn từ câu sai kèm link nguồn.
  - Viewing progress chỉ xuất hiện trên Dashboard, không lặp lại trong Ôn tập.
- **Kế hoạch & Lịch:** lịch tuần theo khung giờ giống mock, hỗ trợ chuyển tuần, thêm lịch bằng nút hoặc ô trống, thêm task và đánh dấu hoàn thành. Daily Goal/Streak vẫn ở Dashboard.

## Boundary bắt buộc

- Browser chỉ gọi public Java `/api/v1`.
- Không gọi Python, database, pgvector, Object Storage hoặc model provider trực tiếp.
- Không tính score, progress, Streak hoặc Daily Goal actual ở client.
- Dashboard hiển thị aggregate và tiến độ từng Course Offering; không có màn Progress riêng.
- Student tạo Quiz từ Personal PDF ngay trong Trợ lý tài liệu. Teacher tạo Quiz từ Course Material PDF qua AI Quiz Studio riêng; cả hai đều qua Java và ở trạng thái review trước khi sử dụng/công bố.
- Fixture demo không được xem là implementation production hoặc dữ liệu thật.

Kế hoạch triển khai nằm tại [`../../docs/frontend-implementation-plan.md`](../../docs/frontend-implementation-plan.md).
