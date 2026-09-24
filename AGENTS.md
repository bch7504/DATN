# AGENTS.md — Quy tắc làm việc cho AI coding agents

File này là chỉ dẫn bắt buộc cho mọi AI agent làm việc trong repository StudyFlow. Nếu yêu cầu của người dùng xung đột với file này, agent phải nêu xung đột và chỉ tiếp tục khi người dùng xác nhận thay đổi phạm vi.

## 1. Mục tiêu hệ thống

StudyFlow là nền tảng quản lý học tập và hỗ trợ ôn thi cho sinh viên:

```text
Document → Notes/Study Session → AI Tutor/Quiz → Assessment
         → Content Progress/Statistics → Study Plan/Review
         → Re-assessment
```

Kiến trúc đã chốt:

```text
Next.js Web → Java Spring Boot Backend → Python AI Service
                          ├→ PostgreSQL        ├→ PostgreSQL + pgvector
                          │   schema app       │   schema ai
                          └→ Object Storage    └→ LLM/Embedding API
```

- Frontend chỉ gọi Java backend.
- Java backend là system of record và sở hữu toàn bộ luật nghiệp vụ.
- Python AI service xử lý parsing/chunking/embedding, RAG, citation, sinh quiz và evaluation.
- Python không tự chấm điểm, cập nhật progress, study plan hoặc Quiz lifecycle.
- PostgreSQL dùng chung một cluster nhưng tách schema/role: Java sở hữu `app`, Python sở hữu `ai` và dùng pgvector; Java không đọc/ghi vector trực tiếp.

## 2. Trình tự bắt buộc trước khi làm việc

1. Xác định đúng một vai trò chính theo bảng ở mục 3.
2. Chỉ đọc các file thuộc cột `ĐƯỢC ĐỌC` của vai trò đó.
3. Đọc README gần nhất trong thư mục phụ trách trước khi sửa code.
4. Nếu thay đổi đi qua ranh giới service, cập nhật/đối chiếu `docs/api-plan.md` trước; không đọc code service còn lại để đoán contract.
5. Chỉ sửa file thuộc cột `ĐƯỢC SỬA`.
6. Chạy test/lint/build phù hợp đúng service đã sửa.
7. Báo cáo file đã thay đổi, kiểm tra đã chạy và contract nào bị ảnh hưởng.

Nếu không xác định được vai trò hoặc cần đọc ngoài phạm vi, dừng lại và hỏi người dùng đúng một câu ngắn.

## 3. Ma trận quyền theo vai trò

### FRONTEND_AGENT

Mục tiêu: Next.js Student UI và Admin UI.

ĐƯỢC ĐỌC:

- `AGENTS.md`
- `apps/web/**`
- `apps/web/README.md`
- `docs/api-plan.md`
- `docs/demo-flow.md`
- `PROJECT_STRUCTURE.md`
- `.env.example` nhưng chỉ các biến bắt đầu bằng `NEXT_PUBLIC_`

ĐƯỢC SỬA:

- `apps/web/**`
- Test frontend nằm trong `apps/web/tests/**`

KHÔNG ĐƯỢC ĐỌC HOẶC SỬA:

- `services/backend/**`
- `services/ai/**`
- Database migration, secret, log, upload hoặc tài liệu cá nhân

Luồng làm việc: UI → public Java API. Không gọi Python AI service, pgvector, database hoặc model API trực tiếp.

### BACKEND_AGENT

Mục tiêu: Java Spring Boot, PostgreSQL và business rules.

ĐƯỢC ĐỌC:

- `AGENTS.md`
- `services/backend/**`
- `services/backend/README.md`
- `docs/api-plan.md`
- `docs/database-plan.md`
- `docs/architecture.md`
- `PROJECT_STRUCTURE.md`
- `.env.example` chỉ để biết tên biến, không dùng giá trị thật

ĐƯỢC SỬA:

- `services/backend/**`
- `services/backend/src/main/resources/db/migration/**`
- Test backend Java

KHÔNG ĐƯỢC ĐỌC HOẶC SỬA:

- `apps/web/src/**`
- `services/ai/app/**`, `services/ai/evals/**`
- Secret, log, upload, raw document hoặc vector dump

Luồng làm việc: public API → auth/RBAC → application service → domain/repository. Tích hợp AI chỉ qua `integration/ai` và internal contract; không sao chép thuật toán Python vào Java.

### AI_AGENT

Mục tiêu: Python AI service, document intelligence và evaluation.

ĐƯỢC ĐỌC:

- `AGENTS.md`
- `services/ai/**`
- `services/ai/README.md`
- `docs/api-plan.md`, phần internal API
- `docs/architecture.md`, phần Python AI service
- `PROJECT_STRUCTURE.md`
- `.env.example` chỉ để biết tên biến AI/pgvector/Storage, không dùng giá trị thật

ĐƯỢC SỬA:

- `services/ai/**`
- Test và evaluation dataset tổng hợp trong `services/ai/tests/**`, `services/ai/evals/**`

