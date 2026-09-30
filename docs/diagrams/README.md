# Sơ đồ Use Case và luồng StudyFlow

Mở [bộ sơ đồ trực quan](index.html) hoặc [PDF sơ đồ khổ ngang](luong-use-case-studyflow.pdf). Mỗi hình có bản SVG để chèn Word không vỡ chữ, PNG để chèn nhanh và nguồn Mermaid để chỉnh sửa.

## Kết luận đối chiếu báo cáo

Đã đối chiếu các sơ đồ luồng trong `bao_cao_chuong_1_2_3.pdf` (71 trang) với [đặc tả](../specification.md), [API contract](../api-plan.md), [kế hoạch AI](../ai-implementation-plan.md) và quy tắc dự án. Đây là đối chiếu **thiết kế đã chốt**, không phải xác nhận backend/AI đã chạy đúng bằng kiểm thử runtime.

Các nghiệp vụ chính vẫn phù hợp, nhưng báo cáo chưa khớp hoàn toàn. Số trang dưới đây là số trang PDF tính từ trang bìa, bắt đầu từ 1. Không thay đổi PDF gốc. Bản Markdown các chương đã được cập nhật; bộ hình này dùng để thay hình khi xuất lại bản báo cáo Word/PDF.

| Trang PDF / hình | Kết luận | Điểm cần chỉnh |
|---|---|---|
| 19–20 — Use Case tổng quát và ba role | Phạm vi phần lớn đúng; vẽ lại ký pháp | Dùng actor ngoài boundary, use case và association; không dùng mũi tên giữa các use case để biểu diễn thứ tự. Personal RAG, Slide Tutor, sinh Quiz là ba mục tiêu độc lập. |
| 24 — Tham gia lớp | Luồng chính đúng; bổ sung kiểm quyền | Join code cần enabled và lớp joinable; PENDING trùng dùng bản ghi cũ. Mỗi lần mở học liệu kiểm publication/status; phân biệt PDF download và PPTX web-only. |
| 25 — Personal RAG và Quiz | Hai nhánh độc lập đúng; chưa đủ chi tiết | Tách sơ đồ RAG/Quiz để đọc rõ. Evidence gate trước LLM; Quiz có bốn options, repair tối đa một lần, Regenerate tạo quizId mới và Accept kiểm destination. |
| 26 — Tiến độ và ôn tập | Cần sửa nguồn ôn và vai trò kế hoạch | Quiz MVP sinh từ Personal PDF nên nguồn câu sai là document + page, không phải slide. Kế hoạch & Lịch là thao tác chủ động riêng, không phải kết quả hệ thống tự sinh từ Dashboard. |
| 27 — Learning Events/Goal/Streak | Đúng nguyên tắc | Giữ ba event hợp lệ, local date/timezone và điều kiện Streak độc lập với đạt 100% Goal; bổ sung dedup/target do Student cấu hình. |
| 28 — Sequence Slide Tutor | Endpoint lỗi thời | Thay `/student/slides/{id}/questions` bằng `POST /api/v1/student/materials/{documentId}/slides/{number}/tutor`; thêm nhánh sai quyền, evidence gate và giới hạn rewrite. |
| 29 — Sequence Quiz | Thiếu cơ chế bất đồng bộ public | Trả `202 + quizId` trước generation nền; Web poll Java, không chờ LLM trong public request. Java validate toàn bộ draft rồi mới REVIEW_REQUIRED. |
| 30 — Sequence Personal RAG | Thứ tự evidence gate chưa đúng | Hình cũ đưa evidence vào LLM trước nhánh đủ/thiếu bằng chứng. Kiểm evidence trước generation; giữ grounding check sau generation và rewrite tối đa một lần. |
| 31 — Sequence upload/index | Thiếu job acknowledgement/polling | Internal index trả `202 + jobId` ngay; Java poll `GET /internal/v1/jobs/{jobId}`. Không vẽ Job SUCCESS như response đồng bộ kéo dài hoặc callback. |
| 31 — Kiến trúc | Đúng ranh giới chính | Giữ Web → Java → Python; làm rõ schema/role app và ai, cùng cluster; Python truy cập Storage để đọc raw và ghi artifact trong scope. |
| 32 — Document pipeline | Đúng ở mức khái quát | Bổ sung job/failure, tách Personal PDF và Teacher PPTX; không gửi Teacher PDF qua AI. |
| 33 — RAG/Tutor/Quiz pipelines | Thiếu các nhánh an toàn | Bổ sung evidence gate trước LLM, NO_EVIDENCE, rewrite/repair có giới hạn, bốn options và Java revalidation. Không gom lỗi hạ tầng vào NO_EVIDENCE. |
| 57, 59, 61, 62, 64, 66 — Sáu luồng Chương 3 | Phần lớn đúng nghiệp vụ; cần vẽ lại và thống nhất số hình | Hình cũ dùng nhiều màu, nhánh lỗi nét đứt dễ bị hiểu là vẫn đi tiếp; số hình in trong ảnh lệch với caption báo cáo. Hình mới không in số chương vào nội dung, có nhánh kết thúc và bố cục ngang. |
| 67 — Phân tầng Java | Ranh giới đúng; cần chỉnh cách trình bày | Không đặt refresh-token rotation như nhiệm vụ mặc định của JWT filter; sơ đồ mô tả trách nhiệm tầng, không khẳng định tên class/runtime. |
| 68 — Python/worker | Cần vẽ lại | Chữ chồng lên nhau; tách job index/deindex khỏi pipeline RAG/Tutor/Quiz, bổ sung polling; không cố định tên model chưa được xác minh vào hình. |
| 68 — Signed URL | Có mô tả sai | Signed query token không phải HttpOnly cookie. Student không được tải PPTX raw. TTL theo policy, không tự chốt 5 phút; revoke chặn URL mới, URL cũ có thể tồn tại đến hết TTL. |

