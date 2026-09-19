# StudyFlow — Low-level design

> Đây là thiết kế triển khai, không mô tả tính năng đã chạy. Ranh giới service xem [architecture.md](architecture.md), bảng dữ liệu xem [database-plan.md](database-plan.md), HTTP contract xem [api-plan.md](api-plan.md).

## 1. Tổ chức module

### Next.js

- App Router tách `(auth)`, `(student)` và `admin`. `components/features` giữ UI theo nghiệp vụ; `lib/api` là nơi duy nhất gọi `/api/v1`, chuẩn hóa error/pagination và gắn `requestId` khi cần.
- Viewer gọi endpoint Java đã kiểm quyền để lấy PDF hoặc artifact xem. Citation là liên kết tới document ID và PAGE/SLIDE/SECTION; web không tự suy ra quyền truy cập từ URL.
- Web hiển thị trạng thái xử lý tài liệu và polling khi `PENDING_INDEX`/`INDEXING`. Chức năng `mvp.html` hiện tại là prototype, không được coi là tích hợp production.

### Java modular monolith

| Module | Vai trò |
|---|---|
| `auth`, `user`, `security` | Login/refresh, RBAC, owner policy, session và public identity. |
| `subject`, `document`, `note` | Official/Personal content, upload/viewer, document status, Note/Bookmark và read events. |
| `quiz`, `progress`, `event` | Validate câu hỏi AI, attempt/scoring, Content Progress, Topic Mastery, mastery history và Learning Events. |
| `study`, `exam` | Task/Session/Plan, recommendation theo rule, Exam/Mock Exam/countdown/readiness. |
| `admin` | User, Official Content, trạng thái AI/RAG, feedback và vận hành; không quản lý Quiz/Exam/Progress cá nhân. |
| `integration.ai`, `integration.storage` | HTTP client có timeout và service token; S3 adapter. Domain không phụ thuộc SDK. |

Mỗi module đi theo `controller → application service → domain/repository`; transaction nghiệp vụ chỉ nằm trong PostgreSQL của Java. `progress` là nơi duy nhất ghi Topic Mastery. Event đọc tài liệu cập nhật Content Progress; attempt đã được Java chấm mới cung cấp bằng chứng cho Mastery. Khi thiếu bằng chứng giữ `NO_DATA` hoặc `LEARNING`.

### Python AI API và worker

- `api/routes` nhận internal HTTP; `schemas` validate contract và schema version; `core` giữ cấu hình, service authentication và logging an toàn.
- `pipelines/parsers` trả nội dung kèm vị trí nguồn: PDF = PAGE 1-based, PPTX = SLIDE 1-based, DOCX = SECTION. Chunk không băng qua ranh giới page/slide/section; khởi đầu 800 token/chunk và overlap tối đa 100 token trong cùng vị trí.
- `services/rag` tạo embedding câu hỏi, truy hồi, xây context và tạo câu trả lời; `services/quiz` sinh câu hỏi theo schema. `clients` bọc OpenAI, PostgreSQL vector và S3.
- `worker` là process riêng, đọc job bền vững từ PostgreSQL vector. Không dùng FastAPI background task làm nguồn job duy nhất vì restart có thể làm mất tác vụ.

## 2. Quyền truy cập và nhận dạng

- Java dùng Spring Security: access JWT ngắn hạn; refresh token luân phiên trong cookie HttpOnly, Secure, SameSite; role `USER`/`ADMIN`. Java kiểm tra quyền ở application service theo owner, trạng thái publish và quan hệ subject/document trước khi gọi AI hoặc phục vụ file.
- Internal API chỉ nhận service token từ Java qua mạng Compose nội bộ; Python không nhận JWT người dùng. Request Tutor/Quiz chứa `authorizedDocumentIds` do Java liệt kê sau khi kiểm quyền. Danh sách rỗng trả `NO_EVIDENCE`, không truy vấn toàn kho.
- Python áp dụng danh sách ID trong câu SQL **trước** khi sắp xếp theo cosine distance; chỉ lấy active index version. Python còn kiểm `sourceType` và `ownerId` của chunk như lớp bảo vệ phụ. Java kiểm lại mọi `documentId` trong citation/result trước khi trả client.
- Personal Document chỉ owner sử dụng; Admin không mặc định được đọc hoặc đưa nó thành Official Content. Thay đổi publish/owner phải làm Java tính lại scope ở mỗi request, không tin scope client gửi.

## 3. Dữ liệu và storage

### PostgreSQL nghiệp vụ — Java sở hữu

Giữ các nhóm bảng ở [database-plan.md](database-plan.md). `documents` chứa `id`, `owner_id` nullable cho Official Content, `source_type`, `subject_id`, object key, MIME, `document_version`, `processing_status`, `page_or_slide_count`, `published_at`, timestamps. Java giữ `ai_job_id`/lỗi đã chuẩn hóa để polling và audit, không lưu vector hoặc prompt thô.

### PostgreSQL vector — Python sở hữu

| Bảng | Trường/cấu trúc chính | Ràng buộc |
|---|---|---|
| `document_indexes` | `document_id`, `active_version`, `embedding_model`, `dimensions`, trạng thái | Một active version cho mỗi document. |
| `document_chunks` | `document_id`, `document_version`, `chunk_no`, `source_type`, `owner_id`, `subject_id`, `topic_id`, `location_kind`, `location_value`, `content`, `embedding vector(1536)` | Unique `(document_id, document_version, chunk_no)`; index metadata để lọc trước similarity. |
| `index_jobs` | `job_id`, `request_id`, `idempotency_key`, `document_id`, `document_version`, `kind`, `status`, `attempts`, `next_run_at`, `error_code`, `input_url` tạm thời, timestamps | Unique `idempotency_key`; worker claim bằng `FOR UPDATE SKIP LOCKED`. Xóa `input_url` sau khi tải file. |

