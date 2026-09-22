# StudyFlow — Traceability Matrix

## 1. Mục đích

Ma trận này là checklist bàn giao giữa requirement, API, data, test và demo. Chi tiết contract nằm trong từng feature spec và `../api-plan.md`.

## 2. Functional traceability

| Requirement group | Public/internal interface | Data chính | Test trọng yếu | Demo |
|---|---|---|---|---|
| AUTH-FR-001..005 | `/auth/*`, `/me` | `users`, `refresh_tokens` | register role escalation, lock, refresh reuse | Login/role switch |
| STU-FR-001..003 | `/student/classes`, `/subjects`, `/materials` | `class_students`, `class_subjects`, `document_publications` | membership/publication isolation | Bước 1 |
| STU-FR-004..007 | `/slides`, `/note`, `/view-events`, `/tutor`; internal `/slides/ask` | `slides`, `slide_notes`, `learning_progress` | PPTX no-download, PDF download-only, citation scope | Bước 3 |
| PAI-FR-001..002 | `/personal-documents`; internal index/jobs/deindex | `documents`, `ai.index_jobs`, `ai.document_chunks` | MIME/size, owner, retry/deletion | Bước 2 |
| PAI-FR-003..004 | `/personal-rag/conversations/*`; internal `/personal-rag/ask` | `chat_conversations`, `chat_messages`, chunks/vector | multi-doc scope, `NO_EVIDENCE` | Bước 2 |
| PAI-FR-005..006 | conversation Quiz endpoint; internal `/quizzes/generate` | `quizzes`, sources, questions | malformed answer/source, async failure | Bước 6 |
| PLAN-FR-001 | `/progress/*`, `/statistics` | `learning_progress`, `learning_events` | no Topic Mastery, owner scope | Bước 4 |
| PLAN-FR-002..004 | `/study-plans/*`, `/calendar` | `study_plans`, `study_plan_items` | ownership, time validation, conflict override | Bước 5 |
| QUIZ-FR-001..005 | `/review/quizzes/*`, `/review/attempts/*` | Quiz/attempt/answer tables | review gate, single answer, idempotent submit | Bước 6 |
| TCH-FR-001..002 | `/teacher/class-subjects/*` | assignment, membership | assignment isolation, privacy fields | Bước 7 |
| TCH-FR-003..006 | `/teacher/documents/*`, publications | documents/publications/slides | type matrix, one object/many publications, revoke | Bước 7 |
| ADM-FR-001..008 | `/admin/*` | users, academic, feedback, logs, settings | role constraints, privacy, settings allowlist | Bước 8 |

## 3. Business rule traceability

| Rule | Enforcement owner | Required evidence |
|---|---|---|
| Frontend chỉ gọi Java | Web config/network test | Không có Python/storage/provider URL trong client bundle |
| Personal Document thuộc owner | Java + Python defense in depth | Cross-user contract/integration test |
| Teacher chỉ public theo assignment | Java application service + DB constraint | Negative test với ClassSubject ngoài scope |
| PPTX viewer, PDF download | Java policy + Web action matrix | API và UI test theo file type |
| Teacher đăng PDF/PPTX, Student học PPTX hoặc tải PDF; Personal chỉ PDF | Java upload policy + Python schema v2 + Web validation | Test DOCX bị từ chối cả hai scope; PPTX bị từ chối tại Personal; PDF Teacher không gọi AI |
| Citation đúng scope | Python retrieval + Java revalidation | Eval/test với citation sai document/location |
| Quiz phải được duyệt | Java state machine | `REVIEW_REQUIRED` attempt trả 409 |
| Một đáp án đúng | Python structured output + Java validation/scoring | Invalid multiple answer key bị từ chối; selected answer test |
| Java chấm điểm | Java transaction | Không có scoring endpoint/function tại Python |
| Calendar là projection | Java query + schema | Không có bảng calendar trùng; response lấy plan items |
| Admin không đọc dữ liệu cá nhân | RBAC/application service | Negative API tests |

## 4. Contract test checklist

- [ ] Mỗi endpoint có valid input, invalid input, unauthorized scope và output schema test.
- [ ] Java/Python contract test dùng cùng schema version cho index, RAG, Tutor và Quiz.
- [ ] Error envelope luôn có `code`, `message`, `details`, `traceId`.
- [ ] Pagination có boundary cho page/size và max 100.
- [ ] Idempotency được test cho view event, index/deindex, Quiz generation và submit.
- [ ] State transition sai trả `409`, không âm thầm sửa trạng thái.
- [ ] Test/eval chỉ dùng fixture tổng hợp.

## 5. Release evidence

| Evidence | Điều kiện đạt |
|---|---|
| Unit tests | Rule/state/scoring quan trọng đạt |
| Contract tests | Public DTO và Java↔Python schema tương thích |
| Integration tests | PostgreSQL/pgvector, storage và job lifecycle chạy với fixture |
| AI eval | Scope isolation, relevance, groundedness và citation correctness đạt ngưỡng dự án |
| E2E | Luồng `demo-flow.md` hoàn tất với ba role |
| Security review | Không có secret/content nhạy cảm trong repo/log |
| Restore drill | Seed/backup demo phục hồi được trước buổi bảo vệ |
