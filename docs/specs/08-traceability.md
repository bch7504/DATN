# Traceability Matrix — Flow MVP v1.0

| Requirement | Public UI/API | System of record | Test chính |
|---|---|---|---|
| AUT-FR-001..005 | auth, `/me` | Java auth/user | role guard, token rotation, internal auth |
| STU-FR-001..003 | join, Student offerings, chi tiết lớp | `course_offerings`, `course_enrollments` | invalid code, pending denied, approved allowed |
| STU-FR-004..007 | PDF materials/viewer/page-note/tutor | publication/page/note + AI result | approved access, loại học liệu, `NO_EVIDENCE`, page citation scope |
| STU-FR-008 | Quiz Assignment | Java Assignment/attempt/submission | đúng Student/lớp/Quiz, Java scoring, on-time/late |
| STU-FR-009 | Dashboard viewing progress | Java learning events | idempotency, không Topic Mastery |
| PAI-FR-001..008 | personal docs/assistant/Quiz | Java conversation/Quiz + AI indexes/agent runs | owner isolation, tool routing, clarification, prompt injection, schema/citation |
| TCH-FR-001..003 | Teacher offerings/join/enrollments | Java offering/enrollment | owner-only, rotation, transition idempotency |
| TCH-FR-004..008 | kho mặc định, PDF/PPTX, publication và xóa an toàn | Java library/document/publication | default library, conversion, owner scope, revoke/deindex/delete |
| TCH-FR-009..012 | AI Quiz nhiều nguồn, Assignment và báo cáo | Java Quiz/Assignment/submission | 1–10 nguồn, review/publish, đúng lớp, thống kê không đếm lặp |
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
| Single Agent chỉ dùng tool registry | router + JSON Schema args | intent mơ hồ hỏi lại; không gọi tool ngoài scope |
| Citation entail claim | claim reviewer + validator | citation ID đúng nhưng không chứng minh claim bị loại |
| Java chấm Quiz | Quiz service/transaction | client/LLM gửi score bị bỏ qua |
| Hai mode Quiz đúng owner | Student accept/Teacher publish policy | ngoài enrollment/ownership bị từ chối; source không đổi khi gắn môn |
| Review không suy luận | answer/source projection | chỉ câu sai xuất hiện; không gọi AI mastery |
| Java tính Streak/Daily Goal | learning-event projector + user timezone | login/Note/ASK_AI không tăng streak; client gửi actual bị bỏ qua |
