# Implementation Plan — Quiz lớp, Ôn tập cá nhân và Trí tuệ tài liệu

Ngày đối chiếu source gần nhất: 04/11/2026. Vai trò rà soát: ARCHITECT_OR_INTEGRATION_AGENT.

Đây là kế hoạch thay đổi tiếp theo trên baseline MVP v2. Trạng thái dưới đây kết hợp đối chiếu source và kết quả kiểm thử ngày 03/11/2026; kiểm thử HTTP dùng dữ liệu tổng hợp và PostgreSQL Testcontainers, không thay thế browser E2E hoặc nghiệm thu provider thật.

## 1. Luồng chức năng mục tiêu

- Teacher chọn Slide PDF → sinh Quiz → duyệt/sửa → nhập tiêu đề, hướng dẫn và hạn nộp → giao bài tập trắc nghiệm cho lớp.
- Student nhận bài ở Bài tập và lịch, làm bài và nộp; Java chấm điểm, lưu lượt làm và kết quả nộp trong một transaction.
- Teacher xem đã nộp/chưa nộp/nộp muộn, điểm thang 10, từng câu đúng/sai và tỷ lệ sai theo câu.
- Kho Ôn tập chỉ chứa Quiz do Student tự tạo; Quiz Teacher được truy cập qua bài tập lớp. Cần áp dụng bộ lọc này cho cả danh sách, số lượng, lịch sử và tổng hợp câu sai.
- Student tự luyện từ tài liệu cá nhân; kế hoạch mở rộng thêm tài liệu lớp được cấp quyền và đề văn bản dán vào hội thoại.

## 2. Kết quả kiểm tra hiện trạng

Cập nhật triển khai: Q1 đã tách Quiz cá nhân khỏi Quiz Teacher trong Review. Q2 có migration V22, endpoint bắt đầu/nộp Quiz lớp, Java chấm điểm và cầu nối đưa Quiz AI đã duyệt sang mô hình Quiz dùng để giao bài; câu hỏi và nguồn trích dẫn được giữ cùng định danh. Q3–Q4 đã nối màn tạo Quiz Teacher, Bài tập Student, chi tiết đúng/sai và tỷ lệ sai theo câu. Ngày 04/11/2026, một ca HTTP xuyên suốt đã xác nhận Teacher sinh/công bố Quiz, gắn vào Assignment, Student được duyệt làm và nộp, Java chấm điểm, Teacher xem kết quả cùng tỷ lệ sai; toàn bộ 25 ca HTTP đạt, một ca tích hợp tùy chọn được bỏ qua. D1 đã hoàn thành hardening source và test tổng hợp: giới hạn số trang/pixel/ngữ cảnh/chú thích, timeout từng trang, text-layer gate độc lập với Vision và trạng thái fallback. D2 đã có KaTeX và source end-to-end cho ảnh: schema v4, migration V23, Java render PNG từ PDF gốc, metadata riêng tư, endpoint kiểm quyền và FE duyệt ảnh. D4 đã nối Python–Java–FE. Browser E2E và provider thật vẫn là bước nghiệm thu còn lại.

