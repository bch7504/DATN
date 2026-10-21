# StudyFlow

**Hệ thống hỗ trợ học tập và ôn luyện ứng dụng Trí tuệ Nhân tạo**

StudyFlow là nền tảng web hỗ trợ sinh viên học theo lớp học phần, quản lý tài liệu PDF, lập kế hoạch học tập, hỏi đáp có trích dẫn và tạo Quiz ôn tập. Hệ thống gồm ba phần độc lập:

```text
Next.js Web → Java Spring Boot → Python FastAPI
                       │              │
                       ▼              ▼
                 PostgreSQL app   PostgreSQL ai + pgvector
```

- Frontend chỉ gọi Java qua `/api/v1`.
- Java quản lý tài khoản, phân quyền, lớp học phần, Quiz, điểm, tiến độ và kế hoạch.
- Python xử lý PDF, embedding, truy xuất nội dung, citation, hỏi đáp, tóm tắt và sinh bản nháp Quiz.
- PostgreSQL dùng chung một cluster nhưng tách schema và database role: `app` cho Java, `ai` cho Python.

## Trạng thái hiện tại

- Frontend Next.js đã có giao diện Student, Teacher và Admin; Auth/OTP cùng một phần API nghiệp vụ đã kết nối Java.
- Java đã có Auth, hồ sơ, Course Offering, Enrollment, Study Plan, Calendar và Notification.
- Python AI Service đã có 7 internal endpoint và kiểm thử offline; chưa nghiệm thu đầy đủ với Java, Object Storage và OpenRouter thật.
- PostgreSQL 17 + pgvector và Mailpit có thể chạy local bằng Docker.

## Chức năng MVP

| Vai trò | Chức năng chính |
|---|---|
| Student | Tham gia lớp, xem PDF, ghi chú, AI Tutor, tài liệu cá nhân, Quiz, Dashboard và Kế hoạch & Lịch |
| Teacher | Tạo lớp học phần, quản lý join code/enrollment, công bố PDF và sinh Quiz bằng AI |
| Admin | Quản lý tài khoản, danh mục, giám sát, phản hồi, nhật ký và thiết lập |

MVP chỉ nhận PDF có lớp văn bản. Không hỗ trợ PPTX, DOCX, OCR, multi-agent, Topic Mastery, XP, badge hoặc leaderboard.

## Cấu trúc repository

```text
DATN/
├── apps/web/                 # Next.js Frontend
├── services/backend/         # Java Spring Boot + Flyway
├── services/ai/              # Python FastAPI + Alembic + RAG/Quiz
├── infrastructure/docker/    # PostgreSQL/pgvector và Mailpit local
├── scripts/                  # Script database và kiểm thử E2E
├── docs/                     # Đặc tả, kế hoạch, báo cáo và sơ đồ
├── AGENTS.md                 # Quy tắc cho AI coding agents
└── PROJECT_STRUCTURE.md      # Cấu trúc chi tiết
```

## Yêu cầu môi trường

| Công cụ | Phiên bản/ghi chú |
|---|---|
| Git | Bản ổn định gần đây |
| Node.js | 20 trở lên |
| JDK | 17 |
| Docker Desktop | Dùng cho PostgreSQL, pgvector và Mailpit |
| uv | Dùng cho Python 3.12, Alembic và AI Service |

Kiểm tra nhanh:

```powershell
git --version
node --version
npm.cmd --version
java -version
docker version
uv --version
```

## Cổng local

| Thành phần | Địa chỉ |
|---|---|
| Frontend | `http://localhost:3000` |
| Java Backend | `http://localhost:8088` |
| Python AI Service | `http://127.0.0.1:8001` |
| PostgreSQL | `127.0.0.1:5433` |
| Mailpit SMTP | `127.0.0.1:1025` |
| Mailpit Web | `http://127.0.0.1:8025` |

## Chạy nhanh Frontend + Java + PostgreSQL

Các lệnh dưới đây dành cho PowerShell trên Windows. Không cần đọc hoặc dùng `.env` của người khác.

### Chạy toàn bộ bằng một lệnh

Sau khi sếp đã cấu hình `.env` tại root và mở Docker Desktop:

```powershell
.\scripts\start-all.ps1
```

Nếu đang dùng Command Prompt (`E:\ĐATN>`), chạy:

```bat
scripts\start-all.cmd
```

Những lần chạy sau có thể bỏ qua bước đồng bộ dependency:

```powershell
.\scripts\start-all.ps1 -SkipDependencyInstall
```

Dừng các tiến trình và container nhưng giữ nguyên dữ liệu:

