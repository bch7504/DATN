# CHƯƠNG 3. PHA THIẾT KẾ HỆ THỐNG

Từ các yêu cầu đã phân tích ở Chương 2, chương này trình bày cách StudyFlow được chia thành các phần, cách dữ liệu được tổ chức và cách các phần phối hợp với nhau. Nội dung chuyên sâu tập trung vào ba chức năng AI: hỏi đáp và tóm tắt tài liệu cá nhân, hỏi đáp tài liệu bài giảng và sinh bộ câu hỏi trắc nghiệm cho Sinh viên hoặc Giảng viên.

Các sơ đồ trong chương thể hiện phương án thiết kế dự kiến. Chúng giúp nhóm thống nhất cách xây dựng hệ thống nhưng không được xem là bằng chứng tính năng đã hoàn thành. Tài liệu chi tiết dùng để đối chiếu gồm [đặc tả hệ thống](../specification.md), [kiến trúc](../architecture.md), [quy định trao đổi dữ liệu](../api-plan.md), [kế hoạch cơ sở dữ liệu](../database-plan.md), [kế hoạch AI](../ai-implementation-plan.md) và [hướng dẫn sử dụng bộ sơ đồ](../diagrams/README.md).

## 3.1. Thiết kế kiến trúc chung

### 3.1.1. Sơ đồ khối hệ thống

Hình 3.1 cho biết hệ thống gồm những phần nào, mỗi phần chịu trách nhiệm về việc gì và dữ liệu được chuyển theo hướng nào. Các mũi tên chỉ hướng trao đổi thông tin, không phải thứ tự thao tác của người dùng.

![Kiến trúc StudyFlow](../diagrams/chuong-3/component-01-kien-truc-he-thong.png)

*Hình 3.1. Kiến trúc tổng thể và ranh giới trách nhiệm của StudyFlow.*

Trang web là nơi người dùng thực hiện các thao tác. Mọi yêu cầu từ trang web đều được gửi đến hệ thống chính để kiểm tra tài khoản, quyền sử dụng tài liệu và các quy tắc học tập. Hệ thống chính cũng chịu trách nhiệm quản lý bộ câu hỏi từ lúc tạo đến lúc sử dụng, chấm điểm, ghi nhận tiến độ và quản lý kế hoạch học tập.

Phần AI chỉ nhận đúng tài liệu và phạm vi trang mà hệ thống chính đã cho phép. Phần này đọc nội dung PDF, tìm đoạn liên quan, trả lời câu hỏi, giải thích bài học, chỉ rõ trang nguồn và tạo bản nháp bộ câu hỏi. Phần AI không được tự xem thông tin cá nhân, kết quả học tập hoặc dữ liệu quản lý của Sinh viên.

Các logo đơn sắc đặt dưới từng khối cho biết công nghệ triển khai tương ứng: Next.js và TypeScript cho giao diện; Spring Boot và Java cho hệ thống chính; FastAPI, Python và LangChain cho phần AI; PostgreSQL, pgvector và S3 cho dữ liệu; OpenRouter cung cấp mô hình chat và embedding.

Dữ liệu được lưu trong cùng một hệ thống nhưng chia thành hai khu vực tách biệt: một khu vực chứa thông tin người dùng và hoạt động học tập, khu vực còn lại phục vụ việc xử lý tài liệu bằng AI. Mỗi phần chỉ được sử dụng khu vực dữ liệu thuộc trách nhiệm của mình. Tệp PDF gốc và các hình ảnh dùng để xem tài liệu được lưu trong một kho tệp riêng; cơ sở dữ liệu chỉ lưu thông tin mô tả và vị trí của tệp. Khóa dùng để kết nối với dịch vụ AI chỉ được giữ tại phần xử lý AI và không bao giờ được gửi xuống trình duyệt của người dùng.

### 3.1.2. Trách nhiệm của từng phần

| Phần của hệ thống | Nhiệm vụ chính | Không được thực hiện |
|---|---|---|
| Trang web, xây dựng bằng Next.js | Hiển thị màn hình cho Sinh viên, Giảng viên và Quản trị viên; gửi yêu cầu; hiển thị trạng thái và kết quả | Không gọi thẳng phần AI, không tự chấm điểm và không tự thay đổi tiến độ |
| Hệ thống chính, xây dựng bằng Java | Đăng nhập, kiểm tra quyền, quản lý lớp học phần, tài liệu, bộ câu hỏi, điểm số, tiến độ và kế hoạch học tập | Không tin các thông tin về quyền do trình duyệt tự gửi lên nếu chưa kiểm tra |
| Phần kết nối dữ liệu của hệ thống chính | Đọc và lưu dữ liệu học tập; gửi yêu cầu đã được kiểm tra sang phần AI; quản lý kho tệp | Không tự đọc hoặc sửa dữ liệu tìm kiếm chuyên dụng của phần AI |
| Phần xử lý AI, xây dựng bằng Python | Đọc PDF, chuẩn bị nội dung, tìm đoạn phù hợp, tạo câu trả lời, bản tóm tắt và bản nháp câu hỏi | Không duyệt bộ câu hỏi, không chấm điểm, không thay đổi thành viên lớp hoặc kế hoạch học tập |
| Dịch vụ AI bên ngoài | Hỗ trợ hiểu yêu cầu và tạo nội dung từ phần tài liệu được cung cấp | Không nhận khóa truy cập của người dùng và không quyết định người nào được xem tài liệu |

Mỗi yêu cầu trao đổi giữa hệ thống chính và phần AI phải có khóa xác nhận nội bộ, mã theo dõi và số phiên bản của cách trao đổi dữ liệu. Với yêu cầu có thể tạo hoặc thay đổi dữ liệu, hệ thống còn dùng một mã chống lặp để cùng một yêu cầu không bị thực hiện hai lần. Thông tin đăng nhập của người dùng không được dùng thay cho khóa xác nhận nội bộ.

Các công việc mất nhiều thời gian, như chuẩn bị một PDF hoặc sinh bộ câu hỏi, được tiếp nhận trước rồi xử lý ở phía sau. Trang web chỉ hỏi hệ thống chính về tình trạng công việc; trang web không hỏi trực tiếp phần AI. Nếu có lỗi hoặc hết thời gian chờ, hệ thống phải thông báo rõ và không tự tạo thêm một công việc trùng lặp.

### 3.1.3. Lý do lựa chọn cách chia hệ thống

Việc tách hệ thống chính và phần AI giúp nhóm có thể thay đổi cách xử lý AI mà không làm thay đổi các quy tắc về tài khoản, lớp học, điểm số và tiến độ. Đổi lại, kết quả đi qua hai phần nên phải được kiểm tra cả trước khi gửi và sau khi nhận. Hệ thống chính chỉ công nhận kết quả khi quyền sử dụng vẫn còn hiệu lực và dữ liệu trả về đầy đủ.

Để tìm đúng đoạn trong tài liệu, mỗi đoạn văn được chuyển thành một dãy 1.024 con số thể hiện ý nghĩa của đoạn đó. Câu hỏi của người dùng cũng được chuyển theo cùng cách để so sánh mức độ gần nhau. Nếu thay đổi cách chuyển đổi hoặc độ dài của dãy số, toàn bộ tài liệu cũ phải được xử lý lại; không được dùng lẫn kết quả của hai cách xử lý khác nhau.

## 3.2. Thiết kế thực thể và quan hệ nghiệp vụ

### 3.2.1. Biểu đồ thiết kế lớp thực thể

Hình 3.2 trình bày các lớp thực thể của hệ thống và mối quan hệ nghiệp vụ giữa chúng. Mỗi khung thể hiện tên lớp cùng các thuộc tính chính. Ba vai trò Student, Teacher và Admin được biểu diễn bằng thuộc tính `role` của lớp User để thống nhất với bảng `users` trong ERD. Hình thoi đặc đặt ở phía thực thể sở hữu thể hiện quan hệ hợp thành; đường liền thể hiện liên kết nghiệp vụ; đường nét đứt có mũi tên chỉ dùng cho tham chiếu logic từ dữ liệu AI sang dữ liệu nghiệp vụ. Các con số ở hai đầu đường nối cho biết một đối tượng có thể liên quan với bao nhiêu đối tượng khác.

![Biểu đồ thiết kế lớp thực thể StudyFlow](../diagrams/chuong-3/class-entity-02-studyflow-overview.png)

*Hình 3.2. Biểu đồ thiết kế lớp thực thể tổng quan của StudyFlow.*

Biểu đồ được bố trí theo các quan hệ dữ liệu chính của hệ thống nhưng không chia thành khung khu vực. Một lớp học phần gắn với một môn học, một học kỳ và một tài khoản Giảng viên; Sinh viên tham gia thông qua bản ghi ghi danh. Lớp học phần liên hệ với bản công bố tài liệu, Quiz và mục kế hoạch học. Tài liệu luôn có chủ sở hữu; việc Giảng viên công bố tài liệu cho lớp không làm thay đổi chủ sở hữu của tài liệu đó. PDF cá nhân của Sinh viên cũng không tự trở thành học liệu chung khi được dùng để hỏi đáp hoặc tạo câu hỏi.

Bộ câu hỏi cá nhân có thể không gắn với lớp học phần. Các lớp AI ở cuối sơ đồ chỉ lưu chỉ mục tài liệu, đoạn nội dung và lần xử lý; chúng liên hệ với dữ liệu học tập bằng mã tài liệu, phiên bản và mã hội thoại chứ không sở hữu tài khoản, kết quả làm bài hay kế hoạch học. Biểu đồ lớp này mô tả cấu trúc nghiệp vụ ở mức thiết kế; sơ đồ cơ sở dữ liệu vật lý tại mục 3.3 mới mô tả bảng, khóa và kiểu cột triển khai.

### 3.2.2. Các quy tắc bảo đảm dữ liệu đúng

