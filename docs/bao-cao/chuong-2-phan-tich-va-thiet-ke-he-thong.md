# CHƯƠNG 2. PHA PHÂN TÍCH HỆ THỐNG

Chương này trình bày toàn bộ kết quả của pha phân tích trong quy trình phát triển hệ thống StudyFlow, bao gồm: phân tích bài toán thực tế, xác định mục tiêu và các tác nhân; phân tích yêu cầu chức năng và phi chức năng; xây dựng form mô tả 9 chức năng trọng tâm chia đều cho 3 thành viên (trong đó 3 chức năng AI đã được chốt và mô tả chi tiết, các chức năng của hai thành viên còn lại được chuẩn bị sẵn form mẫu để hoàn thiện); xây dựng hệ thống biểu đồ Use Case (Use Case Diagram); và đặc tả kịch bản Use Case (Use Case Scenarios) chi tiết cho các ca sử dụng đã chốt của hệ thống.

---

## 2.1. Phân tích bài toán và mục tiêu hệ thống

### 2.1.1. Mô tả bài toán thực tế

Trong môi trường giáo dục đại học hiện nay, sinh viên thường phải đối mặt với tình trạng quá tải thông tin và phân mảnh công cụ học tập. Quá trình tự học và ôn thi của sinh viên thường gặp các khó khăn điển hình:
1. **Phân mảnh tài liệu học tập:** Học liệu chính thức của giảng viên (bài giảng slide PPTX, tài liệu tham khảo PDF) và tài liệu nghiên cứu cá nhân của sinh viên được lưu trữ rời rạc trên nhiều nền tảng (email, mạng xã hội, ổ đĩa cá nhân), gây mất nhiều thời gian tìm kiếm và đồng bộ.
2. **Khai thác kiến thức thiếu định hướng và nguy cơ sai lệch từ AI:** Việc ứng dụng các mô hình ngôn ngữ lớn (LLM) phổ thông như ChatGPT trong học tập tiềm ẩn rủi ro "ảo giác" (hallucination), cung cấp thông tin không có căn cứ hoặc nằm ngoài giáo trình được giảng dạy. Sinh viên không thể xác minh câu trả lời trích xuất từ trang sách hay slide bài giảng nào.
3. **Thiếu công cụ tự đánh giá gắn liền với nguồn học liệu:** Việc tự ôn luyện bằng trắc nghiệm thường thiếu sự liên kết trực tiếp với bài học. Khi làm sai, sinh viên không được chỉ dẫn chính xác đoạn kiến thức cụ thể cần đọc lại để củng cố.
4. **Quản lý kế hoạch và theo dõi tiến độ thụ động:** Sinh viên thiếu công cụ định lượng nỗ lực học tập thực tế hàng ngày (thời gian đọc slide, số câu hỏi ôn tập hoàn thành) và khó duy trì động lực học tập đều đặn.

Từ bài toán trên, StudyFlow được định hướng xây dựng như một nền tảng hỗ trợ học tập và ôn luyện thông minh, thống nhất học liệu chính thức theo lớp học phần với tài liệu tự học cá nhân, tích hợp công nghệ Trí tuệ Nhân tạo có kiểm soát (Retrieval-Augmented Generation - RAG) với nguyên tắc trích dẫn nguồn minh bạch (grounded citations) và từ chối trả lời khi thiếu căn cứ (`NO_EVIDENCE`).

### 2.1.2. Mục tiêu hệ thống

Hệ thống StudyFlow hướng tới các mục tiêu cụ thể:
- **Tổ chức học liệu theo cấu trúc học phần:** Giảng viên chủ động tạo lớp học phần (Course Offering), công bố học liệu bài giảng (PPTX, PDF) và kiểm soát sinh viên tham gia lớp thông qua mã mời (join code).
- **Hỗ trợ học tập tương tác trên bài giảng:** Sinh viên có thể xem trực tiếp slide bài giảng trên web, ghi chú cá nhân theo từng slide và tương tác với Trợ lý AI (Slide AI Tutor) được giới hạn phạm vi kiến thức trong bài giảng đó.
- **Không gian học tập cá nhân hóa:** Sinh viên tải lên và quản lý tài liệu nghiên cứu cá nhân (Personal PDF), thực hiện hỏi đáp chuyên sâu (Personal RAG) trên một hoặc nhiều tài liệu được chọn với trích dẫn số trang chính xác.
- **Hệ thống tạo Quiz và ôn luyện thông minh:** Tự động sinh câu hỏi trắc nghiệm một đáp án đúng (`MCQ_SINGLE`) từ tài liệu do sinh viên lựa chọn; hỗ trợ sinh viên duyệt (review) bộ câu hỏi trước khi học; tự động chấm điểm và điều hướng người học về đúng trang tài liệu chứa kiến thức của các câu trả lời sai.
- **Thống kê và thúc đẩy động lực:** Tự động ghi nhận các sự kiện học tập thực tế (`VIEW_SLIDE`, `STUDY_TASK_COMPLETED`, `QUIZ_COMPLETED`), tính toán chuỗi ngày học tập liên tục (Study Streak), tiến độ hoàn thành mục tiêu ngày (Daily Goal) và quản lý lịch học (Study Plan & Calendar).

### 2.1.3. Các tác nhân tham gia hệ thống (Actors)

| Tác nhân | Phân loại | Mô tả vai trò và trách nhiệm chính trong hệ thống |
|---|---|---|
| **Student** (Sinh viên) | Tác nhân con người (Primary User) | Tham gia lớp học phần bằng mã mời; xem bài giảng PPTX trực tuyến, ghi chú slide; tải tài liệu PDF của giảng viên; tải lên và quản lý tài liệu cá nhân; hỏi đáp với Trợ lý AI (Personal RAG và Slide Tutor); tạo, duyệt và làm bài Quiz; xem thống kê Dashboard, quản lý kế hoạch và lịch học cá nhân. |
| **Teacher** (Giảng viên) | Tác nhân con người (Primary User) | Khởi tạo và quản lý lớp học phần (Course Offering) theo học kỳ và môn học; cấu hình mã mời (join code); xét duyệt hoặc từ chối sinh viên tham gia lớp; tải lên và công bố tài liệu bài giảng (PPTX, PDF) cho sinh viên trong lớp; quản lý lưu trữ tài liệu môn học. |
| **Admin** (Quản trị viên) | Tác nhân con người (System Administrator) | Quản lý danh mục đào tạo (Môn học - Subject, Học kỳ - Semester); quản trị tài khoản người dùng và phân quyền; giám sát hoạt động của các lớp học phần; xem nhật ký hệ thống (Audit Log), phản hồi người dùng và cấu hình thông số hệ thống. |
| **LLM & Embedding Provider** | Tác nhân bên ngoài (External Service) | Nhà cung cấp dịch vụ mô hình ngôn ngữ lớn và mô hình nhúng (thông qua API tương thích OpenAI) phục vụ việc tính toán vector và sinh văn bản theo cấu trúc. |

