# Infrastructure

- `docker/`: local Docker/Compose cho Web, Java, FastAPI, worker, PostgreSQL + pgvector và Object Storage.
- `github/workflows/`: CI lint/test/build và deploy.

Mục tiêu demo: Next.js trên Vercel hoặc web host tương đương; Spring Boot và FastAPI/worker trên Render/Railway hoặc nền tảng tương đương; PostgreSQL + pgvector và Object Storage managed.

Frontend chỉ public Java API. FastAPI, database và storage endpoint nội bộ không public trực tiếp. Cấu hình dùng environment variables; không commit secret.
