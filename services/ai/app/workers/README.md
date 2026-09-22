# Workers

Worker sẽ claim `ai.index_jobs` và chạy một trong hai pipeline:

- `PERSONAL_RAG` cho PDF Student.
- `TEACHER_SLIDE` cho PPTX Teacher. PDF Teacher không index AI.

Thư mục hiện chỉ định nghĩa boundary; chưa có worker production.