---

Python AI Service, Java Backend và Next.js là các thành phần nội bộ, không phải tác nhân bên ngoài khi ranh giới Use Case là toàn bộ StudyFlow. Nhà cung cấp mô hình là tác nhân hỗ trợ; tương tác kỹ thuật với dịch vụ này được trình bày ở biểu đồ kiến trúc và tuần tự Chương 3.

## 2.2. Phân tích yêu cầu hệ thống

### 2.2.1. Yêu cầu chức năng phân hệ Sinh viên (Student)

1. **Quản lý tài khoản và hồ sơ:** Đăng ký tài khoản, đăng nhập hệ thống qua JWT, xem và cập nhật thông tin cá nhân, đổi mật khẩu.
2. **Tham gia lớp học phần:** Nhập mã mời (join code) để gửi yêu cầu tham gia lớp; theo dõi trạng thái yêu cầu (`PENDING`, `APPROVED`, `REJECTED`); truy cập không gian học tập của lớp khi đã được duyệt.
3. **Khai thác học liệu của lớp:** Xem danh sách bài giảng đã được công bố; đọc slide PPTX trực tiếp qua trình xem trực tuyến (Slide Viewer); ghi chú riêng theo từng slide; tải tài liệu tham khảo định dạng PDF của giảng viên về máy tính cá nhân.
4. **Tương tác với Slide AI Tutor:** Đặt câu hỏi thắc mắc ngay tại slide đang xem; nhận câu trả lời có trích dẫn đúng số slide bài giảng; nhận thông báo `NO_EVIDENCE` nếu câu hỏi nằm ngoài phạm vi kiến thức của bài giảng.
5. **Quản lý tài liệu học tập cá nhân (Personal Documents):** Tải lên các tệp tài liệu PDF cá nhân; theo dõi tiến trình xử lý và lập chỉ mục (`PROCESSING`, `READY`, `FAILED`); đổi tên hoặc xóa tài liệu khi không còn sử dụng.
6. **Hỏi đáp tài liệu cá nhân (Personal RAG):** Lựa chọn từ 1 đến 10 tài liệu PDF cá nhân đang ở trạng thái `READY`; tạo cuộc hội thoại mới; gửi câu hỏi truy vấn; nhận câu trả lời kèm trích dẫn số trang và đoạn trích dẫn đối chiếu; nhận thông báo `NO_EVIDENCE` khi tài liệu không chứa đủ thông tin trả lời.
7. **Khởi tạo và duyệt Quiz AI (AI Quiz Generation & Review):** Chọn tài liệu cá nhân làm nguồn kiến thức; nhập yêu cầu (prompt) tùy chỉnh về số lượng câu hỏi, mức độ khó, chủ đề trọng tâm; xem trước bản nháp câu hỏi trắc nghiệm gồm 4 phương án, đáp án đúng, giải thích và căn cứ nguồn; thực hiện Chấp nhận (Accept) để đưa vào kho ôn tập, Tạo lại (Regenerate) hoặc Hủy bỏ (Reject).
8. **Luyện tập và ôn thi (Take Quiz & Review):** Làm bài trắc nghiệm với giao diện trực quan; nộp bài để nhận kết quả chấm điểm tức thì từ hệ thống; xem lại lịch sử các lần làm bài (attempts); xem danh sách các câu trả lời sai kèm liên kết dẫn trực tiếp về trang tài liệu cần đọc lại.
9. **Theo dõi tiến độ và Kế hoạch học tập:** Xem Dashboard tổng quan về tỷ lệ hoàn thành học phần, số slide đã học, số câu hỏi Quiz đã làm; theo dõi chuỗi ngày học tập liên tục (Study Streak); thiết lập mục tiêu học tập hàng ngày (Daily Goal); quản lý danh sách công việc (Task) và lịch học tập theo tuần (Study Plan & Calendar).

### 2.2.2. Yêu cầu chức năng phân hệ Giảng viên (Teacher)

1. **Quản lý lớp học phần (Course Offering):** Tạo lớp học phần mới trên cơ sở Môn học (Subject) và Học kỳ (Semester) hợp lệ trong danh mục; cập nhật thông tin lớp; lưu trữ (Archive) lớp học phần khi kết thúc học kỳ.
2. **Quản lý mã mời và thành viên lớp:** Bật/tắt hoặc cấp lại mã mời (join code) ngẫu nhiên cho lớp; xem danh sách sinh viên đang chờ duyệt (`PENDING`); thực hiện duyệt (`APPROVED`) hoặc từ chối (`REJECTED`) yêu cầu tham gia; xóa sinh viên khỏi lớp học khi cần thiết.
3. **Quản lý kho học liệu môn học:** Tải lên các tệp bài giảng PPTX và tài liệu tham khảo PDF vào thư viện học liệu cá nhân; theo dõi quá trình trích xuất và xử lý slide bài giảng.
4. **Công bố học liệu (Publishing):** Lựa chọn tài liệu từ thư viện để công bố (Public) vào lớp học phần cụ thể cho sinh viên truy cập; thu hồi (Revoke) quyền truy cập tài liệu khi cần chỉnh sửa hoặc thay thế.

### 2.2.3. Yêu cầu chức năng phân hệ Quản trị viên (Admin)

1. **Quản lý danh mục đào tạo:** Quản lý danh sách các Môn học (Subject) gồm mã môn, tên môn, số tín chỉ; quản lý danh sách các Học kỳ (Semester) gồm mã học kỳ, năm học, thời gian bắt đầu và kết thúc; cấu hình trạng thái cho phép mở lớp học phần.
2. **Quản trị người dùng:** Quản lý danh sách tài khoản toàn hệ thống; phân quyền vai trò (Role: Student, Teacher, Admin); kích hoạt, khóa hoặc mở khóa tài khoản.
3. **Giám sát hoạt động lớp học:** Xem danh sách toàn bộ các lớp học phần trên hệ thống; hỗ trợ khóa hoặc lưu trữ lớp học phần trong trường hợp vi phạm quy định.
4. **Giám sát hệ thống:** Xem nhật ký vận hành và bảo mật (Audit Logs); tiếp nhận và xử lý các báo cáo phản hồi (Feedback) từ người dùng; quản lý các tham số cấu hình chung của hệ thống.

### 2.2.4. Yêu cầu phi chức năng

