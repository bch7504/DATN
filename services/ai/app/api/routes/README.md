# Internal routes

Đã triển khai:

- GET /internal/v1/health: yêu cầu Bearer service credential, X-Request-Id và X-Schema-Version: 3.
- POST /internal/v1/documents/index
- POST /internal/v1/documents/deindex
- GET /internal/v1/jobs/{jobId}
- POST /internal/v1/personal-assistant/runs
- POST /internal/v1/course-materials/ask
- POST /internal/v1/quizzes/generate

Các route đều được bảo vệ bằng service credential. Body/response camelCase và ví dụ được ghi trong `services/ai/CONTRACT_V3.md`. Index/deindex trả 202; tác vụ nền do worker riêng xử lý.

Test dùng dependency override cho provider/repository. Khi chạy bình thường, ứng dụng dùng pgvector và OpenRouter thật theo environment, không thay bằng fixture production.