```powershell
.\scripts\stop-all.ps1
```

Script không in giá trị trong `.env`. Các tiến trình chạy ẩn và ghi output kỹ thuật vào `.runtime/`, thư mục này đã được loại khỏi Git. Object Storage không được tự khởi tạo; nếu bật upload, endpoint S3-compatible phải chạy sẵn và các biến `STORAGE_*` phải hợp lệ.

### 1. Clone repository

```powershell
git clone https://github.com/bch7504/DATN.git
Set-Location DATN
```

### 2. Khởi động PostgreSQL, pgvector và migration

Mở Docker Desktop trước, sau đó chạy tại thư mục root:

```powershell
.\scripts\database.ps1 start
.\scripts\database.ps1 migrate
.\scripts\database.ps1 status
```

Database được bind tại `127.0.0.1:5433`. Script dùng file cấu hình local riêng và không tự đọc `.env`.

### 3. Khởi động Mailpit để nhận OTP

```powershell
docker compose --env-file infrastructure/docker/database.defaults `
  -f infrastructure/docker/compose.database.yml `
  up -d --wait mailpit
```

Mở `http://127.0.0.1:8025` để xem email OTP khi đăng ký tài khoản local.

### 4. Chạy Java Backend

Mở một PowerShell mới tại root:

```powershell
$env:SPRING_PROFILES_ACTIVE = "local"
$env:DATABASE_URL = "jdbc:postgresql://127.0.0.1:5433/studyflow?currentSchema=app"
$env:DATABASE_USERNAME = "studyflow_app"
$env:DATABASE_PASSWORD = "studyflow_app_local_only"
$env:JWT_SECRET = "studyflow-local-jwt-secret-minimum-32-characters"
$env:MAIL_FROM = "no-reply@studyflow.local"

Set-Location services/backend
.\mvnw.cmd -s maven-settings.xml spring-boot:run
```

Kiểm tra Backend:

```powershell
Invoke-RestMethod http://127.0.0.1:8088/actuator/health
```

Kết quả mong đợi có `status: UP`.

Nếu Maven gặp lỗi do đường dẫn repository có ký tự Unicode, có thể tạo ổ tạm rồi chạy lại:

```powershell
subst S: "E:\ĐATN"
Set-Location S:\services\backend
.\mvnw.cmd -s maven-settings.xml spring-boot:run
```

Thay `E:\ĐATN` bằng đường dẫn repository trên máy đang chạy.

### 5. Cấu hình Frontend

Tạo file `apps/web/.env.local` với đúng hai biến public:

```text
NEXT_PUBLIC_API_URL=http://localhost:8088/api/v1
NEXT_PUBLIC_DEMO_MODE=false
```

Không đặt database password, AI key hoặc service token trong biến `NEXT_PUBLIC_*`.

### 6. Chạy Frontend

Mở PowerShell mới:

```powershell
Set-Location apps/web
npm.cmd install
npm.cmd run dev
```

Mở `http://localhost:3000`. Khi đăng ký tài khoản Student bằng email `@ptit.edu.vn`, lấy mã OTP tại Mailpit rồi nhập vào màn xác minh.

## Chạy Frontend ở chế độ demo

Nếu chỉ cần xem giao diện mà không chạy Java/PostgreSQL, đặt trong `apps/web/.env.local`:

```text
NEXT_PUBLIC_API_URL=http://localhost:8088/api/v1
NEXT_PUBLIC_DEMO_MODE=true
```

Sau đó chạy `npm.cmd run dev`. Các tài khoản fixture:

| Vai trò | Email | Mật khẩu demo |
|---|---|---|
| Student | `student@ptit.edu.vn` | `ptit@demo123` |
| Teacher | `teacher@ptit.edu.vn` | `ptit@demo123` |
| Admin | `admin@ptit.edu.vn` | `ptit@demo123` |

Đây không phải tài khoản PostgreSQL và không được dùng để kiểm chứng backend production.

## Chạy Python AI Service

AI Service có thể chạy và kiểm thử độc lập. Để chạy health API local, mở PowerShell mới:

```powershell
Set-Location services/ai
uv sync --dev

$env:INTERNAL_SERVICE_TOKEN = "studyflow-local-ai-token"
$env:AI_DATABASE_URL = "postgresql+psycopg://studyflow_ai:studyflow_ai_local_only@127.0.0.1:5433/studyflow?connect_timeout=5&options=-csearch_path%3Dai%2Cpublic"
$env:OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
$env:OPENROUTER_CHAT_MODEL = "openai/gpt-5.6-luna"
$env:OPENROUTER_EMBEDDING_MODEL = "openai/text-embedding-3-large"
$env:EMBEDDING_DIMENSIONS = "1024"

uv run uvicorn app.asgi:app --host 127.0.0.1 --port 8001 --no-access-log
```