- **Bảo mật và Phân quyền (Security & Authorization):** Áp dụng kiến trúc xác thực Stateless dựa trên JWT (Access Token ngắn hạn trong Header và Refresh Token trong Cookie HttpOnly/SameSite). Phân quyền theo vai trò (RBAC) và theo quyền sở hữu tài nguyên (Resource Ownership). Sinh viên chỉ được truy cập học liệu của lớp khi có trạng thái `APPROVED`, chỉ được thao tác trên tài liệu cá nhân của chính mình.
- **Tính toàn vẹn và Tin cậy của AI (AI Grounding & Hallucination Prevention):** Toàn bộ truy xuất AI phải được giới hạn trong phạm vi tài liệu được cấp phép (Authorized Scope). Phải có cơ chế kiểm duyệt căn cứ (Evidence Gate) trước khi sinh văn bản; bắt buộc trích dẫn nguồn (Citations) kèm số trang/số slide; kiên quyết trả về trạng thái `NO_EVIDENCE` khi thông tin nguồn không đủ chứng minh.
- **Tính nhất quán nghiệp vụ (Business Rule Consistency):** Backend Java đóng vai trò là "System of Record", sở hữu toàn bộ logic nghiệp vụ, trạng thái vòng đời Quiz, chấm điểm trắc nghiệm và tính toán tiến độ. AI Service tuyệt đối không can thiệp trực tiếp vào cơ sở dữ liệu nghiệp vụ hoặc tự ý chấm điểm.
- **Hiệu năng và Tính sẵn sàng (Performance & Scalability):** Các tác vụ xử lý tệp nặng (trích xuất slide, tạo embedding, sinh câu hỏi) phải được thực hiện bất đồng bộ (Asynchronous Background Jobs) với cơ chế Idempotency Key để tránh xử lý lặp. Thời gian phản hồi cho các truy vấn đọc dữ liệu thông thường dưới 500ms.
- **Trải nghiệm người dùng và Chuẩn giao diện (UI/UX Standards):** Thiết kế giao diện responsive tương thích từ màn hình di động (360px) đến máy tính để bàn; tuân thủ chuẩn thẩm mỹ hiện đại với tông màu nhận diện học đường (Đỏ PTIT - Trắng - Xám Slate); hỗ trợ điều hướng bàn phím và khả năng tiếp cận (Accessibility - WCAG AA).

---

## 2.3. Form thống nhất mô tả chức năng trọng tâm của các thành viên

Theo quy định phân công đồ án tốt nghiệp trong nhóm 3 thành viên, mỗi thành viên đảm nhận **3 chức năng trọng tâm** có độ phức tạp kỹ thuật cao và thuộc phân hệ mình trực tiếp phụ trách (tổng cộng 9 chức năng cho cả nhóm). Toàn bộ 9 chức năng được chuẩn hóa trình bày theo một **form mẫu thống nhất gồm 10 trường thông tin chi tiết**:

| Trường thông tin | Ý nghĩa và nội dung cần trình bày |
|---|---|
| **Mã và tên chức năng** | Mã định danh duy nhất và tên nghiệp vụ chuẩn hóa của chức năng |
| **Thành viên/phạm vi phụ trách** | Thành viên chịu trách nhiệm chính và phân hệ công nghệ liên quan |
| **Mục tiêu** | Vấn đề chức năng giải quyết và giá trị nghiệp vụ mang lại |
| **Tác nhân** | Tác nhân con người hoặc hệ thống tham gia trực tiếp |
| **Tiền điều kiện** | Trạng thái hệ thống hoặc dữ liệu bắt buộc trước khi thực hiện |
| **Đầu vào** | Cấu trúc dữ liệu, tham số và giới hạn đầu vào |
| **Luồng xử lý chính** | Các bước xử lý tuần tự bảo đảm đúng ranh giới kiến trúc |
| **Đầu ra** | Dữ liệu trả về có cấu trúc và hiệu ứng thay đổi trạng thái (side effects) |
| **Ngoại lệ và quy tắc** | Xử lý lỗi nghiệp vụ, bảo mật và các ràng buộc toàn vẹn |
| **Tiêu chí nghiệm thu** | Điều kiện kỹ thuật cụ thể dùng để xác nhận chức năng đạt chuẩn |

> **Lưu ý về tiến độ thống nhất chức năng của nhóm:**
> Hiện tại, nhóm **đã chốt chính thức 3 chức năng trọng tâm của Thành viên 1 (Phụ trách AI)** và đã được liệt kê chi tiết dưới đây. Các chức năng của **Thành viên 2** và **Thành viên 3** đang trong quá trình thảo luận chốt danh mục cụ thể; do đó báo cáo chuẩn bị sẵn form mẫu chuẩn để hai thành viên điền nội dung chi tiết sau khi chốt chính thức.

---

### 2.3.1. Ba chức năng trọng tâm của Thành viên 1 (Phụ trách AI — Đã chốt chính thức)

#### AI-F01 — Hỏi đáp tài liệu cá nhân bằng RAG (Personal RAG)

| Trường thông tin | Nội dung |
|---|---|
| **Mã và tên chức năng** | **AI-F01: Hỏi đáp tài liệu cá nhân bằng RAG (Personal RAG)** |
| **Thành viên/phạm vi phụ trách** | Thành viên 1 - AI Python; Python AI Service, xử lý văn bản, vector embedding, retrieval, LLM prompt generation và trích dẫn nguồn |
| **Mục tiêu** | Cho phép Student đặt câu hỏi trên một hoặc nhiều tài liệu PDF cá nhân đã chọn và nhận câu trả lời bám sát bằng chứng thực tế kèm số trang trích dẫn |
| **Tác nhân** | Student (chính), nhà cung cấp mô hình (hỗ trợ); các service là thành phần thực thi |
| **Tiền điều kiện** | Student đã đăng nhập; là owner của tài liệu; tài liệu PDF có lớp văn bản; tài liệu và chỉ mục đang ở trạng thái `READY` |
| **Đầu vào** | Khi tạo hội thoại: 1–10 `selectedDocumentIds` duy nhất. Khi gửi tin: `conversationId` trên URL và body `{message}` dài 1–2.000 ký tự; Java lấy danh sách tài liệu/phiên bản từ snapshot đã xác thực, client không truyền lại scope |
| **Luồng xử lý chính** | 1. Java kiểm tra quyền owner và trạng thái tài liệu → gọi nội bộ sang Python AI Service.<br>2. Python embed câu hỏi bằng đúng phiên bản mô hình nhúng.<br>3. Lọc phạm vi theo `ownerId`, `documentId`, `version` và tìm kiếm Cosine trên pgvector.<br>4. Đưa các đoạn trích qua bộ lọc kiểm tra căn cứ (Evidence Gate).<br>5. Đóng gói context và gửi prompt tới LLM sinh câu trả lời kèm citation.<br>6. Kiểm tra tính hợp lệ của trích dẫn (Grounding Validator) và trả về JSON có cấu trúc cho Java. |
| **Đầu ra** | Trạng thái `ANSWERED` cùng nội dung câu trả lời và mảng citation (`documentId + pageNumber + excerpt`), hoặc trạng thái `NO_EVIDENCE` |
| **Ngoại lệ và quy tắc** | Tuyệt đối không dùng chunk ngoài scope; prompt injection trong tài liệu không được thay đổi system rule; thiếu bằng chứng bắt buộc trả `NO_EVIDENCE`; không ghi log nội dung tài liệu hoặc prompt nhạy cảm |
| **Tiêu chí nghiệm thu** | Cách ly dữ liệu giữa các user/document/version đạt 100%; citation trỏ đúng trang và chứng minh được nội dung trả lời; câu hỏi ngoài phạm vi tài liệu trả về `NO_EVIDENCE`; schema phản hồi hợp lệ |