| Hạng mục | Trạng thái source | Bằng chứng và phần thiếu |
|---|---|---|
| Teacher sinh, duyệt và giao Quiz | Đã nối source | Form có tên bài/hạn nộp; duyệt Quiz, tạo và công bố Assignment qua Java |
| Bài tập lớp có hạn nộp, nộp tệp và thống kê | Đã mở rộng source | `CourseAssignment` có `ESSAY/QUIZ`, `quizId`; báo cáo có score/quizAttemptId |
| Gắn Quiz vào Assignment | Đã nối AI draft, migration và HTTP E2E | V22 thêm type/quizId/quizAttemptId; khi Teacher công bố, Java tạo Quiz/câu hỏi/nguồn chấm điểm bằng cùng ID. HTTP đã chứng minh Quiz sinh qua AI gắn được vào Assignment |
| Nộp bài trắc nghiệm lớp | Đã nối và kiểm thử HTTP | Student `APPROVED` bắt đầu trong Assignment, không thấy đáp án trước khi nộp, Java chấm và lưu score; người ngoài lớp bị chặn `403`; còn browser E2E |
| Báo cáo điểm và chi tiết Quiz theo bài tập | Đã nối và kiểm thử HTTP | Teacher owner xem điểm/câu đúng-sai/citation; `questionAnalytics` cho ca sai trả submission=1, wrong=1, wrongRate=100%, không đếm lặp attempt cũ. Còn browser E2E |
| Tách Kho Ôn tập khỏi Quiz Teacher | Đã sửa và test Java | Truy vấn Review giới hạn Student owner + `STUDENT` + `READY`; ngày 04/11 có 3 test Java và 9 test FE Review đạt; còn browser E2E |
| AI đọc ảnh/sơ đồ trong PDF | Đã harden source và test tổng hợp | PyMuPDF, VisionCaptionClient, OpenRouter và worker/indexing đã nối; mỗi trang có timeout và giới hạn tài nguyên, trạng thái `NOT_VISUAL/DISABLED/CAPTIONED/FAILED`; PDF không có text layer vẫn trả `PDF_TEXT_REQUIRED` dù Vision tạo được caption. Toàn bộ test AI và lint đạt; chưa nghiệm thu live Vision |
| Layout, bảng Markdown và công thức | Đã có source và test tổng hợp | PyMuPDF lấy block theo thứ tự đọc, loại phần bảng khỏi text thường, xuất bảng Markdown có giới hạn; metadata đánh dấu LaTeX và FE render KaTeX với `trust: false`. Năm test parser đạt; còn đánh giá trên tập tài liệu thật được cấp quyền |
| PPTX tự chuyển PDF | Đã hoàn thành source, test và nghiệm thu local | Java kiểm PPTX OOXML, gọi Gotenberg/LibreOffice, kiểm PDF/text layer và chỉ lưu PDF; FE nhận PDF/PPTX. Ngày 04/11/2026, smoke test live tạo PDF 1 trang có text layer; browser E2E Teacher trên lớp KTS-01 xác nhận PPTX được lưu vào kho riêng dưới tên `.pdf`. Chưa công bố tệp kiểm thử cho Student |
| IMPORT_QUIZ_FROM_TEXT | Đã nối, migration và HTTP contract đạt | Single Agent có tool thứ tư; thiếu đáp án hỏi lại; draft `IMPORTED_TEXT` không citation; Java kiểm nguồn trước khi lưu; FE có gợi ý nhập đề. Ngày 04/11: 4 test Python, 17 test Java liên quan và bộ 24 kiểm thử HTTP đạt. V24 cho phép mode `IMPORTED_TEXT_STUDENT`; ca HTTP xác nhận draft `REVIEW_REQUIRED`, đúng 4 lựa chọn, không citation và không ảnh PDF giả. Còn browser/provider E2E |
| KaTeX và ảnh trong Quiz | Source, migration và HTTP contract đã triển khai | Model chỉ chọn visual evidence đã cấp; Python ánh xạ nguồn tin cậy; Java render/lưu PNG riêng tư và kiểm quyền; FE tải qua Java. Ngày 04/11: V23 đã chạy trên PostgreSQL local; 6 test FE, 9 test Java liên quan và 23 kiểm thử HTTP đạt. Ca HTTP xác nhận Teacher owner và Student `APPROVED` nhận PNG; người ngoài nhận owner-safe `404`, chưa đăng nhập nhận `401`. Còn browser/provider E2E |

Kết luận: luồng Q1–Q4 và D4 đã có source xuyên FE–Java/Python. Riêng Q2–Q4 đã có kiểm thử HTTP hoàn chỉnh từ Quiz AI của Teacher đến Assignment, lượt làm của Student và báo cáo Teacher; đáp án chỉ xuất hiện sau khi nộp và citation theo câu được giữ lại. D4 đã có migration V24 và kiểm thử HTTP nhập đề đến bản nháp chờ duyệt; còn browser/provider E2E. D2 đã hoàn thành source, unit test materializer/UI, migration V23 và kiểm thử HTTP quyền tải ảnh trên PostgreSQL Testcontainers; còn browser E2E và provider thật. D3 đã hoàn thành source, contract, test tổng hợp, smoke test Gotenberg và browser E2E Teacher upload PPTX thành PDF trong kho riêng.