Vector DB chỉ lưu ID tham chiếu và metadata phục vụ filter, không sao chép user/quiz attempt/mastery/study plan. Không có foreign key qua PostgreSQL nghiệp vụ. Python quản lý migration tiến cho vector DB bằng Alembic; Java dùng Flyway cho DB nghiệp vụ. Thay model hoặc số chiều phải tạo phiên bản index mới và reindex, không trộn embeddings khác chiều trong cùng truy vấn.

SeaweedFS dùng object key dạng `documents/{documentId}/v{version}/original` và `documents/{documentId}/v{version}/view.pdf`. Java giữ key trong DB nghiệp vụ; browser nhận nội dung qua endpoint Java kiểm quyền. Python tải bản gốc qua signed URL ngắn hạn trong mạng nội bộ, không giữ S3 credential quản trị.

## 4. Trạng thái và luồng xử lý

### Upload/index

```text
UPLOADING → PENDING_INDEX → INDEXING → READY
                   │             └────→ FAILED
                   └───────────────────→ FAILED
READY/FAILED → DELETING → DELETED
```

1. Java tạo document ID, kiểm file/owner, ghi object vào SeaweedFS và metadata vào DB. Nếu một bước thất bại, đánh dấu `FAILED` và dọn object mồ côi bằng tác vụ có thể retry.
2. Java gọi `POST /internal/v1/documents/index` với `idempotencyKey = documentId:documentVersion:INDEX`; Python lưu job và trả `202` + `jobId`. Worker claim job, parse, tạo artifact xem, chunk, gọi embedding theo batch rồi upsert chunks của version mới.
3. Sau khi mọi chunk ghi thành công, Python chuyển `active_version` trong một transaction tại vector DB. Version cũ chỉ được dọn sau khi version mới active. Java poll `GET /jobs/{jobId}` và cập nhật `READY`/`FAILED` trong DB nghiệp vụ.
4. Worker retry tối đa ba lần với backoff; lỗi không phục hồi được ghi `errorCode` không chứa nội dung file. Khi signed URL hết hạn, Java tạo URL mới và gửi lại cùng idempotency key; Python chỉ cập nhật `input_url` và xếp lại job đang ở trạng thái retryable. URL là dữ liệu nhạy cảm, không xuất hiện trong log và bị xóa khỏi job sau khi tải file. Không đánh dấu `READY` chỉ vì job đã được nhận.
5. Khi xóa, Java chuyển `DELETING` để loại khỏi authorized scope, gọi deindex idempotent, rồi xóa object và metadata sau khi job hoàn tất. Reconciler của Java tiếp tục các bước lỗi; không cần distributed transaction.

### RAG Tutor

Java kiểm quyền và gửi `authorizedDocumentIds`, question, scope hiện tại cùng `X-Request-Id` trong header. Python chỉ truy hồi chunks thuộc active version bằng cosine distance chính xác; lấy tối đa sáu chunk phù hợp rồi tạo câu trả lời với các chunk ID tham chiếu. Python chỉ xuất citation từ các chunk thực sự truy hồi, gồm document ID, vị trí và excerpt; nếu không có bằng chứng phù hợp trả `NO_EVIDENCE`. Java validate citation thuộc scope, lưu metadata request/usage và trả response. Ngưỡng liên quan, chất lượng tiếng Việt và top-k ban đầu được đánh giá trên fixtures tổng hợp trước demo.

### Quiz → Progress → Study/Exam

Python trả câu hỏi với options, `correctOptionIndex`, explanation, difficulty và topic mapping theo structured output. Java kiểm số lượng, options không trùng, index đáp án hợp lệ, topic/document nằm trong scope rồi mới lưu Quiz. Java chấm attempt theo đáp án đã lưu, ghi Learning Event và cập nhật Topic Mastery/history. Read events cập nhật Content Progress riêng. `study` xếp recommendation bằng rule có giải thích; Student chọn đưa vào Study Plan. Mock Exam dùng cơ chế chấm Java và tạo evidence đánh giá lại.

## 5. Lỗi, quan sát và kiểm chứng

- Mọi internal request mang `requestId`, `schemaVersion`, service token và timeout. Chỉ retry GET hoặc POST có idempotency key. Lỗi trả `code`, `message`, `details`, `traceId`; không chuyển nguyên lỗi/provider payload ra web.
- Theo dõi job backlog, tỷ lệ `FAILED`, thời gian index, độ trễ retrieval, độ trễ OpenAI, token usage và lỗi citation. Log chỉ có ID/trạng thái/độ trễ, không có nội dung tài liệu hoặc prompt nhạy cảm.
- Test bằng dữ liệu tổng hợp: upload PDF/PPTX, reindex cùng version, xóa/deindex, worker restart, signed URL hết hạn, hai user có Personal Document khác nhau, Official Content chưa publish, câu hỏi thiếu bằng chứng, citation sai scope, Quiz malformed, Content Progress độc lập với Mastery và toàn bộ [demo flow](demo-flow.md).
