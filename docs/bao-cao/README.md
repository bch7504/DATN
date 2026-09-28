# Bộ báo cáo StudyFlow theo từng chương

Mỗi chương là một tài liệu độc lập để người viết hoặc AI agent chỉ đọc đúng phạm vi đang làm.

| Chương | File | Nội dung chính |
|---|---|---|
| 1 | [Tổng quan đề tài](chuong-1-tong-quan-de-tai.md) | Bài toán, mục tiêu, phạm vi, phương pháp và bố cục |
| 2 | [Phân tích và thiết kế hệ thống](chuong-2-phan-tich-va-thiet-ke-he-thong.md) | Yêu cầu, use case, kiến trúc, CSDL, API, UI và bảo mật |
| 3 | [Thiết kế chi tiết và cài đặt](chuong-3-thiet-ke-chi-tiet-va-cai-dat.md) | RAG, Slide Tutor, AI Quiz, kiểm thử và đánh giá AI |

Quy tắc làm việc:

- Chỉ đọc chương được giao và tài liệu nguồn được chương đó viện dẫn.
- Chương 1 dùng cho bối cảnh/phạm vi; Chương 2 là chuẩn phân tích/thiết kế; Chương 3 là chuẩn hiện thực ba chức năng trọng tâm.
- Không ghi kết quả triển khai, test hoặc KPI nếu chưa có minh chứng chạy thực tế.
- Khi thay đổi nghiệp vụ, đồng bộ tài liệu nguồn trước rồi cập nhật chương liên quan.
- Sơ đồ từng chương nằm tại `docs/diagrams/chuong-1/`, `docs/diagrams/chuong-2/`, `docs/diagrams/chuong-3/`; ERD tổng quan nằm tại `docs/diagrams/erd/`.