- Hội thoại và bộ câu hỏi phải ghi lại đúng phiên bản tài liệu đã sử dụng. Khi tài liệu được thay mới, nguồn của kết quả cũ vẫn phải được xác định.
- Ghi chú theo trang thuộc riêng Sinh viên đã tạo ghi chú, không trở thành ghi chú chung của Giảng viên hoặc cả lớp.
- Mỗi câu trắc nghiệm có đúng bốn phương án, một đáp án đúng và nguồn theo trang. Mỗi lần làm bài được lưu thành một lượt riêng để không ghi đè lịch sử.
- Tiến độ đọc tài liệu được tính theo các trang đã xem và không được dùng như điểm kiểm tra. Ngày học được xác định theo múi giờ của Sinh viên.
- Nhiệm vụ và lịch tuần cùng lấy dữ liệu từ kế hoạch do Sinh viên tạo. Chuỗi ngày học liên tiếp và nội dung cần ôn lại được tính từ lịch sử hoạt động, không cần tạo thêm một bản dữ liệu độc lập.

## 3.3. Thiết kế cơ sở dữ liệu chung

### 3.3.1. Sơ đồ cơ sở dữ liệu tổng quan

Hình 3.3 trình bày 31 bảng dự kiến: 27 bảng lưu thông tin người dùng và hoạt động học tập, cùng 4 bảng phục vụ việc xử lý AI. Trong hình, PK là trường nhận diện duy nhất của một bản ghi; FK là trường dùng để liên kết sang bảng khác; trường cho phép để trống được đánh dấu riêng.

![ERD StudyFlow](../diagrams/chuong-3/erd-physical-03-studyflow-overview.png)

*Hình 3.3. Sơ đồ tổng quan gồm 27 bảng dữ liệu học tập và 4 bảng dữ liệu AI.*

Hai khu vực dữ liệu dùng các mã tài liệu và phiên bản để đối chiếu nhưng không liên kết cứng vào nhau. Cách này giúp phần AI không thể tự đi sang khu vực dữ liệu học tập để đọc thông tin người dùng. Do sơ đồ có nhiều bảng, hình nên được đặt ở trang ngang hoặc phụ lục khổ lớn và dùng bản PNG độ phân giải cao để chữ vẫn rõ khi chèn báo cáo.

Đây là thiết kế dự kiến, chưa phải ảnh chụp từ cơ sở dữ liệu đã vận hành. Độ dài văn bản, trường bắt buộc và một số nhóm trường kết hợp sẽ được chốt khi tạo cơ sở dữ liệu thực tế.

### 3.3.2. Danh mục bảng và ý nghĩa

Cột “Thông tin chính” dưới đây diễn đạt nội dung bằng tiếng Việt. Tên bảng được giữ nguyên để nhóm triển khai có thể đối chiếu với sơ đồ.

| Bảng | Thông tin chính | Ý nghĩa và quy tắc |
|---|---|---|
| app.users | Mã người dùng, email, tên đăng nhập, mật khẩu đã mã hóa, vai trò, trạng thái, múi giờ | Email và tên đăng nhập không được trùng; không lưu mật khẩu nguyên bản |
| app.refresh_tokens | Phiên đăng nhập còn hiệu lực, thời điểm hết hạn và thu hồi | Chỉ lưu dạng đã mã hóa; hỗ trợ đăng xuất và thu hồi phiên |
| app.subjects | Mã môn, tên môn và trạng thái | Quản trị viên quản lý danh mục môn; mã môn không trùng |
| app.semesters | Mã học kỳ, ngày bắt đầu, ngày kết thúc và trạng thái | Ngày kết thúc không được trước ngày bắt đầu |
| app.course_offerings | Môn học, học kỳ, Giảng viên, mã tham gia và trạng thái lớp | Giảng viên sở hữu lớp; mã tham gia được bảo vệ và không ghi vào nhật ký |
| app.course_enrollments | Lớp, Sinh viên, trạng thái yêu cầu và người xét duyệt | Một Sinh viên chỉ có một yêu cầu hiện hành cho mỗi lớp |
| app.documents | Chủ sở hữu, loại tài liệu, vị trí tệp, phiên bản, trạng thái xử lý và số trang | Chỉ nhận PDF có thể đọc được chữ; không gửi vị trí tệp nội bộ xuống trình duyệt |
| app.document_publications | Tài liệu, lớp học phần, người công bố và trạng thái | Một tài liệu chỉ có một trạng thái công bố trong cùng lớp |
| app.document_pages | Tài liệu, số trang và vị trí ảnh xem trước | Mỗi số trang chỉ xuất hiện một lần trong một tài liệu |
| app.page_notes | Sinh viên, tài liệu, số trang và nội dung ghi chú | Ghi chú thuộc riêng Sinh viên và phải kiểm tra quyền mỗi lần đọc hoặc sửa |
| app.chat_conversations | Sinh viên, tiêu đề, loại và trạng thái cuộc trò chuyện | Cuộc trò chuyện thuộc riêng người tạo |
| app.conversation_documents | Cuộc trò chuyện, tài liệu và phiên bản tài liệu | Ghi lại đúng nguồn đã dùng cho cuộc trò chuyện |
| app.chat_messages | Người gửi, nội dung, trạng thái trả lời, nguồn và mã theo dõi | Không sao chép nội dung trò chuyện vào nhật ký hệ thống |
| app.learning_progress | Sinh viên, tài liệu, lớp, trang gần nhất, số trang đã xem và phần trăm | Chỉ phản ánh tiến độ đọc, không suy đoán mức độ thành thạo |
| app.learning_events | Sinh viên, loại hoạt động, ngày và số lượng | Ngăn một hoạt động bị ghi nhận nhiều lần |
| app.daily_goals | Mục tiêu số trang, số câu và số nhiệm vụ trong ngày | Chỉ lưu mục tiêu; kết quả thực tế được tính từ hoạt động học |
| app.study_plans | Sinh viên và thông tin kế hoạch | Sinh viên tự quản lý; AI không tự lập kế hoạch |
| app.study_plan_items | Kế hoạch, lớp học phần nếu có, thời gian và trạng thái | Là nguồn để hiển thị nhiệm vụ và lịch tuần |
| app.quizzes | Người tạo, vai trò người tạo, lớp nếu có, trạng thái và bộ được tạo lại từ đâu | Hệ thống chính quản lý toàn bộ quá trình của bộ câu hỏi |
| app.quiz_sources | Bộ câu hỏi, tài liệu và phiên bản | Nguồn tạo câu hỏi độc lập với nơi bộ câu hỏi được sử dụng |
| app.quiz_questions | Nội dung câu, bốn phương án, đáp án đúng và lời giải thích | Mỗi câu phải có đúng bốn phương án và một đáp án đúng |
| app.quiz_question_sources | Câu hỏi, tài liệu, số trang và đoạn nguồn | Cho phép kiểm tra nguồn và mở lại nội dung cần ôn |
| app.quiz_attempts | Bộ câu hỏi, Sinh viên, thời gian bắt đầu, kết thúc và điểm | Mỗi lần làm bài là một bản ghi riêng |
| app.quiz_answers | Lượt làm, câu hỏi, lựa chọn của Sinh viên và kết quả đúng hoặc sai | Mỗi câu chỉ có một câu trả lời trong một lượt làm |
| app.feedback_reports | Người gửi, nội dung và trạng thái phản hồi | Dùng để xử lý phản hồi, không cấp thêm quyền xem dữ liệu cá nhân |
| app.system_logs | Người thực hiện, hành động, đối tượng và kết quả | Chỉ lưu thông tin cần thiết; không lưu câu hỏi riêng tư, nội dung PDF hoặc khóa truy cập |
| app.system_settings | Tên cấu hình và giá trị | Không dùng để lưu khóa kết nối dịch vụ AI |
| ai.index_jobs | Yêu cầu xử lý tài liệu, trạng thái, số lần thử và lỗi an toàn | Một yêu cầu lặp lại không tạo dữ liệu trùng; liên kết tải tệp tạm thời được xóa sau khi hoàn tất |
| ai.document_indexes | Tài liệu, phiên bản, cách xử lý và trạng thái | Theo dõi tài liệu đã được chuẩn bị bằng cách nào |
| ai.document_chunks | Đoạn nội dung, tài liệu, chủ sở hữu, số trang và dãy số phục vụ tìm kiếm | Chỉ tìm trong phạm vi được phép; một đoạn không bị lưu trùng |
| ai.agent_runs | Lần xử lý, yêu cầu tương ứng, loại việc được chọn, trạng thái và thời gian | Chỉ lưu thông tin phục vụ theo dõi; không lưu toàn bộ PDF hoặc khóa bí mật |

### 3.3.3. Tìm kiếm nhanh và ghi dữ liệu an toàn

Hệ thống tạo các dấu tra cứu để tìm nhanh người dùng, lớp, trạng thái và tài liệu. Riêng phần AI có thêm cách tìm các đoạn văn gần nghĩa với câu hỏi. Điều kiện về chủ sở hữu, tài liệu, phiên bản và loại nguồn phải được kiểm tra ngay trong lúc tìm; không được tìm trên toàn bộ dữ liệu rồi mới loại bỏ phần không có quyền.

Khi chấm bài, hệ thống lưu lượt làm và các câu trả lời như một công việc hoàn chỉnh. Nếu một phần bị lỗi, toàn bộ lần lưu đó phải được hủy để tránh dữ liệu dở dang. Hoạt động hoàn tất nhiệm vụ và xem trang cũng phải có cách ngăn ghi trùng.

Mục tiêu mỗi ngày cho phép đặt từ 0 đến 100 trang, 0 đến 200 câu hỏi và 0 đến 50 nhiệm vụ, nhưng tổng mục tiêu phải lớn hơn 0. Chuỗi ngày học liên tiếp chỉ tính ngày có ít nhất một hoạt động hợp lệ: xem trang tài liệu, hoàn tất nhiệm vụ hoặc hoàn thành bài trắc nghiệm. Đăng nhập, ghi chú và hỏi AI không được tính.

