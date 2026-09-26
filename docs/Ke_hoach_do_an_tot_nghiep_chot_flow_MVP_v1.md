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
-   Khi kết thúc học kỳ, lớp chuyển sang `ARCHIVED` thay vì bị
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
-   Hiển thị toàn bộ tiến độ tổng quan và tiến độ từng Course Offering
    trực tiếp trên **Dashboard**; không tạo màn tiến độ độc lập.
-   Bổ sung **Study Streak (Chuỗi ôn tập)** để khuyến khích Student duy
    trì hoạt động học tập hằng ngày.
-   Bổ sung **Daily Goal (Mục tiêu hằng ngày)** để Student đặt mục tiêu
    về số Slide cần xem, số câu Quiz cần làm và số Study Task cần hoàn
    thành.
-   Xây dựng Kế hoạch & Lịch để quản lý study plan, task và deadline.
-   Xây dựng khu vực Ôn tập với Quiz AI sinh từ Personal Documents.
-   Deploy end-to-end và có logging, kiểm thử, seed/mock data phục vụ
    demo.

------------------------------------------------------------------------

## 3. Đối tượng sử dụng và phạm vi

  ---------------------------------------------------------------------
  Đối tượng                          Vai trò trong hệ thống
  ---------------------------------- ----------------------------------
  **Student**                        Tham gia lớp học phần bằng join
                                     code; sau khi được Teacher duyệt
                                     có thể xem học liệu, xem Slide,
                                     ghi Note, hỏi Slide AI Tutor, tải
                                     PDF; quản lý Personal Documents,
                                     RAG, Quiz, tiến độ và kế hoạch.

  **Teacher**                        Tự tạo lớp học phần trong học kỳ
                                     đang hoạt động; quản lý yêu cầu
                                     tham gia và danh sách Student;
                                     quản lý kho học liệu; public/thu
                                     hồi tài liệu cho lớp mình sở hữu.

  **Admin**                          Quản lý tài khoản/role, danh mục
                                     môn học, học kỳ; giám sát và
                                     khóa/archive lớp khi cần; quản lý
                                     feedback, logs và cấu hình. Admin
                                     không phải duyệt từng lớp Teacher
                                     tạo.
  ---------------------------------------------------------------------

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
ARCHIVED
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

  ------------------------------------------------------------------------------
  STT                 Module              Mô tả
  ------------------- ------------------- --------------------------------------
  1                   **Dashboard**       Tổng quan lớp đang học, việc cần làm,
                                          deadline và tiến độ học tập. Hiển thị
                                          Study Streak, Daily Goal, tiến độ
                                          Slide, Quiz và Study Plan ở mức tổng
                                          quan và chi tiết từng Course Offering.

  2                   **Lớp học phần**    Xem lớp đang học theo học kỳ; nhập
                                          join code để gửi yêu cầu tham gia; xem
                                          trạng thái
                                          `PENDING/APPROVED/REJECTED`; xem lớp
                                          hiện tại và lớp đã lưu trữ.

  3                   **Tài liệu lớp học  Sau khi enrollment `APPROVED`, xem tài
                      phần**              liệu Teacher public. PPTX xem trên
                                          web; PDF tải xuống.

  4                   **Slide Viewer +    Xem PPTX trực tiếp; lưu Note theo từng
                      Note + AI Tutor**   slide; hỏi AI Tutor theo nội dung
                                          Slide/tài liệu đang xem.

  5                   **Tài liệu cá       Upload và quản lý PDF cá nhân; theo
                      nhân**              dõi
                                          `UPLOADING/PROCESSING/READY/FAILED`;
                                          chọn một/nhiều PDF để hỏi RAG.

  6                   **Kế hoạch & Lịch** Tạo/chỉnh sửa study plan, task,
                                          deadline và xem trên lịch.

  7                   **Ôn tập**          Quản lý Quiz AI sinh từ Personal
                                          Documents; review, accept/reject, làm
                                          Quiz READY và xem kết quả. Tiến độ
                                          từng Course Offering được hiển thị
                                          trực tiếp trên Dashboard.
  ------------------------------------------------------------------------------

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

  -----------------------------------------------------------------------
  STT                   Module                Mô tả
  --------------------- --------------------- ---------------------------
  1                     **Dashboard hệ        Tổng quan Student, Teacher,
                        thống**               Course Offering, Subject,
                                              Semester và thông tin vận
                                              hành chính.

  2                     **Quản lý người       Tạo/import/xem/cập
                        dùng**                nhật/khóa/mở khóa tài khoản
                                              Student và Teacher.

  3                     **Quản lý vai trò &   Gán
                        phân quyền**          `STUDENT/TEACHER/ADMIN`;
                                              chỉ tài khoản Teacher hợp
                                              lệ mới được tạo Course
                                              Offering.

  4                     **Quản lý môn học**   CRUD danh mục Subject dùng
                                              chung; Teacher chỉ được tạo
                                              lớp từ Subject hợp lệ.

  5                     **Quản lý học kỳ**    Tạo/cập nhật Semester, ngày
                                              bắt đầu/kết thúc và trạng
                                              thái
                                              `UPCOMING/ACTIVE/CLOSED`.

  6                     **Giám sát lớp học    Xem Course Offering do
                        phần**                Teacher tạo; tìm kiếm/lọc
                                              theo Teacher, Subject,
                                              Semester; có quyền
                                              `LOCK/ARCHIVE` lớp bất
                                              thường khi cần. Không duyệt
                                              từng lớp trước khi hoạt
                                              động.

  7                     **Feedback &          Tiếp nhận phản hồi/lỗi và
                        Reports**             báo cáo vận hành.

  8                     **System Logs &       Theo dõi login, role
                        Audit**               change, Teacher tạo lớp,
                                              enrollment approval,
                                              publication và thao tác
                                              quản trị quan trọng.

  9                     **Cấu hình hệ thống** Giới hạn upload, loại file,
                                              tham số dùng chung và các
                                              cấu hình vận hành cơ bản.
  -----------------------------------------------------------------------

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

  ---------------------------------------------------------------------
  Khối                               Trách nhiệm
  ---------------------------------- ----------------------------------
  **Frontend - Next.js**             Student/Teacher/Admin UI; Course
                                     Offering; join request; enrollment
                                     management; documents; Slide
                                     Viewer; Note; AI Tutor; Personal
                                     RAG; Quiz; Progress; Study Plan.

  **Backend chính - Spring Boot**    Auth/JWT/RBAC; User; Subject;
                                     Semester; Course Offering; join
                                     code; Enrollment; Teacher
                                     ownership; Documents/Publications;
                                     Note; Progress; Study Plan; Quiz;
                                     scoring; logging; authorization
                                     trước khi gọi AI.

  **AI Service - Python FastAPI**    PDF extraction, chunking,
                                     embedding, pgvector retrieval,
                                     RAG, prompt/LLM, citation, Slide
                                     AI Tutor và sinh bản nháp Quiz.

  **PostgreSQL + pgvector**          Dữ liệu nghiệp vụ + vector/chunks.

  **Object Storage**                 File PDF/PPTX gốc và tài nguyên
                                     render Slide.
  ---------------------------------------------------------------------

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

