# StudyFlow

**Hệ thống hỗ trợ học tập và ôn luyện ứng dụng Trí tuệ Nhân tạo**

StudyFlow là nền tảng web giúp sinh viên học theo lớp học phần, quản lý tài liệu cá nhân, hỏi đáp nội dung có trích dẫn và tạo Quiz để ôn tập. Hệ thống tách rõ nghiệp vụ học tập khỏi AI: Java Backend quyết định quyền truy cập, chấm điểm và tiến độ; Python AI Service chỉ xử lý tài liệu, truy xuất bằng chứng và sinh nội dung có cấu trúc.

> Trạng thái hiện tại: Frontend Next.js có giao diện demo và đã nối một phần API Java. Java đã triển khai Auth, hồ sơ, Course Offering, Enrollment, Study Plan và Notification. Python AI Service đã có runtime, migration và kiểm thử offline. PostgreSQL + pgvector local đã chạy được bằng Docker; các luồng Documents, AI và Quiz vẫn chưa được tích hợp end-to-end qua Java.

## Điểm nổi bật

- Học theo mô hình `Semester → Course Offering → Documents`.
- Teacher tự tạo Course Offering, quản lý join code, duyệt Student và công bố học liệu.
- Student xem Course Material PDF, ghi chú theo trang và hỏi Course Material AI Tutor.
- Personal Document Assistant dùng một Single Agent để hỏi đáp, tóm tắt hoặc tạo Quiz từ PDF cá nhân, kèm citation theo trang.
- Teacher sinh Quiz từ Course Material PDF theo số câu/độ khó/chủ đề/trang và review trước khi public.
- Java chấm `MCQ_SINGLE`, lưu từng attempt và liên kết câu sai với nguồn cần ôn lại.
- Dashboard tổng hợp tiến độ theo lớp, Study Streak và Daily Goal; màn Kế hoạch & Lịch quản lý task và lịch tuần riêng.
- Giao diện đỏ–trắng theo định hướng nhận diện PTIT, hỗ trợ Student, Teacher và Admin.

## Vai trò trong MVP

| Vai trò | Chức năng chính |
|---|---|
| Student | Tham gia lớp, PDF Viewer/Page Note/Tutor, Personal Assistant, Quiz, Dashboard và Kế hoạch & Lịch tuần |
| Teacher | Tạo Course Offering, quản lý join code/enrollment, upload/public PDF và AI Quiz Studio |
| Admin | Quản lý tài khoản, Subject, Semester, giám sát lớp, feedback, audit và settings |

Ngoài phạm vi MVP: PPTX/DOCX, OCR cho PDF scan, Teacher chatbot/Tutor, multi-agent, Topic Mastery, Exam/Mock Exam, recommendation tự động, XP, level, badge và leaderboard.

## Quy tắc học liệu và AI

| Nguồn | Chính sách MVP |
|---|---|
| Course Material PDF | Student được duyệt xem web, ghi Note và dùng Tutor; Teacher dùng làm nguồn tạo Quiz |
| Personal Document | Chỉ PDF có text layer, thuộc Student owner |
| Personal Assistant | Single Agent chỉ dùng nguồn `READY`; hỏi đáp/tóm tắt/tạo Quiz; thiếu bằng chứng trả `NO_EVIDENCE` |
| Quiz AI | Hai mode Student/Teacher; đúng 4 phương án và 1 đáp án; Java validate/lifecycle/chấm điểm |

## Kiến trúc

```text
Next.js Web
    │ /api/v1
    ▼
Java Spring Boot ───────► PostgreSQL schema app
    │                   └► Object Storage
    │ /internal/v1
    ▼
Python FastAPI ─────────► PostgreSQL schema ai + pgvector
    └───────────────────► LLM / Embedding Provider
```

- **Frontend** chỉ gọi public Java API.
- **Java Backend** là system of record: auth/RBAC, Course Offering, enrollment, publication, Quiz lifecycle/scoring, progress và plan.
- **Python AI Service** xử lý PDF, chunking, embedding, retrieval, Single Agent, Tutor, citation và Quiz draft.
- PostgreSQL dùng chung một cluster nhưng tách schema và database role; Java không đọc vector, Python không đọc bảng nghiệp vụ.

