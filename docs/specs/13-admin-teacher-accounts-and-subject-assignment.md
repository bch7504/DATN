# SPEC-13 — Admin tạo Giảng viên và phân công môn

Ngày chốt: 14/11/2026. Trạng thái: **đã có mã, build và kiểm thử API đạt; đã cấu hình bảy tài khoản local; còn nghiệm thu trực quan**.

## Mục tiêu và hiện trạng trước thay đổi

Trước lần sửa này, Admin sửa vai trò trên tài khoản có sẵn; Teacher gửi yêu cầu mở môn tự nhập, giao diện còn hiển thị nhiều môn và cho tạo kho theo môn. Dữ liệu local dùng chung một tài khoản Teacher cho bảy lớp.

Lần này bổ sung chức năng **Admin tạo Giảng viên**, mỗi Giảng viên được phân công một môn; sửa luồng mở lớp và kho tài liệu cho phù hợp. Các yêu cầu dưới đây thay quy tắc nhập môn tự do và tạo kho theo môn trước đó. SPEC-12 được giữ làm lịch sử lần triển khai ngày 13/11, không dùng để bỏ qua quyết định mới này.

## Yêu cầu trong lần thực hiện

1. Admin vào Người dùng, bấm **Tạo tài khoản Giảng viên**, nhập họ tên, email, tên đăng nhập, mật khẩu ban đầu và chọn một môn đang hoạt động.
2. Tài khoản mới luôn là Giảng viên và chỉ phụ trách một môn. Bỏ đổi vai trò trong màn sửa tài khoản và chặn đổi role bằng API.
3. Giảng viên chỉ gửi yêu cầu mở các nhóm lớp của môn được phân công; Admin vẫn duyệt trước khi lớp hoạt động.
4. Môi trường local có bảy tài khoản theo bảy môn. Tài khoản Kỹ thuật số hiện có được đổi tên đăng nhập theo cùng quy ước, giữ UUID và tài nguyên đang sở hữu; tạo sáu tài khoản còn lại theo môn.
5. Giao diện Teacher không còn kho chọn theo nhiều môn. Kho tài liệu gồm **Tài liệu tải lên** mặc định và các kho riêng do Teacher đặt tên; chuyển tài liệu giữa các kho vẫn hoạt động. Chuyển các kho SUBJECT cũ thành PRIVATE bằng migration, giữ ID và tham chiếu tài nguyên.
6. Thanh học kỳ của Teacher chỉ hiển thị môn được phân công, không liệt kê bảy môn chung. Màn yêu cầu mở lớp hiện môn cố định và chỉ cho chọn học kỳ, mã/tên nhóm lớp. Màn Admin duyệt lớp không cho đổi sang môn khác.
7. Giao diện Student giữ nguyên; một môn vẫn có thể có nhiều giảng viên, mỗi giảng viên chỉ có một môn.

## Phạm vi và hợp đồng

- Next.js chỉ gọi Java; không thay đổi Python hoặc internal AI API.
- Hợp đồng chi tiết: mục SPEC-13 trong `docs/api-plan.md`.
- Cần migration tiến thêm liên kết một môn vào tài khoản Giảng viên, không sửa migration đã chạy.
- Kiểm tra trùng email/username không phân biệt hoa thường, kể cả trùng chéo email với username; mật khẩu chỉ lưu hash. Audit không chứa mật khẩu.
- Không thay toàn bộ tài khoản cũ bằng tài khoản mới; không xóa học liệu hoặc lịch sử để đổi tên người đăng nhập.
- Với lớp local của các môn khác còn gắn vào tài khoản Kỹ thuật số, chỉ chuyển quyền lớp trống sau khi kiểm tra không có tài liệu/bài tập; nếu có dữ liệu phải báo rõ thay vì tự xóa.

## Các chức năng và luồng giao diện

### S13-01 — Admin tạo tài khoản Giảng viên (F-24)

1. Admin mở **Người dùng** → bấm **Tạo tài khoản Giảng viên**.
2. Trang tạo tài khoản hiển thị họ tên, email, tên đăng nhập, mật khẩu ban đầu và môn phụ trách.
3. Admin chọn đúng một môn đang hoạt động rồi xác nhận.
4. Java kiểm tra quyền Admin, dữ liệu và định danh trùng trước khi lưu tài khoản.
5. Thành công: tài khoản có vai trò Giảng viên, trạng thái hoạt động; danh sách/chi tiết hiển thị môn phụ trách. Xóa mật khẩu khỏi form sau khi tạo, không hiển thị lại từ API.

