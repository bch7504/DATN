# SPEC-09 — Hiện trạng dự án StudyFlow

**Ngày chốt:** 11/11/2026  
**Loại tài liệu:** Ảnh chụp hiện trạng cho một lần rà soát và khởi động hệ thống  
**Vai trò thực hiện:** Architect/Integration  
**Không thay thế:** Các đặc tả chức năng `00`–`08`, `docs/api-plan.md` hoặc `docs/database-plan.md`

## 1. Mục tiêu của lần thực hiện

Tài liệu này trả lời bốn câu hỏi tại thời điểm chốt:

1. Kiến trúc và ranh giới service hiện được triển khai như thế nào?
2. Chức năng nào đã có mã và có thể tiếp tục kiểm thử?
3. Thành phần nào đã được kiểm tra trực tiếp trong lần chạy này?
4. Việc nào còn thiếu trước khi có thể tuyên bố hoàn thành MVP?

Trạng thái được dùng trong tài liệu:

- **Đã kiểm tra:** có kết quả chạy hoặc endpoint xác nhận trong lần thực hiện này.
- **Đã có nền tảng:** đã có source code/contract/test liên quan nhưng chưa chạy đủ luồng thật trong lần này.
- **Chưa nghiệm thu:** còn thiếu kiểm thử tích hợp, dữ liệu thật hoặc xác nhận của người dùng.

## 2. Kết luận nhanh

StudyFlow đã có đủ ba service chính theo kiến trúc đã chốt: Next.js, Java Spring Boot và Python AI Service. Hạ tầng local gồm PostgreSQL/pgvector, Object Storage, Mailpit và dịch vụ chuyển PPTX sang PDF đã được khởi động. Frontend và Backend phản hồi HTTP 200; AI API lắng nghe đúng cổng và bắt buộc service credential cho internal health endpoint.

Các luồng nghiệp vụ chính đã có nền tảng từ đăng nhập, lớp học phần, kho học liệu, PDF Viewer/Note/Tutor, Personal Document Assistant, AI Quiz, Assignment, Dashboard đến Kế hoạch & Lịch. Tuy nhiên, lần rà soát này chưa chạy lại toàn bộ E2E Student → Teacher → Admin và chưa đủ cơ sở tuyên bố MVP đã nghiệm thu hoàn toàn.

## 3. Kiến trúc hiện tại

```text
Next.js Web → Java Spring Boot → Python AI Service → OpenRouter
                    │                  │
                    ├→ PostgreSQL app  └→ PostgreSQL ai + pgvector
                    ├→ Object Storage
                    ├→ Mailpit/SMTP local
                    └→ PPTX Converter → PDF chuẩn hóa
```

- Browser chỉ gọi Java qua `/api/v1`.
- Java kiểm tra đăng nhập, quyền, sở hữu dữ liệu và giữ trạng thái nghiệp vụ.
- Python chỉ nhận phạm vi đã được Java cho phép để xử lý PDF, tìm bằng chứng, trả lời có cấu trúc và sinh bản nháp Quiz.
- Quiz lifecycle, chấm điểm, tiến độ, Streak, Daily Goal và Study Plan thuộc Java.
- Schema `app` và `ai` tách quyền trong cùng PostgreSQL cluster; Python dùng pgvector.

## 4. Trạng thái chạy local trong lần thực hiện

| Thành phần | Địa chỉ/cổng | Kết quả | Ghi chú |
|---|---:|---|---|
| Next.js Frontend | `http://localhost:3000` | **Đã kiểm tra — HTTP 200** | Chạy bằng Webpack để tránh Turbopack panic khi xử lý `globals.css` |
| Java Backend | `http://127.0.0.1:8088` | **Đã kiểm tra — health HTTP 200** | Actuator trả trạng thái `UP` |
| Python AI API | `127.0.0.1:8001` | **Đã kiểm tra cổng** | Internal health từ chối request thiếu service credential đúng theo contract; chưa gọi health có credential trong lần này |
| AI document worker | tiến trình riêng | **Đã khởi động** | Chưa tạo job mới để kiểm tra xử lý end-to-end trong lần này |
| PostgreSQL/pgvector | `127.0.0.1:5433` | **Đã khởi động** | Container healthy; dữ liệu/volume được giữ nguyên |
| Object Storage | `127.0.0.1:8333` | **Đã khởi động** | Bucket local giữ nguyên, không reset dữ liệu |
| Mailpit | `http://127.0.0.1:8025` | **Đã kiểm tra — HTTP 200** | Dùng nhận OTP/email local |
| PPTX Converter | `127.0.0.1:3001` | **Đã khởi động** | Container healthy |

## 5. Hiện trạng theo vai trò người dùng

### 5.1 Student

