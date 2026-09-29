# Bàn giao tổng thể dự án StudyFlow cho Claude

**Cập nhật:** 28/09/2026
**Repository:** `https://github.com/bch7504/DATN`

Đây là file bàn giao duy nhất cho toàn dự án. Trước khi làm, đọc `AGENTS.md`, `claude.md`, kiểm tra Git và chỉ tiếp nhận đúng phạm vi sếp giao. Không đọc `.env` hoặc dữ liệu bị cấm.

## 1. Mục tiêu và kiến trúc

Baseline chức năng/tên màn hình FE đã chốt tại `docs/frontend-functional-baseline.md`; `apps/web/mvp.html` là prototype chuẩn để đối chiếu FE thật.

StudyFlow hỗ trợ học theo `Semester → Course Offering → Documents`, hỏi đáp tài liệu có nguồn, tạo/làm Quiz và quản lý hoạt động tự học.

```text
Next.js Web → Java Spring Boot → Python FastAPI
                    ├→ PostgreSQL schema app
                    ├→ Object Storage
                    └→ Python → PostgreSQL schema ai + pgvector
                              → LLM/Embedding Provider
```

- Frontend chỉ gọi Java.
- Java sở hữu auth/RBAC, Course Offering, enrollment, publication, Quiz lifecycle/scoring, learning event, progress và plan.
- Python sở hữu parsing/chunking/embedding, retrieval, RAG, citation, Quiz draft và AI evaluation.
- Một PostgreSQL cluster nhưng tách schema/role; không đọc/ghi chéo dữ liệu nghiệp vụ và vector.

## 2. Trạng thái thực tế

| Hạng mục | Trạng thái |
|---|---|
| Nghiệp vụ | Có kế hoạch MVP, specification, feature specs và demo flow |
| Frontend | Có scaffold Next.js, UI demo ba role, route guard, API client, test/lint/build; chưa kết nối Java Backend production và chưa có E2E thật |
| Backend | Có README/plan/package structure; chưa có application/migration nghiệp vụ hoàn chỉnh |
| AI Service | Có README/plan/module structure; chưa có FastAPI pipeline/migration/test hoàn chỉnh |
| CSDL/API | Có database plan, ERD và API plan; chưa đồng nghĩa database đã migrate |
| Docker | Chỉ có kế hoạch; chưa chạy container/Compose production |
| Báo cáo | Đã tách Chương 1, 2, 3; Chương 3 chưa có runtime result/screenshot/KPI thực đo |

Không dùng lịch sử build cũ hoặc mock để kết luận milestone hiện tại hoàn thành.

## 3. Tài liệu chuẩn

| Nguồn | Mục đích |
|---|---|
| `AGENTS.md` | Quyền agent, giới hạn dữ liệu và luật nghiệp vụ bắt buộc |
| `docs/specification.md`, `docs/specs/` | Requirement và acceptance |
| `docs/api-plan.md` | Public/internal API, header, DTO và error |
| `docs/database-plan.md` | Bảng, ownership và lifecycle dữ liệu |
| `docs/architecture.md`, `docs/low-level-design.md` | Boundary và flow xuyên service |
| `docs/frontend-implementation-plan.md` | Lộ trình FE |
| `docs/backend-implementation-plan.md` | Lộ trình Java Backend |
| `docs/ai-implementation-plan.md` | Lộ trình AI và evaluation |
| `docs/docker-deployment-plan.md` | Lộ trình Docker, chưa triển khai |
| `docs/bao-cao/Ke_hoach_do_an_tot_nghiep_chot_flow_MVP_v1.md` | Kế hoạch/flow đồ án đã chốt |

Nếu có mâu thuẫn: `AGENTS.md` chi phối luật bắt buộc; API plan chi phối wire shape; database plan chi phối dữ liệu; mock chỉ là tham khảo UI.

## 4. Bộ báo cáo tách theo chương

Mục lục: [docs/bao-cao/README.md](docs/bao-cao/README.md).

| Chương | File | Trạng thái |
|---|---|---|
| 1 | `docs/bao-cao/chuong-1-tong-quan-de-tai.md` | Tổng quan, mục tiêu, phạm vi, phương pháp |
| 2 | `docs/bao-cao/chuong-2-phan-tich-va-thiet-ke-he-thong.md` | Yêu cầu, use case, kiến trúc, CSDL, API, UI, bảo mật |
| 3 | `docs/bao-cao/chuong-3-thiet-ke-chi-tiet-va-cai-dat.md` | RAG/Tutor/Quiz, data, thuật toán, module, lỗi và evaluation |

Chỉ đọc chương đang được giao. Sơ đồ và nguồn Mermaid nằm trong `docs/diagrams/chuong-1/`, `chuong-2/`, `chuong-3/`; ERD nằm trong `docs/diagrams/erd/`. Chương 3 đã bỏ ghi chú nội bộ; các mục kết quả nói rõ chưa có runtime evidence.

