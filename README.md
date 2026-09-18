# StudyFlow — Đồ án tốt nghiệp

Nền tảng quản lý học tập và hỗ trợ ôn thi thông minh tích hợp AI dành cho sinh viên đại học.

## Xem HTML mock

Mở trực tiếp `index.html` bằng trình duyệt. Mock là một file HTML độc lập, không cần cài package hay chạy build.

Nếu muốn phục vụ qua HTTP local:

```powershell
npx serve .
```

## Kiến trúc đã chốt

- Frontend: Next.js, gồm Student UI và Admin UI.
- Backend: Java Spring Boot theo hướng modular monolith, giữ nghiệp vụ và database.
- AI: Python FastAPI service riêng cho document processing, embedding, RAG, Quiz Generator và evaluation.
- Database: PostgreSQL.
- File storage: Supabase Storage hoặc object storage tương đương.
- Vector database: Qdrant.
- Deploy: frontend, Java backend và Python AI service là ba deployable unit riêng.

Tài liệu Word ban đầu ghi FastAPI cho backend. Quyết định mới nhất của dự án là dùng Java Spring Boot cho nghiệp vụ và FastAPI/Python cho AI; cấu trúc repository và HTML mock đã được chuẩn hóa theo quyết định này.

## Tài liệu

- `PROJECT_STRUCTURE.md`: cây thư mục và trách nhiệm từng vùng.
- `AGENTS.md`: quyền đọc/sửa và luồng làm việc bắt buộc cho coding agents.
- `docs/architecture.md`: kiến trúc, ranh giới module và quyết định về AI.
- `docs/database-plan.md`: nhóm bảng dự kiến.
- `docs/api-plan.md`: nhóm API dự kiến.
- `docs/demo-flow.md`: kịch bản demo khi bảo vệ.
- `Plan_do_an_tot_nghiep_hoan_chinh_theo_chuc_nang.docx`: tài liệu nguồn, được giữ nguyên.

## Nguyên tắc cốt lõi

1. AI chỉ xử lý tác vụ cần hiểu hoặc sinh ngôn ngữ.
2. Backend Java chịu trách nhiệm scoring, progress, mastery, statistics, recommendation và exam countdown.
3. Student chủ động chỉnh Study Plan; AI không tự điều phối lịch.
4. Personal Documents thuộc người sở hữu và không tự trở thành Official Content.
