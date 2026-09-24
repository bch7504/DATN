# KẾ HOẠCH ĐỒ ÁN TỐT NGHIỆP

## XÂY DỰNG HỆ THỐNG HỖ TRỢ HỌC THUẬT VÀ ÔN LUYỆN ỨNG DỤNG TRÍ TUỆ NHÂN TẠO

-   **Nhóm thực hiện:** 03 sinh viên
-   **Thời gian dự kiến:** 03 tháng (12 tuần)
-   **Loại sản phẩm:** Web Application + AI Integration
-   **Định hướng:** Smart Learning Management / AI-assisted Review
    Platform

------------------------------------------------------------------------

## 1. Tổng quan đề tài

Đề tài xây dựng một nền tảng web hỗ trợ học tập và ôn luyện cho sinh
viên theo mô hình **học kỳ → lớp học phần (Course Offering) → học
liệu**.

Khác với phương án Admin tạo lớp, phân Student và phân công Teacher cho
từng lớp, hệ thống mới áp dụng mô hình phân quyền nhẹ hơn:

-   Admin quản lý tài khoản, vai trò, danh mục môn học, học kỳ và giám
    sát hệ thống.
-   Teacher đã có tài khoản hợp lệ với role `TEACHER` được **tự tạo lớp
    học phần** trong học kỳ đang hoạt động.
-   Hệ thống tự sinh **mã tham gia lớp (join code)**.
-   Student nhập mã lớp để gửi yêu cầu tham gia.
-   Teacher duyệt hoặc từ chối yêu cầu.
-   Khi được duyệt, Student trở thành thành viên của lớp học phần và
    được truy cập học liệu Teacher public.
-   Khi kết thúc học kỳ, lớp chuyển sang `ARCHIVED/COMPLETED` thay vì bị
    xóa, giúp Student tiếp tục xem lại học liệu và phục vụ ôn tập.

Student xem Slide/PPTX trực tiếp trên web, ghi Note theo từng slide và
sử dụng AI Tutor trong Slide Viewer. PDF do Teacher public chỉ được tải
xuống. Ngoài ra Student có kho tài liệu cá nhân để upload PDF, hỏi đáp
bằng AI RAG và tạo Quiz AI.

Trọng tâm của sản phẩm là quản lý học liệu, hỗ trợ học tập, theo dõi
tiến độ và ôn luyện. AI được sử dụng cho **Personal Document RAG**,
**Slide AI Tutor** và sinh bản nháp Quiz có nguồn. Java Spring Boot chịu
trách nhiệm xác thực, phân quyền, lớp học phần, enrollment, học liệu,
tiến độ, kế hoạch, vòng đời Quiz và chấm điểm.

------------------------------------------------------------------------

## 2. Bài toán và mục tiêu

### 2.1. Bài toán

-   Sinh viên sử dụng nhiều tài liệu và công cụ rời rạc nên khó quản lý
    môn học, tài liệu, deadline, lịch học và lịch thi tại một nơi.
-   Sinh viên khó theo dõi tập trung các Slide đã học, tài liệu đã nhận,
    kế hoạch và tiến độ ôn tập.
-   Ghi chú trên Slide, tiến độ học, kế hoạch và lịch ôn tập thường nằm
    rời rạc.
-   Khi gần kỳ thi, sinh viên khó tổng hợp tài liệu và nội dung cần ôn.
-   Nếu Admin phải tạo toàn bộ lớp học phần, phân công Teacher và thêm
    Student cho mỗi học kỳ thì khối lượng quản trị tăng rất lớn khi số
    lượng lớp và sinh viên tăng.
-   Cần một cơ chế để Teacher chủ động mở lớp học phần và quản lý thành
    viên trong phạm vi lớp mình phụ trách mà vẫn giữ được khả năng giám
    sát của Admin.

### 2.2. Mục tiêu

-   Xây dựng Web Application có ba nhóm người dùng: `STUDENT`,
    `TEACHER`, `ADMIN`.
-   Quản lý đào tạo theo **Semester → Course Offering → Documents**.
-   Admin quản lý danh mục môn học và học kỳ; Teacher tự tạo lớp học
    phần từ môn học có sẵn.
-   Student tham gia lớp bằng join code; Teacher chịu trách nhiệm duyệt
    thành viên.
-   Xây dựng cơ chế học liệu rõ ràng:
    -   PPTX/Slide: xem trên web, Note theo slide, AI Tutor.
    -   PDF Teacher public: chỉ tải xuống.
-   Xây dựng Tài liệu cá nhân cho Student: upload PDF và hỏi đáp RAG có
    citation.
-   Xây dựng Tiến độ & Thống kê để theo dõi Slide đã xem và hoạt động
    học tập chính.
-   Xây dựng Kế hoạch & Lịch để quản lý study plan, task và deadline.
-   Xây dựng khu vực Ôn tập với Quiz AI sinh từ Personal Documents.
-   Deploy end-to-end và có logging, kiểm thử, seed/mock data phục vụ
    demo.