#### AI-F02 — Hỏi đáp nội dung bài giảng với Slide AI Tutor

| Trường thông tin | Nội dung |
|---|---|
| **Mã và tên chức năng** | **AI-F02: Hỏi đáp nội dung bài giảng với Slide AI Tutor** |
| **Thành viên/phạm vi phụ trách** | Thành viên 1 - AI Python; bóc tách cấu trúc PPTX, trích xuất văn bản theo từng slide, retrieval theo lớp học phần và điều phối Slide AI Tutor |
| **Mục tiêu** | Giải thích nội dung kiến thức bài giảng theo đúng slide mà Student đang xem trên web hoặc phạm vi bài giảng được phép, có trích dẫn đúng số slide bài giảng |
| **Tác nhân** | Student (chính), nhà cung cấp mô hình (hỗ trợ) |
| **Tiền điều kiện** | Student có enrollment `APPROVED`; bài giảng PPTX đã được Giảng viên công bố và trạng thái chỉ mục là `READY`; lớp và tài liệu chưa bị khóa/thu hồi |
| **Đầu vào** | Câu hỏi của Student, `documentId`, `documentVersion`, `courseOfferingId`, `slideNumber` hiện tại và phạm vi slide được Java cấp quyền |
| **Luồng xử lý chính** | 1. Java kiểm tra quyền enrollment và publication → cấp authorized scope cho Python.<br>2. Python lọc đúng bài giảng/phiên bản/lớp học phần.<br>3. Ưu tiên slide hiện tại, chỉ lấy slide liên quan nằm trong allowed scope.<br>4. Kiểm tra đủ bằng chứng trước khi gọi LLM; nếu thiếu trả `NO_EVIDENCE`.<br>5. Validator kiểm tra citation theo slide và trả kết quả cấu trúc về Java. |
| **Đầu ra** | Trạng thái `ANSWERED` cùng citation (`documentId + slideNumber + excerpt`), hoặc trạng thái `NO_EVIDENCE` |
| **Ngoại lệ và quy tắc** | Tài liệu PDF của Giảng viên chỉ cho tải về, không áp dụng Slide Tutor; Student không được tải tệp PPTX gốc; publication bị thu hồi phải chặn truy vấn ngay lập tức; không suy diễn ngoài nội dung có bằng chứng trong slide |
| **Tiêu chí nghiệm thu** | Tuyệt đối không truy xuất ngoài lớp học phần được phép; citation trỏ đúng số slide bài giảng; câu hỏi ngoài nội dung bài giảng trả `NO_EVIDENCE`; prompt injection không thay đổi được phạm vi bài giảng |

#### AI-F03 — Sinh bộ câu hỏi ôn tập AI (AI Quiz Generator)

| Trường thông tin | Nội dung |
|---|---|
| **Mã và tên chức năng** | **AI-F03: Sinh bộ câu hỏi ôn tập AI (AI Quiz Generator)** |
| **Thành viên/phạm vi phụ trách** | Thành viên 1 - AI Python; retrieval có grounding và structured Quiz generation tuân thủ schema nghiêm ngặt trong Python AI Service |
| **Mục tiêu** | Tự động sinh bộ câu hỏi trắc nghiệm một đáp án đúng (`MCQ_SINGLE`) từ các tài liệu cá nhân do Student chủ động lựa chọn kết hợp prompt yêu cầu tự do |
| **Tác nhân** | Student (chính), nhà cung cấp mô hình (hỗ trợ) |
| **Tiền điều kiện** | Student là owner của các tài liệu; các tài liệu PDF cá nhân đang ở trạng thái `READY`; Java đã khởi tạo Quiz ở trạng thái `GENERATING` |
| **Đầu vào** | Danh sách 1–10 `selectedDocumentIds` duy nhất; Java xác định phiên bản tài liệu; prompt dài 1–2.000 ký tự mô tả số lượng câu, độ khó, chủ đề cần tập trung; không phụ thuộc vào ngữ cảnh chat trước |
| **Luồng xử lý chính** | 1. Java xác thực nguồn tài liệu và tạo scope.<br>2. Python truy xuất các đoạn kiến thức trọng tâm từ tài liệu.<br>3. LLM sinh JSON theo định dạng chuẩn `MCQ_SINGLE`.<br>4. Kiểm tra mỗi câu có đúng 4 phương án, đúng 1 đáp án chính xác, có giải thích và trích dẫn số trang.<br>5. Sửa lỗi cấu trúc tự động (repair) tối đa 1 lần nếu cần.<br>6. Trả bản nháp Quiz có cấu trúc cho Java lưu trữ. |
| **Đầu ra** | Bản nháp Quiz chứa danh sách câu hỏi, các phương án lựa chọn, chỉ số `correctOptionIndex`, lời giải thích và sources; Java chuyển sang `REVIEW_REQUIRED` hoặc `GENERATION_FAILED` |
| **Ngoại lệ và quy tắc** | Prompt tự do của Student không được phép phá vỡ schema hoặc mở rộng scope; Python không tự ý chấp nhận (Accept), chấm điểm hay cập nhật tiến độ; output không hợp lệ sau khi repair sẽ trả lỗi có cấu trúc |
| **Tiêu chí nghiệm thu** | 100% câu hỏi sinh ra đúng schema `MCQ_SINGLE` với 4 phương án và 1 đáp án đúng; toàn bộ câu hỏi đều có nguồn dẫn chứng hợp lệ; Java kiểm soát hoàn toàn vòng đời Quiz và việc chấm điểm |

---

### 2.3.2. Form chức năng của Thành viên 2 (Java Backend 1 — Đang hoàn thiện, để form chờ chốt)

*(Phần này chuẩn bị sẵn form mẫu theo quy chuẩn 10 trường thông tin để Thành viên 2 điền chi tiết sau khi nhóm thống nhất chốt danh mục 3 chức năng)*

#### BE1-F01 — [Chức năng 1 của Thành viên 2 - Đang cập nhật]

| Trường thông tin | Nội dung (Chờ Thành viên 2 cập nhật) |
|---|---|
| **Mã và tên chức năng** | **BE1-F01: [Tên chức năng 1 của Thành viên 2]** |
| **Thành viên/phạm vi phụ trách** | Thành viên 2 - Java Backend 1 |
| **Mục tiêu** | *[Mục tiêu giải quyết của chức năng]* |
| **Tác nhân** | *[Các tác nhân tham gia]* |
| **Tiền điều kiện** | *[Điều kiện bắt buộc trước khi thực hiện]* |
| **Đầu vào** | *[Dữ liệu và tham số đầu vào]* |
| **Luồng xử lý chính** | *[Các bước xử lý chính theo đúng ranh giới kiến trúc]* |
| **Đầu ra** | *[Kết quả trả về và thay đổi trạng thái]* |
| **Ngoại lệ và quy tắc** | *[Xử lý lỗi và ràng buộc nghiệp vụ]* |
| **Tiêu chí nghiệm thu** | *[Điều kiện xác nhận hoàn thành]* |

