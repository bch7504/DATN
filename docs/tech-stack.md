# StudyFlow — Tech stack mục tiêu

> Trạng thái: thiết kế cho toàn bộ luồng demo, chưa phải danh sách dependency đã cài.
> Quyết định ngày 2026-09-19: dùng PostgreSQL + pgvector cho vector search trong giai đoạn đầu, thay cho Qdrant được ghi trong tài liệu cũ.

## Nguyên tắc chọn công nghệ

- Giữ ba deployable unit: Next.js Web, Java Spring Boot Backend và Python AI Service.
- Java là nguồn dữ liệu nghiệp vụ và là public API duy nhất. Python chỉ xử lý AI, jobs và kho vector; browser không gọi Python hoặc database.
- Chạy trên một VPS bằng Docker Compose. Hai PostgreSQL là **hai container và volume riêng trên cùng VPS**: một cho nghiệp vụ, một cho AI/vector. Cách tách này không tạo high availability hay cô lập phần cứng.
- Chốt major/minor mục tiêu dưới đây; khi bắt đầu triển khai cần khóa phiên bản dependency và image bằng lockfile/tag hoặc digest, rồi chạy test tương thích.

## Thành phần

| Lớp | Lựa chọn mục tiêu | Lý do và trách nhiệm |
|---|---|---|
| Web | Next.js 16 App Router, React, TypeScript, Node.js 24 LTS, Tailwind CSS | Student/Admin UI, viewer, form và API client; chỉ gọi Java qua `/api/v1`. |
| Backend | Java 21, Spring Boot 3.5, Spring Web, Spring Security, Spring Data JPA, Flyway, Maven | Auth/RBAC, quyền sở hữu, nghiệp vụ, transaction, chấm Quiz, progress/mastery, recommendation và public API. |
| AI API/worker | Python 3.11+, FastAPI, Pydantic, pydantic-settings; worker cùng codebase chạy thành process riêng | Internal API; parse/chunk/embed/index, RAG, citation, sinh Quiz và evaluation. |
| Parser/viewer | `pypdf`, `python-pptx`, `python-docx`; LibreOffice headless để tạo bản xem PDF từ PPTX/DOCX | Giữ vị trí nguồn PAGE/SLIDE/SECTION; artifact xem được lưu cùng kho file. Chỉ thêm dependency này khi triển khai pipeline tương ứng. |
| Dữ liệu nghiệp vụ | PostgreSQL 17; Flyway do Java quản lý | Users, documents, quiz attempts, Content Progress, Topic Mastery, Study Plan, Exam và audit events. |
| Vector/jobs | PostgreSQL 17 + pgvector 0.8.x; Python dùng `psycopg`/pgvector adapter và Alembic | Chunks, embeddings, phiên bản index và job state; Python không có credential vào PostgreSQL nghiệp vụ. |
| File | SeaweedFS `weed mini` qua S3 API | Lưu bản gốc và artifact xem; Java cấp quyền truy cập, Python đọc qua signed URL ngắn hạn. |
| LLM/embedding | OpenAI Responses API với `gpt-5.6-terra` cho Tutor/Quiz; Embeddings API với `text-embedding-3-small` mặc định 1536 chiều | Python gọi qua adapter, Java không giữ prompt/provider response thô. Model ID là cấu hình server; đổi embedding model/dimension phải reindex. |
| Triển khai | Docker Compose và Caddy | Caddy cấp HTTPS và định tuyến `/api/v1` tới Java, các đường web tới Next.js; AI, storage và database chỉ ở mạng nội bộ. |

Next.js nêu cấu hình App Router/TypeScript và yêu cầu Node.js; Node.js 24 đang thuộc nhánh LTS. Spring Boot 3.5 hỗ trợ Java 21. pgvector hỗ trợ PostgreSQL 17 và tìm kiếm chính xác mặc định. SeaweedFS mô tả `weed mini` cho một node. OpenAI Docs xác nhận model và kích thước embedding: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Node.js](https://nodejs.org/en/about/previous-releases), [Spring Boot](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [pgvector](https://github.com/pgvector/pgvector), [SeaweedFS](https://github.com/seaweedfs/seaweedfs/blob/master/README.md), [OpenAI models](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [OpenAI embeddings](https://developers.openai.com/api/docs/guides/embeddings).

## Chiến lược vector search tạm thời

MVP dùng truy vấn cosine **chính xác** trên các document ID Java đã cho phép, với B-tree index cho metadata lọc. Chưa tạo HNSW trong bản đầu để giữ kết quả truy hồi ổn định trên bộ dữ liệu demo nhỏ; chỉ đánh giá HNSW hoặc kho vector khác khi đo tải thực tế cho thấy cần thiết. Toàn bộ truy cập vector nằm sau adapter Python để lần đổi kho sau không làm đổi public API.

## Tài nguyên và vận hành

- Mốc đánh giá VPS: 4 vCPU, 8 GB RAM, SSD; đây là giả định để kiểm tra tải, không phải cam kết đủ cho mọi quy mô. Giới hạn số worker và connection pool theo RAM đo được.
- Compose cần health check, restart policy, volume riêng, backup và thử khôi phục cho cả hai PostgreSQL lẫn SeaweedFS. Bản backup phải có bản sao ngoài VPS vì một VPS là điểm lỗi chung.
- Ghi `requestId`, trạng thái, độ trễ và mức dùng token; không log nội dung tài liệu, prompt nhạy cảm hoặc API key.
- OpenAI model access, quota và chi phí thực tế phải kiểm tra bằng tài khoản triển khai trước buổi demo. Không tự thay model trong runtime nếu chưa chạy lại evaluation.