| Nhóm chức năng | Trạng thái hiện tại |
|---|---|
| Đăng ký OTP, đăng nhập, refresh/logout, hồ sơ | **Đã có nền tảng** |
| Tham gia lớp bằng join code và chờ Teacher duyệt | **Đã có nền tảng** |
| Xem lớp đã duyệt, học liệu và bài tập của lớp | **Đã có nền tảng** |
| Xem `SLIDE_PDF` theo từng trang, chọn/copy chữ và ghi chú theo trang | **Đã có nền tảng** |
| Course Material AI Tutor có hội thoại theo đúng PDF/version | **Đã có nền tảng**; citation vẫn nằm trong response có cấu trúc, giao diện hiện không hiển thị khối nguồn theo quyết định UI gần nhất |
| Tải Personal PDF, chọn 1–10 tài liệu và dùng Personal Assistant | **Đã có nền tảng** |
| Hỏi đáp, tóm tắt, tạo Quiz có nguồn hoặc nhập Quiz từ văn bản | **Đã có nền tảng** |
| Duyệt Quiz cá nhân, làm bài, lưu attempt và xem câu sai | **Đã có nền tảng** |
| Dashboard, Content Progress, Study Streak và Daily Goal | **Đã có nền tảng** |
| Kế hoạch & Lịch tuần cá nhân | **Đã có nền tảng** |

### 5.2 Teacher

| Nhóm chức năng | Trạng thái hiện tại |
|---|---|
| Tạo Course Offering theo Subject + Semester | **Đã có nền tảng** |
| Quản lý join code, yêu cầu chờ duyệt và danh sách Student | **Đã có nền tảng** |
| Kho mặc định “Tài liệu tải lên”, kho theo môn và kho riêng | **Đã có nền tảng** |
| Upload PDF/PPTX vào kho Teacher | **Đã có nền tảng** |
| Chuyển PPTX sang PDF, kiểm tra text layer và chỉ lưu PDF chuẩn hóa | **Đã có nền tảng** |
| Thêm tài liệu từ kho Teacher vào kho lớp/công bố cho lớp | **Đã có nền tảng** |
| AI Quiz Studio chọn 1–10 `SLIDE_PDF` đã công bố | **Đã có nền tảng** |
| Duyệt/công bố Quiz và giao thành Assignment | **Đã có nền tảng** |
| Xem số đã nộp, đúng hạn, nộp muộn và thống kê câu sai | **Đã có nền tảng**; cần chạy lại E2E sau các thay đổi UI gần nhất |

Teacher không có Personal Chatbot hoặc Course Material Tutor; hai chức năng này thuộc Student theo đúng phạm vi đã chốt.

### 5.3 Admin

| Nhóm chức năng | Trạng thái hiện tại |
|---|---|
| Quản lý người dùng và trạng thái tài khoản | **Đã có nền tảng** |
| Quản lý Subject và Semester | **Đã có nền tảng** |
| Giám sát Course Offering, feedback và audit | **Đã có nền tảng** |
| Runtime settings | **Đã có nền tảng** |

Admin không phân công từng lớp, không quản lý Quiz và không xem Progress cá nhân của Student trong MVP.

## 6. Hiện trạng Backend Java

- Java là system of record cho auth/RBAC, Course Offering, Enrollment, tài liệu, publication, conversation, Quiz, Assignment, scoring, progress và plan.
- Course Material nhận PDF có text layer hoặc PPTX tối đa 20 MB. PPTX được chuyển thành PDF trước khi lưu và gửi lập chỉ mục.
- `SLIDE_PDF` hỗ trợ Viewer, Note, Tutor và Quiz; `REFERENCE_PDF` chỉ tải xuống.
- Personal Document thuộc Student owner; Java kiểm owner và authorized scope trước khi gọi Python.
- Course Material Tutor lưu long-term conversation theo Student + PDF version và chỉ gửi tối đa 12 lượt gần nhất sang Python.
- Quiz dùng `MCQ_SINGLE`: đúng 4 lựa chọn, một đáp án đúng; Java validate, giữ lifecycle và chấm điểm.
- Assignment hỗ trợ bài Quiz và tệp nộp, nhắc hạn, báo cáo đúng hạn/muộn/chưa nộp.
- Migration sử dụng forward-only; không sửa migration đã chạy.

## 7. Hiện trạng Python AI Service

- Đã có internal API schema version 4 cho index/deindex, job status, Personal Assistant, Course Material Tutor, Quiz generation và health.
- PDF pipeline có parsing/chunking, embedding 1024 chiều và lưu pgvector.
- Retrieval hiện kết hợp vector search và PostgreSQL full-text search, hợp nhất bằng RRF rồi dùng LLM reranker.
- Bộ lọc quyền chạy trước retrieval và được kiểm tra lại sau rerank.
- Personal Document Assistant dùng một Single Orchestrator Agent với bốn tool: hỏi đáp, tóm tắt, tạo Quiz có nguồn và nhập Quiz từ văn bản.
- Course Material Tutor nhận short-term memory do Java cung cấp, viết lại câu hỏi nối tiếp và dùng trang hiện tại + bằng chứng làm working memory. Long-term memory vẫn thuộc Java.
- Guardrail giữ authorized scope, chặn prompt thay đổi system rule/schema, yêu cầu `NO_EVIDENCE` khi thiếu bằng chứng và validate citation/output có cấu trúc.
- Lần đánh giá AI được ghi trong `services/ai/IMPLEMENTATION_STATUS.md` đã có Hybrid RAG live trên tài liệu Kỹ thuật số; số liệu này là kết quả lịch sử, không phải E2E được chạy lại trong SPEC-09.

