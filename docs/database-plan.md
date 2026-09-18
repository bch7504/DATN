# Database plan

## Identity và nội dung

- `users`: tài khoản, profile, role, status.
- `subjects`: môn chuẩn hoặc cá nhân; owner, type, status.
- `topics`: topic, subject, order, importance.

## Documents và annotation

- `documents`: metadata, type OFFICIAL/PERSONAL, file URL, processing status, page/slide count.
- `document_progress`: vị trí hiện tại, phần đã xem, tỷ lệ hoàn thành.
- `notes`: ghi chú theo subject/topic/document/page/slide.
- `bookmarks`: vị trí được đánh dấu và trạng thái cần review.

## Study và exam

- `tasks`: deadline, priority, status.
- `study_plans`: kế hoạch do Student quản lý.
- `study_sessions`: start/end/duration/status theo subject/topic.
- `exams`: ngày thi, target score, status.
- `exam_topics`: phạm vi topic của kỳ thi.

## Quiz và progress

- `quizzes`, `quiz_questions`: cấu hình và câu hỏi.
- `quiz_attempts`, `quiz_answers`: lần làm, đáp án, score.
- `topic_progress`: content progress, mastery, quiz average, study minutes, status.
- `mastery_history`: lịch sử thay đổi và nguyên nhân.
- `learning_events`: event chuẩn phục vụ progress/statistics/audit.

## AI và vận hành

- `ai_requests`: request type, scope, latency, token, status.
- `ai_feedback`: Helpful/Not Helpful, report, comment.
- `system_logs`: lỗi/sự kiện upload, parsing, indexing và backend.

## Ghi chú triển khai

- Mọi bảng dữ liệu cá nhân phải có owner hoặc đường liên kết xác định owner.
- Dùng Flyway migration, không sửa schema thủ công trên môi trường deploy.
- Mastery history và learning events là append-oriented để giữ audit trail.
- Vector content nằm ở Qdrant; PostgreSQL giữ metadata và trạng thái nguồn đáng tin cậy.