## 5. Nghiệp vụ phải giữ

- Student chỉ học lớp khi enrollment `APPROVED`.
- Teacher PPTX có Viewer/Note/Tutor cho Student; Teacher PDF download-only; Personal Document chỉ PDF có text.
- RAG/Tutor phải có citation đúng scope hoặc `NO_EVIDENCE`.
- Quiz từ Personal PDF + prompt tự do, không phụ thuộc chat, đúng bốn options/một đáp án.
- Student review/accept trước attempt; Java chấm điểm; mỗi lần làm tạo attempt mới.
- Câu sai và nguồn câu hỏi tạo nội dung cần ôn, không AI suy luận Topic Mastery.
- Dashboard chứa toàn bộ progress; Streak chỉ tính `VIEW_SLIDE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED`.
- Teacher tạo lớp/quản lý join/enrollment/publication; Admin quản lý catalog/tài khoản và giám sát.
- Ngoài MVP: DOCX, OCR, Topic Mastery, Teacher Quiz, Exam, recommendation, XP/badge/leaderboard và multi-agent supervisor.

## 6. Contract tích hợp chính

Java gọi Python qua `/internal/v1`: `documents/index`, `documents/deindex`, `jobs/{jobId}`, `personal-rag/ask`, `slides/ask`, `quizzes/generate`, `health`.

Request có service credential, `X-Request-Id`, `X-Schema-Version: 3`, authorized scope và timeout. Mutation phù hợp có idempotency key. Python trả structured output; Java revalidate citation và Quiz trước lưu.

## 7. Dữ liệu và AI

- Schema `app`: identity, catalog, offering/enrollment, documents/publications/slides/notes, chat, Quiz, plan, progress/events/goals, audit.
- Schema `ai`: `index_jobs`, `document_indexes`, `document_chunks`.
- MVP không có bảng `document_versions`; version nằm ở `documents.document_version` và index/chunk scope.
- Embedding kế hoạch: `text-embedding-3-large`, 1024 chiều, cosine; phải kiểm chứng khi triển khai.
- Evidence gate chạy trước LLM; generation/reviewer dùng cùng snapshot; rewrite tối đa một lần.
- Quiz sai schema được repair giới hạn hoặc chuyển `GENERATION_FAILED`.

## 8. Lộ trình

| Track | Thứ tự |
|---|---|
| FE | Scaffold/API client → shell/auth → offering → materials → chat/Tutor → Quiz/Dashboard/Plan → E2E |
| Backend | Scaffold → auth → catalog/offering → enrollment → documents → AI adapter → Quiz → events/Dashboard/Plan → hardening |
| AI | Config/provider → schema/worker → parser/index → RAG/Tutor → Quiz → evaluation/hardening |
| Docker | Convention → images → local Compose → migration/worker → production hardening |

Frontend đã được triển khai ở mức demo theo kế hoạch mới; AI vẫn ở mức cấu trúc/kế hoạch. Không tự triển khai milestone mới khi chưa được giao.

## 9. Backlog ưu tiên

1. Chốt schema artifact PPTX trả từ job cho Java.
2. Chốt DTO/status polling của Quiz generation ở public API.
3. Đồng bộ tài liệu còn dùng state Course Offering hoặc Quiz cũ.
4. Kiểm chứng model ID/capability khi xây adapter; không gọi trả phí ngoài yêu cầu.
5. Triển khai source/test trước khi điền kết quả, screenshot và KPI vào Chương 3.
6. Khi có DOCX, kiểm tra style, caption, mục lục, bảng và phân trang; hiện mới xác nhận Markdown.

## 10. Kiểm thử và bàn giao

- FE: role guard, policy tài liệu, Tutor/citation, Quiz state, responsive, accessibility và E2E.
- Backend: state/policy, ownership, schema/constraint, scoring, idempotency, timezone/event.
- AI: parser synthetic, scope isolation, vector version, citation/grounding, malformed Quiz, injection, fake provider.
- Evaluation: RAG/Tutor báo riêng; development/locked/regression set; correctness, faithfulness, citation, refusal, scope và latency.

Kết thúc task phải báo scope, file đổi, validation đã chạy, contract bị ảnh hưởng và việc còn lại. Không báo pass khi chưa chạy; không commit secret.

## 11. Prompt tiếp nhận

```text
Đọc AGENTS.md và claude.md tại root, sau đó đọc ban-giao-du-an-claude.md.
Gọi tôi là sếp và không đọc .env hay vùng cấm. Kiểm tra Git, bảo toàn thay đổi
hiện có và chọn đúng một vai trò. Nếu làm báo cáo, chỉ đọc đúng file chương
được giao trong docs/bao-cao/README.md. Phân biệt kế hoạch với implementation,
không chạy Docker/model thật hoặc commit/push nếu tôi chưa yêu cầu.
```