## 3. Phạm vi thay đổi đã được chấp thuận nhưng chưa triển khai hết

Người dùng đã yêu cầu triển khai kế hoạch này. Các mục dưới đây là phạm vi mở rộng đã được chấp thuận cho đợt tích hợp, nhưng vẫn phải cập nhật contract trước khi viết source tương ứng:

1. Nhận PPTX ở Java và chuyển sang PDF: **đã triển khai và nghiệm thu local** với giới hạn file, Gotenberg nội bộ, timeout, cleanup và kiểm tra text layer sau chuyển đổi. Python tiếp tục chỉ nhận PDF. Browser E2E đã xác nhận Teacher tải PPTX và Java lưu tên PDF chuẩn hóa trong kho riêng; tệp kiểm thử không được công bố cho Student.
2. Công cụ thứ tư nhập đề đã được thêm vào allowlist với nguồn `IMPORTED_TEXT`. Không gắn citation PDF giả; thiếu đáp án phải hỏi lại; đáp án do người nhập cung cấp chưa được kiểm chứng và Student vẫn phải duyệt trước khi luyện.
3. Student không tạo Quiz trực tiếp từ học liệu lớp. Student chỉ xem, ghi chú và hỏi AI Tutor trên `SLIDE_PDF` đã công bố; Quiz Student chỉ được tạo từ Personal PDF hoặc văn bản do chính Student nhập. Teacher là vai trò duy nhất sinh Quiz từ `SLIDE_PDF` của lớp rồi duyệt và công bố.
4. Vision chỉ bổ sung bằng chứng hình ảnh; không tự mở OCR cho PDF scan. Parser hiện có khả năng nhận trang chỉ có caption, cần kiểm tra lại policy text-layer trước bật production.

## 4. Các mốc triển khai

| Mốc | Công việc | Nghiệm thu |
|---|---|---|
| Q0 — Chốt contract | Quyền, late policy, số lần nộp, thời điểm hiện đáp án, liên kết Quiz–Assignment và schema response | API/database/spec thống nhất trước code |
| Q1 — Tách Review | Lọc createdBy Student + READY tại mọi truy vấn Review | Quiz Teacher không xuất hiện trong kho cá nhân, số lượng hoặc câu sai cá nhân |
| Q2 — Backend Assignment Quiz | **Đã hoàn thành source và HTTP E2E**: migration, AI draft → Quiz giao bài, quizId, quizAttemptId, score; giao bài và nộp/chấm atomic | HTTP xác nhận Teacher owner/Student APPROVED; người ngoài bị chặn; không lộ đáp án trước submit |
| Q3 — FE giao/làm bài | Teacher duyệt rồi giao bài có hạn; Student làm/nộp; tích hợp lịch | Tải lại trang giữ đúng trạng thái; xử lý double-submit và lỗi API |
| Q4 — Báo cáo lớp | **Đã hoàn thành source và HTTP E2E**: điểm, chi tiết câu trả lời/citation, tỷ lệ sai, đã/chưa/muộn | Chỉ Teacher owner đọc; ca HTTP sai một câu trả đúng submission/wrong/wrongRate; còn browser E2E |
| D1 — Vision hardening | **Đã hoàn thành source và test tổng hợp**: giới hạn số trang, pixel, context/caption, timeout từng trang, provenance theo trang, text-layer gate và fallback có trạng thái | PDF vector tổng hợp được caption đúng một lần; timeout/provider failure giữ text gốc; caption quá giới hạn không được index; PDF chỉ có ảnh vẫn bị từ chối |
| D2 — Công thức và ảnh Quiz | **Source end-to-end, Flyway V23 và HTTP authorization đã xong**; còn browser/provider E2E | KaTeX không chạy HTML tùy ý; ảnh có document/version/page/bbox, object key riêng tư; owner/enrollment gate đã được kiểm tra qua HTTP |
| D3 — PPTX | **Hoàn thành source/contract/test, smoke test và browser E2E local**; Java chuẩn hóa PPTX thành PDF, Python không đổi | Test Java/FE đạt; Compose hợp lệ; Gotenberg 8.39.0 tạo PDF có text layer; UI Teacher xác nhận lưu `.pdf` vào kho riêng |
| D4 — Import đề | **Đã nối Python–Java–FE, Flyway V24 và HTTP contract**; còn browser/provider E2E | HTTP xác nhận `REVIEW_REQUIRED`, đúng 4 lựa chọn/một đáp án, không citation hoặc ảnh PDF giả; thiếu đáp án vẫn phải hỏi lại |