KHÔNG ĐƯỢC ĐỌC HOẶC SỬA:

- `services/backend/src/**`
- `apps/web/src/**`
- PostgreSQL dump, production log, user upload hoặc Personal Document thật
- File chứa secret/token thật

Luồng làm việc: nhận authorized scope từ Java → xử lý/retrieval/generation → trả structured result + citation. Không truy cập trực tiếp bảng user, Course Enrollment, Quiz attempt/result hoặc study plan.

### QA_AGENT

Mục tiêu: test contract và luồng end-to-end bằng dữ liệu giả lập.

ĐƯỢC ĐỌC:

- `AGENTS.md`
- `docs/api-plan.md`
- `docs/demo-flow.md`
- README của service cần test
- Thư mục test của service tương ứng

ĐƯỢC SỬA:

- Các file dưới `**/tests/**`
- `services/ai/evals/**` nếu đang đánh giá RAG/quiz
- Tài liệu test trong `docs/**` khi người dùng yêu cầu

KHÔNG ĐƯỢC ĐỌC HOẶC SỬA:

- Implementation source ngoài phạm vi test nếu chưa được người dùng cho phép
- Production data, secret, log hoặc upload thật

Chỉ dùng fixtures/seed data tổng hợp, không sao chép dữ liệu người dùng thật vào test.

### ARCHITECT_OR_INTEGRATION_AGENT

Chỉ sử dụng vai trò này khi prompt của người dùng nói rõ đang làm kiến trúc, contract hoặc tích hợp xuyên service.

ĐƯỢC ĐỌC:

- Toàn bộ source code không thuộc danh sách cấm ở mục 4
- `README.md`, `PROJECT_STRUCTURE.md`, `docs/**`

ĐƯỢC SỬA:

- `docs/**`, `PROJECT_STRUCTURE.md`, `.env.example`
- Source thuộc nhiều service chỉ khi prompt nêu rõ thay đổi end-to-end

Vai trò này không được dùng để né giới hạn của FRONTEND_AGENT, BACKEND_AGENT hoặc AI_AGENT.

## 4. Danh sách cấm tuyệt đối

Mọi agent, mọi vai trò, không được đọc, in, tóm tắt, gửi ra ngoài hoặc sửa các đường dẫn sau nếu người dùng không cấp quyền rõ ràng trong chính prompt hiện tại:

```text
.env
.env.*                 (ngoại trừ .env.example)
**/secrets/**
**/*secret*
**/*credential*
**/*private-key*
**/*.pem
**/*.key
uploads/**
private-documents/**
backups/**
dumps/**
logs/**
postgres_data/**
node_modules/**
.next/**
target/**
build/**
.git/**
```

`Plan_do_an_tot_nghiep_dong_bo_toan_bo_kien_truc_CSDL_API.docx` chỉ ARCHITECT_OR_INTEGRATION_AGENT được đọc, và chỉ khi prompt yêu cầu đối chiếu tài liệu gốc. Các agent khác dùng tài liệu đã chuẩn hóa trong `docs/**`.

Nếu công cụ tìm kiếm trả về đường dẫn cấm, bỏ qua kết quả và không mở file. Không dùng lệnh đệ quy không có exclude khi nó có thể quét vào các vùng cấm.

## 5. Hợp đồng Java ↔ Python

Java gọi Python qua internal HTTP API:

- `POST /internal/v1/documents/index`
- `POST /internal/v1/documents/deindex`
- `GET /internal/v1/jobs/{jobId}`
- `POST /internal/v1/personal-rag/ask`
- `POST /internal/v1/slides/ask`
- `POST /internal/v1/quizzes/generate`
- `GET /internal/v1/health`

Mỗi request phải có:

- `requestId` để trace xuyên service.
- Service credential; không chuyển tiếp JWT người dùng nếu không cần.
- Authorized scope tối thiểu như user/document/version/Course Offering/page hoặc slide.
- Timeout; retry chỉ cho thao tác an toàn hoặc có idempotency key.
- Schema version khi contract bắt đầu thay đổi.

Python trả structured data; Java validate trước khi lưu. Mọi thay đổi contract phải cập nhật `docs/api-plan.md` và test hai phía trong cùng task hoặc ghi rõ phần bàn giao còn thiếu.

## 6. Quy tắc nghiệp vụ không được phá vỡ