#### BE1-F02 — [Chức năng 2 của Thành viên 2 - Đang cập nhật]

| Trường thông tin | Nội dung (Chờ Thành viên 2 cập nhật) |
|---|---|
| **Mã và tên chức năng** | **BE1-F02: [Tên chức năng 2 của Thành viên 2]** |
| **Thành viên/phạm vi phụ trách** | Thành viên 2 - Java Backend 1 |
| **Mục tiêu** | *[Mục tiêu giải quyết của chức năng]* |
| **Tác nhân** | *[Các tác nhân tham gia]* |
| **Tiền điều kiện** | *[Điều kiện bắt buộc trước khi thực hiện]* |
| **Đầu vào** | *[Dữ liệu và tham số đầu vào]* |
| **Luồng xử lý chính** | *[Các bước xử lý chính]* |
| **Đầu ra** | *[Kết quả trả về]* |
| **Ngoại lệ và quy tắc** | *[Xử lý lỗi và ràng buộc nghiệp vụ]* |
| **Tiêu chí nghiệm thu** | *[Điều kiện xác nhận hoàn thành]* |

#### BE1-F03 — [Chức năng 3 của Thành viên 2 - Đang cập nhật]

| Trường thông tin | Nội dung (Chờ Thành viên 2 cập nhật) |
|---|---|
| **Mã và tên chức năng** | **BE1-F03: [Tên chức năng 3 của Thành viên 2]** |
| **Thành viên/phạm vi phụ trách** | Thành viên 2 - Java Backend 1 |
| **Mục tiêu** | *[Mục tiêu giải quyết của chức năng]* |
| **Tác nhân** | *[Các tác nhân tham gia]* |
| **Tiền điều kiện** | *[Điều kiện bắt buộc trước khi thực hiện]* |
| **Đầu vào** | *[Dữ liệu và tham số đầu vào]* |
| **Luồng xử lý chính** | *[Các bước xử lý chính]* |
| **Đầu ra** | *[Kết quả trả về]* |
| **Ngoại lệ và quy tắc** | *[Xử lý lỗi và ràng buộc nghiệp vụ]* |
| **Tiêu chí nghiệm thu** | *[Điều kiện xác nhận hoàn thành]* |

---

### 2.3.3. Form chức năng của Thành viên 3 (Java Backend 2 / Frontend — Đang hoàn thiện, để form chờ chốt)

*(Phần này chuẩn bị sẵn form mẫu theo quy chuẩn 10 trường thông tin để Thành viên 3 điền chi tiết sau khi nhóm thống nhất chốt danh mục 3 chức năng)*

#### BE2-F01 — [Chức năng 1 của Thành viên 3 - Đang cập nhật]

| Trường thông tin | Nội dung (Chờ Thành viên 3 cập nhật) |
|---|---|
| **Mã và tên chức năng** | **BE2-F01: [Tên chức năng 1 của Thành viên 3]** |
| **Thành viên/phạm vi phụ trách** | Thành viên 3 - Java Backend 2 / Frontend |
| **Mục tiêu** | *[Mục tiêu giải quyết của chức năng]* |
| **Tác nhân** | *[Các tác nhân tham gia]* |
| **Tiền điều kiện** | *[Điều kiện bắt buộc trước khi thực hiện]* |
| **Đầu vào** | *[Dữ liệu và tham số đầu vào]* |
| **Luồng xử lý chính** | *[Các bước xử lý chính]* |
| **Đầu ra** | *[Kết quả trả về]* |
| **Ngoại lệ và quy tắc** | *[Xử lý lỗi và ràng buộc nghiệp vụ]* |
| **Tiêu chí nghiệm thu** | *[Điều kiện xác nhận hoàn thành]* |

#### BE2-F02 — [Chức năng 2 của Thành viên 3 - Đang cập nhật]

| Trường thông tin | Nội dung (Chờ Thành viên 3 cập nhật) |
|---|---|
| **Mã và tên chức năng** | **BE2-F02: [Tên chức năng 2 của Thành viên 3]** |
| **Thành viên/phạm vi phụ trách** | Thành viên 3 - Java Backend 2 / Frontend |
| **Mục tiêu** | *[Mục tiêu giải quyết của chức năng]* |
| **Tác nhân** | *[Các tác nhân tham gia]* |
| **Tiền điều kiện** | *[Điều kiện bắt buộc trước khi thực hiện]* |
| **Đầu vào** | *[Dữ liệu và tham số đầu vào]* |
| **Luồng xử lý chính** | *[Các bước xử lý chính]* |
| **Đầu ra** | *[Kết quả trả về]* |
| **Ngoại lệ và quy tắc** | *[Xử lý lỗi và ràng buộc nghiệp vụ]* |
| **Tiêu chí nghiệm thu** | *[Điều kiện xác nhận hoàn thành]* |

#### BE2-F03 — [Chức năng 3 của Thành viên 3 - Đang cập nhật]

| Trường thông tin | Nội dung (Chờ Thành viên 3 cập nhật) |
|---|---|
| **Mã và tên chức năng** | **BE2-F03: [Tên chức năng 3 của Thành viên 3]** |
| **Thành viên/phạm vi phụ trách** | Thành viên 3 - Java Backend 2 / Frontend |
| **Mục tiêu** | *[Mục tiêu giải quyết của chức năng]* |
| **Tác nhân** | *[Các tác nhân tham gia]* |
| **Tiền điều kiện** | *[Điều kiện bắt buộc trước khi thực hiện]* |
| **Đầu vào** | *[Dữ liệu và tham số đầu vào]* |
| **Luồng xử lý chính** | *[Các bước xử lý chính]* |
| **Đầu ra** | *[Kết quả trả về]* |
| **Ngoại lệ và quy tắc** | *[Xử lý lỗi và ràng buộc nghiệp vụ]* |
| **Tiêu chí nghiệm thu** | *[Điều kiện xác nhận hoàn thành]* |

---

## 2.4. Biểu đồ Use Case hệ thống

Biểu đồ dùng ký pháp UML tham khảo Visual Paradigm: actor ngoài ranh giới hệ thống, Use Case hình elip và association đường liền. Quan hệ `extend` đi từ hành vi tùy chọn tới Use Case gốc; không dùng `include`/`extend` để diễn tả thao tác xảy ra trước/sau. Chi tiết quy ước và nguồn tham khảo tại [hướng dẫn biểu đồ](../diagrams/README.md).

Danh sách Use Case bao quát chức năng toàn hệ thống; không đồng nhất với chín chức năng nhóm chọn để báo cáo chuyên sâu. Đăng nhập là tiền điều kiện dùng chung của các Use Case cần bảo vệ; không vẽ lại đường include tới đăng nhập ở mọi chức năng.