Luồng thay thế: thiếu thông tin, email sai, mật khẩu không hợp lệ, định danh trùng hoặc môn không hoạt động → hiện lỗi, không tạo tài khoản dở dang. Student/Teacher gọi thẳng API cũng không được tạo tài khoản Giảng viên.

Ràng buộc: họ tên 1–100 ký tự; email tối đa 254 ký tự; username 3–100 ký tự gồm chữ Latin, số, dấu chấm, gạch dưới hoặc gạch ngang. Mật khẩu ít nhất 8 ký tự và tối đa 72 byte UTF-8. Kiểm tra email/username không phân biệt hoa thường, kể cả trùng chéo giữa hai trường. Mật khẩu chỉ lưu dạng băm, không ghi vào audit.

### S13-02 — Quản lý trạng thái, không đổi vai trò (F-24)

Admin mở tài khoản → xem vai trò/môn phụ trách → khóa hoặc mở theo quy tắc hiện có → lưu. Không còn ô chọn vai trò. Gửi `role` bằng request tự sửa cũng bị từ chối. Khóa tài khoản và thu hồi phiên đăng nhập vẫn giữ kiểm tra quyền hiện có.

### S13-03 — Mở nhóm lớp của môn được phân công (F-15, F-26)

1. Teacher mở **Lớp học phần** → **Yêu cầu mở lớp**.
2. Hệ thống lấy môn được phân công từ Java và hiển thị cố định tên/mã/tín chỉ; không có danh sách bảy môn để chọn.
3. Teacher chọn học kỳ, nhập mã và tên nhóm lớp → gửi yêu cầu chờ duyệt.
4. Admin xem yêu cầu, duyệt đúng môn đã phân công hoặc từ chối kèm lý do.
5. Chỉ khi duyệt mới tạo lớp cho Teacher gửi yêu cầu. Teacher tiếp tục quản lý mã tham gia, ghi danh và nội dung lớp như trước.

Luồng thay thế: chưa có môn phụ trách hoặc môn ngừng hoạt động → hiện lỗi và không cho gửi. Thay môn trong request, chọn môn khác lúc duyệt hoặc gọi đường tạo lớp trực tiếp để bỏ qua quy tắc đều bị chặn. Chưa duyệt không tạo lớp hoạt động hoặc mã tham gia.

Một Teacher có thể có nhiều nhóm lớp của cùng môn. Một môn có thể có nhiều Teacher. Bảy môn chỉ là dữ liệu thử local, không phải giới hạn hệ thống.

### S13-04 — Kho mặc định và kho riêng của Teacher (F-17–F-19)

1. Teacher mở **Kho tài liệu**: thấy các thẻ kho, không trải nội dung từng kho ra trang chung.
2. **Tài liệu tải lên** là kho mặc định; tệp tải lên không chọn kho khác tự vào đây.
3. **Tạo kho** chỉ nhập tên kho riêng; không chọn môn và không có loại kho theo môn.
4. Nhấn một kho mới mở bảng tài liệu gồm STT, tên, loại, số trang, trạng thái và thao tác.
5. Giữ tìm kiếm, sửa tên, xóa có xác nhận; chọn nhiều tài liệu để chuyển kho hoặc thêm vào lớp mình phụ trách.

Kho theo môn cũ chuyển thành kho riêng, giữ tên/ID/nội dung. Xóa kho không xóa học liệu gốc; kho mặc định không thể xóa. Chuyển kho không sao chép tệp, không lập chỉ mục lại hoặc đổi công bố. Kho lớp chỉ nhận nội dung từ kho Teacher, không nhận tệp tải trực tiếp. Các bước tải slide và đính kèm giáo trình của SPEC-11/12 giữ nguyên.

Student giữ nguyên kho tài liệu cá nhân và các lớp được phép truy cập. Python, thuật toán RAG, Quiz và internal AI API không đổi trong lần này.

## Tài khoản local theo môn

| Môn | Username thống nhất | Cách xử lý |
|---|---|---|
| Giải tích 2 | `teacher.gt2.local` | Tạo tài khoản local |
| Kinh tế chính trị | `teacher.ktct.local` | Tạo tài khoản local |
| Kỹ thuật số | `teacher.kts.local` | Đổi định danh tài khoản hiện có, giữ UUID/mật khẩu/tài nguyên |
| Tiếng Anh C1 | `teacher.engc1.local` | Tạo tài khoản local |
| Tin học cơ sở 2 | `teacher.thcs2.local` | Tạo tài khoản local |
| Vật lí thí nghiệm 1 | `teacher.vltn1.local` | Tạo tài khoản local |
| Xác suất thống kê | `teacher.xstk.local` | Tạo tài khoản local |

