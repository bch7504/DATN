# Bộ báo cáo StudyFlow theo từng chương

Mỗi chương là một tài liệu độc lập để người viết hoặc AI agent chỉ đọc đúng phạm vi đang làm.

## Báo cáo cá nhân và báo cáo toàn hệ thống

- [Chương 2–3 của thành viên AI](chuong-2-3-thanh-vien-ai.md): hai chức năng chính — Personal Assistant (gộp nhánh sinh/duyệt Quiz) và Course Material PDF Tutor. Giữ mã UC-RAG-01, UC-QUIZ-01 và UC-TUTOR-01 để truy vết.
- Các chương trong bảng dưới là **báo cáo toàn hệ thống**, không bị thay thế bởi bản cá nhân. Cách nhóm chức năng trong báo cáo cá nhân không tự đổi phạm vi/luồng chung.

| Chương | File | Nội dung chính |
|---|---|---|
| 1 | [Tổng quan đề tài](chuong-1-tong-quan-de-tai.md) | Bài toán, mục tiêu, phạm vi, phương pháp và bố cục |
| 2 | [Pha phân tích hệ thống](chuong-2-phan-tich-va-thiet-ke-he-thong.md) | Bài toán, yêu cầu, form 9 chức năng của 3 thành viên, biểu đồ Use Case và kịch bản Use Case chi tiết |
| 3 | [Pha thiết kế hệ thống](chuong-3-thiet-ke-chi-tiet-va-cai-dat.md) | Kiến trúc sơ đồ khối, lớp thực thể, CSDL ERD, biểu đồ lớp chi tiết và biểu đồ hoạt động/tuần tự |

Quy tắc làm việc:

- Chỉ đọc chương được giao và tài liệu nguồn được chương đó viện dẫn.
- Chương 1 dùng cho bối cảnh/phạm vi; Chương 2 là pha phân tích hệ thống; Chương 3 là pha thiết kế hệ thống.
- Không ghi kết quả triển khai, test hoặc KPI nếu chưa có minh chứng chạy thực tế.
- Khi thay đổi nghiệp vụ, đồng bộ tài liệu nguồn trước rồi cập nhật chương liên quan.
- Sơ đồ nằm tại `docs/diagrams/chuong-1/`, `chuong-2/`, `chuong-3/`; ERD tổng quan thuộc thư mục `chuong-3/`. Mở [gallery tổng](../diagrams/index.html) để xem và lấy ảnh; dùng `.puml` để chỉnh UML, `.svg` để chèn vector hoặc `.png` để chèn Word.
- Mọi hình/sơ đồ phải có đủ ba phần: câu dẫn trước hình, chú thích đánh số ngay dưới hình và ít nhất một đoạn văn sau hình giải thích hình biểu diễn gì, dùng để làm rõ nội dung nào và điểm người đọc cần quan sát. Không chèn hình đứng riêng chỉ để minh họa.
- Màu sắc tham khảo mẫu Visual Paradigm của từng loại biểu đồ, không bắt buộc tất cả màu xám hoặc cùng một màu. Dùng nhất quán trong từng loại; nhãn và hình dạng vẫn phải đủ phân biệt ý nghĩa khi in đen trắng. Đường nối ưu tiên thẳng hoặc vuông góc, tránh đường cong giao cắt. Chỉ hình dài/nhiều cột mới trải ngang; hình ngắn ưu tiên dọc. Activity chia swimlane, Sequence để thời gian từ trên xuống, Use Case giữ actor ngoài boundary.
- Xem [bộ sơ đồ và bảng đối chiếu PDF](../diagrams/README.md) để chọn đúng ảnh thay cho từng trang của `bao_cao_chuong_1_2_3.pdf`. Số hình trong bản PDF và bản Markdown hiện khác nhau; không sao chép số cũ trong nội dung ảnh.