### 2.4.1. Biểu đồ Use Case tổng quát

Biểu đồ Use Case tổng quát thể hiện bức tranh toàn cảnh về ranh giới tương tác của ba nhóm tác nhân chính: Sinh viên (Student), Giảng viên (Teacher), và Quản trị viên (Admin) đối với các phân hệ chức năng của nền tảng StudyFlow.

![Hình 2.1 — Use Case tổng quát StudyFlow](../diagrams/chuong-2/use-case-01-tong-quat.svg)

*Hình 2.1. Biểu đồ Use Case tổng quát toàn hệ thống StudyFlow.*

**Thuyết minh biểu đồ Hình 2.1:**
- Tác nhân **Student** tương tác với bảy nhóm chức năng chính: tham gia Course Offering, học bằng slide và ghi chú, Personal RAG, Slide Tutor, Quiz AI, Dashboard và Kế hoạch & Lịch ôn tập.
- Tác nhân **Teacher** tạo và quản lý Course Offering, quản lý join code/enrollment, upload PDF/PPTX, theo dõi xử lý và chủ động công bố hoặc thu hồi học liệu.
- Tác nhân **Admin** quản lý người dùng, vai trò, Subject, Semester, giám sát Course Offering, feedback, audit và cấu hình hệ thống; Admin không mặc định được đọc dữ liệu học tập cá nhân của Student.
- Ba khung chức năng nằm trong một System Boundary duy nhất của StudyFlow. Hình 2.2–2.4 tiếp tục phân rã nghiệp vụ theo từng vai trò để tránh đưa chi tiết luồng xử lý vào biểu đồ tổng quát.
- Biểu đồ phân định ranh giới nghiệp vụ rõ ràng: Giảng viên và Quản trị viên không can thiệp vào kho tài liệu cá nhân, nội dung hỏi đáp riêng tư, kết quả làm Quiz và lịch học của từng sinh viên.

---

### 2.4.2. Biểu đồ Use Case phân hệ Sinh viên (Student)

Biểu đồ phân rã chi tiết các ca sử dụng dành riêng cho tác nhân Sinh viên trong quá trình học tập và ôn luyện trên hệ thống.

![Hình 2.2 — Use Case phân hệ Student](../diagrams/chuong-2/use-case-02-student.svg)

*Hình 2.2. Biểu đồ Use Case chi tiết phân hệ Sinh viên (Student).*

**Thuyết minh biểu đồ Hình 2.2:**
- Ký hiệu Student được lặp ở hai phía nhưng cùng biểu diễn một tác nhân; cách trình bày này rút ngắn association, giữ đường nối thẳng và không tạo thêm vai trò nghiệp vụ.
- Nhóm ca sử dụng lớp học phần: Sinh viên nhập mã mời (Join Class), khi được duyệt sẽ có quyền xem slide bài giảng trực tuyến, ghi chú slide (`slide_notes`), và đặt câu hỏi cho Slide AI Tutor (`<<extend>>` từ việc xem slide).
- Nhóm ca sử dụng tài liệu cá nhân và RAG: Sinh viên tải lên tài liệu PDF cá nhân; chọn tài liệu để tạo phiên hội thoại hỏi đáp RAG. Hỏi đáp bắt buộc kiểm tra căn cứ và trích dẫn số trang; đây là quy tắc nội bộ, không tách mỗi bước xử lý thành một Use Case.
- Nhóm ca sử dụng Quiz AI: Sinh viên chọn tài liệu và nhập prompt để hệ thống sinh bản nháp Quiz; sinh viên duyệt bản nháp (Accept/Reject/Regenerate) trước khi tiến hành làm bài; hệ thống tự động chấm điểm và trích xuất danh sách câu sai liên kết về nguồn học liệu.
- Nhóm ca sử dụng tiến độ và kế hoạch: Sinh viên thiết lập Daily Goal, quản lý các đầu việc Task trên giao diện lịch tuần và theo dõi thống kê chuỗi ngày học Streak trên Dashboard.

---

### 2.4.3. Biểu đồ Use Case phân hệ Giảng viên (Teacher)

Biểu đồ mô tả chi tiết các quyền hạn và chức năng nghiệp vụ thuộc phạm vi phụ trách của tác nhân Giảng viên.

![Hình 2.3 — Use Case phân hệ Teacher](../diagrams/chuong-2/use-case-03-teacher.svg)

*Hình 2.3. Biểu đồ Use Case chi tiết phân hệ Giảng viên (Teacher).*

**Thuyết minh biểu đồ Hình 2.3:**
- Giảng viên trực tiếp khởi tạo lớp học phần (Create Course Offering) dựa trên danh mục Môn học và Học kỳ do Nhà trường/Admin ban hành mà không cần chờ phê duyệt lớp.
- Quản lý thành viên lớp: Giảng viên xem danh sách yêu cầu tham gia, thực hiện phê duyệt (`Approve Enrollment`) để cấp quyền cho sinh viên hoặc từ chối (`Reject Enrollment`). Giảng viên có quyền tạo mới hoặc vô hiệu hóa mã mời (Manage Join Code).
- Quản lý học liệu: Giảng viên tải lên tài liệu bài giảng PPTX và tài liệu tham khảo PDF vào thư viện tài liệu của mình; thực hiện thao tác công bố (`Publish Document`) tài liệu vào một hoặc nhiều lớp học phần đang giảng dạy, hoặc thu hồi (`Revoke Publication`) khi cần thiết.

---

### 2.4.4. Biểu đồ Use Case phân hệ Quản trị viên (Admin)

Biểu đồ xác định phạm vi quản trị danh mục, giám sát hệ thống và phân quyền của tác nhân Quản trị viên.

![Hình 2.4 — Use Case phân hệ Admin](../diagrams/chuong-2/use-case-04-admin.svg)

*Hình 2.4. Biểu đồ Use Case chi tiết phân hệ Quản trị viên (Admin).*

**Thuyết minh biểu đồ Hình 2.4:**
- Quản lý danh mục cốt lõi: Khởi tạo, cập nhật các Môn học (Subject) và Học kỳ (Semester), cấu hình thời gian mở đăng ký lớp.
- Quản lý tài khoản: Xem danh sách người dùng, kích hoạt hoặc khóa tài khoản vi phạm, điều chỉnh phân quyền người dùng.
- Giám sát vận hành: Theo dõi hoạt động của các lớp học phần (khóa hoặc lưu trữ khi cần); xem xét các báo cáo phản hồi (Feedback) và tra cứu nhật ký hệ thống (Audit Logs) để bảo đảm an toàn thông tin.

---

## 2.5. Kịch bản Use Case chi tiết