Xem chi tiết tại [Architecture](docs/architecture.md) và [API plan](docs/api-plan.md).

## Cấu trúc repository

```text
DATN/
├── apps/web/                 # Next.js frontend và HTML prototype
├── services/backend/         # Java Spring Boot, Flyway và nghiệp vụ hệ thống
├── services/ai/              # Python FastAPI, Alembic, RAG/Quiz và evaluation
├── docs/
│   ├── bao-cao/              # Báo cáo tách theo Chương 1, 2, 3
│   ├── diagrams/             # SVG và nguồn Mermaid
│   ├── specs/                # Feature specifications
│   └── *-plan.md             # Kiến trúc, API, CSDL và kế hoạch triển khai
├── infrastructure/           # PostgreSQL/pgvector local, kế hoạch Docker và CI
├── index.html                # Trang giới thiệu/prototype tĩnh
├── AGENTS.md                 # Quy tắc bắt buộc cho AI coding agents
└── PROJECT_STRUCTURE.md      # Cấu trúc chi tiết
```

## Chạy dự án hiện tại

### 1. Yêu cầu

- Git.
- Node.js 20 trở lên và npm để chạy frontend Next.js.
- Trình duyệt hiện đại.
- Docker Desktop để chạy PostgreSQL + pgvector local.
- `uv` khi cần chạy migration hoặc kiểm thử Python AI.

Backend Java, AI Service, PostgreSQL, pgvector và Object Storage chưa cần thiết nếu chỉ chạy frontend ở chế độ demo.

### 2. Clone repository

```bash
git clone https://github.com/bch7504/DATN.git
cd DATN
```

### 3. Chạy Frontend Next.js ở chế độ demo