------------------------------------------------------------------------

## 3. Đối tượng sử dụng và phạm vi

  -----------------------------------------------------------------------
  Đối tượng                           Vai trò trong hệ thống
  ----------------------------------- -----------------------------------
  **Student**                         Tham gia lớp học phần bằng join
                                      code; sau khi được Teacher duyệt có
                                      thể xem học liệu, xem Slide, ghi
                                      Note, hỏi Slide AI Tutor, tải PDF;
                                      quản lý Personal Documents, RAG,
                                      Quiz, tiến độ và kế hoạch.

  **Teacher**                         Tự tạo lớp học phần trong học kỳ
                                      đang hoạt động; quản lý yêu cầu
                                      tham gia và danh sách Student; quản
                                      lý kho học liệu; public/thu hồi tài
                                      liệu cho lớp mình sở hữu.

  **Admin**                           Quản lý tài khoản/role, danh mục
                                      môn học, học kỳ; giám sát và
                                      khóa/archive lớp khi cần; quản lý
                                      feedback, logs và cấu hình. Admin
                                      không phải duyệt từng lớp Teacher
                                      tạo.
  -----------------------------------------------------------------------

### Nguyên tắc quản trị

Admin **duyệt/quản lý quyền Teacher ở cấp tài khoản**, không duyệt từng
lớp học phần. Teacher có role hợp lệ được phép tạo lớp. Điều này giảm
tải cho Admin nhưng vẫn kiểm soát được hệ thống thông qua RBAC, audit
log và trạng thái lớp.

------------------------------------------------------------------------

## 4. Luồng nghiệp vụ cốt lõi

### 4.1. Luồng tạo và tham gia lớp học phần

``` text
Admin
  → quản lý Teacher/Student
  → quản lý Subjects
  → quản lý Semesters

Teacher
  → chọn Subject
  → chọn Semester đang ACTIVE
  → tạo Course Offering
  → hệ thống sinh join_code
  → chia sẻ join_code cho Student

Student
  → nhập join_code
  → gửi yêu cầu tham gia
  → enrollment = PENDING

Teacher
  → xem yêu cầu
  → APPROVE / REJECT

APPROVED
  → Student được truy cập lớp và học liệu
```

Teacher có thể duyệt từng Student hoặc duyệt nhiều yêu cầu cùng lúc.
Teacher không tạo tài khoản Student; Teacher chỉ xác nhận **quan hệ
Student ↔ Course Offering**.

### 4.2. Vòng đời lớp theo học kỳ

``` text
ACTIVE
  ↓
Teacher dạy và public học liệu
  ↓
Kết thúc học kỳ
  ↓
ARCHIVED / COMPLETED
```

Không xóa lớp sau mỗi học kỳ. Student vẫn có thể xem lịch sử lớp, Slide,
Note và sử dụng Slide AI Tutor trên học liệu cũ nếu tài liệu vẫn được
phép truy cập. Học kỳ mới Teacher tạo Course Offering mới; tài khoản
Student/Teacher được giữ nguyên.

### 4.3. Luồng học liệu

``` text
Student
  → Lớp học phần
  → chọn lớp
  → Tài liệu
      ├─ PPTX → Slide Viewer → Note + AI Tutor
      └─ PDF  → Download
```

PPTX được sắp xếp trước PDF. Không phân tài liệu theo Chapter/Topic
trong MVP.

### 4.4. Luồng tài liệu cá nhân

``` text
Student
  → Tài liệu cá nhân
  → upload PDF
  → Object Storage
  → extract text
  → chunking
  → embedding
  → PostgreSQL + pgvector
  → chọn một/nhiều PDF
  → RAG Chatbot
  → answer + citation
```

Chatbot Personal RAG không truy xuất học liệu Teacher public.

### 4.5. Luồng Quiz AI

Student chọn một hoặc nhiều Personal Documents `READY` → yêu cầu tạo
Quiz → AI sinh MCQ_SINGLE có nguồn → Java lưu ở `REVIEW_REQUIRED` →
Student chấp nhận → `READY` → làm bài → Java chấm điểm và lưu kết quả.

------------------------------------------------------------------------

