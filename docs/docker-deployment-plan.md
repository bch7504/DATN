# StudyFlow — Kế hoạch triển khai Docker toàn dự án

> **Trạng thái:** Chỉ lập kế hoạch. Chưa tạo Dockerfile, chưa tạo Docker Compose và chưa chạy container.

## 1. Mục tiêu và phạm vi

Docker đóng gói toàn bộ các deployable unit của StudyFlow nhưng không thay đổi ranh giới kiến trúc:

```text
Browser
   ↓
Next.js Web → Java Spring Boot → Python AI API → OpenRouter
                    │                 │
                    ├→ PostgreSQL ←───┘
                    │   app + ai/pgvector
                    └→ Object Storage
                              ↑
                       Python AI Worker
```

- Frontend vẫn chỉ gọi Java `/api/v1`; container Web không được chứa AI credential.
- Java là system of record, sở hữu schema `app` và chạy Flyway migration.
- Python AI API và AI Worker dùng chung một image, sở hữu schema `ai` và chạy Alembic migration.
- PostgreSQL dùng image có extension pgvector; tách database role và `search_path` cho Java/Python.
- OpenRouter là dịch vụ bên ngoài, không được mô phỏng thành container production.
- Object Storage dùng dịch vụ tương thích S3 trong môi trường local; production có thể trỏ đến dịch vụ được quản lý.

## 2. Thành phần container dự kiến

| Service | Image/nguồn build | Exposure | Trách nhiệm |
|---|---|---|---|
| `web` | `apps/web/Dockerfile` | Public `3000` | Next.js standalone, UI Student/Teacher/Admin |
| `backend` | `services/backend/Dockerfile` | Public `8080` | Public API, auth/RBAC và nghiệp vụ |
| `ai-api` | `services/ai/Dockerfile` | Chỉ mạng nội bộ `8000` | Internal API, RAG/citation/Quiz generation |
| `ai-worker` | Cùng image với `ai-api` | Không mở port | Index/deindex job và document pipeline |
| `postgres` | Image PostgreSQL có pgvector | Nội bộ; chỉ mở port ở profile dev khi cần | Schema `app`, schema `ai` và vector index |
| `object-storage` | Image S3-compatible | Nội bộ; console chỉ bật ở dev | Tài liệu và slide artifact |
| `reverse-proxy` | Nginx/Caddy, chỉ profile production | Public `80/443` | TLS, routing và security headers |

Không thêm Redis hoặc message broker trong MVP. Worker claim job từ PostgreSQL theo cơ chế đã mô tả trong kế hoạch AI.

## 3. Cấu trúc file sẽ triển khai

```text
apps/web/
└── Dockerfile
services/backend/
└── Dockerfile
services/ai/
└── Dockerfile
infrastructure/docker/
├── compose.dev.yml
├── compose.prod.yml
├── README.md
└── config/                 # Chỉ cấu hình không chứa secret
```

- Mỗi build context có `.dockerignore` riêng để loại `.env*`, secret, log, upload, dependency cache và build output.
- `compose.dev.yml` phục vụ local integration, có volume và port hỗ trợ phát triển.
- `compose.prod.yml` dùng image bất biến, không bind-mount source và không đặt secret trực tiếp trong YAML.
- Không commit file `.env`; chỉ tài liệu hóa tên biến trong `.env.example`.

## 4. Network, dữ liệu và secret

- `public_net`: chỉ `reverse-proxy`, `web` và `backend` khi cần.
- `service_net`: `backend` gọi `ai-api`; trình duyệt không truy cập được Python.
- `data_net`: chỉ Backend/AI với PostgreSQL và Object Storage.
- Volume riêng cho PostgreSQL và Object Storage; không mount upload thật vào source tree.
- Secret được inject ở runtime bằng secret manager hoặc Docker secrets. Không dùng `NEXT_PUBLIC_*` cho token, mật khẩu hay OpenRouter key.
- Java và Python dùng database role khác nhau; role Java không đọc schema `ai`, role Python không đọc schema `app`.
- Log chỉ chứa request ID và metadata an toàn; không log tài liệu, prompt, signed URL, token hoặc API key.

## 5. Build, khởi động và health check dự kiến

Thứ tự khởi động:

```text
PostgreSQL/pgvector + Object Storage healthy
                    ↓
Flyway app migration + Alembic ai migration
                    ↓
Java Backend + AI API + AI Worker healthy
                    ↓
Next.js Web + Reverse Proxy
```

- Web build theo chế độ Next.js standalone, chạy bằng non-root user.
- Backend và AI dùng multi-stage build, pin runtime version và chạy bằng non-root user.
- Migration là bước riêng, hoàn tất thành công trước khi service nhận traffic; không để nhiều replica đồng thời tự chạy cùng migration.
- Health check phân biệt liveness và readiness. Readiness AI kiểm tra cấu hình/database nhưng không gọi OpenRouter tốn phí.
- `depends_on` chỉ hỗ trợ thứ tự; readiness thực tế phải dựa trên health check và retry có giới hạn.

## 6. Milestone Docker

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| D-M0 | Chốt image convention, port, network, volume và biến cấu hình | Không thay đổi boundary FE → Java → AI |
| D-M1 | Dockerfile cho Web, Backend và AI | Image build tái lập được, non-root, không chứa secret |
| D-M2 | Compose local cho PostgreSQL/pgvector, Object Storage và các service | Stack khởi động đúng thứ tự, health check đạt |
| D-M3 | Flyway/Alembic migration và AI Worker | Migration idempotent; worker không tạo job/chunk trùng |
| D-M4 | Production hardening | TLS, immutable image, resource limit, backup/restore và rollback runbook |

Việc triển khai Docker chỉ bắt đầu sau khi FE-M1 và AI-M1 ổn định. Docker không làm mở rộng phạm vi sang FE-M2/AI-M2 hoặc các chức năng RAG/Quiz chưa đến milestone.

## 7. Kiểm thử và tiêu chí nghiệm thu khi triển khai

- Validate cấu hình Compose trước khi build; không sử dụng secret thật trong test.
- Build từng image từ clean context và kiểm tra image không chứa `.env`, source upload hoặc credential.
- Smoke test Web → Java và Java → AI bằng request ID/schema version/service credential đúng boundary.
- Kiểm tra trình duyệt không truy cập trực tiếp `ai-api`, PostgreSQL hoặc Object Storage.
- Kiểm tra Flyway chỉ sửa schema `app`, Alembic chỉ sửa schema `ai`, và pgvector sẵn sàng trước migration AI.
- Restart container không làm mất dữ liệu volume và không tạo migration/job trùng.
- Kiểm tra graceful shutdown, health check, resource limit và log không chứa dữ liệu nhạy cảm.
- Production cần có quy trình backup/restore PostgreSQL và Object Storage, scan image, pin image digest và rollback phiên bản.

## 8. Công việc chưa thực hiện

- Chưa tạo Dockerfile hoặc `.dockerignore`.
- Chưa tạo `compose.dev.yml`/`compose.prod.yml`.
- Chưa build image, chạy migration, tạo volume hoặc khởi động container.
- Chưa thay đổi hạ tầng local hay môi trường triển khai hiện tại.