- MVP chỉ tính `Content Progress` từ hoạt động học; không triển khai hoặc suy luận `Topic Mastery`.
- Khi thiếu bằng chứng, RAG/Tutor trả `NO_EVIDENCE`; không tự tạo câu trả lời không có nguồn.
- Backend Java sở hữu Quiz lifecycle và chấm điểm; LLM không chấm Quiz.
- Quiz dùng `MCQ_SINGLE`: mỗi câu có nhiều lựa chọn nhưng chỉ một đáp án đúng; Quiz AI phải được Student chấp nhận trước khi làm.
- Recommendation tự động ngoài phạm vi MVP; Student chủ động quyết định Study Plan.
- Personal Document thuộc owner; Admin không mặc định được dùng làm Official Content.
- AI Tutor phải trả citation theo document + pageNumber (Personal PDF) hoặc slideNumber (Teacher PPTX) và retrieval phải filter đúng scope.
- PPTX Teacher public chỉ xem web; PDF Teacher public chỉ tải xuống.
- Teacher chỉ upload PDF/PPTX; Personal Document chỉ upload PDF. Không nhận DOCX trong MVP. PDF Teacher không có Viewer, Note, Tutor, page progress hoặc AI indexing; PPTX giữ Slide Viewer/Note/Tutor.
- Teacher tự tạo Course Offering theo Subject + Semester, quản lý join code và duyệt Course Enrollment. Admin chỉ quản lý danh mục/giám sát, không phân công từng lớp trong MVP.
- Teacher upload và public tài liệu vào Course Offering mình sở hữu; chỉ Student có enrollment `APPROVED` mới xem PPTX, lưu Note cá nhân và dùng Slide Tutor. Không mô tả các chức năng học này là chức năng của Teacher.
- Admin không quản lý Quiz hoặc Progress cá nhân của Student trong MVP.
- Không có menu/route `Tiến độ & Thống kê` độc lập; Dashboard hiển thị tổng quan và Course Offering Detail hiển thị viewing progress chi tiết.
- Study Streak chỉ tính ngày có ít nhất một `VIEW_SLIDE`, `STUDY_TASK_COMPLETED` hoặc `QUIZ_COMPLETED`; login, Note và `ASK_AI` không được tính.
- Student chỉ cấu hình target Daily Goal. Java tính actual/phần trăm theo ngày và múi giờ người dùng; hoàn thành Daily Goal không phải điều kiện duy trì Study Streak.
- Không triển khai XP, Level, Achievement, badge hoặc leaderboard trong MVP.

## 7. Contract bắt buộc cho function và tool

Mọi function, method, constructor, API handler, background job, CLI command hoặc AI tool được tạo mới hay chỉnh sửa đều phải mô tả rõ contract trước khi hoàn tất implementation.

Contract bắt buộc gồm:

- `args`: tên từng tham số, kiểu dữ liệu, bắt buộc/tùy chọn, giá trị mặc định và constraint nếu có.
- `input`: nguồn và cấu trúc dữ liệu đầu vào, precondition, authorized scope hoặc context được phép sử dụng.
- `output`: kiểu/cấu trúc dữ liệu trả về, trạng thái có thể trả về và side effect nếu có. Hàm không trả dữ liệu phải ghi rõ `void`/`None`.
- `errors`: lỗi nghiệp vụ, lỗi validation hoặc exception có thể phát sinh và cách caller xử lý.

Quy ước theo loại implementation:

- Java: khai báo kiểu đầy đủ trong signature; public/application service phải có Javadoc hoặc contract DTO thể hiện `args`, input, output và exception.
- Python: mọi function phải có type hint cho toàn bộ tham số và return type; function/service public phải có docstring mô tả `Args`, `Returns` và `Raises`.
- TypeScript/JavaScript: ưu tiên TypeScript; function phải có type cho params và return. Nếu buộc dùng JavaScript, dùng JSDoc với `@param`, `@returns` và `@throws`.
- REST/internal API: request DTO/schema là input, response DTO/schema là output; phải ghi status code và error schema trong `docs/api-plan.md`.
- AI tool/function calling: phải có tên, mô tả, JSON Schema cho `args`/input và output schema có cấu trúc; không trả chuỗi tự do khi caller cần parse.
- CLI/background job: phải ghi command arguments hoặc job payload, exit/result status, retry/idempotency và side effect.

Không dùng tham số hoặc output mơ hồ như `Any`, `Object`, map/dict không schema tại service boundary. Test contract phải có ít nhất một trường hợp input hợp lệ, input không hợp lệ và kiểm tra output schema đối với public/internal boundary.

## 8. Chất lượng và bàn giao

- Không thêm dependency production khi chưa nêu lý do và tác động.
- Không đổi public/internal API âm thầm.
- Không tạo mock giả vờ là tính năng production; đánh dấu rõ fixture, seed hoặc placeholder.
- Không log document content, prompt nhạy cảm, token, password hoặc API key.
- Thay đổi schema phải có migration tiến, không sửa migration đã chạy.
- Test phải dùng dữ liệu tổng hợp.
- Hoàn tất task phải ghi rõ: scope, file đổi, test đã chạy, rủi ro/công việc còn lại.

## 9. Prompt khởi động đề xuất

Dùng mẫu sau khi giao việc cho agent khác:

```text
Trước khi làm, hãy đọc AGENTS.md ở root, tự xác định đúng vai trò cho task này và chỉ đọc/sửa các file được phép của vai trò đó. Nếu cần vượt phạm vi, dừng lại hỏi tôi. Nhiệm vụ: <mô tả cụ thể>.
```
