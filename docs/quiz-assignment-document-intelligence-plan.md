# Implementation Plan — Quiz lớp, Ôn tập cá nhân và Trí tuệ tài liệu

Ngày đối chiếu source: 03/11/2026. Vai trò rà soát: ARCHITECT_OR_INTEGRATION_AGENT.

Đây là kế hoạch thay đổi tiếp theo trên baseline MVP v2. Trạng thái dưới đây kết hợp đối chiếu source và kết quả kiểm thử ngày 03/11/2026; kiểm thử HTTP dùng dữ liệu tổng hợp và PostgreSQL Testcontainers, không thay thế browser E2E hoặc nghiệm thu provider thật.

## 1. Luồng chức năng mục tiêu

- Teacher chọn Slide PDF → sinh Quiz → duyệt/sửa → nhập tiêu đề, hướng dẫn và hạn nộp → giao bài tập trắc nghiệm cho lớp.
- Student nhận bài ở Bài tập và lịch, làm bài và nộp; Java chấm điểm, lưu lượt làm và kết quả nộp trong một transaction.
- Teacher xem đã nộp/chưa nộp/nộp muộn, điểm thang 10, từng câu đúng/sai và tỷ lệ sai theo câu.
- Kho Ôn tập chỉ chứa Quiz do Student tự tạo; Quiz Teacher được truy cập qua bài tập lớp. Cần áp dụng bộ lọc này cho cả danh sách, số lượng, lịch sử và tổng hợp câu sai.
- Student tự luyện từ tài liệu cá nhân; kế hoạch mở rộng thêm tài liệu lớp được cấp quyền và đề văn bản dán vào hội thoại.

## 2. Kết quả kiểm tra hiện trạng

Cập nhật triển khai: Q1 đã tách Quiz cá nhân khỏi Quiz Teacher trong Review. Q2 có migration V22, liên kết Quiz–Assignment–Attempt, endpoint bắt đầu/nộp Quiz lớp và Java chấm điểm; Q3–Q4 đã nối màn tạo Quiz Teacher, Bài tập Student, chi tiết đúng/sai và tỷ lệ sai theo câu. Frontend đạt 102 test, lint và typecheck. Backend đã chạy toàn bộ Maven test thành công; riêng `RealHttpApiTest` đạt 22 ca với một ca tích hợp tùy chọn được bỏ qua và đã chạy Flyway trên PostgreSQL Testcontainers. D1 có pipeline multimodal; toàn bộ test AI, ruff check và format-check đạt, một integration test tùy chọn được skip. D2 đã hoàn thành phần LaTeX văn bản bằng KaTeX an toàn. D4 đã nối Python–Java–FE; test Python/FE và 25 test Java chọn lọc đều đạt. Image artifact của D2, browser E2E và D3 chưa hoàn tất.