## 10. Theo dõi học tập, Study Streak và Daily Goal

Không xây dựng **Tiến độ & Thống kê** thành một menu độc lập. Dashboard
hiển thị cả chỉ số tổng quan và tiến độ chi tiết theo từng Course Offering.
Course Offering Detail tập trung vào thông tin lớp và học liệu; Ôn tập
tập trung vào Quiz, câu sai, nguồn cần xem lại và lịch sử attempt.

### 10.1. Tiến độ học tập

Theo dõi chủ yếu:

-   Slide đã mở/xem.
-   Tiến độ theo tài liệu/lớp học phần.
-   Study plan/task đã hoàn thành.
-   Số Quiz đã làm và điểm Quiz trung bình.

PDF Teacher chỉ tải xuống nên không có page progress. Việc xem Slide chỉ
được hiểu là **Viewing Progress**, không dùng để kết luận Student đã
hiểu hoặc thành thạo kiến thức.

### 10.2. Hiển thị trên Dashboard

Dashboard Student hiển thị:

-   Lớp học phần đang học.
-   Việc cần làm/deadline gần nhất.
-   Tổng quan Slide đã xem.
-   Study Plan/Task đã hoàn thành.
-   Số Quiz đã làm và điểm Quiz trung bình.
-   Study Streak hiện tại và kỷ lục.
-   Daily Goal của ngày hiện tại.

Dashboard hiển thị đầy đủ tiến độ theo từng Course Offering cùng số liệu
tổng quan; không tạo menu hoặc màn hình tiến độ chi tiết riêng.

### 10.3. Study Streak - Chuỗi ôn tập

Study Streak thể hiện số ngày liên tiếp Student có hoạt động học tập hợp
lệ. Không tính streak chỉ dựa trên việc đăng nhập.

Các hoạt động MVP được tính streak:

-   `VIEW_SLIDE`
-   `STUDY_TASK_COMPLETED`
-   `QUIZ_COMPLETED`

Quy tắc:

-   Trong ngày chỉ cần có ít nhất một hoạt động hợp lệ thì ngày đó được
    tính là một ngày học.
-   Nhiều hoạt động trong cùng ngày vẫn chỉ tính một ngày.
-   Nếu Student không có hoạt động hợp lệ trong một ngày thì chuỗi bị
    ngắt.
-   Hiển thị `currentStreak`, `longestStreak` và các ngày có hoạt động
    trong tuần gần nhất.
-   Streak chỉ dùng khuyến khích duy trì thói quen, không dùng để đánh
    giá năng lực học tập.

### 10.4. Daily Goal - Mục tiêu hằng ngày

Student có thể cấu hình mục tiêu hằng ngày gồm:

-   Số Slide cần xem.
-   Số câu Quiz cần hoàn thành.
-   Số Study Task cần hoàn thành.

Ví dụ:

``` text
Slide:        5 / 5
Quiz:         6 / 10 câu
Study Task:   1 / 2
```

Target được Student cấu hình và có thể dùng lặp lại cho các ngày tiếp
theo. Backend tính `actual` từ hoạt động học thực tế trong ngày.

Daily Goal và Study Streak độc lập:

-   **Daily Goal:** hôm nay Student muốn hoàn thành bao nhiêu.
-   **Study Streak:** Student đã duy trì hoạt động học bao nhiêu ngày
    liên tiếp.

Không bắt buộc hoàn thành 100% Daily Goal để duy trì Streak; chỉ cần có
ít nhất một hoạt động học hợp lệ trong ngày.

### 10.5. Learning Events

Các event chính:

-   `COURSE_JOIN_REQUESTED`
-   `COURSE_JOIN_APPROVED`
-   `VIEW_SLIDE`
-   `NOTE_SAVED`
-   `PERSONAL_DOCUMENT_UPLOADED`
-   `PERSONAL_DOCUMENT_INDEXED`
-   `ASK_AI`
-   `STUDY_PLAN_CREATED`
-   `STUDY_TASK_COMPLETED`
-   `QUIZ_GENERATED`
-   `QUIZ_COMPLETED`

Không sử dụng Topic Mastery trong MVP.

------------------------------------------------------------------------

## 11. Cơ sở dữ liệu dự kiến

PostgreSQL là nguồn dữ liệu trung tâm. `pgvector` nằm trong cùng
cluster. Java/Flyway sở hữu schema nghiệp vụ; Python/Alembic sở hữu
schema AI.

### 11.1. Bảng nghiệp vụ chính

  ---------------------------------------------------------------------
  Bảng                               Mục đích
  ---------------------------------- ----------------------------------
  `users`                            Tài khoản STUDENT/TEACHER/ADMIN;
                                     thông tin cơ bản, role, status.

  `refresh_tokens`                   Phiên đăng nhập/refresh token.

  `subjects`                         Danh mục môn học do Admin quản lý.

  `semesters`                        Học kỳ: name, academic_year,
                                     start_date, end_date, status.

  `course_offerings`                 Lớp học phần do Teacher tạo:
                                     subject_id, teacher_id,
                                     semester_id, code/name, join_code,
                                     join_enabled, status, created_at.

  `course_enrollments`               Quan hệ Student ↔ Course Offering:
                                     status, requested_at, approved_at,
                                     approved_by.

  `documents`                        Metadata tài liệu Teacher/Student.

  `document_publications`            Public một Teacher document cho
                                     một Course Offering.

  `slides`                           Slide render/extracted text của
                                     PPTX.

  `slide_notes`                      Note Student theo document +
                                     slide_number.

  `chat_conversations` /             Hội thoại PERSONAL_RAG hoặc
  `chat_messages`                    SLIDE_TUTOR.

  `learning_progress`                Tiến độ Student theo
                                     course_offering/document/slide.

  `learning_events`                  Event học tập dùng tổng hợp
                                     Dashboard, tính Study Streak và
                                     Daily Goal.

  `daily_goals`                      Cấu hình mục tiêu hằng ngày:
                                     slide_target,
                                     quiz_question_target, task_target.

  `study_plans` / `study_plan_items` Kế hoạch, task, deadline và lịch.

  `quizzes`                          Vòng đời Quiz AI.

  `quiz_sources`                     Personal Documents dùng sinh Quiz.

  `quiz_questions`                   Câu hỏi MCQ_SINGLE.

  `quiz_question_sources`            Citation của câu hỏi.

  `quiz_attempts` / `quiz_answers`   Lần làm bài, đáp án và điểm.

  `feedback_reports`                 Feedback/report.

  `system_logs`                      Audit nghiệp vụ.

  `system_settings`                  Cấu hình dùng chung.
  ---------------------------------------------------------------------

### 11.2. Schema AI

  ---------------------------------------------------------------------
  Bảng                               Mục đích
  ---------------------------------- ----------------------------------
  `ai.index_jobs` /                  Job index/deindex, document
  `ai.document_indexes`              version, embedding model, status.

  `ai.document_chunks`               Chunk, page/slide location,
                                     content và vector embedding.
  ---------------------------------------------------------------------

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

### Dashboard, Study Streak & Daily Goal - Student

``` text
GET /api/v1/student/dashboard
GET /api/v1/student/study-streak
GET /api/v1/student/daily-goal
PUT /api/v1/student/daily-goal
```

`GET /api/v1/student/study-streak` trả về `currentStreak`,
`longestStreak` và `activityDays`.