## 3.4. Thiết kế chi tiết ba chức năng AI

Các sơ đồ lớp trong mục này sử dụng mô hình View–DAO–Entity theo form thống nhất của báo cáo. Các lớp được trình bày trên một mặt phẳng, không chia thành các khung riêng: View nằm ở phía trên, DAO ở giữa và Entity ở phía dưới. Nhóm View thể hiện màn hình người dùng thao tác. Nhóm DAO đại diện cho các điểm truy cập, kiểm tra phạm vi và trao đổi dữ liệu với phần nghiệp vụ hoặc phần AI; ký hiệu này không có nghĩa Frontend được phép gọi cơ sở dữ liệu trực tiếp, vì mọi yêu cầu vẫn phải đi qua API Java. Nhóm Entity thể hiện dữ liệu được lưu hoặc truyền giữa các bước. Đường phụ thuộc, liên kết, kết tập và hợp thành dùng ký hiệu UML tương ứng. Tên trong sơ đồ là tên thiết kế phục vụ báo cáo, không khẳng định toàn bộ các lớp đã được triển khai đầy đủ.

### 3.4.1. Hỏi đáp và tóm tắt tài liệu cá nhân — AI-F01

Hình 3.4 cho thấy đầy đủ đường đi từ trang Tài liệu cá nhân và bảng hội thoại, qua lớp kiểm tra phạm vi và Single Agent, đến các thực thể tài liệu, hội thoại, chỉ mục và kết quả trả về.

![Lớp Personal RAG](../diagrams/chuong-3/class-04-personal-rag.png)

*Hình 3.4. Biểu đồ lớp View–DAO–Entity của chức năng hỏi đáp, tóm tắt và tạo Quiz từ tài liệu cá nhân.*

Sinh viên chọn PDF và nhập yêu cầu ngay trên trang Tài liệu cá nhân. Lớp View gửi yêu cầu qua DAO của hệ thống chính. Các DAO kiểm tra tài liệu có thuộc Sinh viên hay không, cố định phiên bản và phạm vi hội thoại, sau đó điểm truy cập AI chọn đúng một khả năng hỏi đáp, tóm tắt hoặc tạo Quiz. Các Entity lưu quan hệ giữa Sinh viên, tài liệu, hội thoại, tin nhắn, chỉ mục và lần chạy; kết quả phải có trạng thái và trang nguồn trước khi giao diện hiển thị.

### 3.4.2. Hỏi đáp tài liệu bài giảng — AI-F02

Hình 3.5 thể hiện từ thư viện học liệu, trình xem từng trang PDF, bảng ghi chú và AI Tutor đến lớp kiểm quyền, xử lý hỏi đáp và các entity lớp học phần, publication, tài liệu, trang, ghi chú và tiến độ.

![Lớp Course Material PDF Tutor](../diagrams/chuong-3/class-05-slide-tutor.png)

*Hình 3.5. Biểu đồ lớp View–DAO–Entity của Viewer, ghi chú và Course Material AI Tutor.*

Giao diện phân biệt SLIDE_PDF để mở Viewer/Tutor và REFERENCE_PDF chỉ để tải xuống. Hệ thống chính xác định enrollment, publication, phiên bản tài liệu, trang đang xem và những trang Sinh viên được phép sử dụng. Phần AI chỉ tìm trong phạm vi này; sau khi AI trả kết quả, hệ thống chính kiểm tra lại quyền và citation trước khi hiển thị. Ghi chú và tiến độ là dữ liệu riêng do hệ thống chính quản lý, không phải kết quả do AI tự cập nhật.

### 3.4.3. Sinh bộ câu hỏi trắc nghiệm — AI-F03

Hình 3.6 thể hiện đầy đủ các màn hình tạo, theo dõi, duyệt, làm và xem kết quả Quiz; đồng thời tách lớp sinh bản nháp AI khỏi lớp chấm điểm của hệ thống chính.

![Lớp sinh Quiz](../diagrams/chuong-3/class-06-quiz.png)

*Hình 3.6. Biểu đồ lớp View–DAO–Entity của quá trình sinh, duyệt, làm và chấm Quiz.*

Lớp View gửi cấu hình tạo Quiz và theo dõi trạng thái qua các DAO. DAO kiểm tra vai trò, tài liệu và lớp học phần trước khi giao công việc sinh bản nháp cho AI. Mỗi câu trong bản nháp phải có bốn phương án, một đáp án đúng, lời giải thích và trang nguồn. Các Entity lưu Quiz, nguồn, câu hỏi, lượt làm và câu trả lời. Hệ thống Java vẫn quản lý duyệt/công bố, tạo lượt làm và chấm điểm; phần AI không thực hiện các công việc này.

### 3.4.4. Quy định dữ liệu vào và kết quả trả về

| Trường hợp | Thông tin cần cung cấp | Kết quả hợp lệ | Khi không thể tiếp tục |
|---|---|---|---|
| Hỏi hoặc tóm tắt PDF cá nhân | Nội dung yêu cầu và từ một đến mười PDF thuộc Sinh viên | Câu trả lời, bản tóm tắt, bản nháp câu hỏi, yêu cầu bổ sung thông tin hoặc thông báo không tìm thấy căn cứ | Dừng khi tài liệu không thuộc người dùng, sai phiên bản hoặc chưa sẵn sàng |
| Hỏi tài liệu bài giảng | Câu hỏi, tài liệu và trang đang xem | Câu trả lời có trang nguồn; không tự tăng tiến độ từ hành động hỏi AI | Từ chối khi Sinh viên không còn quyền, tài liệu chưa công bố hoặc trang không hợp lệ |
| Sinh bộ câu hỏi | Người tạo, tài liệu, số câu, mức độ, chủ đề và phạm vi trang | Tiếp nhận yêu cầu và tạo bản nháp chờ xem lại | Không tạo khi nguồn không hợp lệ; ghi nhận thất bại nếu AI không thể tạo bộ đúng quy tắc |
| Trao đổi giữa hệ thống chính và phần AI | Khóa xác nhận nội bộ, mã theo dõi và phạm vi tài liệu được phép | Kết quả có cấu trúc rõ ràng để hệ thống chính kiểm tra | Từ chối khi thiếu khóa, sai phiên bản hoặc phạm vi không hợp lệ |
| Công việc xử lý phía sau | Mã bộ câu hỏi và mã lần chạy | Lưu trọn vẹn bản nháp hợp lệ hoặc ghi trạng thái thất bại | Chạy lại không tạo câu trùng; kết quả cũ không ghi đè kết quả mới |

Tên trường, địa chỉ gửi yêu cầu và mã lỗi dành cho người triển khai được quy định tại [kế hoạch API](../api-plan.md). Chương này tập trung giải thích ý nghĩa và trách nhiệm, không lặp lại toàn bộ thông số kỹ thuật.

### 3.4.5. Phần của các thành viên còn lại

Sáu chức năng do hai thành viên phụ trách phần hệ thống chính vẫn cần được chốt trong Chương 2 trước khi bổ sung sơ đồ chi tiết. Khi đã lựa chọn, mỗi chức năng phải có mô tả trách nhiệm, dữ liệu vào và ra, các bước xử lý, trường hợp thay thế, ngoại lệ và tiêu chí kiểm thử theo cùng một mẫu.

## 3.5. Thiết kế các luồng hoạt động

Ba loại sơ đồ được sử dụng với ba mục đích khác nhau. Activity Diagram mô tả các bước và nhánh lựa chọn. Sequence Diagram cho biết các thành phần trao đổi theo thứ tự nào. State Machine Diagram cho biết một đối tượng có thể chuyển qua những trạng thái nào. Mỗi hình đều có đoạn giải thích ngay sau hình để người đọc biết điểm cần quan sát.

### 3.5.1. Các bước hỏi đáp tài liệu cá nhân

Hình 3.7 mô tả quá trình từ lúc Sinh viên gửi yêu cầu đến lúc nhận câu trả lời, bản tóm tắt hoặc bản nháp bộ câu hỏi.

![Activity RAG](../diagrams/chuong-3/activity-07-personal-rag.png)

*Hình 3.7. Các bước lựa chọn hỏi đáp, tóm tắt hoặc tạo bộ câu hỏi.*

Quyền sử dụng tài liệu được kiểm tra trước khi tìm nội dung. Nếu tài liệu không có căn cứ phù hợp, hệ thống dừng và thông báo không tìm thấy căn cứ. Nếu có căn cứ, AI tạo kết quả và hệ thống kiểm tra lại nguồn. Khi kết quả chưa đạt, AI chỉ được sửa lại một lần và không được đổi sang tài liệu khác.

### 3.5.2. Các bước hỏi đáp tài liệu bài giảng

Hình 3.8 thể hiện việc hỏi đáp trong phạm vi PDF đã được Giảng viên công bố cho lớp học phần.

![Activity Tutor](../diagrams/chuong-3/activity-08-slide-tutor.png)

*Hình 3.8. Các bước hỏi đáp tài liệu bài giảng theo trang.*

Hệ thống kiểm tra Sinh viên đã được chấp nhận vào lớp và tài liệu vẫn đang được công bố. Trang hiện tại được ưu tiên, nhưng AI chỉ được dùng những trang đã được cho phép trong cùng tài liệu. Kết quả luôn kèm trang nguồn. Hành động hỏi AI không được tính là một ngày học trong chuỗi ngày học liên tiếp.

### 3.5.3. Các bước sinh bộ câu hỏi

Hình 3.9 mô tả quá trình tạo bản nháp, kiểm tra và chuyển quyền quyết định cho Sinh viên hoặc Giảng viên.

![Activity Quiz](../diagrams/chuong-3/activity-09-quiz-generation.png)

*Hình 3.9. Các bước sinh và xem lại bộ câu hỏi bằng AI.*