| Hạng mục | Trạng thái source | Bằng chứng và phần thiếu |
|---|---|---|
| Teacher sinh, duyệt và giao Quiz | Đã nối source | Form có tên bài/hạn nộp; duyệt Quiz, tạo và công bố Assignment qua Java |
| Bài tập lớp có hạn nộp, nộp tệp và thống kê | Đã mở rộng source | `CourseAssignment` có `ESSAY/QUIZ`, `quizId`; báo cáo có score/quizAttemptId |
| Gắn Quiz vào Assignment | Đã có migration và kiểm thử DB | V22 thêm type/quizId/quizAttemptId cùng constraint/index; Flyway và full Maven suite đạt trên PostgreSQL Testcontainers |
| Nộp bài trắc nghiệm lớp | Đã nối và test service | Student bắt đầu trong Assignment, submit attempt hiện hữu, Java chấm và lưu score; còn browser E2E |
| Báo cáo điểm và chi tiết Quiz theo bài tập | Đã nối và test service | Teacher owner xem điểm/câu đúng-sai; `questionAnalytics` tính tỷ lệ sai từ attempt hiện tại của mỗi bài nộp, không đếm lặp attempt cũ; còn browser E2E |
| Tách Kho Ôn tập khỏi Quiz Teacher | Đã sửa và test Java | Truy vấn Review giới hạn Student owner + `STUDENT` + `READY`; còn browser E2E |
| AI đọc ảnh/sơ đồ trong PDF | Đã có source và unit test nền | PyMuPDF, VisionCaptionClient, OpenRouter và worker/indexing đã nối; đã sửa `pipelineVersion`, toàn bộ test AI đạt; chưa nghiệm thu live Vision |
| Layout, bảng Markdown và công thức | Một phần | Parser đang lấy text và caption ảnh nhúng; chưa có trích bảng/layout có cấu trúc. FE render `$...$` và `$$...$$` bằng KaTeX với `trust: false`; chưa đánh giá nhận diện công thức trên tài liệu thật |
| PPTX tự chuyển PDF | Chưa có | Chưa tìm thấy tích hợp Gotenberg/LibreOffice trong source đã rà soát |
| IMPORT_QUIZ_FROM_TEXT | Đã nối và qua test ba lớp | Single Agent có tool thứ tư; thiếu đáp án hỏi lại; draft `IMPORTED_TEXT` không citation; Java kiểm nguồn trước khi lưu; FE có gợi ý nhập đề; còn browser/provider E2E |
| KaTeX và ảnh trong Quiz | KaTeX hoàn thành; contract ảnh Python đã triển khai, Java/CSDL đang chờ migration V23 | Model chỉ chọn `imageEvidenceId` thuộc visual evidence đã cấp; Python ánh xạ về document/version/page/bbox tin cậy. Còn materialize PNG private, lưu metadata Java, endpoint quyền và FE hiển thị |

Kết luận: luồng Q1–Q4 đã có source xuyên FE–Java, đã biên dịch và kiểm thử với migration/database Testcontainers. D1, phần KaTeX của D2 và D4 đã qua test theo service/contract. Browser E2E, provider thật, image artifact của D2 và toàn bộ D3 vẫn là phần việc tiếp theo.

## 3. Phạm vi thay đổi đã được chấp thuận nhưng chưa triển khai hết

Người dùng đã yêu cầu triển khai kế hoạch này. Các mục dưới đây là phạm vi mở rộng đã được chấp thuận cho đợt tích hợp, nhưng vẫn phải cập nhật contract trước khi viết source tương ứng:

1. Nhận PPTX ở Java và chuyển sang PDF: cần cập nhật quy tắc PDF-only, giới hạn file, dịch vụ chuyển đổi, timeout, cleanup và kiểm tra text layer sau chuyển đổi. Python tiếp tục nhận PDF.
2. Công cụ thứ tư nhập đề đã được thêm vào allowlist với nguồn `IMPORTED_TEXT`. Không gắn citation PDF giả; thiếu đáp án phải hỏi lại; đáp án do người nhập cung cấp chưa được kiểm chứng và Student vẫn phải duyệt trước khi luyện.
3. Student tạo Quiz tự luyện từ học liệu lớp: cần cấp quyền theo enrollment/publication và giới hạn `SLIDE_PDF`; không tái sử dụng scope Personal PDF hoặc cho phép `REFERENCE_PDF`.
4. Vision chỉ bổ sung bằng chứng hình ảnh; không tự mở OCR cho PDF scan. Parser hiện có khả năng nhận trang chỉ có caption, cần kiểm tra lại policy text-layer trước bật production.

## 4. Các mốc triển khai