Email local theo mẫu `<username>@studyflow.local`. Bộ nạp chỉ chạy trong profile `local` khi được bật rõ ràng; chạy lại không tạo trùng hoặc đặt lại mật khẩu tài khoản đã tồn tại. Ngày 14/11 đã kiểm tra cả bảy username đăng nhập `204` và API môn phụ trách trả đúng môn tương ứng. Mật khẩu test local được ghi tại [README dự án](../../README.md); không sao chép mật khẩu hay token từ môi trường vào spec.

## Hợp đồng API và lưu trữ

| API | Đầu vào và quyền | Kết quả/lỗi chính |
|---|---|---|
| `POST /api/v1/admin/teachers` | Admin; `{fullName,email,username,password,subjectId}` | `201 User` có môn phụ trách, không có password/hash; `401/403`, `409 ACCOUNT_IDENTIFIER_EXISTS`, `422` khi dữ liệu sai |
| `PATCH /api/v1/admin/users/{id}` | Admin; `{status}` theo quy tắc khóa/mở hiện có | Cập nhật trạng thái; request có `role` trả `422 ROLE_CHANGE_NOT_ALLOWED` |
| `GET /api/v1/teacher/subject` | Teacher; lấy chính tài khoản đang đăng nhập, không nhận user ID từ client | `200 Subject`; `409` nếu chưa được phân công hoặc môn không hoạt động |
| `POST /api/v1/teacher/course-opening-requests` | Teacher; môn phải trùng phân công, học kỳ và nhóm lớp hợp lệ | Yêu cầu `PENDING`; môn khác trả `403 TEACHER_SUBJECT_MISMATCH` |
| `POST /api/v1/teacher/resource-libraries` | Teacher; `{name}` | Tạo kho riêng; gửi `subjectId` trả `422 SUBJECT_LIBRARY_REMOVED` |

API duyệt yêu cầu vẫn thuộc Admin và giữ đường dẫn hiện có trong [API plan](../api-plan.md); kiểm tra môn cả khi gửi lẫn khi duyệt. Dùng envelope lỗi chung, không tự đổi status/lỗi ở Frontend. Next.js chỉ gọi Java.

Migration tiến `V32__assign_one_subject_to_teacher.sql` thêm liên kết môn vào tài khoản Teacher và chuyển loại kho cũ; không sửa V31 hoặc migration đã chạy. Ràng buộc tài khoản ngăn gán môn Teacher cho Student/Admin. Không chuyển hoặc xóa dữ liệu AI/vector trong migration này.

## Điều chỉnh ảnh sequence trong cùng lần làm việc

- Giữ source PUML, ảnh PNG toàn bộ và các XMI chuẩn của ba luồng: Personal RAG, Slide Tutor, Quiz.
- Kiểm tra lời gọi và lời trả về khớp nhau, thanh thực thi tại các điểm nhận và tên phương thức khớp biểu đồ lớp/bước mô tả báo cáo.
- Mỗi ảnh sequence có thêm hai ảnh cắt `-part-1.png` và `-part-2.png` trong `docs/diagrams/chuong-3/` để chèn báo cáo dễ đọc.
- Chỉ cắt ảnh gốc thành hai phần; **không lặp lại tên cột, không thêm thuộc tính hoặc thay đổi nội dung** ở phần hai, theo yêu cầu chốt sau cùng của sếp.
- Điều chỉnh sau khi chèn Google Docs: giãn khoảng cách giữa các bước, không phóng đều cả PNG vì Docs thu vừa chiều ngang sẽ làm mất hiệu quả phóng to. Chiều cao mỗi nửa khóa theo ảnh gốc ban đầu: RAG 7638 px, Tutor 3932 px, Quiz 7622 px. Không tăng mốc này theo ảnh toàn bộ đã đổi font. Chọn điểm cắt cân đối theo chiều cao và không cắt chữ, không chỉ thêm nền trắng để bù chiều cao.
- Chốt mới nhất về cỡ chữ/hình: sửa trực tiếp font trong ba PUML thành 26; render lại cả ảnh toàn bộ và sáu ảnh nửa, dùng biểu tượng đầu cột 1,8 lần và mũi tên đậm hơn. Nhãn dài xuống dòng, giữ đủ tên lớp và nội dung. Hai nửa của mỗi luồng cùng canvas; bỏ lề trắng lớn, chỉ chừa 4 px mỗi phía ở hệ tọa độ render để chống cắt nét. Không thêm/bỏ bước hoặc đổi quan hệ.
- XMI là đầu ra trao đổi mô hình; kiểm tra tự động không thay thế việc mở/import trực tiếp bằng Visual Paradigm.

## Nghiệm thu cần thực hiện

