# StudyFlow Spring Boot backend

Java backend là system of record và public API duy nhất cho Web.

## Module

| Package | Trách nhiệm |
|---|---|
| `auth`, `user` | JWT/session, RBAC STUDENT/TEACHER/ADMIN, account status |
| `classroom` | Class và Student membership |
| `subject` | Subject, ClassSubject và Teacher assignment |
| `document` | Teacher Library, Personal Document, upload/status/delete |
| `publication` | Public/revoke theo ClassSubject |
| `slide`, `note` | Slide artifact access, view event và Note |
| `progress` | Learning Progress và Statistics; không có Topic Mastery |
| `study` | Study Plan, item và Calendar tuần |
| `review` | Quiz draft review, accept/reject, attempt/answer/scoring |
| `feedback`, `audit`, `settings` | Admin operation |
| `integration.ai`, `integration.storage` | Outbound adapter |

## Rule

- Teacher chỉ public document của mình vào ClassSubject được phân công.
- PPTX Teacher: viewer + Note + Tutor, không download file gốc.
- PDF Teacher: download, không viewer/Note/Tutor.
- Personal Document: Student owner, PDF/DOCX, Personal RAG riêng.
- Java xác minh scope trước khi gọi Python và kiểm lại citation khi nhận.
- Java lưu vòng đời Quiz, chỉ cho làm Quiz `READY`, tính progress và chấm Quiz.

## Database

Spring Data JPA + Flyway sở hữu schema `app` trong PostgreSQL. Python sở hữu schema `ai`; Java không đọc/ghi vector trực tiếp.

Project Spring Boot chưa được scaffold dependency trong repository. Các thư mục package hiện đánh dấu boundary để implementation sau bám đúng [API plan](../../docs/api-plan.md).