Hệ thống chính ghi nhận bộ câu hỏi ở trạng thái đang tạo để trang web không phải chờ liên tục. AI tạo nội dung và kiểm tra nguồn; hệ thống chính tiếp tục kiểm tra mỗi câu có đủ bốn phương án và một đáp án đúng. Sinh viên phải chấp nhận trước khi ôn. Giảng viên có thể sửa rồi mới công bố cho lớp. Kết quả do AI tạo không được chuyển thẳng sang bước làm bài.

### 3.5.4. Thứ tự xử lý yêu cầu tài liệu cá nhân

Hình 3.10 cho biết thứ tự trao đổi giữa Sinh viên, trang web, hệ thống chính, phần AI, nơi lưu dữ liệu tìm kiếm và dịch vụ AI bên ngoài.

![Sequence RAG](../diagrams/chuong-3/sequence-10-personal-rag.png)

*Hình 3.10. Thứ tự xử lý yêu cầu hỏi đáp tài liệu cá nhân.*

Hệ thống phân biệt rõ bốn trường hợp: người dùng không có quyền, yêu cầu còn thiếu thông tin, tài liệu không đủ căn cứ và tài liệu có đủ căn cứ. AI có thể nhận biết người dùng muốn hỏi, tóm tắt hay tạo câu hỏi, nhưng hệ thống chính vẫn quyết định tài liệu nào được dùng và kiểm tra lại kết quả. Không đủ căn cứ thì không tạo nội dung.

#### Diễn giải trình tự Hình 3.10

Mũi tên nét liền là lời gọi đồng bộ; nét đứt trả kết quả về đúng bên gọi. Mũi tên đầu mở (`->>`) biểu diễn sự kiện giao diện hoặc công việc bất đồng bộ. Bên gọi chỉ tiếp tục sau khi nhận phản hồi của lời gọi đồng bộ. Một đối tượng đã nhận lại kết quả có thể gọi tiếp đối tượng khác; không bắt buộc mỗi bước phải xuất phát từ đối tượng nhận của bước ngay trước. Mỗi đầu mũi tên gọi và trả về đều gắn với thanh thực thi của bên gửi/nhận. Thanh của một lời gọi kéo dài từ lúc nhận yêu cầu đến lúc trả kết quả, kể cả thời gian chờ lời gọi con; lời gọi lồng vào chính đối tượng được vẽ bằng thanh thực thi lồng. Giao diện, tác nhân và công việc nền có thanh thực thi cho lượt tương tác tương ứng. Chỉ một nhánh `alt` được chạy; số bước liên tục giúp đối chiếu hình, không có nghĩa mọi nhánh đều chạy. Thao tác với Entity là thiết kế trao đổi dữ liệu, không bổ sung phương thức mới cho lớp thực thể.

1. Tại `PersonalDocumentsView`, người dùng thực hiện `selectDocuments(ids)`.
2. Tại `PersonalDocumentsView`, người dùng thực hiện `openAssistant()`.
3. `PersonalDocumentsView` gọi `open(ids)` của `PersonalAssistantView` và chờ bên nhận xử lý.
4. `PersonalAssistantView` trả `void - đã mở hội thoại` về đúng bên gọi là `PersonalDocumentsView`.
5. Tại `PersonalAssistantView`, người dùng thực hiện `submitPrompt(message)`.
6. `PersonalAssistantView` gọi `postMessage(conversationId, MessageRequest)` của `PersonalAssistantDAO` và chờ bên nhận xử lý.
7. `PersonalAssistantDAO` gọi `run(studentId, conversationId, request)` của `ConversationDAO` và chờ bên nhận xử lý.
8. `ConversationDAO` gọi `loadAuthorizedSnapshot(studentId, conversationId)` của `ConversationScopeDAO` và chờ bên nhận xử lý.
9. `ConversationScopeDAO` thực hiện thao tác `đọc hội thoại thuộc Student` với dữ liệu thực thể `ChatConversation` qua tầng lưu trữ.
10. `ChatConversation` trả `ConversationSnapshot` về đúng bên gọi là `ConversationScopeDAO`.
11. Với mỗi lượt trong vòng lặp, `ConversationScopeDAO` thực hiện thao tác `đọc owner, READY và version` với dữ liệu thực thể `PersonalDocument` qua tầng lưu trữ.
12. Với mỗi lượt trong vòng lặp, `PersonalDocument` trả `DocumentSnapshot` về đúng bên gọi là `ConversationScopeDAO`.
13. `ConversationScopeDAO` trả `AuthorizedScope hoặc lỗi truy cập` về đúng bên gọi là `ConversationDAO`.
14. Trong trường hợp phạm vi hợp lệ, `ConversationDAO` gọi `runAssistant(InternalAssistantRequest)` của `AiGatewayDAO` và chờ bên nhận xử lý.
15. Trong trường hợp phạm vi hợp lệ, `AiGatewayDAO` gọi `run(request)` của `OrchestratorDAO` và chờ bên nhận xử lý.
16. Trong trường hợp phạm vi hợp lệ, `OrchestratorDAO` tự thực hiện `selectTool(message)` trước khi tiếp tục.
17. Trong trường hợp phạm vi hợp lệ, `OrchestratorDAO` trả `ToolName` về đúng bên gọi là `OrchestratorDAO`.
18. Trong trường hợp phạm vi hợp lệ, `OrchestratorDAO` thực hiện thao tác `ghi selectedTool và RUNNING` với dữ liệu thực thể `AgentRun` qua tầng lưu trữ.
19. Trong trường hợp phạm vi hợp lệ, `AgentRun` trả `đã lưu AgentRun` về đúng bên gọi là `OrchestratorDAO`.
20. Trong trường hợp tool hỏi đáp, `OrchestratorDAO` gọi `execute(AskArgs, scope)` của `AskDocumentDAO` và chờ bên nhận xử lý.
21. Trong trường hợp tool hỏi đáp, `AskDocumentDAO` gọi `search(scope, query)` của `DocumentIndexDAO` và chờ bên nhận xử lý.
22. Trong trường hợp tool hỏi đáp, `DocumentIndexDAO` thực hiện thao tác `đọc chỉ mục theo document/version` với dữ liệu thực thể `DocumentIndex` qua tầng lưu trữ.
23. Trong trường hợp tool hỏi đáp, `DocumentIndex` trả `IndexSnapshot` về đúng bên gọi là `DocumentIndexDAO`.
24. Trong trường hợp tool hỏi đáp, `DocumentIndexDAO` gửi yêu cầu `embedding(query)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
25. Trong trường hợp tool hỏi đáp, `Model Provider` trả `QueryVector` về đúng bên gọi là `DocumentIndexDAO`.
26. Trong trường hợp tool hỏi đáp, `DocumentIndexDAO` thực hiện thao tác `tìm từ khóa + vector trong scope` với dữ liệu thực thể `DocumentChunk` qua tầng lưu trữ.
27. Trong trường hợp tool hỏi đáp, `DocumentChunk` trả `CandidateChunks` về đúng bên gọi là `DocumentIndexDAO`.
28. Trong trường hợp tool hỏi đáp, `DocumentIndexDAO` gửi yêu cầu `rerank(query, CandidateChunks)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
29. Trong trường hợp tool hỏi đáp, `Model Provider` trả `RankedEvidence` về đúng bên gọi là `DocumentIndexDAO`.
30. Trong trường hợp tool hỏi đáp, `DocumentIndexDAO` trả `EvidenceSet theo trang` về đúng bên gọi là `AskDocumentDAO`.
31. Trong trường hợp có bằng chứng, `AskDocumentDAO` gửi yêu cầu `sinh nội dung từ EvidenceSet` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
32. Trong trường hợp có bằng chứng, `Model Provider` trả `AnswerResult` về đúng bên gọi là `AskDocumentDAO`.
33. Trong trường hợp có bằng chứng, `AskDocumentDAO` gọi `validate(result, evidence)` của `GroundingValidationDAO` và chờ bên nhận xử lý.
34. Trong trường hợp có bằng chứng, `GroundingValidationDAO` trả `ValidationResult` về đúng bên gọi là `AskDocumentDAO`.
35. Trong trường hợp tool hỏi đáp, `AskDocumentDAO` trả `ANSWERED hoặc NO_EVIDENCE` về đúng bên gọi là `OrchestratorDAO`.
36. Trong trường hợp tool tóm tắt, `OrchestratorDAO` gọi `execute(SummaryArgs, scope)` của `SummarizeDocumentDAO` và chờ bên nhận xử lý.
37. Trong trường hợp tool tóm tắt, `SummarizeDocumentDAO` gọi `search(scope, query)` của `DocumentIndexDAO` và chờ bên nhận xử lý.
38. Trong trường hợp tool tóm tắt, `DocumentIndexDAO` thực hiện thao tác `đọc chỉ mục theo document/version` với dữ liệu thực thể `DocumentIndex` qua tầng lưu trữ.
39. Trong trường hợp tool tóm tắt, `DocumentIndex` trả `IndexSnapshot` về đúng bên gọi là `DocumentIndexDAO`.
40. Trong trường hợp tool tóm tắt, `DocumentIndexDAO` gửi yêu cầu `embedding(query)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
41. Trong trường hợp tool tóm tắt, `Model Provider` trả `QueryVector` về đúng bên gọi là `DocumentIndexDAO`.
42. Trong trường hợp tool tóm tắt, `DocumentIndexDAO` thực hiện thao tác `tìm từ khóa + vector trong scope` với dữ liệu thực thể `DocumentChunk` qua tầng lưu trữ.
43. Trong trường hợp tool tóm tắt, `DocumentChunk` trả `CandidateChunks` về đúng bên gọi là `DocumentIndexDAO`.
44. Trong trường hợp tool tóm tắt, `DocumentIndexDAO` gửi yêu cầu `rerank(query, CandidateChunks)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
45. Trong trường hợp tool tóm tắt, `Model Provider` trả `RankedEvidence` về đúng bên gọi là `DocumentIndexDAO`.
46. Trong trường hợp tool tóm tắt, `DocumentIndexDAO` trả `EvidenceSet theo trang` về đúng bên gọi là `SummarizeDocumentDAO`.
47. Trong trường hợp có bằng chứng, `SummarizeDocumentDAO` gửi yêu cầu `sinh nội dung từ EvidenceSet` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
48. Trong trường hợp có bằng chứng, `Model Provider` trả `SummaryResult` về đúng bên gọi là `SummarizeDocumentDAO`.
49. Trong trường hợp có bằng chứng, `SummarizeDocumentDAO` gọi `validate(result, evidence)` của `GroundingValidationDAO` và chờ bên nhận xử lý.
50. Trong trường hợp có bằng chứng, `GroundingValidationDAO` trả `ValidationResult` về đúng bên gọi là `SummarizeDocumentDAO`.
51. Trong trường hợp tool tóm tắt, `SummarizeDocumentDAO` trả `SUMMARIZED hoặc NO_EVIDENCE` về đúng bên gọi là `OrchestratorDAO`.
52. Trong trường hợp tool tạo quiz có nguồn, `OrchestratorDAO` gọi `execute(QuizArgs, scope)` của `GenerateQuizDAO` và chờ bên nhận xử lý.
53. Trong trường hợp tool tạo quiz có nguồn, `GenerateQuizDAO` gọi `search(scope, query)` của `DocumentIndexDAO` và chờ bên nhận xử lý.
54. Trong trường hợp tool tạo quiz có nguồn, `DocumentIndexDAO` thực hiện thao tác `đọc chỉ mục theo document/version` với dữ liệu thực thể `DocumentIndex` qua tầng lưu trữ.
55. Trong trường hợp tool tạo quiz có nguồn, `DocumentIndex` trả `IndexSnapshot` về đúng bên gọi là `DocumentIndexDAO`.
56. Trong trường hợp tool tạo quiz có nguồn, `DocumentIndexDAO` gửi yêu cầu `embedding(query)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
57. Trong trường hợp tool tạo quiz có nguồn, `Model Provider` trả `QueryVector` về đúng bên gọi là `DocumentIndexDAO`.
58. Trong trường hợp tool tạo quiz có nguồn, `DocumentIndexDAO` thực hiện thao tác `tìm từ khóa + vector trong scope` với dữ liệu thực thể `DocumentChunk` qua tầng lưu trữ.
59. Trong trường hợp tool tạo quiz có nguồn, `DocumentChunk` trả `CandidateChunks` về đúng bên gọi là `DocumentIndexDAO`.
60. Trong trường hợp tool tạo quiz có nguồn, `DocumentIndexDAO` gửi yêu cầu `rerank(query, CandidateChunks)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
61. Trong trường hợp tool tạo quiz có nguồn, `Model Provider` trả `RankedEvidence` về đúng bên gọi là `DocumentIndexDAO`.
62. Trong trường hợp tool tạo quiz có nguồn, `DocumentIndexDAO` trả `EvidenceSet theo trang` về đúng bên gọi là `GenerateQuizDAO`.
63. Trong trường hợp có bằng chứng, `GenerateQuizDAO` gửi yêu cầu `sinh nội dung từ EvidenceSet` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
64. Trong trường hợp có bằng chứng, `Model Provider` trả `QuizDraft` về đúng bên gọi là `GenerateQuizDAO`.
65. Trong trường hợp có bằng chứng, `GenerateQuizDAO` gọi `validate(result, evidence)` của `GroundingValidationDAO` và chờ bên nhận xử lý.
66. Trong trường hợp có bằng chứng, `GroundingValidationDAO` trả `ValidationResult` về đúng bên gọi là `GenerateQuizDAO`.
67. Trong trường hợp tool tạo quiz có nguồn, `GenerateQuizDAO` trả `QUIZ_CREATED hoặc NO_EVIDENCE` về đúng bên gọi là `OrchestratorDAO`.
68. Trong trường hợp phạm vi hợp lệ, `OrchestratorDAO` thực hiện thao tác `ghi kết quả thực hiện` với dữ liệu thực thể `AgentRun` qua tầng lưu trữ.
69. Trong trường hợp phạm vi hợp lệ, `AgentRun` trả `đã lưu AgentRun` về đúng bên gọi là `OrchestratorDAO`.
70. Trong trường hợp phạm vi hợp lệ, `OrchestratorDAO` trả `AssistantResponse` về đúng bên gọi là `AiGatewayDAO`.
71. Trong trường hợp phạm vi hợp lệ, `AiGatewayDAO` trả `AssistantResponse` về đúng bên gọi là `ConversationDAO`.
72. Trong trường hợp phạm vi hợp lệ, `ConversationDAO` gọi `validateResult(scope, response)` của `ConversationScopeDAO` và chờ bên nhận xử lý.
73. Trong trường hợp phạm vi hợp lệ, `ConversationScopeDAO` trả `void hoặc lỗi quyền/nguồn` về đúng bên gọi là `ConversationDAO`.
74. Trong trường hợp kết quả được java chấp nhận, `ConversationDAO` thực hiện thao tác `lưu hội thoại và liên kết Quiz nháp` với dữ liệu thực thể `ChatMessage` qua tầng lưu trữ.
75. Trong trường hợp kết quả được java chấp nhận, `ChatMessage` trả `đã lưu ChatMessage` về đúng bên gọi là `ConversationDAO`.
76. `ConversationDAO` trả `AssistantResponse hoặc lỗi theo contract` về đúng bên gọi là `PersonalAssistantDAO`.
77. `PersonalAssistantDAO` trả `AssistantResponse hoặc lỗi theo contract` về đúng bên gọi là `PersonalAssistantView`.
78. `PersonalAssistantView` hiển thị kết quả hoặc câu hỏi làm rõ cho người dùng.
79. Trong trường hợp có citation và student chọn xem nguồn, Tại `PersonalAssistantView`, người dùng thực hiện `chọn citation`.
80. Trong trường hợp có citation và student chọn xem nguồn, `PersonalAssistantView` gọi `open(citation)` của `CitationView` và chờ bên nhận xử lý.
81. Trong trường hợp có citation và student chọn xem nguồn, `CitationView` trả `void - đã mở nguồn` về đúng bên gọi là `PersonalAssistantView`.
82. Trong trường hợp có quizdraft hợp lệ, `PersonalAssistantView` gọi `showDraft(response.quizDraft)` của `QuizDraftReviewView` và chờ bên nhận xử lý.
83. Trong trường hợp có quizdraft hợp lệ, `QuizDraftReviewView` trả `void - đã hiển thị bản nháp` về đúng bên gọi là `PersonalAssistantView`.