- Admin tạo Teacher thành công; sai email/mật khẩu/môn, trùng định danh bị chặn; Student/Teacher không gọi được API tạo tài khoản.
- Tài khoản vừa tạo đăng nhập được và chỉ có môn được phân công; gửi/duyệt yêu cầu môn khác bị chặn.
- Gửi role vào API sửa tài khoản bị từ chối; khóa/mở tài khoản vẫn tuân theo luật hiện có.
- FE có màn tạo riêng, cột môn phụ trách, trạng thái loading/error và không còn chọn role khi sửa.
- Teacher không có dropdown môn khi tạo kho; API tạo kho gửi subjectId trả `422 SUBJECT_LIBRARY_REMOVED`. Kho cũ không bị xóa tài liệu.
- Kiểm tra bảy tài khoản local và quyền truy cập tài nguyên Kỹ thuật số sau khi đổi tên.

## Kết quả kiểm tra và phần còn lại

| Phần | Kết quả đã ghi nhận trong lần sửa |
|---|---|
| Frontend unit | `npm.cmd test`: 127 test đạt, gồm API client tạo Teacher và chặn sửa role |
| Frontend lint/type | `npm.cmd run lint -- --quiet` và `npm.cmd exec tsc -- --noEmit --incremental false`: đạt |
| Frontend build | `npm.cmd run build -- --webpack`: đạt, có route `/admin/users/new` và các route Teacher liên quan |
| Java unit/MVC | Các nhóm `AdminServiceTest`, `AdminControllerTest`, `TeacherAccountServiceTest`, `OpeningRequestServiceTest`, `CourseOfferingServiceTest`, `TeacherResourceLibraryServiceTest`: đã chạy đạt |
| HTTP/PostgreSQL cách ly | `mvnw.cmd -Dtest=RealHttpApiTest#adminCreatesTeacherAndSubjectCannotBeBypassed test`: đạt. Kiểm tra 401/403 cho tạo Teacher, tạo thành công 201, dữ liệu sai/trùng, đăng nhập 204, đọc đúng môn, chặn đổi role, chặn gửi/duyệt sai môn và duyệt đúng môn |
| Database local | Flyway validate 32 migration và áp dụng V32 thành công. Bảy tài khoản có đúng bảy môn tương ứng, mỗi tài khoản quản lý một lớp hiện có; không còn kho SUBJECT |
| Định danh Kỹ thuật số | Đổi thành `teacher.kts.local`, giữ UUID `969e67c2-d552-4911-8cb1-3df7daa99e80`; không thay mật khẩu/xóa tài nguyên. Chỉ chuyển các lớp khác môn không còn công bố hoạt động và không có bài tập/Quiz |
| Đăng nhập local | Cả bảy tài khoản đăng nhập qua API thật trả 204; `GET /teacher/subject` trả đúng mã GT2, KTCT, KTS, ENG-C1, THCS2, VL-TN1, XSTK |
| Sequence | `node docs/diagrams/validate-diagrams.mjs`: đạt; ba luồng lần lượt có 39, 20, 30 cặp gọi/trả về, khớp class/XMI/bước báo cáo |
| Contract sequence | `node --test docs/diagrams/tests/sequence-contract.test.mjs`: 9 test đạt |
| Kích thước ảnh nửa sequence | Sáu PNG dùng chữ 26/biểu tượng 1,8 lần: mỗi nửa Personal RAG 8528 × 7638 px, Slide Tutor 6486 × 3932 px, Quiz 8292 × 7622 px. Chiều cao giữ mốc ảnh gốc ban đầu; mỗi cặp bằng nhau, nền trắng và sát nội dung. Renderer kiểm font thực tế 26, đủ biểu tượng, điểm cắt an toàn và số bước |

Còn kiểm tra trực quan các màn mới, toàn bộ luồng học liệu sau đổi định danh và import trực tiếp bằng Visual Paradigm. Lần chạy local này chỉ kiểm tài khoản/môn/lớp; chưa thay thế nghiệm thu AI với tài liệu thật hoặc E2E giao diện toàn hệ thống.

## Tài liệu cùng cập nhật

- [Danh mục chức năng](00-functional-catalog.md): F-15, F-17, F-18, F-24, F-25, F-26.
- [Xác thực/phân quyền](01-auth-and-access.md): tạo Teacher, chặn đổi role, môn được phân công.
- [Teacher](05-teacher-content.md): mở lớp đúng môn và kho riêng.
- [Admin](06-admin-operations.md): tạo Teacher và duyệt lớp đúng môn.
- [Traceability](08-traceability.md): nối yêu cầu, API và kiểm thử; [API plan](../api-plan.md) ghi contract xuyên FE–Java.