`GET /api/v1/student/daily-goal` trả về target và actual của Slide, câu
Quiz và Study Task trong ngày hiện tại.

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

  ---------------------------------------------------------------------
  Thành phần                         Công nghệ
  ---------------------------------- ----------------------------------
  Frontend                           Next.js + Tailwind CSS

  Backend                            Java Spring Boot

  Database                           PostgreSQL

  Vector Search                      pgvector

  AI Service                         Python FastAPI

  LLM                                Gemini hoặc OpenAI tùy quota/chi
                                     phí

  Storage                            Object Storage

  Document Processing                Python PDF parsing; PPTX
                                     extraction/rendering

  Container                          Docker

  Source/CI                          GitHub + GitHub Actions

  Observability                      Spring Boot/FastAPI logging; có
                                     thể tích hợp Langfuse
  ---------------------------------------------------------------------

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
-   Dashboard tổng hợp tiến độ học tập.
-   Study Streak (Chuỗi ôn tập).
-   Daily Goal (Mục tiêu hằng ngày).
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

  ---------------------------------------------------------------------
  Tuần                               Nội dung
  ---------------------------------- ----------------------------------
  1                                  Khảo sát, use case, chốt mô hình
                                     Semester → Course Offering →
                                     Enrollment và MVP 3 role.

  2                                  UI/UX, kiến trúc Next.js + Spring
                                     Boot + FastAPI, DB schema, API
                                     contract, Docker dev.

  3                                  Auth/JWT/RBAC; User; Subject;
                                     Semester; Teacher tạo Course
                                     Offering; join code.

  4                                  Student join request; Teacher
                                     approve/reject; danh sách Student;
                                     enrollment authorization.

  5                                  Teacher Document Library +
                                     public/thu hồi theo Course
                                     Offering; Student Materials.

  6                                  Slide Viewer, Note; PDF Teacher
                                     download; PPTX
                                     extraction/rendering.

  7                                  Personal Documents + pgvector +
                                     RAG có citation.

  8                                  Slide AI Tutor + authorization +
                                     AI evaluation.

  9                                  Dashboard progress; Study Streak;
                                     Daily Goal; Kế hoạch & Lịch.

  10                                 Quiz AI từ Personal RAG;
                                     review/accept/reject;
                                     attempt/scoring.

  11                                 Admin monitoring;
                                     Feedback/Reports; Logs/Audit;
                                     Settings; security; deployment.

  12                                 Integration/regression test,
                                     seed/mock data, fix bug, báo cáo
                                     và demo.
  ---------------------------------------------------------------------

------------------------------------------------------------------------

## 19. Phân công nhóm 3 người

  ---------------------------------------------------------------------
  Phụ trách                          Công việc
  ---------------------------------- ----------------------------------
  **Thành viên 1 - Frontend + AI     Next.js/Tailwind cho 3 role;
  Python**                           Course/Join UI; Slide Viewer +
                                     Note + AI Tutor UI; Personal
                                     Documents + Chat; FastAPI AI:
                                     extract/chunk/embed, pgvector
                                     retrieval, RAG, Slide Tutor, Quiz
                                     generation, citation, evaluation.

  **Thành viên 2 - Java Backend 1**  Auth/JWT/RBAC; User; Subject;
                                     Semester; Course Offering; join
                                     code; Course Enrollment; Teacher
                                     approve/reject; Admin monitoring.

  **Thành viên 3 - Java Backend 2**  Documents/Publications, Object
                                     Storage, Slides/Notes, Progress,
                                     Study Plan/Calendar, Quiz
                                     lifecycle/scoring, feedback/logs;
                                     internal API tới FastAPI.

  **Thành viên 2 + 3**               PostgreSQL schema/ERD,
                                     JPA/Hibernate, Flyway,
                                     transaction, constraints/index,
                                     API convention, validation,
                                     exception handling, tests, API
                                     docs, Docker/deploy.

  **Cả nhóm**                        Requirements, architecture, API
                                     contract, integration FE ↔ Java ↔
                                     Python, seed/mock, regression,
                                     report và demo.
  ---------------------------------------------------------------------

------------------------------------------------------------------------

## 20. Tiêu chí đánh giá

  ---------------------------------------------------------------------
  Hạng mục                           Tiêu chí
  ---------------------------------- ----------------------------------
  Course Offering                    Teacher hợp lệ tự tạo lớp đúng
                                     Subject/Semester; join code
                                     unique; ownership đúng.

  Enrollment                         Student request đúng lớp; Teacher
                                     chỉ duyệt lớp của mình; chỉ
                                     `APPROVED` truy cập học liệu.

  Admin                              Quản lý User/Role/Subject/Semester
                                     và giám sát lớp; không cần duyệt
                                     từng lớp.

  Teacher Documents                  Upload, public/thu hồi đúng Course
                                     Offering.

  Student Materials                  PPTX xem trên web, PDF download;
                                     quyền theo enrollment.

  Slide Notes                        Note lưu đúng Student + Slide.

  Slide AI Tutor                     Chỉ hoạt động với Slide được phép
                                     truy cập; trả lời bám context.

  Personal RAG                       Chỉ retrieval trên PDF Student sở
                                     hữu/đã chọn; citation đúng.

  Progress                           Cập nhật đúng Slide đã xem và hoạt
                                     động chính.

  Study Plan                         CRUD task/deadline/lịch đúng
                                     nghiệp vụ.

  Quiz AI                            Sinh từ đúng Personal Documents;
                                     review trước khi làm; Java
                                     scoring.

  System                             Security cơ bản, error handling,
                                     logging, responsive và deploy ổn
                                     định.
  ---------------------------------------------------------------------

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
10. Mở **Dashboard** để xem Study Streak, Daily Goal, tiến độ tổng quan
    và tiến độ chi tiết từng Course Offering; sau đó mở **Kế hoạch & Lịch**.
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
9.  Hết kỳ không xóa lớp; chuyển `ARCHIVED` và tắt join code.
10. Student có thể xem lịch sử lớp cũ.
11. Teacher PPTX: xem trên web + Note + AI Tutor, không download file
    gốc.