## 5. Chức năng phía Student

  --------------------------------------------------------------------------------------
  STT                     Module                  Mô tả
  ----------------------- ----------------------- --------------------------------------
  1                       **Dashboard**           Tổng quan lớp đang học, việc cần làm,
                                                  deadline, tiến độ và thông tin học tập
                                                  quan trọng.

  2                       **Lớp học phần**        Xem lớp đang học theo học kỳ; nhập
                                                  join code để gửi yêu cầu tham gia; xem
                                                  trạng thái
                                                  `PENDING/APPROVED/REJECTED`; xem lớp
                                                  hiện tại và lớp đã lưu trữ.

  3                       **Tài liệu lớp học      Sau khi enrollment `APPROVED`, xem tài
                          phần**                  liệu Teacher public. PPTX xem trên
                                                  web; PDF tải xuống.

  4                       **Slide Viewer + Note + Xem PPTX trực tiếp; lưu Note theo từng
                          AI Tutor**              slide; hỏi AI Tutor theo nội dung
                                                  Slide/tài liệu đang xem.

  5                       **Tài liệu cá nhân**    Upload và quản lý PDF cá nhân; theo
                                                  dõi
                                                  `UPLOADING/PROCESSING/READY/FAILED`;
                                                  chọn một/nhiều PDF để hỏi RAG.

  6                       **Tiến độ & Thống kê**  Theo dõi số Slide đã xem, tiến độ học
                                                  và các số liệu tổng hợp cần thiết.

  7                       **Kế hoạch & Lịch**     Tạo/chỉnh sửa study plan, task,
                                                  deadline và xem trên lịch.

  8                       **Ôn tập**              Quản lý Quiz AI sinh từ Personal
                                                  Documents; review, accept/reject, làm
                                                  Quiz READY và xem kết quả.
  --------------------------------------------------------------------------------------

### Quyền truy cập Student

Student chỉ được truy cập học liệu của Course Offering khi:

``` text
course_enrollments.status == APPROVED
```

Student không được tự thêm mình trực tiếp vào lớp và không thể truy cập
tài liệu chỉ bằng cách biết `course_offering_id`.

------------------------------------------------------------------------

## 6. Chức năng phía Teacher

  -----------------------------------------------------------------------
  STT                     Module                  Mô tả
  ----------------------- ----------------------- -----------------------
  1                       **Dashboard**           Tổng quan lớp đang dạy,
                                                  số yêu cầu tham gia chờ
                                                  duyệt, số Student và
                                                  tài liệu đã public.

  2                       **Lớp học phần của      Teacher tự tạo Course
                          tôi**                   Offering bằng cách chọn
                                                  Subject + Semester,
                                                  nhập tên/mã nhóm nếu
                                                  cần; hệ thống sinh join
                                                  code. Teacher chỉ quản
                                                  lý lớp do mình tạo/sở
                                                  hữu.

  3                       **Yêu cầu tham gia &    Xem yêu cầu `PENDING`,
                          Danh sách Student**     duyệt/từ chối từng
                                                  Student hoặc nhiều
                                                  Student; xem danh sách
                                                  `APPROVED`; có thể
                                                  remove Student khi có
                                                  lý do phù hợp.

  4                       **Kho tài liệu giáo     Upload và quản lý
                          viên**                  PDF/PPTX. Tài liệu mới
                                                  upload nằm trong kho và
                                                  chưa tự động hiển thị
                                                  cho Student.

  5                       **Public & Quản lý tài  Chọn tài liệu → chọn
                          liệu**                  Course Offering của
                                                  mình → public. Xem tài
                                                  liệu đã public ở đâu và
                                                  thu hồi public khi cần.

  6                       **Quản lý lớp**         Bật/tắt join code, xem
                                                  thông tin lớp, archive
                                                  lớp khi kết thúc hoặc
                                                  theo quy tắc học kỳ.
  -----------------------------------------------------------------------

### Luồng Teacher chính

``` text
Teacher
  → tạo Course Offering
  → nhận join_code
  → Student gửi request
  → Teacher duyệt
  → upload PDF/PPTX
  → public cho Course Offering
  → Student APPROVED truy cập
```

Teacher không cần Admin phân công từng lớp và Admin không cần duyệt từng
Course Offering.

------------------------------------------------------------------------

## 7. Chức năng phía Admin

  ---------------------------------------------------------------------------
  STT                     Module                  Mô tả
  ----------------------- ----------------------- ---------------------------
  1                       **Dashboard hệ thống**  Tổng quan Student, Teacher,
                                                  Course Offering, Subject,
                                                  Semester và thông tin vận
                                                  hành chính.

  2                       **Quản lý người dùng**  Tạo/import/xem/cập
                                                  nhật/khóa/mở khóa tài khoản
                                                  Student và Teacher.

  3                       **Quản lý vai trò &     Gán
                          phân quyền**            `STUDENT/TEACHER/ADMIN`;
                                                  chỉ tài khoản Teacher hợp
                                                  lệ mới được tạo Course
                                                  Offering.

  4                       **Quản lý môn học**     CRUD danh mục Subject dùng
                                                  chung; Teacher chỉ được tạo
                                                  lớp từ Subject hợp lệ.

  5                       **Quản lý học kỳ**      Tạo/cập nhật Semester, ngày
                                                  bắt đầu/kết thúc và trạng
                                                  thái
                                                  `UPCOMING/ACTIVE/CLOSED`.

  6                       **Giám sát lớp học      Xem Course Offering do
                          phần**                  Teacher tạo; tìm kiếm/lọc
                                                  theo Teacher, Subject,
                                                  Semester; có quyền
                                                  `LOCK/ARCHIVE` lớp bất
                                                  thường khi cần. Không duyệt
                                                  từng lớp trước khi hoạt
                                                  động.

  7                       **Feedback & Reports**  Tiếp nhận phản hồi/lỗi và
                                                  báo cáo vận hành.

  8                       **System Logs & Audit** Theo dõi login, role
                                                  change, Teacher tạo lớp,
                                                  enrollment approval,
                                                  publication và thao tác
                                                  quản trị quan trọng.

  9                       **Cấu hình hệ thống**   Giới hạn upload, loại file,
                                                  tham số dùng chung và các
                                                  cấu hình vận hành cơ bản.
  ---------------------------------------------------------------------------

