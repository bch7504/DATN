# StudyFlow Web

Frontend Next.js là giao diện thật cho ba vai trò và chỉ lấy dữ liệu qua Java `/api/v1`; không có chế độ demo lúc chạy. Route/chức năng được mô tả tại [`../../docs/frontend-implementation-plan.md`](../../docs/frontend-implementation-plan.md).

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
- **Điều hướng quay lại:** thanh trên có nút quay lại cho các trang con. Chi tiết lớp, học liệu và bài tập được phản ánh trong URL/lịch sử để nút Back của trình duyệt trở về danh sách vừa xem; URL mở trực tiếp vẫn có đường về danh sách hoặc Dashboard theo vai trò.

## Boundary bắt buộc

- Browser chỉ gọi public Java `/api/v1`.
- Không gọi Python, database, pgvector, Object Storage hoặc model provider trực tiếp.
- Không tính score, progress, Streak hoặc Daily Goal actual ở client.
- Dashboard hiển thị aggregate và tiến độ từng Course Offering; không có màn Progress riêng.
- Student quản lý Personal PDF, hỏi đáp, tóm tắt và tạo Quiz ngay trên cùng trang Tài liệu cá nhân. Teacher tạo Quiz từ Course Material PDF qua AI Quiz Studio riêng; cả hai đều qua Java và ở trạng thái review trước khi sử dụng/công bố.
- Dữ liệu tổng hợp chỉ được dùng trong test; giao diện đang chạy không fallback sang học liệu, lớp hoặc Quiz giả khi API lỗi.

Kế hoạch triển khai nằm tại [`../../docs/frontend-implementation-plan.md`](../../docs/frontend-implementation-plan.md).

Khung toàn bộ giao diện và lịch sử thay đổi: [`../../docs/ui-design.md`](../../docs/ui-design.md).

## Điều hướng các màn nghiệp vụ

Màn danh sách, tạo, sửa và chi tiết có route riêng. Route module chỉ chọn màn; các form và phần tải dữ liệu chung được tái sử dụng bằng component có props rõ ràng. Bộ lọc danh sách vẫn dùng query hoặc state; hộp xác nhận và xem trước tệp là popup ngắn.

| Khu vực | Đường dẫn |
| --- | --- |
| Bài tập giảng viên | `/teacher/assignments`, `/new`, `/{assignmentId}`, `/{assignmentId}/edit` |
| Bài tập sinh viên | `/assignments`, `/assignments/{assignmentId}` |
| Mở lớp giảng viên | `/teacher/course-offerings/new` |
| Học liệu giảng viên | `/teacher/documents`, `/{offeringId}`, `/{offeringId}/upload`, `/publications/{documentId}` |
| Lớp và học liệu sinh viên | `/course-offerings/{offeringId}`, `/materials/class/{offeringId}`, `/materials/{documentId}/viewer` |
| Quiz giảng viên | `/teacher/quizzes/create`, `/teacher/quizzes/{quizId}` |
| Quiz sinh viên | `/quiz/create`, `/quiz/drafts/{draftId}`, `/quiz/drafts/{draftId}/accept` |
| Ôn tập và lượt làm | `/review/{courseId}`, `/items`, `/attempts/{attemptId}`, `/attempts/{attemptId}/result` |
| Kế hoạch | `/plan`, `/plan/new`, `/plan/{planId}/edit`, `/plan/{planId}/items/new`, `/plan/{planId}/items/{itemId}/edit` |
| Quản trị | `/admin/users/{userId}/edit`, `/admin/feedback/{reportId}`, `/admin/course-offerings/{offeringId}` |
| Danh mục quản trị | `/admin/catalog/subjects` và `/admin/catalog/semesters`, mỗi khu vực có `/new` và `/{entityId}/edit` |

Liên kết query cũ tới chi tiết bài tập/lớp/học liệu được chuyển tiếp sang route mới. Mỗi màn con có nút về danh sách/màn cha; Back của trình duyệt dùng lịch sử điều hướng Next.

Lượt làm Quiz chỉ được tạo bằng thao tác bấm bắt đầu, không tạo lại khi tải trang. Câu hỏi, lựa chọn đang làm và kết quả chấm thực từ Java được giữ trong `sessionStorage` theo tài khoản + lượt làm để khôi phục trong cùng thẻ. Contract hiện chưa có GET lượt đang làm; mở URL đó ở thẻ mới không tự tạo một lượt khác. Kết quả dùng phản hồi chấm của Java, không chấm tại frontend.

`node tests/browser-navigation.cjs` chạy Chrome headless với API fixtures tổng hợp để kiểm tra các route, Back, F5, tạo bài và nộp Quiz; toàn bộ request `/api/v1` của lượt kiểm thử được chặn và trả fixture, không ghi dữ liệu vào Java thật.