## 8. Phạm vi dữ liệu demo hiện chốt

- Kịch bản demo chuẩn tập trung vào môn **Kỹ thuật số**, lớp `KTS-01`.
- Học liệu chính dùng **Slide Chương 2 – Cổng logic**.
- Kịch bản đi qua Teacher upload/công bố → Student xem/note/hỏi Tutor → Teacher tạo và giao Quiz → Student nộp → Teacher xem thống kê.
- Việc cơ sở dữ liệu local chỉ còn đúng học liệu Chương 2 chưa được xác minh lại bằng E2E trong lần này; không suy luận trạng thái dữ liệu chỉ từ giao diện hoặc tài liệu.

## 9. Kiểm tra đã chạy trong lần thực hiện

| Kiểm tra | Kết quả |
|---|---|
| Frontend `/login` | HTTP 200 sau khi chạy bằng Webpack |
| Backend `/actuator/health` | HTTP 200, `UP` |
| Frontend unit/contract tests | **123/123 đạt** |
| PostgreSQL, Object Storage, Mailpit, PPTX Converter | Đã khởi động; container healthy |
| AI API | Cổng 8001 lắng nghe; request thiếu credential bị từ chối đúng contract |
| Full browser E2E Student/Teacher/Admin | **Chưa chạy trong lần này** |
| Live RAG/Quiz trên Slide Chương 2 | **Chưa chạy lại trong lần này** |
| Toàn bộ Java test suite | **Chưa chạy trong lần này** |

## 10. Thay đổi kỹ thuật của lần thực hiện

### FE-DEV-01 — Ổn định lệnh chạy Frontend local

- Hiện trạng đầu: `next dev` dùng Turbopack, panic khi xử lý `src/app/globals.css`, khiến `/login` trả HTTP 500.
- Thay đổi: script `dev` được cố định thành `next dev --webpack`.
- Output: Frontend trả HTTP 200 tại `/login`.
- Errors/cách xử lý: nếu cổng 3000 đã có tiến trình cũ, dừng tiến trình đó rồi chạy lại `npm.cmd run dev`; không mở thêm server ở cổng 3001 để che lỗi.

## 11. Phần chưa nghiệm thu và rủi ro

1. Chưa chạy lại full E2E theo `docs/demo-flow.md` sau các thay đổi kho Teacher, route lớp và UI Tutor.
2. Chưa chạy Java test suite trong lần này; health `UP` không thay thế kiểm thử nghiệp vụ.
3. Chưa gọi AI health bằng service credential trong lần này; trạng thái cổng lắng nghe không chứng minh provider/database đều hoạt động.
4. Chưa chạy lại live RAG, LLM reranker và Quiz generation trên Slide Chương 2 trong lần này.
5. Citation của Course Material Tutor đang bị ẩn khỏi UI theo yêu cầu gần nhất, dù Backend/AI vẫn trả citation. Khi viết báo cáo hoặc nghiệm thu tiêu chí “trả lời kèm nguồn”, cần chốt lại quyết định hiển thị.
6. Lần compile route đầu trong development có thể chậm hơn các lần sau; cần đo bằng production build trước khi kết luận hiệu năng.
7. Các service vẫn khởi động riêng; chưa có Docker Compose thống nhất cho toàn bộ Frontend + Java + Python.

## 12. Thứ tự thực hiện tiếp theo

1. Chạy full E2E bằng đúng ba vai trò theo `docs/demo-flow.md`.
2. Chạy luồng thật Slide Chương 2: upload/công bố/view/note/Tutor/Quiz/Assignment/report.
3. Chạy Java test suite và xử lý lỗi môi trường nếu có.
4. Chạy AI authenticated health và live evaluation có kiểm soát.
5. Kiểm tra production build Frontend và thời gian chuyển route.
6. Tạo SPEC-10 cho lần triển khai tiếp theo, ghi rõ thay đổi và kết quả thay vì sửa lịch sử SPEC-09.

## 13. Tiêu chí đóng SPEC-09

- [x] Ghi rõ hiện trạng theo service và vai trò.
- [x] Phân biệt “đã có nền tảng” với “đã kiểm tra”.
- [x] Ghi kết quả chạy local và kiểm thử Frontend.
- [x] Ghi rõ phần chưa nghiệm thu và rủi ro.
- [x] Không đọc hoặc ghi secret, `.env`, user upload hay dữ liệu cá nhân.