## 5. Contract và dữ liệu cần bổ sung

- Source dùng đúng bảng `app.course_assignments`; migration tiến V22 là phiên bản kế tiếp tại thời điểm triển khai và không sửa các migration cũ.
- Public contract hiện có trong source: tạo Assignment nhận `type/quizId`; Student bắt đầu qua `/quiz-attempts`, nộp qua `/quiz-submissions`; Teacher xem chi tiết qua `/quiz-attempt`. Chỉ công nhận hoạt động sau khi migration và E2E runtime đạt.
- Nộp bài nhận `attemptId` và answer IDs, không nhận điểm từ client. Chính `attemptId` là định danh idempotency: gửi lại cùng lượt đã chấm trả lại kết quả đã lưu, còn làm lượt mới phải tạo attempt mới. Java trả submission/attempt ID, submittedAt, late status và điểm theo policy công bố.
- Teacher report cần quyền owner và enrollment snapshot/policy; tính tỷ lệ sai theo lượt nộp được chọn, tránh đếm lặp mọi attempt.
- Đề xuất mặc định cho phép nộp muộn và ghi LATE để khớp báo cáo; cần xác nhận trước Q0. Số lần nộp và thời điểm hiện lời giải vẫn là quyết định còn mở.
- Internal AI API cần schema version mới khi thêm imported source hoặc image artifact; cập nhật contract test Java/Python cùng task. Giữ Java là nơi chấm điểm và quản lý lifecycle.

## 6. Kiểm thử và đồng bộ

Kiểm thử bổ sung: Review isolation; Quiz Assignment owner/enrollment; nộp atomic/idempotent; deadline/timezone/late; điểm và câu đúng/sai; Teacher report; KaTeX; quyền ảnh; conversion thất bại; tool nhập đề và prompt injection. Test dùng tài liệu tổng hợp; live provider là bước nghiệm thu riêng có cấp quyền.

Lần cập nhật 04/11/2026 cho D3 đã chạy toàn bộ 104 test FE đạt, lint không có lỗi (còn hai cảnh báo `<img>` có sẵn) và `docker compose config` đạt. Năm test parser bảng/layout/công thức cũng đạt. Sau khi Docker Engine được bật, container Gotenberg 8.39.0 đã báo health `up` cho LibreOffice/Chromium và chuyển thành công PPTX tổng hợp thành PDF 20.201 byte, 1 trang, có text layer. Flyway xác thực 24 migration; V23 và V24 đã được áp dụng thành công, Alembic hoàn tất. Sau khi bổ sung cầu nối Quiz AI–Assignment, toàn bộ 273 test Java đạt, 0 lỗi và 2 test tích hợp tùy chọn bỏ qua. Riêng bộ HTTP Testcontainers đạt 25 ca, 0 lỗi và 1 ca tích hợp tùy chọn bỏ qua; trong đó có ca xuyên suốt Teacher AI Quiz → công bố → Assignment → Student làm/nộp → Teacher xem điểm và tỷ lệ sai. D1 đã chạy toàn bộ test AI thành công (một test tích hợp tùy chọn bỏ qua), `ruff` đạt và 14 test parser/worker/evaluation tập trung đạt. Browser E2E dùng tài khoản Teacher local trên lớp KTS-01 đã tải PPTX tổng hợp và giao diện xác nhận lưu tên PDF chuẩn hóa vào kho riêng; tệp không được công bố cho Student. Bản hardening mới chưa chạy lại với tài liệu thật; nghiệm thu Vision ngày 03/11 vẫn là baseline trước thay đổi này.

Đồng bộ theo thứ tự: kế hoạch này → specification/specs → API/database → AI/BE/FE plan → UI design/demo → báo cáo/diagram. Giữ kế hoạch MVP v2 làm baseline đối với các mục chưa được thay thế hoặc chưa được xác nhận phạm vi.