Kiểm tra health trong PowerShell khác:

```powershell
$headers = @{
  Authorization = "Bearer studyflow-local-ai-token"
  "X-Request-Id" = "local-health-001"
  "X-Schema-Version" = "3"
}
Invoke-RestMethod -Headers $headers http://127.0.0.1:8001/internal/v1/health
```

Chạy worker trong terminal riêng sau khi đã cấp đầy đủ cấu hình AI và Storage:

```powershell
Set-Location services/ai
uv run python -m app.workers.documents
```

Không commit `OPENROUTER_API_KEY`. Các luồng index/RAG/Quiz thật còn cần Object Storage, API key hợp lệ và Java adapter tương ứng; health chạy được không có nghĩa toàn bộ AI end-to-end đã hoàn tất.

## Kiểm thử

### Frontend

```powershell
Set-Location apps/web
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

### Backend

```powershell
Set-Location services/backend
.\mvnw.cmd -s maven-settings.xml test
```

### AI Service

```powershell
Set-Location services/ai
uv run --offline ruff check .
uv run --offline ruff format --check .
uv run --offline pytest
uv run --offline python -m evals --synthetic
```

### Luồng Backend end-to-end local

Khi PostgreSQL, Mailpit và Java Backend đang chạy:

```powershell
Set-Location <thu-muc-root-cua-repository>
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/backend-e2e.ps1
```

Script dùng dữ liệu tổng hợp để kiểm tra:

```text
Auth → Course Offering → Enrollment → Study Plan → Calendar
```

## Dừng dịch vụ

- Dừng Frontend, Backend, AI API hoặc worker bằng `Ctrl+C` tại terminal tương ứng.
- Dừng PostgreSQL nhưng giữ dữ liệu:

```powershell
.\scripts\database.ps1 stop
```

- Dừng Mailpit:

```powershell
docker compose --env-file infrastructure/docker/database.defaults `
  -f infrastructure/docker/compose.database.yml `
  stop mailpit
```

Script không xóa Docker volume. Không chạy lệnh xóa volume nếu chưa xác nhận vì thao tác đó sẽ xóa tài khoản và dữ liệu local.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `npm.ps1 cannot be loaded` | Dùng `npm.cmd` thay cho `npm` trong PowerShell |
| Backend không kết nối database | Kiểm tra Docker Desktop và chạy `.\scripts\database.ps1 status` |
| Không nhận OTP | Kiểm tra container Mailpit và mở `http://127.0.0.1:8025` |
| Frontend vẫn dùng dữ liệu demo | Đặt `NEXT_PUBLIC_DEMO_MODE=false`, sau đó khởi động lại Next.js |
| Biểu tượng Dev Tools vẫn hiện | Dừng rồi chạy lại `npm.cmd run dev`; `next.config.ts` đã tắt dev indicator |
| Port đã được sử dụng | Kiểm tra các cổng `3000`, `8088`, `8001`, `5433`, `8025` trước khi chạy |
| Maven lỗi với đường dẫn Unicode | Dùng `subst` như hướng dẫn ở phần Java Backend |

## Tài liệu chính

- [Quy tắc làm việc cho agents](AGENTS.md)
- [Cấu trúc repository](PROJECT_STRUCTURE.md)
- [Đặc tả hệ thống](docs/specification.md)
- [Kiến trúc](docs/architecture.md)
- [API contract](docs/api-plan.md)
- [Kế hoạch cơ sở dữ liệu](docs/database-plan.md)
- [Kế hoạch Frontend](docs/frontend-implementation-plan.md)
- [Kế hoạch Backend](docs/backend-implementation-plan.md)
- [Kế hoạch AI](docs/ai-implementation-plan.md)
- [Demo flow](docs/demo-flow.md)
- [Báo cáo Chương 1–3](docs/bao-cao/README.md)

## Nguyên tắc an toàn

1. Không commit `.env`, API key, token, tài liệu cá nhân, log hoặc database dump.
2. Frontend không gọi Python, database hoặc OpenRouter trực tiếp.
3. Java xác minh quyền trước khi cấp phạm vi tài liệu cho Python.
4. Thiếu bằng chứng phải trả `NO_EVIDENCE`.
5. Java là nơi duy nhất chấm Quiz và cập nhật tiến độ.
6. Fixture chỉ chạy khi demo mode được bật rõ ràng.