ERD trang 34 và ảnh giao diện trang 41–51 không phải luồng Use Case; task này không xác nhận lại từng cột CSDL hoặc thay ảnh giao diện. Logo bìa và ERD hiện có được giữ nguyên; quy tắc tông xám áp dụng cho bộ sơ đồ luồng/kiến trúc ở đây.

## Những đoạn văn cần sửa khi xuất lại PDF gốc

- Trang 58: citation Slide Tutor phải là `documentId + slideNumber` (kèm version trong scope), không dùng `publication_id` để thay ID tài liệu.
- Trang 58: các số Recall 94,2%/98,6%/99,1%, latency <30/<45/<80 ms và cam kết truy xuất <100 ms chưa có nguồn benchmark trong phần trình bày. Bỏ số hoặc ghi rõ thử nghiệm, dataset, cấu hình và log chứng minh; không gọi 1024 chiều là “tối ưu” đã đo nếu chưa có kết quả.
- Trang 60–62: MVP Teacher nhận cả PDF/PPTX, nhưng chỉ PPTX vào pipeline AI. Speaker notes chưa được chốt trong pipeline hiện hành; không mặc định đưa ghi chú riêng của Teacher vào context Student. Chunk 500–800 từ/overlap 100 từ chỉ nên là cấu hình thử nghiệm cần benchmark, không phải kết quả tối ưu đã xác nhận.
- Trang 63: phân biệt document version với embedding/index version; thay model/dimensions cần reindex, không đồng nghĩa nội dung raw luôn đổi document version.
- Trang 68: sửa mô tả tải file thành “PDF hoặc slide artifact được phép”, không viết người dùng tải mọi PDF/PPTX gốc. Signed URL không phải cookie HttpOnly.
- Trang 69: ô Admin ở hàng “Tạo & Làm Quiz AI” phải là “Không”; “Java chấm điểm tự động” thuộc trách nhiệm backend, không thuộc actor Admin.
- Chương 3 trong PDF là **Cơ sở lý thuyết và công nghệ**, còn Markdown hiện tại là **Thiết kế chi tiết và cài đặt**. Không thay toàn bộ nội dung PDF bằng Markdown hoặc sao chép số mục máy móc. Bảng dưới ghi riêng cả hai vị trí để thay đúng hình.
- Các hình cần câu dẫn trước, caption ngay dưới và đoạn giải thích sau. Dùng các đoạn mô tả trong gallery/catalog hoặc bản Markdown, không chèn ảnh đứng riêng.

## Bản đồ chèn/thay hình

Số Hình 2.x/3.x sau dấu “Markdown” thuộc bản báo cáo trong `docs/bao-cao/`; không phải số hình bắt buộc của PDF gốc. Với hình ở trang 25/32/33, nên tách thành các hình con thay vì thu nhỏ một sơ đồ quá dài.

