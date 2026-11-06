# Teacher Resource Library

`/teacher/documents` là trang tổng quan kho chung của Teacher và chỉ hiển thị thẻ kho/lớp. Mỗi Teacher luôn có một kho `DEFAULT` tên **Tài liệu tải lên**; upload không chọn kho khác sẽ tự vào kho này. Teacher tự tạo/xóa kho theo môn học hoặc kho không gắn môn; xóa kho chỉ xóa cách phân loại và không xóa tài nguyên gốc. Mỗi kho có thể chứa liên kết tới Course Material PDF, Quiz do Teacher sinh và bài tập thuộc Teacher.

- `/teacher/documents/libraries/{libraryId}` mở nội dung và thao tác của đúng một kho; trang tổng quan không hiển thị nội dung kho ở bên ngoài.
- `/teacher/documents/upload` tải PDF/PPTX vào kho đang chọn hoặc kho **Tài liệu tải lên**; Java chuẩn hóa PPTX thành PDF.
- `/{offeringId}` là kho của đúng một lớp: quản lý tài liệu đã công bố và thêm tài liệu có sẵn từ kho Teacher.
- `/{offeringId}/upload` tải tài liệu rồi mở bước xác nhận công bố cho lớp.
- `/publications/{documentId}` chọn hoặc thu hồi phạm vi công bố.
- `DELETE /api/v1/teacher/documents/{documentId}` xóa học liệu gốc an toàn: thu hồi publication/vector, bỏ liên kết kho, xóa mềm metadata và dọn object sau commit.

Đưa tài liệu, Quiz hoặc bài tập vào kho cá nhân không tự công bố, không tự giao bài và không đổi vòng đời Java của tài nguyên. Chỉ thao tác `Thêm vào lớp` mới tạo publication để tài liệu xuất hiện trong kho lớp; cùng một tài liệu có thể nằm trong nhiều kho lớp mà không sao chép tệp. Teacher không có chatbot cá nhân hoặc AI Tutor; Teacher Quiz Studio vẫn là màn riêng và có thao tác lưu Quiz vào một kho đã chọn.

Teacher Quiz Studio không mặc định nguồn. Sau khi chọn lớp, Teacher chủ động chọn từ 1 đến 10 `SLIDE_PDF` đã `READY` và đã công bố trong chính lớp đó. Khi chọn nhiều tài liệu, khoảng trang áp dụng chung phải hợp lệ với mọi tài liệu được chọn.
