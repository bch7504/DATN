# Workers

Worker sẽ claim `ai.index_jobs` và chạy một trong hai pipeline:

- `PERSONAL_RAG` cho PDF/DOCX Student.
- `TEACHER_SLIDE` cho PPTX Teacher.

Thư mục hiện chỉ định nghĩa boundary; chưa có worker production.