### 3.5.5. Thứ tự xử lý câu hỏi về tài liệu bài giảng

Hình 3.11 cho biết một câu hỏi đi từ trang đọc PDF đến hệ thống chính, phần AI và quay trở lại Sinh viên như thế nào.

![Sequence Tutor](../diagrams/chuong-3/sequence-11-slide-tutor.png)

*Hình 3.11. Thứ tự xử lý câu hỏi về tài liệu bài giảng.*

Mỗi lần hỏi đều phải kiểm tra quyền hiện tại, kể cả khi Sinh viên đã hỏi trước đó trong cùng cuộc trò chuyện. Nếu Giảng viên thu hồi tài liệu trong lúc chờ, kết quả không được trả về. Nguồn của câu trả lời phải xác định đúng tài liệu và số trang.

#### Diễn giải trình tự Hình 3.11

Mũi tên nét liền là lời gọi đồng bộ; nét đứt trả kết quả về đúng bên gọi. Mũi tên đầu mở (`->>`) biểu diễn sự kiện giao diện hoặc công việc bất đồng bộ. Bên gọi chỉ tiếp tục sau khi nhận phản hồi của lời gọi đồng bộ. Một đối tượng đã nhận lại kết quả có thể gọi tiếp đối tượng khác; không bắt buộc mỗi bước phải xuất phát từ đối tượng nhận của bước ngay trước. Mỗi đầu mũi tên gọi và trả về đều gắn với thanh thực thi của bên gửi/nhận. Thanh của một lời gọi kéo dài từ lúc nhận yêu cầu đến lúc trả kết quả, kể cả thời gian chờ lời gọi con; lời gọi lồng vào chính đối tượng được vẽ bằng thanh thực thi lồng. Giao diện, tác nhân và công việc nền có thanh thực thi cho lượt tương tác tương ứng. Chỉ một nhánh `alt` được chạy; số bước liên tục giúp đối chiếu hình, không có nghĩa mọi nhánh đều chạy. Thao tác với Entity là thiết kế trao đổi dữ liệu, không bổ sung phương thức mới cho lớp thực thể.