### Phân quyền mới

``` text
Admin
  → quản lý nền tảng
  → quản lý tài khoản/role
  → Subject
  → Semester
  → giám sát Course Offering

Teacher
  → tự tạo Course Offering
  → duyệt Student
  → quản lý/public tài liệu

Student
  → xin tham gia bằng join code
  → học sau khi APPROVED
```

------------------------------------------------------------------------

## 8. Kiến trúc hệ thống

  -----------------------------------------------------------------------
  Khối                                Trách nhiệm
  ----------------------------------- -----------------------------------
  **Frontend - Next.js**              Student/Teacher/Admin UI; Course
                                      Offering; join request; enrollment
                                      management; documents; Slide
                                      Viewer; Note; AI Tutor; Personal
                                      RAG; Quiz; Progress; Study Plan.

  **Backend chính - Spring Boot**     Auth/JWT/RBAC; User; Subject;
                                      Semester; Course Offering; join
                                      code; Enrollment; Teacher
                                      ownership; Documents/Publications;
                                      Note; Progress; Study Plan; Quiz;
                                      scoring; logging; authorization
                                      trước khi gọi AI.

  **AI Service - Python FastAPI**     PDF extraction, chunking,
                                      embedding, pgvector retrieval, RAG,
                                      prompt/LLM, citation, Slide AI
                                      Tutor và sinh bản nháp Quiz.

  **PostgreSQL + pgvector**           Dữ liệu nghiệp vụ + vector/chunks.

  **Object Storage**                  File PDF/PPTX gốc và tài nguyên
                                      render Slide.
  -----------------------------------------------------------------------

### Luồng gọi AI

``` text
Next.js
   ↓
Spring Boot
   ↓
JWT + RBAC + Enrollment/Ownership Check
   ↓
Python FastAPI
   ↓
RAG / Slide Context / LLM
   ↓
Spring Boot
   ↓
Next.js
```

FastAPI không quyết định Student có thuộc lớp hay không. Spring Boot
chịu trách nhiệm authorization.

------------------------------------------------------------------------

## 9. Thiết kế AI và RAG

### 9.1. Personal Document RAG

-   Chỉ dùng PDF do chính Student upload.
-   Student có thể chọn một hoặc nhiều tài liệu `READY`.
-   Retrieval filter theo owner và document được chọn.
-   Citation dùng `pageNumber`.

### 9.2. Slide AI Tutor

-   Chỉ xuất hiện trong Slide Viewer.
-   Chỉ áp dụng cho PPTX Teacher đã public.
-   Backend kiểm tra:
    1.  Student có enrollment `APPROVED`.
    2.  Document đang được public cho Course Offering đó.
    3.  Slide/document context hợp lệ.
-   Citation/context dùng `slideNumber`.
-   PDF Teacher public không có AI Tutor.

### 9.3. Quan hệ với học kỳ

AI Tutor không phụ thuộc vào cách lớp được tạo. Học kỳ/Course Offering
chỉ quyết định **quyền truy cập**. Khi lớp `ARCHIVED`, Student đã từng
được `APPROVED` vẫn có thể xem lại Slide và sử dụng Tutor nếu chính sách
hệ thống cho phép.

Embedding/index nên gắn với document/version, không tạo lại chỉ vì tài
liệu được public sang Course Offering khác.

------------------------------------------------------------------------

## 10. Theo dõi học tập

### 10.1. Tiến độ học tập

Theo dõi chủ yếu:

-   Slide đã mở/xem.
-   Tiến độ theo tài liệu/lớp học phần.
-   Study plan/task đã hoàn thành.

PDF Teacher chỉ tải xuống nên không có page progress.

### 10.2. Thống kê

Có thể tổng hợp:

-   Số Slide đã xem.
-   Số Personal Documents.
-   Số kế hoạch đã hoàn thành.
-   Số Quiz đã làm.
-   Điểm Quiz trung bình.

Không sử dụng Topic Mastery trong MVP.

### 10.3. Learning Events

Các event chính:

-   `COURSE_JOIN_REQUESTED`
-   `COURSE_JOIN_APPROVED`
-   `VIEW_SLIDE`
-   `NOTE_SAVED`
-   `PERSONAL_DOCUMENT_UPLOADED`
-   `PERSONAL_DOCUMENT_INDEXED`
-   `ASK_AI`
-   `STUDY_PLAN_CREATED`
-   `STUDY_PLAN_COMPLETED`
-   `QUIZ_GENERATED`
-   `QUIZ_ACCEPTED`
-   `QUIZ_COMPLETED`

------------------------------------------------------------------------

## 11. Cơ sở dữ liệu dự kiến

PostgreSQL là nguồn dữ liệu trung tâm. `pgvector` nằm trong cùng
cluster. Java/Flyway sở hữu schema nghiệp vụ; Python/Alembic sở hữu
schema AI.

### 11.1. Bảng nghiệp vụ chính

  -----------------------------------------------------------------------
  Bảng                                Mục đích
  ----------------------------------- -----------------------------------
  `users`                             Tài khoản STUDENT/TEACHER/ADMIN;
                                      thông tin cơ bản, role, status.

  `refresh_tokens`                    Phiên đăng nhập/refresh token.

  `subjects`                          Danh mục môn học do Admin quản lý.

  `semesters`                         Học kỳ: name, academic_year,
                                      start_date, end_date, status.

  `course_offerings`                  Lớp học phần do Teacher tạo:
                                      subject_id, teacher_id,
                                      semester_id, code/name, join_code,
                                      join_enabled, status, created_at.

  `course_enrollments`                Quan hệ Student ↔ Course Offering:
                                      status, requested_at, approved_at,
                                      approved_by.

  `documents`                         Metadata tài liệu Teacher/Student.

  `document_publications`             Public một Teacher document cho một
                                      Course Offering.

  `slides`                            Slide render/extracted text của
                                      PPTX.

  `slide_notes`                       Note Student theo document +
                                      slide_number.

  `chat_conversations` /              Hội thoại PERSONAL_RAG hoặc
  `chat_messages`                     SLIDE_TUTOR.

  `learning_progress`                 Tiến độ Student theo
                                      course_offering/document/slide.

  `study_plans` / `study_plan_items`  Kế hoạch, task, deadline và lịch.

  `quizzes`                           Vòng đời Quiz AI.

  `quiz_sources`                      Personal Documents dùng sinh Quiz.

  `quiz_questions`                    Câu hỏi MCQ_SINGLE.

  `quiz_question_sources`             Citation của câu hỏi.

  `quiz_attempts` / `quiz_answers`    Lần làm bài, đáp án và điểm.

  `feedback_reports`                  Feedback/report.

  `system_logs`                       Audit nghiệp vụ.

  `system_settings`                   Cấu hình dùng chung.
  -----------------------------------------------------------------------

### 11.2. Schema AI

  -----------------------------------------------------------------------
  Bảng                                Mục đích
  ----------------------------------- -----------------------------------
  `ai.index_jobs` /                   Job index/deindex, document
  `ai.document_indexes`               version, embedding model, status.

  `ai.document_chunks`                Chunk, page/slide location, content
                                      và vector embedding.
  -----------------------------------------------------------------------

### 11.3. `course_offerings`

``` text
id
subject_id
teacher_id
semester_id
code
name
join_code
join_enabled
status          ACTIVE / ARCHIVED / LOCKED
created_at
updated_at
```

Ràng buộc:

-   `join_code` unique.
-   Teacher chỉ tạo lớp trong Semester cho phép tạo lớp.
-   Teacher chỉ thao tác lớp thuộc `teacher_id` của mình.
-   Admin có quyền giám sát/LOCK.

### 11.4. `course_enrollments`

``` text
id
course_offering_id
student_id
status          PENDING / APPROVED / REJECTED / REMOVED
requested_at
approved_at
approved_by
```

Unique:

``` text
(course_offering_id, student_id)
```

Quy tắc:

-   Student nhập join code → tạo `PENDING`.
-   Teacher của Course Offering → `APPROVED` hoặc `REJECTED`.
-   Chỉ `APPROVED` mới truy cập học liệu.
-   Teacher không tạo tài khoản Student.
-   Enrollment không bị xóa khi kết thúc học kỳ để giữ lịch sử.

### 11.5. Quan hệ chính

``` text
subjects 1 ─── N course_offerings
semesters 1 ── N course_offerings
users(Teacher) 1 ── N course_offerings

users(Student) N ── N course_offerings
                 qua course_enrollments

documents N ── N course_offerings
             qua document_publications
```

Các bảng cũ `classes`, `class_students`, `class_subjects` được thay thế
bằng mô hình `course_offerings` + `course_enrollments`.

------------------------------------------------------------------------

## 12. API/Backend dự kiến

### Auth & Users

``` text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/users/me
```

### Subjects & Semesters - Admin

