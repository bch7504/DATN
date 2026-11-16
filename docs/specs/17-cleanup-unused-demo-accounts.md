# SPEC-17 — Dọn tài khoản cũ và dữ liệu kiểm thử không cần dùng

Ngày thực hiện: 16/11/2026. Trạng thái: **đã dọn dữ liệu trên Supabase và kiểm tra lại runtime đạt**.

## Yêu cầu và kết quả rà soát

Sếp hỏi vì sao V33 đổi 28 tài khoản, sau đó yêu cầu bỏ tài khoản cũ/kiểm thử nếu không cần. Số 28 trong SPEC-16 là các bản ghi Student/Teacher đã có, không phải số tài khoản được tạo mới. Database còn hai Admin, không tính trong số 28 đó.

Rà soát chỉ đọc metadata, số tham chiếu và khóa ngoại; không đọc nội dung PDF, Note, hội thoại hoặc vector. Ngoài 17 tài khoản A–G/A–J theo yêu cầu, có:

- 8 tài khoản E2E cũ: chỉ còn lớp, ghi danh và một ít kế hoạch/sự kiện/thông báo kiểm thử.
- `teacher.studyflow`, `student.studyflow` cũ: chỉ còn refresh session, không giữ học liệu/lịch sử nghiệp vụ.
- `admin.studyflow` cũ: chỉ còn refresh session, không giữ dữ liệu hoặc audit cần thiết; Admin hiện dùng là `admin.local`.
- `student.local@stu.ptit.edu.vn`: còn tài liệu cá nhân, index/chunk, Note, hội thoại Tutor/Personal Assistant, kết quả làm Quiz, bài nộp và ghi danh lớp; tài khoản này vẫn cần để giữ luồng demo hiện tại.

## S17-01 — Phạm vi xóa và bảo vệ dữ liệu

- Xóa đúng 8 E2E và ba StudyFlow cũ ở trên: **11 tài khoản**. Dùng allowlist định danh cụ thể đã rà soát, không xóa theo tiền tố rộng hoặc theo tuổi tài khoản.
- Bảo vệ 7 Teacher A–G, 10 Student A–J, sinh viên Local có dữ liệu và Admin `admin.local`.
- Giữ UUID, email/username, trạng thái và môn phụ trách của toàn bộ tài khoản được bảo vệ.
- Dọn các bản ghi chỉ thuộc tài khoản test: lớp/ghi danh E2E, kế hoạch/mục học/sự kiện/thông báo và refresh token. Không chuyển dữ liệu cá nhân sang tài khoản khác.
- Chỉ xóa mã môn `E2E101` sau khi không còn tham chiếu. Không xóa các môn/lớp thực hoặc tài liệu, Quiz, Note/hội thoại và embedding hiện dùng.

## S17-02 — Thực hiện trên Supabase

Tạm dừng Java writer, dùng một transaction có kiểm tra trước/sau. Từ chối nếu thiếu Admin hiện dùng, thiếu tài khoản cần bảo vệ, có tài khoản ngoài allowlist, có dữ liệu nghiệp vụ ngoài phạm vi test hoặc ghi danh người dùng cần giữ tham chiếu lớp E2E. Các ràng buộc FK luôn bật; lỗi hoặc dữ liệu được bảo vệ thay đổi sẽ rollback toàn bộ.

Transaction đã commit với kết quả:

| Bản ghi | Số đã xóa |
|---|---:|
| Tài khoản | 11 |
| Lớp E2E | 3 |
| Ghi danh E2E | 3 |
| Kế hoạch kiểm thử | 2 |
| Mục kế hoạch | 2 |
| Sự kiện học kiểm thử | 2 |
| Thông báo kiểm thử | 2 |
| Refresh token của tài khoản xóa | 9 |
| Mã môn E2E không còn tham chiếu | 1 |

Thêm 11 audit metadata dưới actor `admin.local`, không ghi mật khẩu, khóa hoặc nội dung học tập. Đã đối chiếu các bảng ngoài phạm vi dọn và toàn bộ số tham chiếu của sinh viên Local trước/sau, kết quả không đổi. Không có thao tác xóa tệp trên Storage hoặc deindex AI.

## Trạng thái tài khoản còn lại

- 7 Teacher: `teacher.a@ptit.edu.vn` đến `teacher.g@ptit.edu.vn`.
- 10 Student mới: `student.a@stu.ptit.edu.vn` đến `student.j@stu.ptit.edu.vn`.
- 1 Student giữ lịch sử demo: `student.local@stu.ptit.edu.vn`.
- 1 Admin: `admin.local`.

Tổng **19 tài khoản**. Không giữ tài khoản E2E hoặc StudyFlow cũ; sinh viên Local được giữ có chủ đích vì dữ liệu đang dùng. Bộ khởi tạo/tự động kiểm thử trên runtime Supabase tiếp tục tắt; kiểm thử tự động dùng database cách ly.

## Kiểm tra và bàn giao

- Transaction báo `COMMITTED`; tổng theo role: Teacher 7, Student 11, Admin 1.
- Backend health `UP`; API Admin trả đúng 19 tài khoản theo allowlist được bảo vệ, không còn tài khoản E2E/StudyFlow cũ.
- Teacher C đăng nhập được, môn vẫn KTS, có chín tài liệu và tải PDF `200`; Student Local đăng nhập và mở slide PNG/Note/history đều `200`; Student A mới đăng nhập bằng email đầy đủ thành công; Web `/login` `200`.
- `git diff --check` đạt. Đây là thay đổi dữ liệu vận hành có kiểm tra trước/sau trong transaction, không sửa source nghiệp vụ nên không chạy lại toàn bộ test suite hoặc provider AI.
- Không đổi public/internal API hoặc mã nghiệp vụ trong lần dọn dữ liệu này.
- Snapshot/database local cũ vẫn được giữ để phục hồi và không đồng bộ ngược từ cloud; kết quả dọn áp dụng cho Supabase đang vận hành. Không chạy lại copy/reset để đồng bộ.
- Git chỉ bàn giao tài liệu kết quả dọn; thao tác xóa đã thực hiện trên Supabase, không tự chạy lại khi người khác pull code.
