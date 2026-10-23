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
  - Chỉ mở sau khi bấm **Hỏi đáp tài liệu cá nhân** trong `/personal-documents`; mặc định trang hiển thị kho PDF. Có nút **Quay lại kho tài liệu**, không có menu Assistant riêng.
  - Khung Chatbot đặt ở bên **trái** (linh hoạt độ rộng, ưu tiên trải nghiệm thảo luận).
  - Thanh phiên hội thoại (Session Bar) đặt ở đầu (header) bên trong khung chatbot, hỗ trợ chuyển nhanh giữa các phiên thảo luận hoặc bấm `+ Phiên mới`.
  - Cột chọn nguồn tài liệu cá nhân đặt gọn ở bên **phải** (~280px) kèm tìm kiếm, nút chọn tất cả / bỏ chọn và badge trạng thái `READY`.
  - Single Orchestrator Agent tự chọn đúng một trong ba tool: hỏi đáp, tóm tắt hoặc tạo Quiz; khi thiếu tham số phải hỏi lại.
  - **In-Chat Citation Drawer:** Click vào chip trích dẫn trong tin nhắn để mở Drawer kiểm chứng trích đoạn (excerpt), số trang, file gốc và mã đối chiếu SHA-256 ngay trong khung chatbot.
- **Course Material PDF:** Teacher lưu PDF vào kho riêng, chờ xử lý tới `READY` rồi công bố theo lớp; Student đã được duyệt mở/tải file và dùng AI Tutor qua Java. Ghi chú theo trang chưa được nối trong luồng hiện tại.
- **Teacher AI Quiz Studio:** Teacher chọn lớp, Course Material `READY`, số câu, độ khó, chủ đề và khoảng trang; xem bản nháp có nguồn rồi công bố. Frontend không tự sinh câu hỏi hoặc tự đổi trạng thái Quiz.
- **Ôn tập (Review Hub - 2 tầng):**
  - **Sinh đề thi trắc nghiệm AI** mở `/quiz/create` (form PDF + prompt, bản nháp, accept); không redirect tới hỏi đáp. Chat vẫn có thể tạo Quiz nếu Student chủ động yêu cầu trong hội thoại.
  - **Level 1:** Course Offering được phép và Quiz cá nhân, kèm số Quiz, điểm trung bình và số câu cần ôn.
  - **Level 2:** Quiz `READY`, attempt history không ghi đè và nội dung cần ôn từ câu sai kèm link nguồn.
  - Viewing progress chỉ xuất hiện trên Dashboard, không lặp lại trong Ôn tập.
- **Kế hoạch & Lịch:** lịch tuần hiển thị mọi buổi học theo ngày và giờ đã chọn, không giới hạn ở khung giờ cố định; hỗ trợ chuyển tuần, thêm/sửa lịch, thêm task và đánh dấu hoàn thành. Daily Goal/Streak vẫn ở Dashboard.
- **Thông báo học tập:** Student và Teacher đều có chuông bên cạnh nút Đăng xuất; mỗi vai trò chỉ lấy thông báo của chính mình từ Java, hiện số chưa đọc, lọc và đánh dấu đã đọc trong cửa sổ bật ra. Java phát thông báo học liệu, bài tập, ghi danh và hạn; browser chỉ hiển thị và dẫn tới đúng khu vực, không tự tính deadline. Route `/notifications` của Student vẫn truy cập trực tiếp được để tương thích liên kết cũ, nhưng không còn trong menu.

## Boundary bắt buộc

- Browser chỉ gọi public Java `/api/v1`.
- Không gọi Python, database, pgvector, Object Storage hoặc model provider trực tiếp.
- Không tính score, progress, Streak hoặc Daily Goal actual ở client.
- Dashboard hiển thị aggregate và tiến độ từng Course Offering; không có màn Progress riêng.
- Student quản lý Personal PDF, hỏi đáp, tóm tắt và tạo Quiz ngay trên cùng trang Tài liệu cá nhân. Teacher tạo Quiz từ Course Material PDF qua AI Quiz Studio riêng; cả hai đều qua Java và ở trạng thái review trước khi sử dụng/công bố.
- Fixture demo không được xem là implementation production hoặc dữ liệu thật.

Kế hoạch triển khai nằm tại [`../../docs/frontend-implementation-plan.md`](../../docs/frontend-implementation-plan.md).

Khung toàn bộ giao diện và lịch sử thay đổi: [`../../docs/ui-design.md`](../../docs/ui-design.md).