1. Tại `SlideViewerView`, người dùng thực hiện `showPage(pageNumber)`.
2. Tại `SlideViewerView`, người dùng thực hiện `toggleTutor()`.
3. `SlideViewerView` gọi `open(documentId, pageNumber)` của `AiTutorView` và chờ bên nhận xử lý.
4. `AiTutorView` trả `void - đã mở Tutor` về đúng bên gọi là `SlideViewerView`.
5. Tại `AiTutorView`, người dùng thực hiện `ask(question)`.
6. `AiTutorView` gọi `ask(documentId, pageNumber, PageQuestion)` của `CourseMaterialTutorDAO` và chờ bên nhận xử lý.
7. `CourseMaterialTutorDAO` gọi `ask(studentId, documentId, pageNumber, question)` của `TutorConversationDAO` và chờ bên nhận xử lý.
8. `TutorConversationDAO` gọi `authorizeTutor(studentId, documentId, pageNumber)` của `MaterialAccessDAO` và chờ bên nhận xử lý.
9. `MaterialAccessDAO` thực hiện thao tác `đọc trạng thái APPROVED` với dữ liệu thực thể `CourseEnrollment` qua tầng lưu trữ.
10. `CourseEnrollment` trả `EnrollmentSnapshot` về đúng bên gọi là `MaterialAccessDAO`.
11. `MaterialAccessDAO` thực hiện thao tác `đọc trạng thái công bố` với dữ liệu thực thể `DocumentPublication` qua tầng lưu trữ.
12. `DocumentPublication` trả `PublicationSnapshot` về đúng bên gọi là `MaterialAccessDAO`.
13. `MaterialAccessDAO` thực hiện thao tác `đọc SLIDE_PDF, READY và version` với dữ liệu thực thể `CourseMaterial` qua tầng lưu trữ.
14. `CourseMaterial` trả `MaterialSnapshot` về đúng bên gọi là `MaterialAccessDAO`.
15. `MaterialAccessDAO` trả `PageScope hoặc lỗi quyền/loại tài liệu` về đúng bên gọi là `TutorConversationDAO`.
16. Trong trường hợp phạm vi hợp lệ, `TutorConversationDAO` gọi `askCourseMaterial(scope, question)` của `AiGatewayDAO` và chờ bên nhận xử lý.
17. Trong trường hợp phạm vi hợp lệ, `AiGatewayDAO` gọi `run(scope, question)` của `TutorPipelineDAO` và chờ bên nhận xử lý.
18. Trong trường hợp phạm vi hợp lệ, `TutorPipelineDAO` gọi `search(scope, question)` của `DocumentIndexDAO` và chờ bên nhận xử lý.
19. Trong trường hợp phạm vi hợp lệ, `DocumentIndexDAO` thực hiện thao tác `đọc chỉ mục theo document/version` với dữ liệu thực thể `DocumentIndex` qua tầng lưu trữ.
20. Trong trường hợp phạm vi hợp lệ, `DocumentIndex` trả `IndexSnapshot` về đúng bên gọi là `DocumentIndexDAO`.
21. Trong trường hợp phạm vi hợp lệ, `DocumentIndexDAO` gửi yêu cầu `embedding(question)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
22. Trong trường hợp phạm vi hợp lệ, `Model Provider` trả `QueryVector` về đúng bên gọi là `DocumentIndexDAO`.
23. Trong trường hợp phạm vi hợp lệ, `DocumentIndexDAO` thực hiện thao tác `tìm từ khóa + vector trong scope` với dữ liệu thực thể `DocumentChunk` qua tầng lưu trữ.
24. Trong trường hợp phạm vi hợp lệ, `DocumentChunk` trả `CandidateChunks` về đúng bên gọi là `DocumentIndexDAO`.
25. Trong trường hợp phạm vi hợp lệ, `DocumentIndexDAO` gửi yêu cầu `rerank(question, CandidateChunks)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
26. Trong trường hợp phạm vi hợp lệ, `Model Provider` trả `RankedEvidence` về đúng bên gọi là `DocumentIndexDAO`.
27. Trong trường hợp phạm vi hợp lệ, `DocumentIndexDAO` trả `EvidenceSet theo trang` về đúng bên gọi là `TutorPipelineDAO`.
28. Trong trường hợp có bằng chứng, `TutorPipelineDAO` gửi yêu cầu `sinh answer từ evidence` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
29. Trong trường hợp có bằng chứng, `Model Provider` trả `GeneratedAnswer + citations` về đúng bên gọi là `TutorPipelineDAO`.
30. Trong trường hợp có bằng chứng, `TutorPipelineDAO` gọi `validate(answer, evidence)` của `GroundingValidationDAO` và chờ bên nhận xử lý.
31. Trong trường hợp có bằng chứng, `GroundingValidationDAO` trả `ValidationResult` về đúng bên gọi là `TutorPipelineDAO`.
32. Trong trường hợp phạm vi hợp lệ, `TutorPipelineDAO` trả `AnswerResponse` về đúng bên gọi là `AiGatewayDAO`.
33. Trong trường hợp phạm vi hợp lệ, `AiGatewayDAO` trả `AnswerResponse` về đúng bên gọi là `TutorConversationDAO`.
34. Trong trường hợp phạm vi hợp lệ, `TutorConversationDAO` gọi `authorizeTutor(studentId, documentId, pageNumber)` của `MaterialAccessDAO` và chờ bên nhận xử lý.
35. Trong trường hợp phạm vi hợp lệ, `MaterialAccessDAO` thực hiện thao tác `kiểm tra enrollment hiện tại` với dữ liệu thực thể `CourseEnrollment` qua tầng lưu trữ.
36. Trong trường hợp phạm vi hợp lệ, `CourseEnrollment` trả `trạng thái enrollment` về đúng bên gọi là `MaterialAccessDAO`.
37. Trong trường hợp phạm vi hợp lệ, `MaterialAccessDAO` thực hiện thao tác `kiểm tra chưa bị thu hồi` với dữ liệu thực thể `DocumentPublication` qua tầng lưu trữ.
38. Trong trường hợp phạm vi hợp lệ, `DocumentPublication` trả `trạng thái publication` về đúng bên gọi là `MaterialAccessDAO`.
39. Trong trường hợp phạm vi hợp lệ, `MaterialAccessDAO` thực hiện thao tác `kiểm tra phiên bản và trạng thái hiện tại` với dữ liệu thực thể `CourseMaterial` qua tầng lưu trữ.
40. Trong trường hợp phạm vi hợp lệ, `CourseMaterial` trả `trạng thái tài liệu` về đúng bên gọi là `MaterialAccessDAO`.
41. Trong trường hợp phạm vi hợp lệ, `MaterialAccessDAO` trả `PageScope hiện tại hoặc lỗi quyền` về đúng bên gọi là `TutorConversationDAO`.
42. `TutorConversationDAO` trả `AnswerResponse hoặc lỗi theo contract` về đúng bên gọi là `CourseMaterialTutorDAO`.
43. `CourseMaterialTutorDAO` trả `AnswerResponse hoặc lỗi theo contract` về đúng bên gọi là `AiTutorView`.
44. `AiTutorView` hiển thị kết quả cho người dùng.

### 3.5.6. Thứ tự tạo và duyệt bộ câu hỏi

Hình 3.12 phân biệt thời điểm hệ thống tiếp nhận yêu cầu, thời gian AI tạo nội dung và thao tác xem lại của người dùng.

![Sequence Quiz](../diagrams/chuong-3/sequence-12-quiz.png)

*Hình 3.12. Thứ tự tạo bản nháp và duyệt bộ câu hỏi cho Sinh viên hoặc Giảng viên.*

Trang web chỉ hỏi tình trạng từ hệ thống chính. Mỗi yêu cầu có mã riêng để lỗi mạng hoặc việc thử lại không tạo ra nhiều bộ giống nhau. Sinh viên chấp nhận bộ cá nhân trước khi ôn; Giảng viên xem lại, chỉnh sửa và công bố bộ câu hỏi của lớp. PDF cá nhân dùng làm nguồn không vì vậy mà trở thành học liệu chung.

#### Diễn giải trình tự Hình 3.12

Mũi tên nét liền là lời gọi đồng bộ; nét đứt trả kết quả về đúng bên gọi. Mũi tên đầu mở (`->>`) biểu diễn sự kiện giao diện hoặc công việc bất đồng bộ. Bên gọi chỉ tiếp tục sau khi nhận phản hồi của lời gọi đồng bộ. Một đối tượng đã nhận lại kết quả có thể gọi tiếp đối tượng khác; không bắt buộc mỗi bước phải xuất phát từ đối tượng nhận của bước ngay trước. Mỗi đầu mũi tên gọi và trả về đều gắn với thanh thực thi của bên gửi/nhận. Thanh của một lời gọi kéo dài từ lúc nhận yêu cầu đến lúc trả kết quả, kể cả thời gian chờ lời gọi con; lời gọi lồng vào chính đối tượng được vẽ bằng thanh thực thi lồng. Giao diện, tác nhân và công việc nền có thanh thực thi cho lượt tương tác tương ứng. Chỉ một nhánh `alt` được chạy; số bước liên tục giúp đối chiếu hình, không có nghĩa mọi nhánh đều chạy. Thao tác với Entity là thiết kế trao đổi dữ liệu, không bổ sung phương thức mới cho lớp thực thể.

HTTP `202` chỉ xác nhận tiếp nhận. Công việc nền và polling độc lập; khối worker đặt trước khối polling để dễ đọc, không bắt giao diện đợi worker hoàn thành.

