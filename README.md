# StudyFlow

**Hệ thống hỗ trợ học tập và ôn luyện ứng dụng Trí tuệ Nhân tạo**

StudyFlow là nền tảng web giúp sinh viên học theo lớp học phần, quản lý tài liệu cá nhân, hỏi đáp nội dung có trích dẫn và tạo Quiz để ôn tập. Hệ thống tách rõ nghiệp vụ học tập khỏi AI: Java Backend quyết định quyền truy cập, chấm điểm và tiến độ; Python AI Service chỉ xử lý tài liệu, truy xuất bằng chứng và sinh nội dung có cấu trúc.

> Trạng thái hiện tại: Frontend Next.js đang được xây dựng và có thể chạy bằng dữ liệu demo. Java Backend, Python AI Service và Docker mới ở giai đoạn cấu trúc/kế hoạch, chưa có runtime hoàn chỉnh.

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
├── services/backend/         # Cấu trúc Java Spring Boot mục tiêu
├── services/ai/              # Cấu trúc Python FastAPI mục tiêu
├── docs/
│   ├── bao-cao/              # Báo cáo tách theo Chương 1, 2, 3
│   ├── diagrams/             # SVG và nguồn Mermaid
│   ├── specs/                # Feature specifications
│   └── *-plan.md             # Kiến trúc, API, CSDL và kế hoạch triển khai
├── infrastructure/           # Kế hoạch Docker và CI
├── index.html                # Trang giới thiệu/prototype tĩnh
├── AGENTS.md                 # Quy tắc bắt buộc cho AI coding agents
└── PROJECT_STRUCTURE.md      # Cấu trúc chi tiết
```

## Chạy dự án hiện tại

### 1. Yêu cầu

- Git.
- Node.js 20 trở lên và npm để chạy frontend Next.js.
- Trình duyệt hiện đại.

Backend Java, AI Service, PostgreSQL, pgvector và Object Storage chưa cần thiết khi chạy frontend ở chế độ demo.

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
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

Không cần tạo file môi trường để chạy demo vì ứng dụng có giá trị mặc định an toàn. Khi tích hợp Java Backend, đặt `NEXT_PUBLIC_DEMO_MODE=false` và trỏ `NEXT_PUBLIC_API_URL` đến public API `/api/v1`. Không đưa AI key hoặc service credential vào biến `NEXT_PUBLIC_*`.

### 4. Kiểm tra Frontend

Chạy trong `apps/web`:

```bash
npm run lint
npm test
npm run build
```

Các lệnh tương ứng kiểm tra ESLint, test contract/UI bằng Node test runner và production build.

### 5. Xem prototype HTML không cần cài dependency

Có thể mở trực tiếp hai file sau bằng trình duyệt:

- [`index.html`](index.html): tổng quan kiến trúc, quy tắc và demo flow.
- [`docs/frontend-implementation-plan.md`](docs/frontend-implementation-plan.md): route, chức năng và kế hoạch triển khai Frontend.

Hai trang HTML sử dụng fixture tổng hợp, không gọi Backend hoặc model thật.

### 6. Backend, AI và Docker

Các phần này hiện **chưa có manifest/runtime hoàn chỉnh**, vì vậy repository chưa cung cấp lệnh Maven, FastAPI hoặc Docker Compose có thể chạy end-to-end. Không dùng các lệnh giả như `docker compose up` cho đến khi các milestone tương ứng được triển khai.

Tài liệu chuẩn bị triển khai:

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
- [ ] Triển khai Java Backend và Flyway migrations.
- [ ] Triển khai Python AI Service, Alembic và pgvector pipeline.
- [ ] Hoàn thiện Docker Compose, CI và kiểm thử end-to-end.
- [ ] Chạy AI evaluation và bổ sung kết quả thực đo vào báo cáo.

## Quy tắc dành cho AI coding agents

Mọi AI coding agent phải đọc [`AGENTS.md`](AGENTS.md) trước khi làm việc, chọn đúng vai trò và chỉ đọc/sửa phạm vi được phép. Trạng thái và kế hoạch triển khai được duy trì trực tiếp trong `docs/**`.