``` text
GET/POST/PUT /api/v1/admin/subjects
GET/POST/PUT /api/v1/admin/semesters
```

### Course Offering - Teacher

``` text
POST /api/v1/teacher/course-offerings
GET  /api/v1/teacher/course-offerings
GET  /api/v1/teacher/course-offerings/{id}
PATCH /api/v1/teacher/course-offerings/{id}
POST /api/v1/teacher/course-offerings/{id}/archive
POST /api/v1/teacher/course-offerings/{id}/join-code/regenerate
```

### Join/Enrollment - Student

``` text
POST /api/v1/student/course-enrollments/join
GET  /api/v1/student/course-enrollments
```

Request ví dụ:

``` json
{
  "joinCode": "AI7X92"
}
```

### Enrollment Management - Teacher

``` text
GET  /api/v1/teacher/course-offerings/{id}/enrollments
POST /api/v1/teacher/enrollments/{enrollmentId}/approve
POST /api/v1/teacher/enrollments/{enrollmentId}/reject
POST /api/v1/teacher/enrollments/approve-batch
```

### Admin Monitoring

``` text
GET  /api/v1/admin/course-offerings
GET  /api/v1/admin/course-offerings/{id}
POST /api/v1/admin/course-offerings/{id}/lock
POST /api/v1/admin/course-offerings/{id}/archive
```

### Teacher Documents

Upload/list/delete metadata; public/thu hồi theo `course_offering_id`.

### Student Class Materials

Spring Boot kiểm tra enrollment `APPROVED` trước khi trả danh sách tài
liệu, Slide hoặc download PDF.

### Slide Note & AI Tutor

Spring Boot lưu Note, kiểm tra enrollment + publication rồi mới gọi
Python FastAPI.

### Personal Documents & RAG

Spring Boot quản lý ownership/status; Python xử lý
extract/chunk/embed/retrieval/RAG.

### Internal AI API

``` text
POST /internal/v1/documents/index
POST /internal/v1/documents/deindex
GET  /internal/v1/jobs/{jobId}
POST /internal/v1/personal-rag/ask
POST /internal/v1/slides/ask
POST /internal/v1/quizzes/generate
GET  /internal/v1/health
```

------------------------------------------------------------------------

## 13. Yêu cầu phi chức năng

-   **Bảo mật:** JWT, password hash, RBAC, ownership, enrollment
    authorization, validate upload.
-   **Phân quyền lớp:** chỉ Teacher sở hữu Course Offering được duyệt
    enrollment và public tài liệu cho lớp đó.
-   **Student:** chỉ truy cập Course Offering khi enrollment `APPROVED`.
-   **Admin:** có quyền giám sát/khóa nhưng không phải duyệt từng lớp.
-   **Hiệu năng:** pagination, async indexing khi cần, giới hạn RAG
    context.
-   **Độ tin cậy:** document processing status, retry có kiểm soát,
    health check.
-   **Khả dụng:** responsive, loading/error state rõ ràng.
-   **Quan sát:** request/error logs, AI latency, enrollment events,
    document processing.
-   **Riêng tư:** Personal Documents cô lập theo owner; chatbot không
    retrieval chéo Student.

------------------------------------------------------------------------

## 14. Công nghệ dự kiến

  -----------------------------------------------------------------------
  Thành phần                          Công nghệ
  ----------------------------------- -----------------------------------
  Frontend                            Next.js + Tailwind CSS

  Backend                             Java Spring Boot

  Database                            PostgreSQL

  Vector Search                       pgvector

  AI Service                          Python FastAPI

  LLM                                 Gemini hoặc OpenAI tùy quota/chi
                                      phí

  Storage                             Object Storage

  Document Processing                 Python PDF parsing; PPTX
                                      extraction/rendering

  Container                           Docker

  Source/CI                           GitHub + GitHub Actions

  Observability                       Spring Boot/FastAPI logging; có thể
                                      tích hợp Langfuse
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Deployment

``` text
Next.js / Vercel
        ↓
Java Spring Boot
        ↓
PostgreSQL + pgvector
        ↓
Object Storage

Spring Boot
        ↓ internal REST
Python FastAPI AI Service
        ↓
LLM / Embedding
```

Frontend không gọi trực tiếp AI Service. Spring Boot luôn kiểm tra JWT,
role, ownership và enrollment trước.

------------------------------------------------------------------------

## 16. Business và khả năng mở rộng

Giá trị chính của hệ thống là kết hợp:

-   Lớp học phần theo học kỳ.
-   Học liệu Teacher.
-   Slide Viewer + Note + AI Tutor.
-   Personal Documents + RAG.
-   Progress.
-   Study Plan/Calendar.
-   Quiz AI.

Mô hình Teacher tự tạo Course Offering giúp hệ thống dễ mở rộng hơn so
với việc Admin phải tạo và phân toàn bộ lớp mỗi học kỳ.

### Future integration với hệ thống nhà trường