12. Teacher PDF: chỉ download, không viewer/Note/Tutor.
13. Personal Documents MVP: chỉ PDF có text layer.
14. Không tạo menu hoặc màn **Tiến độ & Thống kê** độc lập; Dashboard
    hiển thị cả tổng quan và tiến độ theo từng Course Offering.
15. Gamification MVP chỉ gồm **Study Streak** và **Daily Goal**; chưa
    triển khai XP, Level, Achievement hoặc leaderboard.
16. Streak được tính từ hoạt động học hợp lệ, không tính từ đăng nhập và
    không yêu cầu hoàn thành 100% Daily Goal.
17. Personal RAG và Slide AI Tutor là hai trải nghiệm AI riêng.
18. Import thời khóa biểu/danh sách đăng ký tín chỉ để ở Future Work.
19. Nếu sau này import Excel/CSV, ưu tiên parser + validation xác định;
    không dùng LLM cho dữ liệu có cấu trúc cố định.

------------------------------------------------------------------------

# PHỤ LỤC --- FLOW MVP V1.0 ĐÃ CHỐT

> Phần này là flow chuẩn để đồng bộ Use Case, Database, API, UI và
> roadmap triển khai.

## 1. Flow tổng thể

``` text
USER
 ↓
Đăng nhập
 ↓
Spring Boot Auth
 ├─ STUDENT
 ├─ TEACHER
 └─ ADMIN
```

### Student

-   Dashboard
-   Lớp học phần
-   Tài liệu cá nhân + RAG
-   Slide Viewer + Note + AI Tutor
-   AI Quiz
-   Ôn tập
-   Kế hoạch & Lịch
-   Study Streak
-   Daily Goal

### Teacher

-   Tạo và quản lý Course Offering
-   Quản lý yêu cầu tham gia
-   Quản lý Student trong lớp
-   Upload tài liệu
-   Publish tài liệu vào Course Offering
-   Archive lớp

### Admin

-   User / Role
-   Subject
-   Semester
-   Course Offering Monitoring
-   Feedback
-   Audit Logs
-   Settings

Admin không duyệt từng Course Offering và không gán từng Student vào
lớp.

------------------------------------------------------------------------

## 2. Course Offering và Enrollment

``` text
Admin tạo Subject + Semester
        ↓
Teacher chọn Subject + Semester
        ↓
Tạo Course Offering
        ↓
Hệ thống sinh Join Code
        ↓
ACTIVE
        ↓
Student nhập Join Code
        ↓
course_enrollment = PENDING
        ↓
Teacher Approve / Reject
        ↓
APPROVED → Student được truy cập môn
```

Quy tắc truy cập:

``` text
course_enrollments.status == APPROVED
```

Student và Teacher account được giữ qua nhiều học kỳ, không tạo lại theo
từng semester.

------------------------------------------------------------------------

## 3. Teacher Document Flow

``` text
Teacher
 ↓
Kho tài liệu
 ↓
Upload PPTX / PDF
 ↓
Object Storage
 ↓
Document Record
 ↓
Chọn Course Offering
 ↓
Publish
 ↓
document_publications
```

Một document có thể được publish vào nhiều Course Offering mà không
duplicate file.

### Student sử dụng tài liệu

``` text
Course Offering
 ↓
Materials
 ├─ PPTX → Slide Viewer → Note + AI Tutor + Auto Progress
 └─ PDF  → Download
```

Teacher PDF trong MVP không có Viewer, Note hoặc AI Tutor.

------------------------------------------------------------------------

## 4. Slide AI Tutor

``` text
Student mở PPTX
 ↓
Slide Viewer
 ↓
Hỏi AI tại slide đang xem
 ↓
Spring Boot kiểm tra Enrollment + Publication
 ↓
FastAPI
 ↓
Slide Context + Deck Context cần thiết
 ↓
LLM
 ↓
Answer + Citation [Slide N]
```

AI Tutor chỉ là trợ lý trong Slide Viewer, không phải chatbot toàn hệ
thống.

------------------------------------------------------------------------

## 5. Personal Documents + RAG

