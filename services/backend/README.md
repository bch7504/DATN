# Spring Boot backend

Backend Java theo hướng modular monolith. AI/RAG chạy ở Python service riêng; Java gọi qua internal API và vẫn giữ quyền quyết định nghiệp vụ.

## Stack đề xuất

- Spring Boot + Spring Web.
- Spring Security cho JWT/session và RBAC.
- Spring Data JPA + PostgreSQL.
- Flyway cho database migration.
- Object storage qua S3-compatible client.
- HTTP client cho giao tiếp nội bộ với Python AI service.

## Package rule

Mỗi feature giữ controller, application service, domain model, repository port/adapter và DTO ở gần nhau. Các tích hợp bên ngoài đi qua interface/adapter trong `integration`; domain không phụ thuộc trực tiếp SDK của nhà cung cấp.

## Luồng tích hợp AI

1. `document` nhận file, kiểm tra quyền, lưu metadata và object storage.
2. Java gọi internal endpoint của Python với document ID và signed file URL.
3. Python parse/chunk/embed/index rồi trả trạng thái; Java cập nhật processing status.
4. Khi hỏi Tutor, Java xác thực scope rồi gọi Python RAG endpoint.
5. Python trả answer/citations; Java lưu `ai_requests`, trả response và ghi `ASK_AI`.

## Quy tắc an toàn nghiệp vụ

- Python chỉ sinh câu hỏi; module Java `quiz` validate, lưu và chấm điểm.
- `progress` là module duy nhất cập nhật mastery.
- `study` tính recommendation bằng rule có thể test.
- API key chỉ tồn tại ở server-side configuration.