Có thể mở rộng:

``` text
Hệ thống quản lý đào tạo
  → API/Excel thời khóa biểu
  → đồng bộ Course Offering
  → API/Excel đăng ký tín chỉ
  → đồng bộ Enrollment
```

Không bắt buộc trong MVP.

------------------------------------------------------------------------

## 17. Phạm vi MVP và Future Work

### 17.1. MVP bắt buộc

-   Auth/RBAC `STUDENT/TEACHER/ADMIN`.
-   Admin: User, Role, Subject, Semester, Course Offering monitoring.
-   Teacher tự tạo Course Offering.
-   Join code.
-   Student gửi request.
-   Teacher approve/reject Student.
-   Enrollment authorization.
-   Teacher Document Library.
-   Public/thu hồi tài liệu theo Course Offering.
-   PPTX Viewer + Note + Slide AI Tutor.
-   PDF Teacher chỉ download.
-   Personal PDF + RAG có citation.
-   Tiến độ & Thống kê.
-   Kế hoạch & Lịch.
-   Quiz AI từ Personal Documents.
-   Deploy end-to-end.

### 17.2. Future Work

-   Import thời khóa biểu Excel/CSV để tự động tạo hàng loạt Course
    Offering.
-   Import danh sách đăng ký tín chỉ để tự động tạo Enrollment.
-   AI-assisted extraction/normalization khi thời khóa biểu là PDF hoặc
    format không cố định.
-   Đồng bộ trực tiếp API hệ thống quản lý đào tạo.
-   PDF scan + OCR.
-   DOCX Personal Documents.
-   Teacher Quiz.
-   Flashcard, spaced repetition, reminder/push.
-   Exam Workspace/Mock Exam.
-   Google Calendar sync.
-   Study Group/Discussion.
-   Advanced analytics.
-   B2B Workspace.
-   Multi-Agent chỉ khi có use case orchestration rõ ràng.

------------------------------------------------------------------------

## 18. Kế hoạch 12 tuần

  -----------------------------------------------------------------------
  Tuần                                Nội dung
  ----------------------------------- -----------------------------------
  1                                   Khảo sát, use case, chốt mô hình
                                      Semester → Course Offering →
                                      Enrollment và MVP 3 role.

  2                                   UI/UX, kiến trúc Next.js + Spring
                                      Boot + FastAPI, DB schema, API
                                      contract, Docker dev.

  3                                   Auth/JWT/RBAC; User; Subject;
                                      Semester; Teacher tạo Course
                                      Offering; join code.

  4                                   Student join request; Teacher
                                      approve/reject; danh sách Student;
                                      enrollment authorization.

  5                                   Teacher Document Library +
                                      public/thu hồi theo Course
                                      Offering; Student Materials.

  6                                   Slide Viewer, Note; PDF Teacher
                                      download; PPTX
                                      extraction/rendering.

  7                                   Personal Documents + pgvector + RAG
                                      có citation.

  8                                   Slide AI Tutor + authorization + AI
                                      evaluation.

  9                                   Tiến độ & Thống kê; Kế hoạch &
                                      Lịch.

  10                                  Quiz AI từ Personal RAG;
                                      review/accept/reject;
                                      attempt/scoring.

  11                                  Admin monitoring; Feedback/Reports;
                                      Logs/Audit; Settings; security;
                                      deployment.

  12                                  Integration/regression test,
                                      seed/mock data, fix bug, báo cáo và
                                      demo.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 19. Phân công nhóm 3 người

  -----------------------------------------------------------------------
  Phụ trách                           Công việc
  ----------------------------------- -----------------------------------
  **Thành viên 1 - Frontend + AI      Next.js/Tailwind cho 3 role;
  Python**                            Course/Join UI; Slide Viewer +
                                      Note + AI Tutor UI; Personal
                                      Documents + Chat; FastAPI AI:
                                      extract/chunk/embed, pgvector
                                      retrieval, RAG, Slide Tutor, Quiz
                                      generation, citation, evaluation.

  **Thành viên 2 - Java Backend 1**   Auth/JWT/RBAC; User; Subject;
                                      Semester; Course Offering; join
                                      code; Course Enrollment; Teacher
                                      approve/reject; Admin monitoring.

  **Thành viên 3 - Java Backend 2**   Documents/Publications, Object
                                      Storage, Slides/Notes, Progress,
                                      Study Plan/Calendar, Quiz
                                      lifecycle/scoring, feedback/logs;
                                      internal API tới FastAPI.

  **Thành viên 2 + 3**                PostgreSQL schema/ERD,
                                      JPA/Hibernate, Flyway, transaction,
                                      constraints/index, API convention,
                                      validation, exception handling,
                                      tests, API docs, Docker/deploy.

  **Cả nhóm**                         Requirements, architecture, API
                                      contract, integration FE ↔ Java ↔
                                      Python, seed/mock, regression,
                                      report và demo.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 20. Tiêu chí đánh giá

  -----------------------------------------------------------------------
  Hạng mục                            Tiêu chí
  ----------------------------------- -----------------------------------
  Course Offering                     Teacher hợp lệ tự tạo lớp đúng
                                      Subject/Semester; join code unique;
                                      ownership đúng.

  Enrollment                          Student request đúng lớp; Teacher
                                      chỉ duyệt lớp của mình; chỉ
                                      `APPROVED` truy cập học liệu.

  Admin                               Quản lý User/Role/Subject/Semester
                                      và giám sát lớp; không cần duyệt
                                      từng lớp.

  Teacher Documents                   Upload, public/thu hồi đúng Course
                                      Offering.

  Student Materials                   PPTX xem trên web, PDF download;
                                      quyền theo enrollment.

  Slide Notes                         Note lưu đúng Student + Slide.

  Slide AI Tutor                      Chỉ hoạt động với Slide được phép
                                      truy cập; trả lời bám context.

  Personal RAG                        Chỉ retrieval trên PDF Student sở
                                      hữu/đã chọn; citation đúng.

  Progress                            Cập nhật đúng Slide đã xem và hoạt
                                      động chính.

  Study Plan                          CRUD task/deadline/lịch đúng nghiệp
                                      vụ.

  Quiz AI                             Sinh từ đúng Personal Documents;
                                      review trước khi làm; Java scoring.

  System                              Security cơ bản, error handling,
                                      logging, responsive và deploy ổn
                                      định.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 21. Luồng demo khi bảo vệ