``` text
Student
 ↓
Tài liệu cá nhân
 ↓
Upload PDF
 ↓
Object Storage
 ↓
PROCESSING
 ↓
Extract Text
 ↓
Chunk
 ↓
Embedding
 ↓
pgvector
 ↓
READY
```

Hỏi đáp:

``` text
Chọn một hoặc nhiều PDF
 ↓
Nhập câu hỏi
 ↓
Spring Boot kiểm tra Ownership
 ↓
FastAPI Retrieval
 ↓
LLM
 ↓
Answer + Citation [Trang N]
```

MVP chỉ hỗ trợ Personal PDF. OCR scanned PDF và DOCX để Future Work.

------------------------------------------------------------------------

# 6. AI QUIZ --- FLOW ĐÃ CHỐT

## 6.1. Nguyên tắc

Student được **tự do tạo Quiz bằng prompt**.

Không bắt buộc form: - số câu; - độ khó; - chủ đề; - loại kiến thức.

Các yêu cầu này được Student diễn đạt trực tiếp trong prompt.

Ví dụ:

``` text
"Tạo cho tôi 15 câu trắc nghiệm khó về Neural Network,
tập trung vào Backpropagation và Activation Function."
```

## 6.2. Tạo Quiz

``` text
Student
 ↓
Tạo Quiz
 ↓
Chọn tài liệu
 ↓
Nhập Prompt tự do
 ↓
Spring Boot
 ├─ Authentication
 ├─ Ownership
 └─ Document Permission
 ↓
FastAPI
 ↓
RAG Retrieval
 ↓
System Prompt + User Prompt + Retrieved Context
 ↓
LLM
 ↓
Structured Quiz
 ↓
Validate Output
 ↓
REVIEW_REQUIRED
```

Output MVP của mỗi câu:

``` text
MCQ_SINGLE
- Question
- 4 Options
- Correct Answer
- Explanation
- Citation / Source
```

Prompt của Student không được dùng như toàn bộ system instruction. AI
Service vẫn áp dụng system rules để kiểm soát format, grounding và
citation.

------------------------------------------------------------------------

## 6.3. Review Quiz

``` text
AI Generate
 ↓
REVIEW_REQUIRED
 ↓
Student xem Quiz
 ├─ Tạo lại
 └─ Chấp nhận
```

Nếu tạo lại, Student có thể nhập prompt mới như:

``` text
"Làm khó hơn và tập trung nhiều hơn vào Backpropagation."
```

MVP chỉ cần Accept/Reject hoặc Regenerate toàn bộ Quiz, chưa cần editor
từng câu.

------------------------------------------------------------------------

## 6.4. Chấp nhận và đưa Quiz vào Ôn tập

Sau khi Student chấp nhận:

``` text
REVIEW_REQUIRED
 ↓
ACCEPT
 ↓
Chọn nơi đưa Quiz vào
 ├─ Course Offering mà Student đã APPROVED
 └─ Quiz cá nhân
```

Nếu gắn với môn:

``` text
Spring Boot
 ↓
Kiểm tra Enrollment == APPROVED
 ↓
quiz.course_offering_id = selected_course
 ↓
READY
```

Nếu không gắn môn:

``` text
quiz.course_offering_id = NULL
 ↓
READY
 ↓
Quiz cá nhân
```

**Nguồn tạo Quiz và môn dùng để ôn là hai khái niệm độc lập.**

Ví dụ Student có thể tạo Quiz từ Personal PDF rồi gắn Quiz đó vào Course
Offering "Trí tuệ nhân tạo".

------------------------------------------------------------------------

# 7. MODULE ÔN TẬP

## 7.1. Màn hình đầu

Khi Student vào **Ôn tập**, trước tiên chọn môn muốn ôn:

``` text
ÔN TẬP

Môn học của tôi

Trí tuệ nhân tạo
- Quiz: 5
- Điểm TB: 7.8
[Ôn tập]

Machine Learning
- Quiz: 3
- Điểm TB: 8.1
[Ôn tập]

Quiz cá nhân: 2

[+ Tạo Quiz]
```

Chỉ hiển thị Course Offering Student có quyền truy cập.

## 7.2. Workspace ôn tập của một môn

``` text
ÔN TẬP / TRÍ TUỆ NHÂN TẠO

1. Tổng quan
2. Bài Quiz
3. Nội dung cần ôn lại
4. Lịch sử & kết quả
```

------------------------------------------------------------------------

## 7.3. Làm Quiz

``` text
Chọn Quiz READY
 ↓
Start Attempt
 ↓
Trả lời câu hỏi
 ↓
Submit
 ↓
Spring Boot chấm điểm
 ↓
Lưu quiz_attempt + quiz_answers
 ↓
COMPLETED
```

MCQ_SINGLE được Java chấm trực tiếp, không gọi LLM để chấm.

------------------------------------------------------------------------

## 7.4. Nội dung cần ôn lại

Không dùng AI để suy đoán Student "yếu" phần nào.

Dùng dữ liệu câu sai thực tế:

