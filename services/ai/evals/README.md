# AI evaluation

Thư mục này chứa khung đánh giá offline cho ba nhóm:

- Hỏi đáp và tóm tắt Personal PDF.
- Course Material PDF Tutor theo trang.
- Sinh Quiz cho Student và Teacher.

Đánh giá phải kiểm tra đúng quyền, đúng nội dung, đúng trang nguồn và khả năng từ chối khi thiếu bằng chứng. Không đặt tài liệu cá nhân hoặc nội dung production trong thư mục này.

`uv run python -m evals --synthetic` chạy fixture kiểm tra công thức, **không phải đo chất lượng model thật**.

`metrics.py` tách riêng:

- Retrieval recall@k: tỉ lệ các trang nguồn kỳ vọng tìm được trong top-k.
- Citation location precision: tỉ lệ nguồn trích đúng document/version/page theo nhãn độc lập.
- NO_EVIDENCE accuracy: đáp ứng đúng quyết định có thể trả lời/không thể trả lời.
- Human groundedness: tỉ lệ phát biểu được người đánh giá xác nhận có bằng chứng. Không tự suy ra từ citation đúng trang.

Mẫu không có citation không được tự tính precision 100%; chỉ số thiếu dữ liệu giữ null. Nguồn đúng số trang nhưng sai tài liệu/phiên bản vẫn là sai.

Trước nghiệm thu cần bộ câu hỏi tiếng Việt đại diện, phân loại câu có đáp án/ngoài phạm vi/thiếu bằng chứng, nhãn nguồn độc lập và đánh giá từng phát biểu. Bộ synthetic hiện tại chỉ kiểm tra plumbing và công thức; chưa thay thế đánh giá factual correctness, relevance, completeness hoặc chất lượng distractor của Quiz.