Mỗi đặc tả dùng cùng một form: mã/tên, mục tiêu, tác nhân, kích hoạt, tiền điều kiện, luồng chính, luồng thay thế, ngoại lệ và hậu điều kiện. Phân tích mô tả hành vi quan sát được; các lớp thực thi, API và tương tác giữa service được cụ thể hóa ở Chương 3. Các Use Case chung dưới đây không tự động được phân công làm chức năng báo cáo riêng của thành viên nào.

### 2.5.1. UC-RAG-01 — Hỏi đáp tài liệu cá nhân (AI-F01)

| Thuộc tính | Nội dung |
|---|---|
| Mục tiêu / tác nhân | Student nhận câu trả lời dựa trên Personal PDF của mình; nhà cung cấp mô hình hỗ trợ xử lý |
| Kích hoạt | Student gửi câu hỏi trong hội thoại đã chọn nguồn |
| Tiền điều kiện | Đăng nhập; hội thoại thuộc Student; 1–10 Personal PDF thuộc owner, READY, có snapshot phiên bản hợp lệ |
| Luồng chính | 1. Chọn nguồn và tạo hội thoại.<br>2. Nhập câu hỏi dài 1–2.000 ký tự.<br>3. Hệ thống kiểm tra lại quyền và trạng thái nguồn trong snapshot.<br>4. Truy xuất các đoạn có liên quan trong đúng phạm vi được cấp quyền.<br>5. Kiểm tra bằng chứng trước khi sinh câu trả lời.<br>6. Sinh và kiểm tra grounding/citation; cho phép rewrite tối đa một lần trên cùng evidence snapshot.<br>7. Kiểm tra lại quyền truy cập trước khi trả nội dung; lưu tin nhắn và hiển thị citation theo trang. |
| Thay thế | Không đủ bằng chứng hoặc câu trả lời vẫn không đạt grounding sau lần rewrite cho phép: trả `NO_EVIDENCE`, không bổ sung kiến thức ngoài nguồn |
| Ngoại lệ | Nguồn đã xóa/đổi phiên bản/không còn được phép: dừng và yêu cầu cập nhật nguồn. Lỗi provider, timeout hoặc lỗi index được trả bằng error code riêng; không giả thành `NO_EVIDENCE`. HTTP status theo API contract, không tiết lộ sự tồn tại của tài liệu người khác |
| Hậu điều kiện | Có câu trả lời được kiểm tra kèm `documentId + pageNumber + excerpt`, hoặc thông báo thiếu căn cứ; không làm thay đổi điểm Quiz, viewing progress hay Streak |

`NO_EVIDENCE` là cơ chế từ chối có kiểm soát, không phải cam kết mô hình không bao giờ sai. Chất lượng cần được kiểm chứng bằng tập đánh giá có bằng chứng tham chiếu; số liệu nghiệm thu chỉ được công bố sau khi chạy đánh giá.

### 2.5.2. UC-TUTOR-01 — Hỏi đáp slide (AI-F02)

| Thuộc tính | Nội dung |
|---|---|
| Mục tiêu / tác nhân | Student hiểu nội dung slide đang học; nhà cung cấp mô hình hỗ trợ |
| Kích hoạt | Student nhập câu hỏi trong khung Tutor cạnh Slide Viewer |
| Tiền điều kiện | Enrollment APPROVED; PPTX đã công bố, READY; tài liệu/slide tồn tại và được phép truy cập theo chính sách lớp hiện tại |
| Luồng chính | 1. Mở slide và nhập câu hỏi.<br>2. Java kiểm tra enrollment, publication, trạng thái và phiên bản tài liệu.<br>3. Dựng scope gồm slide hiện tại và các slide được phép.<br>4. Python truy xuất trong scope, ưu tiên slide hiện tại, kiểm tra đủ bằng chứng.<br>5. Sinh giải thích, kiểm tra citation; rewrite tối đa một lần nếu cần.<br>6. Java kiểm tra lại quyền và kết quả trước khi trả về Viewer. |
| Thay thế | Thiếu căn cứ: `NO_EVIDENCE`; Student có thể điều chỉnh câu hỏi |
| Ngoại lệ | Chưa được duyệt, bị remove, tài liệu bị revoke/khóa hoặc slide không tồn tại: từ chối theo contract; lỗi hạ tầng có error code riêng |
| Hậu điều kiện | Trả citation `documentId + slideNumber + excerpt`; không dùng publicationId thay documentId |

Không tự mở rộng sang tài liệu khác hoặc toàn bộ lớp. Teacher PDF không có Tutor. `ASK_AI` không được tính vào Streak; xem slide là hoạt động được ghi nhận riêng theo luật của Java.

### 2.5.3. UC-QUIZ-01 — Sinh và duyệt Quiz AI (AI-F03)

| Thuộc tính | Nội dung |
|---|---|
| Mục tiêu / tác nhân | Student tạo bộ ôn tập từ tài liệu mình chọn; nhà cung cấp mô hình sinh bản nháp |
| Kích hoạt | Chọn 1–10 Personal PDF và nhập prompt dài 1–2.000 ký tự |
| Tiền điều kiện | Nguồn thuộc owner, READY, đúng phiên bản; không phụ thuộc vào hội thoại RAG |
| Luồng chính | 1. Student gửi nguồn và prompt.<br>2. Java xác thực, lưu snapshot và tạo Quiz GENERATING; trả `202 + quizId`.<br>3. Tác vụ nền gọi Python để retrieval, sinh bản nháp và kiểm tra schema/grounding.<br>4. Python trả mỗi câu đúng bốn phương án, một `correctOptionIndex` trong 0..3, explanation và page citations; repair tối đa một lần.<br>5. Java kiểm tra toàn bộ bản nháp trước khi lưu REVIEW_REQUIRED; FE polling Java để nhận trạng thái.<br>6. Student review và accept vào PERSONAL hoặc Course Offering có enrollment APPROVED.<br>7. Java kiểm tra destination rồi chuyển READY. |
| Thay thế | Reject chuyển REJECTED; regenerate tạo Quiz mới và bảo toàn bản cũ/lịch sử; destination không hợp lệ thì chưa accept |
| Ngoại lệ | Thiếu nguồn, provider lỗi hoặc output không đạt sau repair: Java ghi GENERATION_FAILED, không lưu bộ câu hỏi không hợp lệ |
| Hậu điều kiện | Quiz chỉ làm được sau accept; Python không tự cập nhật lifecycle hoặc chấm điểm |

Prompt tự do được dùng để nêu chủ đề, độ khó và mong muốn của Student; không được thay thế system rule, authorized scope, schema hoặc yêu cầu citation. Nguồn sinh Quiz và nơi lưu Quiz để ôn tập là hai khái niệm độc lập.

### 2.5.4. UC-DOC-01 — Chuẩn bị Personal PDF

