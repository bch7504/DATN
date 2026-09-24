# Traceability Matrix — Flow MVP v1.0

| Requirement | Public UI/API | System of record | Test chính |
|---|---|---|---|
| AUT-FR-001..005 | auth, `/me` | Java auth/user | role guard, token rotation, internal auth |
| STU-FR-001..003 | join, Student offerings/materials | `course_offerings`, `course_enrollments` | invalid code, pending denied, approved allowed |
| STU-FR-004..006 | materials/viewer/tutor | publication/slide/note + AI result | PPTX no-download, PDF download-only, citation scope |
| PAI-FR-001..008, PAI-BR-004..005 | personal docs/conversations/free-prompt Quiz | Java conversation/Quiz + AI indexes | owner isolation, prompt injection, schema/citation, destination access |
| TCH-FR-001..003 | Teacher offerings/join/enrollments | Java offering/enrollment | owner-only, rotation, transition idempotency |
| TCH-FR-004..006 | library/publication/archive | Java document/publication | type policy, multi-publication, no hard delete |
| ADM-FR-001..005 | Admin users/catalog/monitoring | Java app/audit | no assignment UI, lock/archive audited |
| DASH-FR-001..006 | Dashboard gồm aggregate và progress từng Course Offering, Streak, Daily Goal | Java `learning_events`, `daily_goals`, viewing progress | đúng lớp/quyền/event/ngày/múi giờ, idempotency, goal độc lập streak |
| Plan/Quiz review | plan, subject/personal review workspace, attempts | Java plans/quizzes/answers/sources | Java scoring, wrong-answer citation, attempt history, manual plan |
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
| Nguồn Quiz độc lập nơi ôn | accept policy + nullable offering | ngoài enrollment bị từ chối; source không đổi khi gắn môn |
| Review không suy luận | answer/source projection | chỉ câu sai xuất hiện; không gọi AI mastery |
| Java tính Streak/Daily Goal | learning-event projector + user timezone | login/Note/ASK_AI không tăng streak; client gửi actual bị bỏ qua |
