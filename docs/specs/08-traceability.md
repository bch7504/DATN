# Traceability Matrix — Course Offering baseline

| Requirement | Public UI/API | System of record | Test chính |
|---|---|---|---|
| AUT-FR-001..005 | auth, `/me` | Java auth/user | role guard, token rotation, internal auth |
| STU-FR-001..003 | join, Student offerings/materials | `course_offerings`, `course_enrollments` | invalid code, pending denied, approved allowed |
| STU-FR-004..006 | materials/viewer/tutor | publication/slide/note + AI result | PPTX no-download, PDF download-only, citation scope |
| PAI-FR-001..008 | personal docs/conversations/messages | Java conversation + AI indexes | owner/version isolation, history, claim citation, NO_EVIDENCE |
| TCH-FR-001..003 | Teacher offerings/join/enrollments | Java offering/enrollment | owner-only, rotation, transition idempotency |
| TCH-FR-004..006 | library/publication/archive | Java document/publication | type policy, multi-publication, no hard delete |
| ADM-FR-001..005 | Admin users/catalog/monitoring | Java app/audit | no assignment UI, lock/archive audited |
| Progress/Plan/Quiz | Student progress/plan/review | Java events/plans/quizzes | idempotent progress, Java scoring, manual plan |
| AI evaluation | AI eval runner/report | synthetic versioned dataset | production path, 3 runs, scope violation 0 |

## Kiểm soát kiến trúc

| Quy tắc | Điểm kiểm soát | Negative test |
|---|---|---|
| Browser chỉ gọi Java | FE API client/CSP/config | không có Python/OpenRouter URL hoặc key trong bundle |
| Teacher sở hữu Course Offering | Java application service/repository | Teacher A sửa/public lớp B bị từ chối |
| Student cần Enrollment approved | Java authorization trước URL/AI | pending/rejected không có artifact/chunk |
| Python chỉ dùng authorized scope | request schema + retrieval filter | chunk ngoài document/version/owner/offering không xuất hiện |
| Citation entail claim | claim reviewer + validator | citation ID đúng nhưng không chứng minh claim bị loại |
| Java chấm Quiz | Quiz service/transaction | client/LLM gửi score bị bỏ qua |
