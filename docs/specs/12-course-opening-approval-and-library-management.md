# SPEC-12 — Admin duyệt mở lớp và quản lý tài liệu giảng viên

**Ngày:** 13/11/2026

## 1. Các thay đổi được chốt

### 1.1 Yêu cầu mở lớp

Trong **Lớp học phần**, Teacher bấm **Yêu cầu mở lớp**, tự nhập mã/tên môn, tín chỉ, học kỳ, mã lớp và tên lớp tùy chọn. Không chọn từ danh sách 7 môn cố định. Gửi xong hiển thị **Chờ Admin duyệt** ngay trong chức năng Lớp học phần.

Admin mở **Lớp học phần**, xem yêu cầu và chuẩn hóa mã/tên/tín chỉ hoặc chọn môn chuẩn có sẵn. Duyệt mới tạo lớp cho chính Teacher gửi yêu cầu; mã môn chưa có được thêm vào danh mục. Môn chuẩn có sẵn không bị ghi đè thông tin âm thầm. Từ chối bắt buộc nhập lý do, Teacher xem được kết quả.

Yêu cầu chưa duyệt không tạo lớp, Subject hoặc join code. Sau khi duyệt, Teacher mở lớp để tạo/lấy mã tham gia bằng chức năng hiện có. Không tạo menu độc lập cho yêu cầu mở lớp. Những lớp đã hoạt động trước thay đổi được giữ nguyên.

Java khóa dòng yêu cầu trước khi quyết định, kiểm Teacher vẫn hoạt động và học kỳ vẫn cho mở lớp, tạo môn/lớp và ghi quyết định/audit trong một transaction. Duyệt lặp trả lỗi; không tạo thêm lớp. POST tự mở lớp cũ bị chặn với `OPENING_APPROVAL_REQUIRED`.

### 1.2 Kho tài liệu

- Chi tiết kho có tìm kiếm theo tên hiển thị/tên tệp; hỗ trợ tiếng Việt không dấu. **Chọn tất cả** chỉ áp dụng cho kết quả hiện ra.
- **Sửa tên** ngay trong dòng tài liệu → Lưu hoặc Hủy. Đổi tên không đổi PDF, version hoặc index và được phản ánh ở mọi kho/lớp.
- **Xóa tài liệu** yêu cầu xác nhận việc gỡ tài liệu khỏi mọi kho/lớp. Java dùng luồng xóa/deindex có sẵn; lỗi không được giả thành thành công.
- Chọn một hoặc nhiều tài liệu ở kho mặc định → chọn kho môn/kho riêng đích → **Chuyển sang kho**. Java kiểm toàn bộ quyền/source/target trước khi chuyển reference trong một transaction; không sao chép bytes, không lập chỉ mục lại, không đổi publication hoặc liên kết giáo trình. Những giáo trình chưa được chọn không tự chuyển theo.
- **Bỏ khỏi kho** chỉ bỏ cách sắp xếp, khác **Xóa tài liệu**. Kho mặc định vẫn không được xóa.
- Form upload dùng hai khung kéo thả/bấm chọn tệp: slide chính và giáo trình tùy chọn; có danh sách tệp, dung lượng, nút bỏ tệp và kiểm định dạng/giới hạn. Luồng đính kèm chỉ ở lúc tải lên, giữ nguyên SPEC-11.

## 2. Contract và dữ liệu

- Chi tiết request/response/error: [API plan](../api-plan.md).
- Migration tiến `V31__course_opening_requests.sql`: bảng yêu cầu, FK Teacher/Semester/lớp kết quả, trạng thái PENDING/APPROVED/REJECTED, quyết định Admin, thời gian và lý do; unique partial chống trùng yêu cầu PENDING theo Teacher/học kỳ/mã lớp.
- Không đổi internal AI API hoặc schema ai. Không đọc/chỉnh `.env`.

## 3. Kiểm tra nghiệm thu

- Java unit và MVC: form cũ không bypass được Admin, proposal hợp lệ/không hợp lệ, duyệt/lặp/từ chối, Teacher hoặc kỳ học không còn hợp lệ, chuẩn hóa môn không ghi đè danh mục.
- HTTP tích hợp: Student/Teacher không được quyết định thay Admin; Teacher khác không xem yêu cầu riêng; chưa duyệt chưa có môn/lớp; duyệt xong tạo đúng lớp; kiểm tra rename/move/delete bằng PDF tổng hợp trên PostgreSQL cách ly.
- Frontend: API client đúng method/body, form tự nhập môn, trạng thái chờ duyệt và Admin review; unit suite, lint, TypeScript. Kiểm tra tìm kiếm và checkbox chỉ chọn kết quả hiển thị.
- Frontend: **126/126** test đạt; TypeScript không lỗi; lint không lỗi, còn cảnh báo `<img>` có sẵn trong Viewer.
- Java unit/MVC: **34 test đạt** trong các nhóm OpeningRequestService, TeacherCourseOfferingController, CourseMaterialLibraryService và TeacherResourceLibraryService.
- HTTP/PostgreSQL Testcontainers: **28 test đạt**, một ca opt-in chạy API client Node được bỏ qua. Hai kịch bản mới đã thực thi: Teacher đề xuất môn mới → Admin chuẩn hóa/duyệt → Teacher mở lớp, chặn duyệt lại/bypass, từ chối có lý do và phân quyền; upload PDF tổng hợp → đổi tên → thử chuyển không hợp lệ/khác owner → chuyển thành công → tải được tệp → xóa và không tải lại được.
- Fixture HTTP cũ tự chạy lại migration sau Flyway gây lỗi bảng đã tồn tại; đã bỏ bước lặp để Flyway là nơi duy nhất áp dụng schema. Không sửa migration cũ và không đụng dữ liệu thật.
- Đây là kiểm thử API tích hợp và kiểm tra frontend bằng test/lint/typecheck; chưa ghi thành kiểm thử trực quan đầy đủ trên trình duyệt.
- Bản local đã áp dụng V31 và khởi động lại: Teacher/Admin đăng nhập 204; API danh sách yêu cầu trả 200; Java health UP; trang đăng nhập HTTP 200. Chín tài liệu có sẵn được giữ nguyên; không tạo yêu cầu/lớp demo trong database local.