| Vị trí trong báo cáo | Ảnh thay thế |
|---|---|
| Chương 2: Hình 2.1 — Use Case tổng quát | [Use Case tổng quát](chuong-2/01-use-case-tong-quat.svg) · [PNG](chuong-2/01-use-case-tong-quat.png) |
| Chương 2: Hình 2.2 — Use Case phân hệ Student | [Use Case Student](chuong-2/04-use-case-student.svg) · [PNG](chuong-2/04-use-case-student.png) |
| Chương 2: Hình 2.3 — Use Case phân hệ Teacher | [Use Case Teacher](chuong-2/05-use-case-teacher.svg) · [PNG](chuong-2/05-use-case-teacher.png) |
| Chương 2: Hình 2.4 — Use Case phân hệ Admin | [Use Case Admin](chuong-2/06-use-case-admin.svg) · [PNG](chuong-2/06-use-case-admin.png) |
| Chương 3: Hình 3.1 — Kiến trúc hệ thống | [Kiến trúc và ranh giới dữ liệu](chuong-2/02-kien-truc-he-thong.svg) · [PNG](chuong-2/02-kien-truc-he-thong.png) |
| Chương 3: Hình 3.2 — Sơ đồ CSDL ERD | [ERD tổng quan](erd/studyflow-overview.svg) |
| Chương 3: Hình 3.3 — Biểu đồ hoạt động Personal RAG | [Personal RAG có kiểm chứng nguồn](chuong-3/02-personal-rag.svg) · [PNG](chuong-3/02-personal-rag.png) |
| Chương 3: Hình 3.4 — Biểu đồ hoạt động Slide Tutor | [Hỏi đáp tại slide](chuong-3/04-slide-tutor.svg) · [PNG](chuong-3/04-slide-tutor.png) |
| Chương 3: Hình 3.5 — Biểu đồ hoạt động sinh Quiz | [Sinh, review và accept Quiz](chuong-3/05-quiz-generation.svg) · [PNG](chuong-3/05-quiz-generation.png) |

## Quy ước trình bày

- Nền trắng, khối `#EEEEEE`, chữ đen/xám, viền và đường nối xám; không dùng màu để phân biệt vai trò hoặc kết quả.
- Activity dài chia cụm theo chiều ngang: tiếp nhận → xử lý → kiểm tra → trả kết quả. Đọc luồng nội bộ từng cụm từ trên xuống; nhãn trên đường nối giữa cụm xác định điều kiện chuyển cụm.
- Use Case dùng actor, boundary và association; các liên kết `~~~` trong Mermaid chỉ hỗ trợ bố cục, không xuất hiện trong hình và không phải quan hệ nghiệp vụ.
- Sequence giữ trục thời gian UML từ trên xuống; bố cục participant được giãn ngang và giảm chiều cao dư thừa. Không xoay ảnh làm chữ bị nghiêng.
- PDF bộ hình dùng A3 landscape để xem/in rõ chi tiết. Khi đưa vào báo cáo A4, dùng section landscape riêng cho hình rộng và ưu tiên SVG; không ép hình vào nửa trang khiến chữ không đọc được.
- Không in số hình vào SVG/PNG. Caption đánh số trong từng báo cáo để tránh lệch số như PDF cũ.
- Đường nối và nhãn lỗi phân biệt rõ thiếu evidence, sai quyền, lỗi hạ tầng. Mọi repair/rewrite đều có giới hạn.
- Không chứa tài liệu người dùng, token, key, signed URL thật hoặc minh chứng runtime giả.

## Tái tạo và kiểm tra

Công cụ chỉ tạo artifact tài liệu, không thêm dependency production. Yêu cầu Node/npm, Chrome (sửa đường dẫn trình duyệt trong `puppeteer-config.json` nếu cần), Python/uv. Mermaid CLI được khóa phiên bản 12.0.0; PyMuPDF được dùng trong môi trường công cụ tạm của uv.

```powershell
$env:PYTHONIOENCODING='utf-8'
uv run --no-project --with pymupdf python docs/diagrams/render.py
uv run --no-project --with pymupdf python docs/diagrams/render.py --check
uv run --no-project --with pymupdf python docs/diagrams/export.py
```

Render riêng một hình bằng `--only chuong-3/02-personal-rag`. `render.py` chỉ duyệt ba thư mục chương được liệt kê, không đọc `.env`, source service, upload hoặc dữ liệu riêng. PNG được chuẩn hóa grayscale để loại bỏ viền màu khử răng cưa chữ của trình duyệt. Lỗi syntax/render/validation làm command thất bại; cần sửa nguồn rồi chạy lại. `catalog.json` là nguồn metadata cho gallery, mô tả hình và PDF bộ hình.