```bash
cd apps/web
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Cấu hình mặc định của source là:

```text
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_API_URL=http://localhost:8088/api/v1
```

Không cần tạo file môi trường để chạy demo vì ứng dụng có giá trị mặc định an toàn. Khi tích hợp Java Backend, đặt `NEXT_PUBLIC_DEMO_MODE=false` và trỏ `NEXT_PUBLIC_API_URL` đến public API `/api/v1`. Không đưa AI key hoặc service credential vào biến `NEXT_PUBLIC_*`.

### 4. Tạo PostgreSQL + pgvector local

Các lệnh dưới đây không đọc `.env`; database được bind riêng tại `127.0.0.1:5433` để không xung đột PostgreSQL mặc định ở cổng `5432`:

```powershell
.\scripts\database.ps1 start
.\scripts\database.ps1 migrate
.\scripts\database.ps1 status
```

Kết nối Java local:

```text
DATABASE_URL=jdbc:postgresql://localhost:5433/studyflow?currentSchema=app
DATABASE_USERNAME=studyflow_app
DATABASE_PASSWORD=studyflow_app_local_only
```

Kết nối Python local:

```text
AI_DATABASE_URL=postgresql+psycopg://studyflow_ai:studyflow_ai_local_only@127.0.0.1:5433/studyflow?connect_timeout=5&options=-csearch_path%3Dai%2Cpublic
```

Đây là thông tin công khai chỉ dành cho local. Khi dừng bằng `.\scripts\database.ps1 stop`, container dừng nhưng volume dữ liệu vẫn được giữ.

### 5. Kiểm tra Frontend

Chạy trong `apps/web`:

```bash
npm run lint
npm test
npm run build
```

Các lệnh tương ứng kiểm tra ESLint, test contract/UI bằng Node test runner và production build.

### 6. Xem prototype HTML không cần cài dependency

Có thể mở trực tiếp hai file sau bằng trình duyệt:

- [`index.html`](index.html): tổng quan kiến trúc, quy tắc và demo flow.
- [`docs/frontend-implementation-plan.md`](docs/frontend-implementation-plan.md): route, chức năng và kế hoạch triển khai Frontend.

Hai trang HTML sử dụng fixture tổng hợp, không gọi Backend hoặc model thật.

### 7. Backend, AI và Docker

Database local đã có Compose và migration thật. Backend/AI có runtime riêng nhưng toàn hệ thống chưa chạy end-to-end vì Java adapter cho Documents/AI/Quiz và Object Storage vẫn chưa hoàn thiện. Xem hướng dẫn từng service trước khi chạy:

- [Backend README](services/backend/README.md)
- [AI Service README](services/ai/README.md)
- [Database Docker README](infrastructure/docker/README.md)

Tài liệu kế hoạch:

- [Backend implementation plan](docs/backend-implementation-plan.md)
- [AI implementation plan](docs/ai-implementation-plan.md)
- [Docker deployment plan](docs/docker-deployment-plan.md)
- [Tech stack](docs/tech-stack.md)

## Luồng demo dự kiến

1. Admin tạo Subject/Semester và quản lý tài khoản.
2. Teacher tạo Course Offering, lấy join code và duyệt Student.
3. Teacher upload/public Course Material PDF; Student mở PDF Viewer, ghi Note và hỏi Tutor.
4. Student upload Personal PDF, chọn nguồn rồi hỏi, tóm tắt hoặc tạo Quiz ngay trong trang Tài liệu cá nhân.
5. Teacher dùng AI Quiz Studio; Student/Teacher review Quiz theo đúng vai trò trước khi sử dụng/public.
6. Dashboard cập nhật tiến độ, Streak, Daily Goal và công việc sắp tới.

Chi tiết xem tại [demo flow](docs/demo-flow.md).

## Tài liệu

- [Mục lục báo cáo Chương 1–3](docs/bao-cao/README.md)
- [Kế hoạch và flow MVP v2 hiện hành](docs/bao-cao/Ke_hoach_do_an_tot_nghiep_MVP_v2_PDF_Single_Agent_Teacher_Quiz.md)
- [Master specification](docs/specification.md)
- [High-level architecture](docs/architecture.md)
- [Low-level design](docs/low-level-design.md)
- [Database plan](docs/database-plan.md)
- [API plan](docs/api-plan.md)
- [ERD tổng quan](docs/diagrams/erd/index.html)
- [Cấu trúc repository](PROJECT_STRUCTURE.md)

## Nguyên tắc phát triển

1. Không vượt quyền owner, role, Course Offering hoặc authorized document scope.
2. Thiếu bằng chứng phải trả `NO_EVIDENCE`; không để LLM đoán ngoài nguồn.
3. Java sở hữu Quiz lifecycle, scoring, progress, Study Streak và Daily Goal.
4. Mỗi lần làm Quiz tạo attempt mới; không ghi đè lịch sử.
5. Dashboard là nơi hiển thị toàn bộ tiến độ; không tạo màn Progress độc lập.
6. Không commit secret, tài liệu cá nhân, log sản xuất hoặc vector dump.
7. Mock/fixture phải được đánh dấu rõ và không được xem là tính năng production.

## Trạng thái phát triển

- [x] Phân tích nghiệp vụ, kiến trúc, CSDL và API mục tiêu.
- [x] HTML mock và thiết kế giao diện PTIT.
- [x] Bộ báo cáo Chương 1–3 và sơ đồ thiết kế.
- [ ] Hoàn thiện Frontend Next.js và kết nối public Java API.
- [x] Triển khai phần nền Java Backend và Flyway V1–V4.
- [x] Triển khai Python AI Service, Alembic và pgvector pipeline ở mức offline/local.
- [x] Tạo PostgreSQL + pgvector local, tách role/schema và chạy migration thật.
- [ ] Hoàn thiện Docker Compose toàn hệ thống, Object Storage, CI và kiểm thử end-to-end.
- [ ] Chạy AI evaluation và bổ sung kết quả thực đo vào báo cáo.

## Quy tắc dành cho AI coding agents

Mọi AI coding agent phải đọc [`AGENTS.md`](AGENTS.md) trước khi làm việc, chọn đúng vai trò và chỉ đọc/sửa phạm vi được phép. Trạng thái và kế hoạch triển khai được duy trì trực tiếp trong `docs/**`.
