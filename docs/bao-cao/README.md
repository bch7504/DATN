# Bộ báo cáo StudyFlow theo từng chương

Mỗi chương là một tài liệu độc lập để người viết hoặc AI agent chỉ đọc đúng phạm vi đang làm.

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
- Sơ đồ các chương nằm tại `docs/diagrams/chuong-2/`, `docs/diagrams/chuong-3/`; ERD tổng quan nằm tại `docs/diagrams/erd/`.
- Mọi hình/sơ đồ phải có đủ ba phần: câu dẫn trước hình, chú thích đánh số ngay dưới hình và ít nhất một đoạn văn sau hình giải thích hình biểu diễn gì, dùng để làm rõ nội dung nào và điểm người đọc cần quan sát. Không chèn hình đứng riêng chỉ để minh họa.
- Các sơ đồ luồng thống nhất nền trắng, khối xám, chữ và đường nối đen/xám; phân biệt nhánh bằng nhãn và hình dạng, không dùng màu. Luồng dài chia thành các cụm theo chiều ngang; ưu tiên trang landscape khi chèn vào báo cáo, không thu chữ quá nhỏ.
- Xem [bộ sơ đồ và bảng đối chiếu PDF](../diagrams/README.md) để chọn đúng ảnh thay cho từng trang của `bao_cao_chuong_1_2_3.pdf`. Số hình trong bản PDF và bản Markdown hiện khác nhau; không sao chép số cũ trong nội dung ảnh.