1. Tại `QuizCreateView`, người dùng thực hiện `selectDocuments(ids)`.
2. Tại `QuizCreateView`, người dùng thực hiện `setConstraints(count, difficulty, topic)`.
3. `QuizCreateView` gọi `generate(QuizRequest)` của `QuizDAO` và chờ bên nhận xử lý.
4. `QuizDAO` gọi `create(actorId, request)` của `QuizLifecycleDAO` và chờ bên nhận xử lý.
5. `QuizLifecycleDAO` gọi `authorizeGeneration(actorId, request)` của `QuizAccessDAO` và chờ bên nhận xử lý.
6. Với mỗi lượt trong vòng lặp, `QuizAccessDAO` thực hiện thao tác `đọc owner, publication, READY và version` với dữ liệu thực thể `Document` qua tầng lưu trữ.
7. Với mỗi lượt trong vòng lặp, `Document` trả `DocumentSnapshot` về đúng bên gọi là `QuizAccessDAO`.
8. `QuizAccessDAO` trả `AuthorizedScope hoặc lỗi validation/access` về đúng bên gọi là `QuizLifecycleDAO`.
9. Trong trường hợp hợp lệ, `QuizLifecycleDAO` thực hiện thao tác `tạo GENERATING + runId` với dữ liệu thực thể `Quiz` qua tầng lưu trữ.
10. Trong trường hợp hợp lệ, `Quiz` trả `quizId + GENERATING` về đúng bên gọi là `QuizLifecycleDAO`.
11. Trong trường hợp hợp lệ, `QuizLifecycleDAO` thực hiện thao tác `lưu snapshot tài liệu/phiên bản/phạm vi trang` với dữ liệu thực thể `QuizSource` qua tầng lưu trữ.
12. Trong trường hợp hợp lệ, `QuizSource` trả `đã lưu QuizSource` về đúng bên gọi là `QuizLifecycleDAO`.
13. Trong trường hợp hợp lệ, `QuizLifecycleDAO` gửi công việc `execute(quizId, runId)` tới `QuizGenerationJobDAO` theo kiểu bất đồng bộ, không chờ AI sinh xong.
14. `QuizLifecycleDAO` trả `AcceptedQuiz(202) hoặc lỗi theo contract` về đúng bên gọi là `QuizDAO`.
15. `QuizDAO` trả `quizId + GENERATING hoặc lỗi` về đúng bên gọi là `QuizCreateView`.
16. `QuizCreateView` hiển thị tiếp nhận hoặc lỗi cho người dùng.
17. Trong trường hợp yêu cầu được tiếp nhận (202), `QuizCreateView` chuyển tới `QuizStatusView` để mở theo dõi quizId.
18. Trong trường hợp có công việc sinh quiz được tiếp nhận, `QuizGenerationJobDAO` gọi `generate(InternalQuizRequest)` của `AiGatewayDAO` và chờ bên nhận xử lý.
19. Trong trường hợp có công việc sinh quiz được tiếp nhận, `AiGatewayDAO` gọi `generate(scope, constraints)` của `QuizGeneratorDAO` và chờ bên nhận xử lý.
20. Trong trường hợp có công việc sinh quiz được tiếp nhận, `QuizGeneratorDAO` gọi `search(scope, constraints)` của `DocumentIndexDAO` và chờ bên nhận xử lý.
21. Trong trường hợp có công việc sinh quiz được tiếp nhận, `DocumentIndexDAO` gửi yêu cầu `embedding(query)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
22. Trong trường hợp có công việc sinh quiz được tiếp nhận, `Model Provider` trả `QueryVector` về đúng bên gọi là `DocumentIndexDAO`.
23. Trong trường hợp có công việc sinh quiz được tiếp nhận, `DocumentIndexDAO` gửi yêu cầu `rerank(query, CandidateChunks)` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
24. Trong trường hợp có công việc sinh quiz được tiếp nhận, `Model Provider` trả `RankedEvidence` về đúng bên gọi là `DocumentIndexDAO`.
25. Trong trường hợp có công việc sinh quiz được tiếp nhận, `DocumentIndexDAO` trả `EvidenceSet theo trang` về đúng bên gọi là `QuizGeneratorDAO`.
26. Trong trường hợp có bằng chứng, `QuizGeneratorDAO` gửi yêu cầu `sinh MCQ_SINGLE theo JSON Schema + evidence` tới dịch vụ ngoài `Model Provider` và chờ kết quả.
27. Trong trường hợp có bằng chứng, `Model Provider` trả `QuizDraft` về đúng bên gọi là `QuizGeneratorDAO`.
28. Trong trường hợp có bằng chứng, `QuizGeneratorDAO` gọi `validate(draft, evidence)` của `QuizValidationDAO` và chờ bên nhận xử lý.
29. Trong trường hợp có bằng chứng, `QuizValidationDAO` trả `ValidationResult` về đúng bên gọi là `QuizGeneratorDAO`.
30. Trong trường hợp có công việc sinh quiz được tiếp nhận, `QuizGeneratorDAO` trả `QuizDraft hoặc lỗi sinh nội dung` về đúng bên gọi là `AiGatewayDAO`.
31. Trong trường hợp có công việc sinh quiz được tiếp nhận, `AiGatewayDAO` trả `QuizDraft hoặc lỗi sinh nội dung` về đúng bên gọi là `QuizGenerationJobDAO`.
32. Trong trường hợp lỗi sinh nội dung hoặc java không chấp nhận, `QuizGenerationJobDAO` thực hiện thao tác `cập nhật GENERATION_FAILED` với dữ liệu thực thể `Quiz` qua tầng lưu trữ.
33. Trong trường hợp lỗi sinh nội dung hoặc java không chấp nhận, `Quiz` trả `đã lưu trạng thái thất bại` về đúng bên gọi là `QuizGenerationJobDAO`.
34. Với mỗi lượt trong vòng lặp, `QuizGenerationJobDAO` thực hiện thao tác `lưu MCQ_SINGLE: 4 options, 1 đáp án` với dữ liệu thực thể `QuizQuestion` qua tầng lưu trữ.
35. Với mỗi lượt trong vòng lặp, `QuizQuestion` trả `questionId` về đúng bên gọi là `QuizGenerationJobDAO`.
36. Với mỗi lượt trong vòng lặp, `QuizGenerationJobDAO` thực hiện thao tác `lưu documentId/pageNumber/excerpt` với dữ liệu thực thể `QuizQuestionSource` qua tầng lưu trữ.
37. Với mỗi lượt trong vòng lặp, `QuizQuestionSource` trả `đã lưu nguồn câu hỏi` về đúng bên gọi là `QuizGenerationJobDAO`.
38. Trong trường hợp bản nháp hợp lệ và quyền còn hiệu lực, `QuizGenerationJobDAO` thực hiện thao tác `cập nhật REVIEW_REQUIRED` với dữ liệu thực thể `Quiz` qua tầng lưu trữ.
39. Trong trường hợp bản nháp hợp lệ và quyền còn hiệu lực, `Quiz` trả `đã lưu trạng thái chờ duyệt` về đúng bên gọi là `QuizGenerationJobDAO`.
40. Với mỗi lượt trong vòng lặp, Bộ hẹn giờ của `QuizStatusView` kích hoạt `poll(quizId)`; chỉ bắt đầu lượt mới khi lượt hỏi trước đã kết thúc.
41. Với mỗi lượt trong vòng lặp, `QuizStatusView` gọi `getStatus(quizId)` của `QuizDAO` và chờ bên nhận xử lý.
42. Với mỗi lượt trong vòng lặp, `QuizDAO` thực hiện thao tác `đọc trạng thái và câu hỏi được phép` với dữ liệu thực thể `Quiz` qua tầng lưu trữ.
43. Với mỗi lượt trong vòng lặp, `Quiz` trả `QuizSummary` về đúng bên gọi là `QuizDAO`.
44. Với mỗi lượt trong vòng lặp, `QuizDAO` trả `QuizSummary` về đúng bên gọi là `QuizStatusView`.
45. Trong trường hợp generation_failed hoặc hết lượt chờ, `QuizStatusView` tự thực hiện `showFailure(errorCode)` trước khi tiếp tục.
46. Trong trường hợp generation_failed hoặc hết lượt chờ, `QuizStatusView` trả `void - đã hiển thị thông báo` về đúng bên gọi là `QuizStatusView`.
47. Trong trường hợp review_required, `QuizStatusView` gọi `showQuestions(quiz)` của `QuizReviewView` và chờ bên nhận xử lý.
48. Trong trường hợp review_required, `QuizReviewView` trả `void - đã hiển thị bản nháp` về đúng bên gọi là `QuizStatusView`.
49. Trong trường hợp student chấp nhận quiz cá nhân, Tại `QuizReviewView`, người dùng thực hiện `acceptStudent()`.
50. Trong trường hợp student chấp nhận quiz cá nhân, `QuizReviewView` gọi `accept(quizId, AcceptQuizRequest)` của `QuizDAO` và chờ bên nhận xử lý.
51. Trong trường hợp student chấp nhận quiz cá nhân, `QuizDAO` gọi `acceptStudent(studentId, quizId)` của `QuizLifecycleDAO` và chờ bên nhận xử lý.
52. Trong trường hợp được phép và quiz còn chờ duyệt, `QuizLifecycleDAO` thực hiện thao tác `cập nhật READY` với dữ liệu thực thể `Quiz` qua tầng lưu trữ.
53. Trong trường hợp được phép và quiz còn chờ duyệt, `Quiz` trả `QuizSummary` về đúng bên gọi là `QuizLifecycleDAO`.
54. Trong trường hợp student chấp nhận quiz cá nhân, `QuizLifecycleDAO` trả `QuizSummary hoặc lỗi quyền/trạng thái` về đúng bên gọi là `QuizDAO`.
55. Trong trường hợp student chấp nhận quiz cá nhân, `QuizDAO` trả `QuizSummary hoặc lỗi quyền/trạng thái` về đúng bên gọi là `QuizReviewView`.
56. Trong trường hợp student chấp nhận quiz cá nhân, `QuizReviewView` hiển thị kết quả quyết định cho người dùng.
57. Trong trường hợp teacher công bố quiz lớp, Tại `QuizReviewView`, người dùng thực hiện `publishTeacher()`.
58. Trong trường hợp teacher công bố quiz lớp, `QuizReviewView` gọi `publish(quizId, PublishQuizRequest)` của `QuizDAO` và chờ bên nhận xử lý.
59. Trong trường hợp teacher công bố quiz lớp, `QuizDAO` gọi `publishTeacher(teacherId, quizId)` của `QuizLifecycleDAO` và chờ bên nhận xử lý.
60. Trong trường hợp được phép và quiz còn chờ duyệt, `QuizLifecycleDAO` thực hiện thao tác `cập nhật PUBLISHED` với dữ liệu thực thể `Quiz` qua tầng lưu trữ.
61. Trong trường hợp được phép và quiz còn chờ duyệt, `Quiz` trả `QuizSummary` về đúng bên gọi là `QuizLifecycleDAO`.
62. Trong trường hợp teacher công bố quiz lớp, `QuizLifecycleDAO` trả `QuizSummary hoặc lỗi quyền/trạng thái` về đúng bên gọi là `QuizDAO`.
63. Trong trường hợp teacher công bố quiz lớp, `QuizDAO` trả `QuizSummary hoặc lỗi quyền/trạng thái` về đúng bên gọi là `QuizReviewView`.
64. Trong trường hợp teacher công bố quiz lớp, `QuizReviewView` hiển thị kết quả quyết định cho người dùng.
65. Trong trường hợp người tạo từ chối bản nháp, Tại `QuizReviewView`, người dùng thực hiện `reject()`.
66. Trong trường hợp người tạo từ chối bản nháp, `QuizReviewView` gọi `reject(quizId)` của `QuizDAO` và chờ bên nhận xử lý.
67. Trong trường hợp người tạo từ chối bản nháp, `QuizDAO` gọi `reject(actorId, quizId)` của `QuizLifecycleDAO` và chờ bên nhận xử lý.
68. Trong trường hợp được phép và quiz còn chờ duyệt, `QuizLifecycleDAO` thực hiện thao tác `cập nhật REJECTED` với dữ liệu thực thể `Quiz` qua tầng lưu trữ.
69. Trong trường hợp được phép và quiz còn chờ duyệt, `Quiz` trả `QuizSummary` về đúng bên gọi là `QuizLifecycleDAO`.
70. Trong trường hợp người tạo từ chối bản nháp, `QuizLifecycleDAO` trả `QuizSummary hoặc lỗi quyền/trạng thái` về đúng bên gọi là `QuizDAO`.
71. Trong trường hợp người tạo từ chối bản nháp, `QuizDAO` trả `QuizSummary hoặc lỗi quyền/trạng thái` về đúng bên gọi là `QuizReviewView`.
72. Trong trường hợp người tạo từ chối bản nháp, `QuizReviewView` hiển thị kết quả quyết định cho người dùng.

### 3.5.7. Luồng chuẩn bị tài liệu

Hình 3.13 áp dụng cho cả PDF cá nhân và PDF bài giảng. Tài liệu được đọc theo từng trang để giữ nguồn chính xác.

![Sequence index](../diagrams/chuong-3/sequence-14-document-indexing.png)

*Hình 3.13. Tiếp nhận, chuẩn bị và đồng bộ trạng thái tài liệu.*

Phần AI xác nhận đã nhận công việc trước, sau đó mới xử lý phía sau. Hệ thống chính định kỳ hỏi tình trạng và cập nhật cho người dùng. Chỉ PDF có thể đọc được chữ mới được chấp nhận. PDF bị khóa hoặc chỉ gồm hình ảnh phải được báo lỗi rõ ràng. Tài liệu xử lý xong vẫn cần Giảng viên chủ động công bố trước khi Sinh viên sử dụng.

### 3.5.8. Các trạng thái của bộ câu hỏi

Hình 3.14 thể hiện những trạng thái mà một bộ câu hỏi có thể đi qua, tách biệt với các lần Sinh viên làm bài.

![State Quiz](../diagrams/chuong-3/state-machine-15-quiz-lifecycle.png)

*Hình 3.14. Trạng thái của bộ câu hỏi và điều kiện chuyển trạng thái.*

Bộ câu hỏi chỉ chuyển từ đang tạo sang chờ duyệt khi toàn bộ câu hỏi hợp lệ. Sinh viên chấp nhận bộ cá nhân để bắt đầu ôn; Giảng viên công bố bộ của lớp sau khi xem lại. Mỗi lần làm bài tạo một lịch sử riêng và không đưa bộ câu hỏi quay lại trạng thái đang tạo. Yêu cầu tạo lại sinh một bộ mới, không ghi đè bộ cũ. Hệ thống chính chấm điểm, AI không chấm.

## 3.6. Thiết kế bảo mật và phân quyền

### 3.6.1. Quyền của từng vai trò

| Nhóm dữ liệu hoặc chức năng | Sinh viên | Giảng viên | Quản trị viên | Phần AI |
|---|---|---|---|---|
| Lớp học phần và thành viên | Gửi yêu cầu và xem lớp đã được phép tham gia | Tạo, quản lý lớp của mình và duyệt Sinh viên | Quản lý danh mục, giám sát và khóa khi cần | Không đọc dữ liệu thành viên lớp |
| PDF bài giảng | Xem, ghi chú và hỏi đáp khi đã được duyệt | Tải lên, công bố, thu hồi và dùng làm nguồn tạo câu hỏi | Chỉ giám sát thông tin cần thiết | Chỉ xử lý đúng tài liệu và trang được hệ thống chính cho phép |
| PDF cá nhân và cuộc trò chuyện | Chỉ chủ sở hữu được sử dụng | Không được đọc | Không mặc định được đọc | Chỉ xử lý trong từng yêu cầu đã được cho phép |
| Bộ câu hỏi, lượt làm và kết quả | Tạo, xem lại và làm bộ cá nhân hoặc bộ của lớp | Tạo, xem lại và công bố bộ của lớp | Không quản lý bộ câu hỏi cá nhân | Chỉ tạo bản nháp có nguồn, không chấm điểm |
| Dashboard, ghi chú và kế hoạch | Chủ sở hữu được xem và thay đổi trong phạm vi cho phép | Không quản lý dữ liệu học riêng của Sinh viên | Không sửa tiến độ cá nhân | Không tính điểm, tiến độ hoặc kế hoạch |

### 3.6.2. Bảo vệ dữ liệu và kiểm tra quyền

Kiểm tra vai trò chỉ là bước đầu. Mỗi thao tác còn phải kiểm tra người dùng có sở hữu tài liệu hay không, có còn thuộc lớp hay không, tài liệu có đang được công bố không và có đúng phiên bản không. Việc ẩn một nút trên trang web không thay thế việc kiểm tra tại hệ thống chính.

Liên kết dùng để xem PDF chỉ có hiệu lực trong thời gian ngắn và chỉ được cấp sau khi kiểm tra quyền. Khi Giảng viên thu hồi tài liệu, yêu cầu tiếp theo phải bị từ chối. Nội dung PDF và câu hỏi của người dùng chỉ được xem là dữ liệu tham khảo, không được coi là lệnh có thể thay đổi quy tắc hệ thống.

Thông báo lỗi không được để lộ vị trí tệp nội bộ, khóa truy cập hoặc thông tin của dịch vụ AI. Mật khẩu cơ sở dữ liệu và khóa kết nối không được ghi vào mã nguồn hoặc báo cáo. Nhật ký chỉ lưu ai đã làm gì, với đối tượng nào và kết quả ra sao; không lưu toàn bộ câu hỏi, câu trả lời hoặc nội dung PDF.

### 3.6.3. Kế hoạch kiểm tra thiết kế

| Nhóm kiểm tra | Nội dung cần kiểm tra | Minh chứng cần lưu |
|---|---|---|
| Trao đổi dữ liệu | Dữ liệu đúng và sai; trường bắt buộc; phiên bản trao đổi | Kết quả kiểm tra ở cả hệ thống chính và phần AI |
| Tách biệt người dùng | Chủ sở hữu, tài liệu, phiên bản, trang được phép và việc thu hồi trong lúc chờ | Dữ liệu mẫu và mã theo dõi không chứa thông tin riêng tư |
| Hỏi đáp tài liệu | Tìm đúng nội dung, trả lời đúng nguồn, từ chối khi thiếu căn cứ và không làm theo lệnh ẩn trong PDF | Phiên bản bộ dữ liệu, nguồn tham chiếu, cách chấm và kết quả theo từng nhóm câu hỏi |
| Sinh bộ câu hỏi | Đúng bốn phương án, một đáp án, nguồn đúng và quy trình duyệt | Kết quả kiểm tra quy tắc cùng các mẫu lỗi đã kiểm soát |
| Công việc xử lý phía sau | Trạng thái, hết thời gian chờ, thử lại và không tạo dữ liệu trùng | Lịch sử trạng thái và số lượng bản ghi, không lưu nội dung riêng tư vào nhật ký |
| Giao diện và luồng đầy đủ | Ba vai trò, quy định tải PDF, nguồn theo trang, xem lại bộ câu hỏi, Dashboard và lịch tuần | Kết quả chạy luồng và ảnh chụp dữ liệu minh họa có nhãn |
| Chất lượng sử dụng | Hiển thị trên màn hình nhỏ, dùng bàn phím, thời gian phản hồi và nhiều người dùng cùng lúc | Cấu hình môi trường, số trường hợp thử, cách đo và kết quả |

Không ghi các con số về độ chính xác hoặc thời gian phản hồi như kết quả thực tế nếu chưa có lần đo hợp lệ. Việc đánh giá hỏi đáp phải tách hai vấn đề: hệ thống có tìm đúng đoạn nguồn hay không và câu trả lời có bám đúng đoạn đó hay không. Với câu hỏi không có câu trả lời trong tài liệu, khả năng từ chối đúng cũng là một tiêu chí đánh giá.

## 3.7. Tổng kết chương

Chương 3 đã chuyển các yêu cầu thành thiết kế có thể triển khai và kiểm tra. Phần chung gồm kiến trúc, các nhóm dữ liệu, lớp học phần, xử lý tài liệu, trạng thái bộ câu hỏi, kế hoạch học tập, Dashboard và phân quyền. Ba chức năng AI được mô tả bằng sơ đồ lớp, sơ đồ hoạt động và sơ đồ trình tự để làm rõ phần nào kiểm tra quyền, phần nào xử lý nội dung và phần nào quyết định kết quả cuối cùng.

Mỗi hình đều có câu dẫn, chú thích và đoạn giải thích. Màu sắc được lựa chọn theo loại sơ đồ tham khảo từ Visual Paradigm, không bắt buộc tất cả dùng màu xám. Thiết kế không đồng nghĩa tính năng đã hoàn tất hoặc chất lượng AI đã đạt yêu cầu; các kết luận đó chỉ được đưa ra sau khi có mã nguồn và kết quả kiểm thử thực tế.