``` text
quiz_answers (WRONG)
 ↓
question_id
 ↓
quiz_question_sources
 ↓
document + pageNumber / slideNumber
 ↓
Nội dung cần ôn lại
```

Ví dụ:

``` text
Backpropagation
- Sai 3 câu
- MachineLearning.pdf - Trang 25
[Xem nguồn]

Activation Function
- Sai 2 câu
- Slide 31
[Xem lại]
```

------------------------------------------------------------------------

## 7.5. Ôn lại và kiểm tra lại

``` text
Nội dung cần ôn lại
 ↓
Student mở nguồn
 ↓
Ôn lại
 ↓
Làm/Tạo Quiz tiếp theo
 ↓
Quiz Attempt mới
 ↓
Chấm điểm
 ↓
So sánh với các Attempt trước
```

Không overwrite lịch sử Attempt.

Ví dụ:

``` text
Attempt 1: 5.0
Attempt 2: 7.0
Attempt 3: 8.5
```

------------------------------------------------------------------------

# 8. PROGRESS VÀ LEARNING EVENTS

Progress được ghi tự động từ hành vi học, không phải Student nhập thủ
công.

``` text
VIEW_SLIDE
 ├─ Slide Progress
 └─ Learning Event

STUDY_TASK_COMPLETED
 └─ Learning Event

QUIZ_COMPLETED
 ├─ Quiz Attempt
 ├─ Quiz Answers
 └─ Learning Event
```

`Tiến độ & Ôn tập` là lớp **đọc/tổng hợp dữ liệu**, không phải nơi tạo
progress.

``` text
Slide Progress
Study Plan
Quiz Attempts
Quiz Answers
Question Sources
      ↓
Tiến độ & Ôn tập
      ↓
- Tiến độ học liệu
- Kết quả Quiz
- Nội dung cần ôn lại
- Điều hướng quay lại học
```

------------------------------------------------------------------------

# 9. STUDY STREAK

Valid learning activity trong MVP:

-   VIEW_SLIDE
-   STUDY_TASK_COMPLETED
-   QUIZ_COMPLETED

``` text
Learning Events
 ↓
Có ít nhất một valid activity trong ngày?
 ↓
YES
 ↓
Ngày đó là Active Day
 ↓
Tính currentStreak + longestStreak
```

Không tính login.

Không yêu cầu hoàn thành 100% Daily Goal để giữ Streak.

------------------------------------------------------------------------

# 10. DAILY GOAL

Student cấu hình mục tiêu hằng ngày:

``` text
slide_target
quiz_question_target
task_target
```

Ví dụ Dashboard:

``` text
MỤC TIÊU HÔM NAY

Slide:      4/5
Quiz:       8/10
Study Task: 1/2
```

Actual được tính tự động từ dữ liệu học trong ngày.

Daily Goal và Study Streak hoạt động độc lập.

------------------------------------------------------------------------

# 11. KẾ HOẠCH & LỊCH

``` text
Student
 ↓
Kế hoạch & Lịch
 ↓
Tạo Study Task
 ↓
Course Offering (optional)
Title
Deadline
 ↓
PENDING
 ↓
Student hoàn thành
 ↓
COMPLETED
 ↓
Learning Event
```

MVP không cần AI cho chức năng này.

------------------------------------------------------------------------

# 12. DASHBOARD STUDENT

Dashboard là nơi tổng hợp nhanh:

``` text
Dashboard
 ├─ Current Course Offerings
 ├─ Upcoming Tasks / Deadlines
 ├─ Overall Learning Progress
 ├─ Study Streak
 ├─ Daily Goal
 └─ Quiz / Study Plan Summary
```

Không có menu top-level riêng tên "Tiến độ & Thống kê".

Tiến độ theo môn nằm trực tiếp trên Dashboard; Ôn tập chỉ tập trung vào
Quiz, câu sai, nguồn cần xem lại và lịch sử attempt.

------------------------------------------------------------------------

# 13. KẾT THÚC HỌC KỲ

``` text
Semester kết thúc
 ↓
Course Offering
ACTIVE → ARCHIVED
 ↓
Disable Join
```

Không xóa: - account; - enrollment; - document; - note; - progress; -
quiz; - quiz attempt.

Học kỳ mới, Teacher tạo Course Offering mới.

------------------------------------------------------------------------

# 14. ADMIN FLOW

``` text
Admin
 ├─ Dashboard
 ├─ User Management
 ├─ Role / RBAC
 ├─ Subject Catalog
 ├─ Semester Management
 ├─ Course Offering Monitoring
 │   ├─ View
 │   ├─ Filter
 │   ├─ LOCK
 │   └─ ARCHIVE
 ├─ Feedback
 ├─ Audit Logs
 └─ Settings
```

Admin không: - duyệt từng Course Offering; - tạo từng lớp thay
Teacher; - gán từng Student; - quản lý Quiz cá nhân hằng ngày; - sử dụng
RAG thay Student.

------------------------------------------------------------------------