| Mốc | Công việc | Nghiệm thu |
|---|---|---|
| Q0 — Chốt contract | Quyền, late policy, số lần nộp, thời điểm hiện đáp án, liên kết Quiz–Assignment và schema response | API/database/spec thống nhất trước code |
| Q1 — Tách Review | Lọc createdBy Student + READY tại mọi truy vấn Review | Quiz Teacher không xuất hiện trong kho cá nhân, số lượng hoặc câu sai cá nhân |
| Q2 — Backend Assignment Quiz | Migration mới, loại bài tập, quizId, quizAttemptId, score; giao bài và nộp/chấm atomic, idempotent | Teacher owner/Student APPROVED; không nộp hộ; không lộ đáp án trước submit |
| Q3 — FE giao/làm bài | Teacher duyệt rồi giao bài có hạn; Student làm/nộp; tích hợp lịch | Tải lại trang giữ đúng trạng thái; xử lý double-submit và lỗi API |
| Q4 — Báo cáo lớp | Điểm, chi tiết câu trả lời, tỷ lệ sai, đã/chưa/muộn | Chỉ Teacher owner đọc; mẫu số theo danh sách Student hợp lệ đã xác định |
| D1 — Vision hardening | Giới hạn ảnh/token/timeout, text-layer gate, provenance và fallback có trạng thái | PDF tổng hợp có ảnh nhúng/vector/bảng/công thức; caption không vượt scope |
| D2 — Công thức và ảnh Quiz | **KaTeX đã xong; internal image schema và guardrail Python đã xong**; còn migration V23, lưu Object Storage, Java cấp quyền và FE | KaTeX không chạy HTML tùy ý; ảnh có document/version/page/bbox, object key riêng tư và quyền truy cập |
| D3 — PPTX | Chỉ sau xác nhận phạm vi: Java conversion adapter + job, PDF validation | File lỗi/mã hóa/quá hạn được xử lý; không gọi LibreOffice từ browser |
| D4 — Import đề | **Đã nối và test Python–Java–FE**; còn browser/provider E2E | Không tạo nguồn PDF giả; thiếu đáp án hỏi lại; đúng 4 lựa chọn/một đáp án |

## 5. Contract và dữ liệu cần bổ sung

- Source dùng đúng bảng `app.course_assignments`; migration tiến V22 là phiên bản kế tiếp tại thời điểm triển khai và không sửa các migration cũ.
- Public contract hiện có trong source: tạo Assignment nhận `type/quizId`; Student bắt đầu qua `/quiz-attempts`, nộp qua `/quiz-submissions`; Teacher xem chi tiết qua `/quiz-attempt`. Chỉ công nhận hoạt động sau khi migration và E2E runtime đạt.
- Nộp bài nhận `attemptId` và answer IDs, không nhận điểm từ client. Chính `attemptId` là định danh idempotency: gửi lại cùng lượt đã chấm trả lại kết quả đã lưu, còn làm lượt mới phải tạo attempt mới. Java trả submission/attempt ID, submittedAt, late status và điểm theo policy công bố.
- Teacher report cần quyền owner và enrollment snapshot/policy; tính tỷ lệ sai theo lượt nộp được chọn, tránh đếm lặp mọi attempt.
- Đề xuất mặc định cho phép nộp muộn và ghi LATE để khớp báo cáo; cần xác nhận trước Q0. Số lần nộp và thời điểm hiện lời giải vẫn là quyết định còn mở.
- Internal AI API cần schema version mới khi thêm imported source hoặc image artifact; cập nhật contract test Java/Python cùng task. Giữ Java là nơi chấm điểm và quản lý lifecycle.

## 6. Kiểm thử và đồng bộ

Kiểm thử bổ sung: Review isolation; Quiz Assignment owner/enrollment; nộp atomic/idempotent; deadline/timezone/late; điểm và câu đúng/sai; Teacher report; KaTeX; quyền ảnh; conversion thất bại; tool nhập đề và prompt injection. Test dùng tài liệu tổng hợp; live provider là bước nghiệm thu riêng có cấp quyền.

Lần cập nhật 03/11/2026 đã chạy 102 test FE, TypeScript và lint; 25 test Java chọn lọc đạt; `RealHttpApiTest` đạt 22 ca với một ca tùy chọn bỏ qua; full Maven suite đạt với Docker/PostgreSQL Testcontainers và Flyway V22. Toàn bộ test/ruff AI đạt với một integration test tùy chọn bị skip. Chưa chạy browser E2E hoặc gọi provider live trong đợt này.

Đồng bộ theo thứ tự: kế hoạch này → specification/specs → API/database → AI/BE/FE plan → UI design/demo → báo cáo/diagram. Giữ kế hoạch MVP v2 làm baseline đối với các mục chưa được thay thế hoặc chưa được xác nhận phạm vi.