1.  **Admin** đăng nhập → tạo/kiểm tra Subject và Semester → xem danh
    sách Teacher/Student.
2.  **Teacher** đăng nhập → chọn Subject + Semester → tạo Course
    Offering → hệ thống sinh join code.
3.  **Student** đăng nhập → nhập join code → gửi yêu cầu tham gia.
4.  **Teacher** mở yêu cầu → approve Student.
5.  **Student** refresh → lớp xuất hiện trong danh sách lớp đang học.
6.  **Teacher** upload PPTX/PDF → public cho Course Offering.
7.  **Student** mở lớp → xem PPTX trên web → ghi Note → hỏi Slide AI
    Tutor; PDF chỉ tải xuống.
8.  Student vào **Tài liệu cá nhân** → upload PDF → hỏi RAG có citation.
9.  Student tạo Quiz từ Personal Documents → review → accept → làm Quiz
    → xem điểm.
10. Mở **Tiến độ & Thống kê** và **Kế hoạch & Lịch**.
11. **Admin** xem Course Offering do Teacher tạo và Audit Log để chứng
    minh khả năng giám sát.
12. Toàn bộ luồng chạy trên phiên bản deploy.

------------------------------------------------------------------------

## 22. Kết quả dự kiến

Sau 12 tuần, nhóm hoàn thiện nền tảng hỗ trợ học thuật và ôn luyện theo
mô hình lớp học phần tín chỉ:

-   Admin quản lý nền tảng nhưng không phải tạo/duyệt từng lớp.
-   Teacher chủ động tạo Course Offering theo Subject + Semester và quản
    lý Student tham gia.
-   Student tham gia bằng join code và chỉ truy cập sau khi được Teacher
    duyệt.
-   Teacher quản lý/public học liệu.
-   Student xem Slide, ghi Note và hỏi AI Tutor.
-   Student có Personal Document RAG và Quiz AI.
-   Hệ thống có progress, study plan/calendar, logging và deployment
    end-to-end.

------------------------------------------------------------------------

## 23. Các quyết định thiết kế đã chốt

1.  Không dùng mô hình `Class → ClassSubject` làm phạm vi học chính.
2.  Dùng `Semester → Course Offering → Enrollment`.
3.  Admin không tạo/phân từng lớp cho Teacher trong MVP.
4.  Admin không duyệt từng Course Offering.
5.  Teacher có role hợp lệ được tự tạo Course Offering.
6.  Student tham gia bằng join code.
7.  Teacher approve/reject enrollment.
8.  Tài khoản Student/Teacher tồn tại xuyên nhiều học kỳ.
9.  Hết kỳ không xóa lớp; chuyển `ARCHIVED/COMPLETED`.
10. Student có thể xem lịch sử lớp cũ.
11. Teacher PPTX: xem trên web + Note + AI Tutor, không download file
    gốc.
12. Teacher PDF: chỉ download, không viewer/Note/Tutor.
13. Personal Documents MVP: chỉ PDF có text layer.
14. Personal RAG và Slide AI Tutor là hai trải nghiệm AI riêng.
15. Import thời khóa biểu/danh sách đăng ký tín chỉ để ở Future Work.
16. Nếu sau này import Excel/CSV, ưu tiên parser + validation xác định;
    không dùng LLM cho dữ liệu có cấu trúc cố định.