| Thuộc tính | Nội dung |
|---|---|
| Mục tiêu / tác nhân | Student chuẩn bị nguồn riêng cho RAG và Quiz |
| Kích hoạt / tiền điều kiện | Chọn upload khi đã đăng nhập; chỉ PDF tối đa 20 MB |
| Luồng chính | 1. Java kiểm tra MIME, kích thước và quyền.<br>2. Lưu tệp riêng tư, tạo metadata PENDING_PROCESSING.<br>3. Gửi yêu cầu index và nhận `202 + jobId`.<br>4. Worker parse theo trang, chunk, embed và lưu index/version.<br>5. Java poll job với backoff, cập nhật READY/FAILED; browser chỉ poll Java. |
| Ngoại lệ | PDF mã hóa: `PDF_ENCRYPTED`; không có text layer: `PDF_TEXT_REQUIRED`; lỗi xử lý: FAILED và safe error |
| Thay thế | Xóa tài liệu: Java chuyển DELETING và chặn dùng ngay; deindex/xóa object theo job và chính sách lưu metadata, không tự đặt thêm trạng thái DELETED |
| Hậu điều kiện | Chỉ nguồn READY được chọn cho AI; quyền riêng tư không thay đổi sau indexing |

### 2.5.5. UC-QUIZ-02 — Làm bài và xem nội dung cần ôn lại

| Thuộc tính | Nội dung |
|---|---|
| Mục tiêu / tác nhân | Student tự kiểm tra kiến thức và tìm lại nguồn của câu trả lời sai |
| Kích hoạt / tiền điều kiện | Bắt đầu một Quiz READY thuộc Student, có quyền truy cập hợp lệ |
| Luồng chính | 1. Java tạo attempt mới.<br>2. FE hiển thị câu hỏi và bốn lựa chọn, không đưa đáp án chuẩn vào payload làm bài.<br>3. Student chọn đáp án, nộp bài.<br>4. Java đối chiếu đáp án đã lưu, ghi từng answer và điểm trong transaction.<br>5. Ghi QUIZ_COMPLETED một lần cho attempt.<br>6. Hiển thị kết quả, giải thích và các trang Personal PDF liên quan tới câu sai. |
| Thay thế | Làm lại tạo attempt mới, không ghi đè lịch sử |
| Ngoại lệ | Submit lặp trả lại kết quả đã ghi, không cộng event lần nữa; mất kết nối hiển thị lỗi và cho thử lại an toàn, không mặc định cam kết chế độ offline |
| Hậu điều kiện | Cập nhật thống kê Quiz, Daily Goal và Streak theo sự kiện hợp lệ; không tăng viewing progress của PPTX từ điểm Quiz |

“Nội dung cần ôn lại” là phép tổng hợp từ câu sai và nguồn của câu hỏi, không phải kết luận AI về mức độ yếu/mạnh hoặc Topic Mastery.

### 2.5.6. Các Use Case chung của hệ thống

| Mã / tác nhân / kích hoạt | Tiền điều kiện | Luồng chính và kết quả | Ngoại lệ / giới hạn |
|---|---|---|---|
| UC-ENROLL-01 / Student, Teacher / nhập code | Lớp cho phép tham gia, code hợp lệ | Student gửi yêu cầu PENDING → Teacher owner duyệt APPROVED hoặc REJECTED → chỉ Student APPROVED được truy cập học liệu public | Code sai, lớp khóa, yêu cầu trùng được xử lý theo state machine; Admin không phải bước duyệt |
| UC-OFFERING-01 / Teacher / tạo lớp | Teacher active, Subject hợp lệ và Semester cho phép tạo | Chọn Subject + Semester → nhập thông tin lớp → Java tạo Course Offering thuộc Teacher | Không tự đặt teacherId của người khác; không cần Admin phân công |
| UC-PUBLISH-01 / Teacher / công bố học liệu | Cùng owner với lớp; PPTX READY | Upload PDF/PPTX → xử lý nếu PPTX → Teacher chủ động publish → Student APPROVED sử dụng | PDF chỉ download, PPTX chỉ xem artifact; revoke chặn truy cập mới |
| UC-DASH-01 / Student / mở Dashboard | Đăng nhập | Java tổng hợp tiến độ chung/từng lớp, câu sai, Streak và Daily Goal; FE hỗ trợ mở/thu các khối | Không có route tiến độ độc lập; chỉ ba event học hợp lệ tính Streak |
| UC-PLAN-01 / Student / thêm task hoặc lịch | Plan thuộc Student | Chọn tuần/ô giờ → nhập task hoặc lịch → Java validate và lưu → lịch tuần phản ánh dữ liệu; hoàn tất task sinh event một lần | Không tự động xếp lịch bằng AI; thao tác vượt owner bị từ chối |
| UC-ADMIN-01 / Admin / quản trị | Đăng nhập với role Admin | Quản lý user/Subject/Semester/settings, xem feedback/audit và giám sát lớp | Không đọc mặc định Personal PDF/chat/Note/Quiz cá nhân; không tạo Teacher Quiz |

### 2.5.7. Ma trận truy vết sang thiết kế và kiểm thử

| Yêu cầu / Use Case | Thiết kế ở Chương 3 | Kiểm thử cần có |
|---|---|---|
| AI-F01 / UC-RAG-01 | Lớp RAG, activity RAG, sequence RAG | Owner/document/version isolation; evidence gate; citation theo trang; provider timeout |
| AI-F02 / UC-TUTOR-01 | Lớp Tutor, activity Tutor, sequence Tutor | Enrollment/revoke; allowed slides; citation theo slide; không cộng Streak |
| AI-F03 / UC-QUIZ-01 | Lớp Quiz, activity/sequence Quiz và lifecycle | Bốn phương án; một đáp án; scope; repair giới hạn; review/accept; regenerate giữ lịch sử |
| UC-DOC-01 / UC-PUBLISH-01 | Sequence index và ranh giới lưu trữ | 202/poll; index idempotent; text-required; PPTX READY không tự public |
| UC-ENROLL-01 / UC-OFFERING-01 | Entity/ERD và activity enrollment | Teacher owner; code; trạng thái pending/approved; từ chối vượt quyền |
| UC-QUIZ-02 / UC-DASH-01 / UC-PLAN-01 | Entity/ERD, lifecycle và quy tắc event | Chấm bằng Java; submit/task idempotent; timezone; viewing progress tách Quiz |
| UC-ADMIN-01 | Kiến trúc, dữ liệu và ma trận phân quyền | RBAC; audit an toàn; không lộ dữ liệu riêng |

## 2.6. Tổng kết chương

Chương 2 xác định các tác nhân, yêu cầu và ranh giới của MVP, đồng thời đặc tả ba chức năng AI được chọn và các Use Case chung cần cho luồng end-to-end. Use Case mô tả mục tiêu của người dùng; thiết kế kỹ thuật triển khai các mục tiêu đó được trình bày trong Chương 3.

Form của hai thành viên còn lại được giữ để nhóm chốt và điền sau; không xem các ô chờ này là nội dung đã hoàn tất. Các tiêu chí nghiệm thu trong chương là yêu cầu cần kiểm thử, không phải số liệu đã đo hoặc khẳng định implementation đã hoàn thành.