# 15. KIẾN TRÚC KỸ THUẬT CHỐT

``` text
Next.js Frontend
       ↓
Spring Boot Main Backend
       ↓
PostgreSQL + Object Storage
       │
       └────→ FastAPI AI Service
                     ↓
            RAG / Embedding / LLM
                     ↓
                  pgvector
```

## Spring Boot chịu trách nhiệm

-   Auth / JWT / RBAC
-   User
-   Subject
-   Semester
-   Course Offering
-   Enrollment
-   Document metadata / publication
-   Notes
-   Progress
-   Study Plan
-   Quiz lifecycle
-   Quiz attempts / scoring
-   Learning Events
-   Study Streak
-   Daily Goal
-   Audit / Security
-   Permission check trước AI

## FastAPI chịu trách nhiệm

-   Text extraction
-   Chunking
-   Embedding
-   pgvector retrieval
-   Personal RAG
-   Slide AI Tutor
-   AI Quiz generation
-   Prompt / LLM
-   Citation

Nguyên tắc:

> **Spring Boot quyết định User có được phép thực hiện hành động hay
> không. FastAPI quyết định AI xử lý nội dung như thế nào.**

------------------------------------------------------------------------

# 16. FLOW STUDENT END-TO-END

``` text
STUDENT
 │
 ├─ Dashboard
 │
 ├─ Lớp học phần
 │    ↓
 │  Join Code
 │    ↓
 │  Teacher Approve
 │    ↓
 │  Chọn Course Offering
 │    ├─ PPTX → Slide Viewer → Note + AI Tutor + Auto Progress
 │    └─ PDF → Download
 │
 ├─ Tài liệu cá nhân
 │    ↓
 │  Upload PDF
 │    ↓
 │  Index → pgvector
 │    ↓
 │  Personal RAG
 │
 ├─ AI Quiz
 │    ↓
 │  Chọn tài liệu
 │    ↓
 │  Prompt tự do
 │    ↓
 │  Generate
 │    ↓
 │  REVIEW_REQUIRED
 │    ↓
 │  Accept
 │    ├─ Gắn Course Offering
 │    └─ Quiz cá nhân
 │
 ├─ Ôn tập
 │    ↓
 │  Chọn môn
 │    ↓
 │  Chọn Quiz
 │    ↓
 │  Làm Quiz
 │    ↓
 │  Java chấm
 │    ↓
 │  Câu sai
 │    ↓
 │  Source / Citation
 │    ↓
 │  Nội dung cần ôn
 │    ↓
 │  Ôn lại
 │    ↓
 │  Attempt mới
 │    ↓
 │  So sánh kết quả
 │
 └─ Kế hoạch & Lịch
      ↓
    Study Task
      ↓
    Learning Event

Learning Events
 ├─ Dashboard
 ├─ Study Streak
 └─ Daily Goal
```

------------------------------------------------------------------------

# 17. THỨ TỰ XÂY DỰNG CHỨC NĂNG

  -----------------------------------------------------------------------
  Giai đoạn                           Chức năng
  ----------------------------------- -----------------------------------
  1\. Foundation                      Auth → RBAC → User → Subject →
                                      Semester

  2\. Course                          Course Offering → Join Code →
                                      Enrollment → Teacher Approve

  3\. Documents                       Upload → Storage → Publication →
                                      Permission

  4\. Learning                        Slide Viewer → Note → Auto Progress

  5\. AI Documents                    PDF processing → Embedding →
                                      pgvector → Personal RAG

  6\. AI Tutor                        Slide Context → Tutor → Citation

  7\. AI Quiz                         Select Documents → Free Prompt →
                                      Generate → Review → Accept

  8\. Review                          Gắn môn → Làm Quiz → Scoring →
                                      Wrong Answers → Review Source

  9\. Planning                        Study Plan → Calendar

  10\. Engagement                     Learning Events → Study Streak →
                                      Daily Goal

  11\. Dashboard                      Aggregate Progress → Streak → Goal
                                      → Deadlines

  12\. Admin & Deploy                 Monitoring → Logs → Settings →
                                      Security → Deploy
  -----------------------------------------------------------------------

## Nguyên tắc triển khai

Không xây Dashboard, Streak hoặc `Tiến độ & Ôn tập` trước khi có dữ liệu
học thực tế.

Cần xây trước:

``` text
Slide Progress
Quiz Attempt
Quiz Answer
Study Task
Learning Event
```

Sau đó mới xây:

``` text
Dashboard
Study Streak
Daily Goal
Tiến độ & Ôn tập
```

------------------------------------------------------------------------

## 18. Trạng thái MVP v1.0

Flow này được sử dụng làm baseline để đồng bộ:

1.  Use Case.
2.  Database schema.
3.  API endpoints.
4.  UI pages.
5.  Permission/RBAC.
6.  AI Service.
7.  Roadmap 12 tuần.
8.  Phân chia công việc 3 thành viên.
9.  Test cases.
10. Demo flow.
