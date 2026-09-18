# Infrastructure

- `docker/`: Dockerfile và compose cho môi trường local.
- `github/workflows/`: lint, test, build và deploy workflows.

MVP triển khai Next.js, Java Spring Boot và Python AI thành ba deployable unit; PostgreSQL, Object Storage và Qdrant dùng managed service nếu phù hợp quota. Python AI service chỉ nên nhận traffic nội bộ từ Java backend.
