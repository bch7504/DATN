# StudyFlow — UI Design: toàn bộ khung giao diện

**Baseline:** UI-2026-10-06. **Phạm vi:** Auth, Student, Teacher, Admin, modal/drawer, responsive và trạng thái lỗi.
Tài liệu này thay thế `ai-ui-redesign-brief.md`, không chỉ mô tả các màn AI.

## 1. Cách sử dụng và quản lý thay đổi

Đây là bản chốt bố cục/điều hướng để đối chiếu trước khi sửa FE. Không phải bằng chứng mọi chức năng đã tích hợp production. Nghiệp vụ theo [specification.md](specification.md) và [AGENTS.md](../AGENTS.md); API theo [api-plan.md](api-plan.md); tiến độ triển khai theo [frontend-implementation-plan.md](frontend-implementation-plan.md).

- **UI:** đã có màn hoặc thành phần tương ứng trong Next.js; có thể đang dùng fixture.
- **TK:** khung mục tiêu đã mô tả để triển khai; chưa khẳng định có tương tác/API hoàn chỉnh.
- **Phụ:** panel/modal/trạng thái bên trong route cha, không tạo thêm menu.
- Các khung là wireframe chức năng, không quy định số liệu demo hoặc kích thước pixel tuyệt đối.
- Giữ ID màn ổn định. Khi thay đổi: sửa khung + nút/đích đến + trạng thái + bản ghi ở mục 12 trong cùng task.
- Không tự tách/gộp menu, đổi tên chức năng hoặc redirect sang chức năng khác. Nếu nghiệp vụ thay đổi, cập nhật cả plan/API/spec liên quan; không chỉ sửa một hình.
- Mock HTML là tham khảo bố cục; quy tắc PDF-only, Teacher Quiz và luồng mới trong tài liệu này thay thế các phần mock cũ còn dùng PPTX/chat riêng.
- Mọi ảnh chèn vào báo cáo phải kèm chú thích và đoạn giải thích vai trò của ảnh; không để ảnh đứng một mình.

## 2. Khung chung — G01/G02 (UI)

G01 desktop: sidebar có thể thu/mở; nội dung không bị che khi thu sidebar. Không thêm menu riêng cho progress hoặc trợ lý tài liệu.

```text
┌──────────────────┬─────────────────────────────────────────────────┐
│ Logo PTIT tròn    │ Breadcrumb / tên khu vực       Tài khoản • Role │
│ StudyFlow [Thu]   ├─────────────────────────────────────────────────┤
│                  │ [Dữ liệu demo — chỉ khi bật demo mode]           │
│ Menu theo role   │ Tiêu đề trang                  [CTA chính đỏ]   │
│                  │ Mô tả ngắn / thông báo                           │
│ Mục đang chọn    ├─────────────────────────────────────────────────┤
│                  │                                                 │
│                  │        NỘI DUNG MÀN HÌNH (các khung bên dưới)     │
│                  │                                                 │
│ [Đăng xuất]      │                                                 │
└──────────────────┴─────────────────────────────────────────────────┘
```

G02 mobile: menu là drawer; khung đọc và form chuyển thành một cột.

```text
┌────────────────────────────────────┐
│ [☰] Logo / StudyFlow     Tài khoản │
├────────────────────────────────────┤
│ Tiêu đề                            │
│ [CTA chính]                        │
│ Nội dung theo một cột               │
│ Bảng/lịch cuộn trong khung riêng    │
└────────────────────────────────────┘
```

### 2.1 Menu theo role

| Student | Teacher | Admin |
|---|---|---|
| Tổng quan | Tổng quan | Tổng quan hệ thống |
| Lớp học phần | Lớp học phần của tôi | Người dùng & Vai trò |
| Tài liệu cá nhân | Yêu cầu tham gia | Môn học & Học kỳ |
| Kế hoạch & Lịch | Kho học liệu PDF | Feedback & Reports |
| Ôn tập | AI Quiz Studio | Logs & Audit |
| — | — | Cấu hình |

Admin có route giám sát lớp từ khu vực Tổng quan, không phải Teacher assignment. Trang tạo Quiz của Student đi từ Ôn tập, không thêm menu chatbot/Quiz thứ hai.

### 2.2 Style chung

- Logo PTIT đúng tỷ lệ trong viền tròn; không kéo méo hoặc tự đổi màu asset.
- Primary `#D71920`, dark `#A80F18`, soft `#FFF1F2`, accent `#F4C300`.
- Background `#F8FAFC`, surface trắng, text `#172033`, secondary `#64748B`, border `#E5E7EB`.
- Manrope cho tiêu đề/số liệu; Be Vietnam Pro cho nội dung. Trang Kế hoạch & Lịch dùng cùng thang chữ với các trang khác.
- CTA chính ở góc/header và nút xác nhận chính dùng nền đỏ/chữ trắng; không tô đỏ mọi tab, checkbox, nút hủy hay control phụ.
- Không dùng hiệu ứng hover đổi kích thước/dịch chuyển; action không được chỉ hiện khi hover. Giữ focus visible và trạng thái disabled.
- Mục tiêu responsive từ 360px, touch target khoảng 44px, WCAG AA. Đây là tiêu chí cần kiểm thử, không tuyên bố đã chứng nhận.

## 3. Xác thực

### A01 — Đăng nhập (UI) — `/login`

```text
┌──────────────────────────────────────────────┐
│               Logo PTIT tròn                 │
│            Đăng nhập StudyFlow               │
│ Email       [............................]   │
│ Mật khẩu    [............................]   │
│ [Thông báo validation / sai thông tin]       │
│                 [Đăng nhập]                  │
│ Chưa có tài khoản? [Đăng ký sinh viên]        │
│ [Chọn role demo — chỉ trong demo mode]        │
└──────────────────────────────────────────────┘
```

Đăng nhập qua Java; role xác định điểm đến. Không cho người dùng tự nâng quyền bằng lựa chọn role production.

### A02 — Đăng ký Student (UI) — `/register`

```text
┌──────────────────────────────────────────────┐
│          Đăng ký tài khoản Sinh viên          │
│ Họ và tên          [.....................]   │
│ Email              [.....................]   │
│ Mật khẩu           [.....................]   │
│ Xác nhận mật khẩu  [.....................]   │
│ [Lỗi theo trường / lỗi từ Java]              │
│                  [Đăng ký]                   │
│ Đã có tài khoản? [Đăng nhập]                  │
└──────────────────────────────────────────────┘
```

Root `/` là điểm điều hướng theo phiên đăng nhập, không là màn chức năng mới. Không thêm màn quên mật khẩu nếu chưa chốt contract.

## 4. Student

### S01 — Tổng quan (UI) — `/dashboard`

```text
┌──────────────────────────────────────────────────────────────┐
│ Tổng quan                            [Cấu hình Daily Goal]    │
├──────────────────────────────────────────────────────────────┤
│ [Streak hiện tại] [Dài nhất] [Trang đã xem] [Quiz / Task]      │
│ Daily Goal: Trang [actual/target] Quiz [...] Task [...]       │
├──────────────────────────────────────────────────────────────┤
│ Tiến độ các lớp học phần                    [Thu / Mở]       │
│ CSDL · xem trang / tổng trang · % · Quiz · Task               │
│ AI   · xem trang / tổng trang · % · Quiz · Task               │
├──────────────────────────────┬───────────────────────────────┤
│ Lịch / việc sắp tới           │ Thống kê và hoạt động học     │
│ [Mở Kế hoạch & Lịch]          │ Dữ liệu do Java tính          │
└──────────────────────────────┴───────────────────────────────┘
```

Dashboard chứa cả tiến độ tổng quan lẫn từng Course Offering; không đẩy chi tiết sang route Progress. Thu/mở chỉ đổi hiển thị, không xóa số liệu.

S01a — Daily Goal (Phụ, UI):

```text
┌──────────────────────────────────────────┐
│ Mục tiêu mỗi ngày                    [×] │
│ Số trang cần xem   [......]              │
│ Số câu Quiz        [......]              │
│ Số task            [......]              │
│ [Lỗi validation]        [Hủy] [Lưu]       │
└──────────────────────────────────────────┘
```

Chỉ gửi target; Java tính actual và Streak. Không có XP, badge hay leaderboard.

### S02 — Lớp học phần và chi tiết trong trang (UI) — `/course-offerings`

```text
┌──────────────────────────────────────────────────────────────┐
│ Lớp học phần                [Nhập mã tham gia] [Tham gia]     │
│ [Đã tham gia] [Chờ duyệt] [Lưu trữ]                           │
├──────────────────────────────────────────────────────────────┤
│ Card lớp: tên · mã · học kỳ · giảng viên · trạng thái         │
│ [Mở lớp / xem học liệu]                                      │
├──────────────────────────────────────────────────────────────┤
│ Chi tiết lớp được chọn                         [Quay lại]    │
│ Thông tin lớp · danh sách PDF đã công bố                      │
│ [Tên PDF] [Số trang] [Trạng thái]              [Xem tài liệu] │
└──────────────────────────────────────────────────────────────┘
```

Join code tạo enrollment PENDING; chỉ APPROVED mở học liệu. PENDING/REJECTED không có Tutor. Lớp chi tiết phục vụ học liệu, không phải màn tiến độ.

### S03 — Học liệu PDF (UI) — `/materials`

```text
┌──────────────────────────────────────────────────────────────┐
│ Học liệu PDF                                                 │
│ [Tìm tài liệu........] [Lớp học phần ▾]                       │
├──────────────────────────────────────────────────────────────┤
│ PDF đã công bố · tên lớp · số trang · READY                  │
│ [Mở PDF]                                                     │
│ PDF tiếp theo ...                                            │
└──────────────────────────────────────────────────────────────┘
```

Route hỗ trợ truy cập học liệu; không tạo một nguồn tài liệu dùng chung ngoài quyền enrollment.

### S04 — PDF Viewer + Note/Tutor (UI) — `/materials/{documentId}/viewer`

```text
┌───────────────────────────────────────────────────────────────────┐
│ [← Học liệu] Tên PDF          Trang n/N       [Trước] [Sau]       │
├─────────────┬───────────────────────────┬─────────────────────────┤
│ Danh sách   │                           │ [AI Tutor] [Ghi chú]    │
│ trang       │         TRANG PDF         │ Phạm vi: PDF / trang n  │
│ 1           │                           │ Câu hỏi / câu trả lời   │
│ 2           │                           │ [Citation Trang n]      │
│ ...         │                           │ [Nhập câu hỏi] [Gửi]    │
└─────────────┴───────────────────────────┴─────────────────────────┘
```

S04a — tab Ghi chú (Phụ, UI): thay nội dung panel phải bằng tiêu đề “Ghi chú cá nhân · Trang n”, textarea, trạng thái lưu và nút **Lưu ghi chú**. Tutor không biến thành Personal Assistant; Teacher không có panel này. Production cần artifact PDF thực, không coi trang fixture là trình render PDF hoàn chỉnh.

### S05 — Kho tài liệu cá nhân (UI) — `/personal-documents`

```text
┌──────────────────────────────────────────────────────────────┐
│ Kho Tài liệu Cá nhân           [Hỏi đáp tài liệu cá nhân]     │
│ Quyền riêng tư: chỉ owner; PDF có text layer                  │
├──────────────────────────────────────────────────────────────┤
│                 Tải lên tài liệu PDF cá nhân                 │
│                 [Chọn tệp PDF từ máy]                        │
├──────────────────────────────┬───────────────────────────────┤
│ Tên PDF · số trang · dung lượng│ Tên PDF ...                  │
│ READY / PROCESSING / FAILED   │ Trạng thái                    │
│ Ngày tải                 [Xóa]│                          [Xóa]│
└──────────────────────────────┴───────────────────────────────┘
```

**Mặc định chỉ có kho, không có chatbot bên dưới.** Bấm nút ở header mới chuyển sang S06, vẫn thuộc Tài liệu cá nhân. Upload 20 MB theo UI hiện tại; không quảng cáo kéo/thả nếu chưa có xử lý drop. Chỉ READY được chọn cho AI.

S05a — xác nhận xóa (Phụ, UI; hiện có thể dùng confirm của trình duyệt):

```text
┌──────────────────────────────────────────┐
│ Xóa tài liệu cá nhân?                    │
│ Tên PDF và cảnh báo mất nguồn khả dụng    │
│                         [Hủy] [Xóa]      │
└──────────────────────────────────────────┘
```

### S06 — Hỏi đáp trong Tài liệu cá nhân (UI)

Vị trí: `/personal-documents#personal-ai-assistant`. Không là sidebar item, không là route Assistant mới.

```text
┌──────────────────────────────────────────────────────────────┐
│ Hỏi đáp, tóm tắt & tạo Quiz        [Quay lại kho tài liệu]    │
├───────────────────────────────────────┬──────────────────────┤
│ [Phiên mới] [Phiên 1] [Phiên 2] ...    │ Chọn Personal PDF    │
├───────────────────────────────────────┤ [Tìm tài liệu...]    │
│ Câu hỏi của Student                   │ [Chọn / bỏ chọn]     │
│ Câu trả lời / bản tóm tắt             │ [✓] PDF A · READY    │
│ [Hỏi đáp / Tóm tắt / Tạo Quiz]        │ [ ] PDF B · READY    │
│ [PDF A · Trang 3]                     │ [ ] PDF C · xử lý    │
│                                      │ Đã chọn n/10 nguồn   │
│ [Nhập yêu cầu tự nhiên..........]     │                      │
│                               [Gửi]  │ [Về kho để tải PDF]  │
└───────────────────────────────────────┴──────────────────────┘
```

- Một composer cho hỏi đáp, tóm tắt và tạo Quiz bằng prompt, vẫn giữ đủ ba khả năng.
- 1–10 PDF READY thuộc owner. Khi đổi nguồn, yêu cầu mới dùng scope mới; không âm thầm gửi theo nguồn phiên cũ.
- Phiên mới/chuyển phiên tải lịch sử từ Java. Nội dung chưa gửi không được coi là đã lưu.
- Nút quay lại khôi phục S05; mở lại tải dữ liệu phiên đã lưu. `/chat` cũ redirect tới S06.
- Mobile: hai khối xếp một cột, không ép desktop width. Bản drawer chọn nguồn mobile là cải tiến TK nếu chưa triển khai.

S06a — kết quả AI (Phụ, UI; semantics production phụ thuộc Java/Python):

```text
┌──────────────────────────────────────────────────┐
│ ASK_DOCUMENT / SUMMARIZE_DOCUMENT                │
│ Nội dung có căn cứ / các ý tóm tắt                │
│ [Tên PDF · Trang n] [Tên PDF · Trang m]           │
├──────────────────────────────────────────────────┤
│ NEEDS_CLARIFICATION                              │
│ Cần thêm số câu / phạm vi? Trả lời ở composer.    │
├──────────────────────────────────────────────────┤
│ CREATE_QUIZ · REVIEW_REQUIRED                    │
│ Thông tin Quiz nháp            [Mở khu vực Ôn tập]│
├──────────────────────────────────────────────────┤
│ NO_EVIDENCE                                      │
│ Chưa đủ bằng chứng. Chọn nguồn/đổi câu hỏi.       │
└──────────────────────────────────────────────────┘
```

Các ô trên là các dạng kết quả thay thế nhau, không bắt buộc xuất hiện đồng thời. Không làm Quiz ngay trong bubble. Việc gắn đúng draft từ chat sang màn duyệt cần API lưu draft; không coi thẻ demo là Quiz đã được lưu thật.

### S07 — Ôn tập tầng 1 (UI) — `/review`

```text
┌──────────────────────────────────────────────────────────────┐
│ Ôn tập                    [Sinh đề thi trắc nghiệm AI]       │
│ Chọn lớp hoặc Quiz cá nhân                                   │
├──────────────────────────────┬───────────────────────────────┤
│ Lớp CSDL · số Quiz · điểm TB  │ Quiz cá nhân · số Quiz       │
│ Số nội dung cần ôn lại        │ Nội dung cần ôn lại           │
│ [Mở ôn tập]                  │ [Mở ôn tập cá nhân]          │
└──────────────────────────────┴───────────────────────────────┘
```

CTA sinh đề mở **S09 form riêng**, không redirect S06. Không đưa viewing progress lên màn này.

### S08 — Workspace ôn tập tầng 2 (UI) — `/review/{courseId}`

`/review/PERSONAL` là workspace Quiz cá nhân.

```text
┌──────────────────────────────────────────────────────────────┐
│ [← Ôn tập] Tên lớp / Cá nhân               [Sinh đề AI]      │
│ [Quiz] [Nội dung cần ôn lại]                                  │
├──────────────────────────────┬───────────────────────────────┤
│ Danh sách Quiz READY          │ Chi tiết Quiz đã chọn         │
│ Tên · số câu                 │ Danh sách câu hỏi / làm bài   │
│ [Chọn Quiz]                  │ [Bắt đầu / Nộp bài]           │
├──────────────────────────────┴───────────────────────────────┤
│ Lịch sử attempt · số lượt · điểm · thời gian · xem kết quả   │
└──────────────────────────────────────────────────────────────┘
```

S08a — làm bài/kết quả (Phụ, UI):

```text
┌──────────────────────────────────────────────┐
│ Lượt làm Quiz — câu n / N                    │
│ Câu hỏi                                      │
│ ( ) A ...  ( ) B ...  ( ) C ...  ( ) D ...   │
│ [Thông báo câu chưa trả lời]      [Nộp bài]  │
├──────────────────────────────────────────────┤
│ Kết quả từ Java: điểm / tổng                 │
│ Đáp án chọn · đáp án đúng · giải thích        │
│ [Citation] [Làm lượt mới] [Lịch sử]           │
└──────────────────────────────────────────────┘
```

Trước khi submit không lộ đáp án. Mỗi lần làm tạo attempt mới; production Java chấm điểm.

S08b — tab Nội dung cần ôn lại và chi tiết attempt (Phụ, UI):

```text
┌──────────────────────────────────────────────┐
│ Nội dung cần ôn lại                           │
│ Câu sai · số lần sai · Quiz nguồn             │
│ Giải thích · [PDF / trang nguồn]              │
├──────────────────────────────────────────────┤
│ Chi tiết lượt làm                         [×]│
│ Thời gian · điểm · đáp án theo từng câu       │
│ [Đóng]                                       │
└──────────────────────────────────────────────┘
```

Tổng hợp từ câu trả lời sai, không AI suy đoán yếu/mạnh hoặc Topic Mastery.

### S09 — Form sinh đề AI riêng (UI) — `/quiz/create`

```text
┌──────────────────────────────────────────────────────────────┐
│ [← Ôn tập] Sinh đề thi trắc nghiệm AI                         │
├──────────────────────────────────┬───────────────────────────┤
│ Định hướng câu hỏi                │ Chọn PDF nguồn (1–10)     │
│ [Prompt: số câu, độ khó, chủ đề]   │ [Tìm kiếm...]             │
│ [.............................]  │ [ ] PDF A · READY         │
│ Gợi ý prompt                     │ [ ] PDF B · READY         │
│ MCQ_SINGLE · 4 lựa chọn · 1 đúng  │ [Tải thêm tài liệu]       │
│                 [Sinh đề AI]     │                           │
└──────────────────────────────────┴───────────────────────────┘
```

Form gửi Java trực tiếp, không tạo conversation. Student tự mô tả yêu cầu trong prompt; không áp dụng giới hạn/form số câu của Teacher một cách ngầm định. Prompt không thay rule, scope hoặc citation.

S09a — đang tạo / bản nháp (Phụ, UI):

```text
┌──────────────────────────────────────────────────────────────┐
│ GENERATING                       [Cập nhật trạng thái]       │
│ Giữ ID yêu cầu; không bấm tạo thêm chỉ để kiểm tra kết quả    │
├──────────────────────────────────────────────────────────────┤
│ REVIEW_REQUIRED        [Tạo lại toàn bộ] [Chấp nhận đề thi]  │
│ Câu 1: nội dung                                              │
│ A ...   B ...   C ...   D ...                                │
│ Đáp án đúng · giải thích · PDF / trang nguồn                  │
│ Câu 2 ...                                                    │
└──────────────────────────────────────────────────────────────┘
```

Hai trạng thái hiển thị lần lượt. UI hiện hỗ trợ kiểm tra trạng thái bằng nút; polling tự động là việc tích hợp sau, không ghi là đã làm. Tạo lại là Quiz mới. Lỗi sinh cho phép sửa yêu cầu.

S09b — chấp nhận/chọn nơi lưu (Phụ, UI):

```text
┌──────────────────────────────────────────┐
│ Chấp nhận đề thi                     [×] │
│ ( ) Quiz cá nhân                        │
│ ( ) Lớp học phần đã được duyệt          │
│     [Chọn lớp APPROVED.............▾]   │
│                 [Hủy] [Xác nhận lưu]   │
└──────────────────────────────────────────┘
```

Nguồn sinh và nơi ôn là hai khái niệm độc lập. Java revalidate enrollment khi accept. Từ chối bản nháp là hành động mục tiêu TK theo contract, không đồng nhất với việc đóng form.

### S10 — Kế hoạch & Lịch (UI) — `/plan`

```text
┌──────────────────────────────────────────────────────────────────┐
│ Kế hoạch & Lịch ôn tập       [+ Thêm task] [+ Thêm lịch học]     │
│ Sinh viên chủ động lập kế hoạch; không AI recommendation         │
├──────────────────────────────────────────────────────────────────┤
│ Tuần: dd–dd/mm/yyyy               [← Trước] [Tuần này] [Sau →]  │
├──────────┬───────┬───────┬───────┬───────┬───────┬──────┬───────┤
│Khung giờ │ Thứ 2 │ Thứ 3 │ Thứ 4 │ Thứ 5 │ Thứ 6 │Thứ 7 │ CN    │
├──────────┼───────┼───────┼───────┼───────┼───────┼──────┼───────┤
│07–09     │       │       │PDF    │       │       │      │       │
│09–11     │       │Tự học │       │       │       │      │       │
│...       │       │       │       │Quiz   │       │      │       │
├──────────┴───────┴───────┴───────┴───────┴───────┴──────┴───────┤
│ Task ôn tập: [ ] Nội dung · deadline · lớp        [Hoàn tất/Xóa]│
└──────────────────────────────────────────────────────────────────┘
```

Giữ lịch tuần theo FE mock; click ô trống mở form với ngày/khung giờ đã điền. Mobile cuộn ngang bên trong lịch, không làm cả trang tràn chiều ngang.

S10a — thêm lịch (Phụ, UI), S10b — thêm task (Phụ, khung chuẩn TK nếu hiện dùng prompt):

```text
┌────────────────────────────┬───────────────────────────────┐
│ Thêm lịch học          [×] │ Thêm task ôn tập          [×] │
│ Ngày [▾]  Khung giờ [▾]    │ Tên task [................]   │
│ Bài giảng / Tự học / Quiz  │ Deadline [...............]   │
│ Nội dung [..............]  │ Lớp / ngữ cảnh [.........]   │
│ Ghi chú phụ [...........]  │                               │
│ [Hủy] [Lưu vào lịch]       │ [Hủy] [Thêm task]            │
└────────────────────────────┴───────────────────────────────┘
```

Đây là hai form riêng, không phải một modal hai cột. Chưa có contract cho trường nào thì không giả vờ lưu production.

## 5. Teacher

### T01 — Tổng quan (UI) — `/teacher/dashboard`

```text
┌──────────────────────────────────────────────────────────────┐
│ Tổng quan giảng viên                                         │
│ [Lớp sở hữu] [SV] [Yêu cầu chờ] [Học liệu]                   │
├────────────────────────────────┬─────────────────────────────┤
│ Lớp học phần của tôi            │ Yêu cầu tham gia chờ duyệt  │
│ Tên lớp / học kỳ / trạng thái   │ [Mở danh sách yêu cầu]      │
│ [Quản lý lớp]                   │                             │
└────────────────────────────────┴─────────────────────────────┘
```

Không hiển thị Personal Chatbot, AI Tutor hoặc tài liệu cá nhân của Student.

### T02 — Lớp học phần của tôi (UI) — `/teacher/course-offerings`

```text
┌──────────────────────────────────────────────────────────────┐
│ Lớp học phần của tôi                         [+ Tạo lớp]     │
│ Môn / Học kỳ / trạng thái                                    │
├──────────────────────────────────────────────────────────────┤
│ Tên lớp · mã lớp · số SV được duyệt / chờ                     │
│ Join code [XXXXXX]  [Sao chép] [Đổi mã] [Bật/Tắt mã]         │
│ [Yêu cầu tham gia] [Học liệu]                                │
└──────────────────────────────────────────────────────────────┘
```

T02a — tạo lớp (Phụ, UI):

```text
┌──────────────────────────────────────────┐
│ Tạo lớp học phần                     [×] │
│ Môn học [..........................▾]   │
│ Học kỳ  [..........................▾]   │
│ Mã / tên lớp (nếu hỗ trợ) [..........]   │
│                         [Hủy] [Tạo]     │
└──────────────────────────────────────────┘
```

Teacher tự tạo từ danh mục hợp lệ; Java sinh join code. Không có Admin phân công Teacher cho từng lớp.

### T03 — Yêu cầu tham gia (UI) — `/teacher/enrollments`

```text
┌──────────────────────────────────────────────────────────────┐
│ Yêu cầu tham gia                       [Lọc lớp........▾]   │
│ [Chờ duyệt] [Đã duyệt]                                      │
├──────────────────────────────────────────────────────────────┤
│ Student · email · lớp · thời gian yêu cầu                    │
│                                        [Từ chối] [Duyệt]    │
│ Đã duyệt: Student · lớp · ngày duyệt                         │
└──────────────────────────────────────────────────────────────┘
```

T03a — từ chối (Phụ): xác nhận người/lớp, lý do nếu contract hỗ trợ, **Hủy/Từ chối**. Teacher chỉ xử lý enrollment lớp mình sở hữu.

### T04 — Kho học liệu PDF (UI) — `/teacher/documents`

```text
┌──────────────────────────────────────────────────────────────┐
│ Kho học liệu PDF                           [+ Tải PDF]      │
│ [Tìm tài liệu...] [Trạng thái / bộ lọc]                      │
├──────────────────────────────────────────────────────────────┤
│ Tên PDF · số trang · processing · các lớp đã công bố         │
│ [Công bố] [Thu hồi nếu đã công bố] [Tạo Quiz bằng AI]        │
└──────────────────────────────────────────────────────────────┘
```

Nút **Tạo Quiz** mở T05 với PDF nguồn đã chọn. Không mở chatbot/Tutor.

T04a/T04b — tải PDF và công bố (Phụ, UI):

```text
┌─────────────────────────────┬────────────────────────────────┐
│ Tải Course Material PDF [×] │ Công bố học liệu           [×] │
│ Tên tài liệu [...........]  │ Tên PDF · READY                │
│ [Chọn file .pdf]            │ [ ] Lớp sở hữu A               │
│ PDF có text layer           │ [ ] Lớp sở hữu B               │
│ [Hủy] [Tải lên]             │ [Hủy] [Công bố]                │
└─────────────────────────────┴────────────────────────────────┘
```

Hai modal riêng. PROCESSING/FAILED không được coi là nguồn sẵn sàng. Thu hồi phải cập nhật quyền Student, không chỉ ẩn card FE.

### T05 — AI Quiz Studio (UI form; review/publish TK) — `/teacher/quizzes/create`

```text
┌──────────────────────────────────────────────────────────────┐
│ Tạo Quiz sau buổi học                                        │
├───────────────────────────────────┬──────────────────────────┤
│ 1. Chọn một PDF READY [........▾] │ Nguồn đã chọn            │
│ 2. Cấu hình                       │ Tên PDF · khoảng trang   │
│ Số câu [15]     Độ khó [......▾] │ Số câu · MCQ_SINGLE      │
│ Từ trang [..]   Đến trang [..]   │ 4 lựa chọn / 1 đúng      │
│ Chủ đề [......................]  │ Phải có citation          │
│ Yêu cầu bổ sung [.............]  │ Teacher duyệt trước       │
│ [Tạo bản nháp MCQ_SINGLE]         │ khi công bố               │
└───────────────────────────────────┴──────────────────────────┘
```

Teacher tự chọn số câu, không cố định 15; UI hiện 5–30 theo plan/contract. Một PDF READY, trang hợp lệ, lớp đích thuộc Teacher. Form hiện có fixture; chưa coi nút “Mở màn duyệt (demo)” là workflow hoàn tất.

T05a/T05b — review và publish (Phụ, TK; chưa tạo route mới ngầm định):

```text
┌──────────────────────────────────────────────────────────────┐
│ REVIEW_REQUIRED      Quiz sau buổi học                        │
│ Câu n [Nội dung........................................]    │
│ A [....] B [....] C [....] D [....] Đáp án đúng [▾]           │
│ Giải thích [...] [PDF · Trang n / Evidence]                  │
│ [Lưu sửa bản nháp]                       [Tiếp tục công bố]  │
├──────────────────────────────────────────────────────────────┤
│ Xác nhận công bố: tên Quiz · lớp sở hữu · số câu hợp lệ      │
│                                      [Hủy] [Công bố Quiz]    │
└──────────────────────────────────────────────────────────────┘
```

Không tự thêm “tạo lại một câu”, tải đề hay đặt giờ mở/đóng nếu contract chưa có. Java quyết định lifecycle; AI không publish.

## 6. Admin

### D01 — Tổng quan hệ thống (UI) — `/admin/dashboard`

```text
┌──────────────────────────────────────────────────────────────┐
│ Tổng quan hệ thống                                           │
│ [Users] [Lớp] [Tài liệu] [Trạng thái vận hành]                │
├──────────────────────────────┬───────────────────────────────┤
│ Thông tin / cảnh báo hệ thống│ Danh mục và khu vực quản trị │
│ Metadata, không nội dung riêng│ [Giám sát lớp học phần]     │
└──────────────────────────────┴───────────────────────────────┘
```

### D02 — Người dùng & Vai trò (UI khung/demo) — `/admin/users`

```text
┌──────────────────────────────────────────────────────────────┐
│ Quản lý người dùng                        [+ Thêm tài khoản]│
│ [Tìm kiếm...................]                              │
├────────────────┬─────────────────┬────────────┬──────────────┤
│ Họ tên         │ Email           │ Vai trò    │ Trạng thái  │
│ ...            │ ...             │ STUDENT    │ Hoạt động   │
└────────────────┴─────────────────┴────────────┴──────────────┘
```

D02a — thêm/sửa tài khoản (Phụ, TK): họ tên, email, role, trạng thái, thông báo validate, **Hủy/Lưu**. Các thao tác role/lock phải qua Java; button placeholder không chứng minh đã có API quản trị.

### D03 — Môn học & Học kỳ (UI khung/demo) — `/admin/catalog`

```text
┌──────────────────────────────────────────────────────────────┐
│ Môn học và học kỳ                         [+ Thêm danh mục] │
│ [Tìm kiếm...................]                              │
├──────────────┬────────────────────┬───────────┬──────────────┤
│ Mã           │ Tên                │ Loại      │ Trạng thái  │
│ ...          │ ...                │ Subject   │ ACTIVE      │
│ ...          │ ...                │ Semester  │ ACTIVE      │
└──────────────┴────────────────────┴───────────┴──────────────┘
```

D03a — danh mục (Phụ, TK): chọn Subject/Semester, mã/tên, trường riêng theo contract (tín chỉ hoặc học kỳ cho phép tạo lớp), trạng thái, **Hủy/Lưu**. Không gộp danh mục thành phân công lớp.

### D04 — Giám sát lớp (UI) — `/admin/course-offerings`

```text
┌──────────────────────────────────────────────────────────────┐
│ Giám sát lớp học phần toàn hệ thống                          │
│ [Môn ▾] [Học kỳ ▾] [Trạng thái ▾]                           │
├──────────────────────────────────────────────────────────────┤
│ Mã · Tên lớp · Học kỳ · Teacher · Số SV · Trạng thái          │
│                                         [Khóa] [Lưu trữ]    │
└──────────────────────────────────────────────────────────────┘
```

D04a — xác nhận (Phụ): tên lớp, hành động, tác động, **Hủy/Xác nhận**. Không mở nội dung học tập cá nhân.

### D05 — Feedback & Reports (UI khung/demo) — `/admin/feedback`

```text
┌──────────────────────────────────────────────────────────────┐
│ Phản hồi hệ thống                    [Tìm kiếm...........]  │
├──────────────────────────────────────────────────────────────┤
│ Mã · Loại · Người gửi · Thời gian · Trạng thái               │
│ FB-... · lỗi hiển thị · Student · ... · Mới                  │
└──────────────────────────────────────────────────────────────┘
```

Chi tiết/xử lý phản hồi nếu triển khai phải qua contract riêng; không hiển thị prompt hoặc PDF cá nhân cho Admin chỉ vì có báo lỗi.

### D06 — Logs & Audit (UI khung/demo) — `/admin/audit`

```text
┌──────────────────────────────────────────────────────────────┐
│ Nhật ký hệ thống                     [Tìm kiếm...........]  │
├──────────────────────────────────────────────────────────────┤
│ Thời gian · Tác nhân · Hành động · Đối tượng · Trace ID       │
│ ... · Teacher · APPROVE_ENROLLMENT · enroll_id · req_id      │
└──────────────────────────────────────────────────────────────┘
```

Chỉ audit metadata, không secret/token/raw provider response hoặc nội dung hội thoại.

### D07 — Cấu hình (UI demo) — `/admin/settings`

```text
┌──────────────────────────────────────────────────────────────┐
│ Cài đặt hệ thống                                             │
│ Hiển thị thông báo bảo trì                     [Bật / Tắt]  │
│ Dữ liệu demo — chưa gửi thay đổi tới Java                    │
└──────────────────────────────────────────────────────────────┘
```

Không có model/provider/API-key editor. Những cấu hình bổ sung phải chốt contract trước khi mở UI.

## 7. Các khung dùng chung và trạng thái

### G03 — Evidence/Citation drawer (Phụ, UI cho chat; tái sử dụng TK)

```text
┌──────────────────────────────────────────┐
│ Chi tiết trích dẫn                   [×] │
│ Tên PDF · Trang n                       │
│ Trích đoạn bằng chứng                   │
│ “...................................”   │
│ Hash nếu Java cung cấp                  │
│ [Mở nguồn nếu có quyền và API hỗ trợ]    │
└──────────────────────────────────────────┘
```

Citation luôn `documentId + pageNumber`; không còn “slideNumber”. Không gắn link tải/xem nguồn giả khi chưa có endpoint. Không mặc định cho Admin đọc Personal PDF.

### G04 — modal xác nhận, thông báo và trạng thái màn

```text
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ Xác nhận hành động        [×] │   │ Không có dữ liệu              │
│ Đối tượng / tác động          │   │ Hướng dẫn ngắn                │
│ [Lỗi nếu Java từ chối]        │   │ [Tạo mới / tải PDF / đổi lọc] │
│            [Hủy] [Xác nhận]  │   └───────────────────────────────┘
└───────────────────────────────┘
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ Đang tải / skeleton           │   │ Không thể tải / xử lý         │
│ Giữ kích thước khung          │   │ Thông báo an toàn + requestId │
│ Không hiện số 0 giả dữ liệu   │   │ [Thử lại] [Quay lại]           │
└───────────────────────────────┘   └───────────────────────────────┘
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ Không có quyền truy cập       │   │ Đang xử lý tài liệu / Quiz    │
│ [Về khu vực được phép]        │   │ Trạng thái thực từ Java       │
│ Không lộ dữ liệu phía sau     │   │ [Cập nhật trạng thái]          │
└───────────────────────────────┘   └───────────────────────────────┘
```

Các trạng thái chuẩn trên là yêu cầu cho từng màn, không tuyên bố mọi màn hiện đã đầy đủ. Modal mục tiêu phải có tên truy cập, focus trap, Escape và trả focus về nút mở; không thay confirm native bằng custom modal kém khả năng dùng bàn phím.

| Nhóm | Trạng thái cần đối chiếu |
|---|---|
| Auth | validation, submitting, invalid credentials, expired session |
| Lớp/Enrollment | loading, empty, PENDING, APPROVED, REJECTED, locked, archived, forbidden |
| PDF | uploading, processing, ready, failed, encrypted, text-layer-required, revoked |
| Chat/Tutor | no source, empty, sending, clarification, no evidence, error, scope changed |
| Student Quiz | generating, review required, generation failed, rejected, ready, accepting, attempt/result |
| Teacher Quiz | invalid PDF/range/count, generating, review/edit, publish success/failure |
| Plan | empty week, loading, invalid schedule, saving/error, completed task |
| Admin | loading/empty/error/forbidden và nhãn demo cho thao tác chưa tích hợp |

Không hiển thị các bước “đã retrieval/đã kiểm chứng” nếu API không cung cấp trạng thái thực. Error không làm mất input cần sửa.

## 8. Quy tắc responsive theo khung

| Nhóm khung | Desktop | Mobile 360px trở lên |
|---|---|---|
| G01/G02 | Sidebar thu/mở | Drawer có nút đóng; không che nội dung sau khi chọn |
| S01/T01/D01 | KPI và card nhiều cột | Card xếp dọc |
| S02/S03/S05/T02/T04 | Card/grid, header CTA phải | CTA xuống dòng; tên dài wrap |
| S04 | Trang / PDF / Note-Tutor | Điều khiển trang + PDF; tab panel bên dưới |
| S06 | Chat trái, nguồn phải | Xếp cột; nguồn và composer đều truy cập được |
| S09/T05 | Form trái, nguồn/tóm tắt phải | Form một cột |
| S10 | Lịch tuần 7 ngày | Scroll ngang trong bảng; task bên dưới |
| Tables Admin/Teacher | Table đầy đủ | Scroll trong table, không tràn body |
| Modal/Drawer | Rộng vừa nội dung | max-width theo viewport, scroll nội dung dài |

Đây là chuẩn nghiệm thu; responsive/focus của các khung TK cần test khi triển khai.

## 9. Ma trận điều hướng bắt buộc

| Điểm vào / thao tác | Đích | Không được đổi thành |
|---|---|---|
| Sidebar Tài liệu cá nhân | S05 kho PDF | Tự mở chat khi vào kho |
| S05: Hỏi đáp tài liệu cá nhân | S06 trong cùng khu vực | Menu Assistant mới |
| S06: Quay lại kho tài liệu | S05 | Trang chatbot độc lập |
| Link cũ `/chat` | `/personal-documents#personal-ai-assistant` | Trang độc lập |
| S07/S08: Sinh đề thi trắc nghiệm AI | S09 `/quiz/create` | S06 chatbot |
| S09: tải thêm PDF | S05 | Upload vào Teacher library |
| S06: yêu cầu tạo Quiz qua prompt | Draft + đi duyệt | Làm bài ngay trong bubble |
| S09: accept Quiz | S08 PERSONAL hoặc lớp APPROVED | AI tự accept/publish |
| T04: Tạo Quiz bằng AI | T05 với PDF đã chọn | Student chat hoặc Tutor |
| S02/S03: Xem tài liệu | S04 theo documentId | Bỏ bước kiểm quyền |
| Admin giám sát lớp | D04 | Teacher assignment |
| Progress | S01 | Route Tiến độ riêng |

## 10. Danh mục đối chiếu route ↔ khung ↔ source

Các đường dẫn source tương đối dưới `apps/web/src/app/`. Panel dùng chung có thể nằm trong `components/`.

| Route / khu vực | Khung | Source |
|---|---|---|
| `/` | Điều hướng | `page.tsx` |
| `/login`, `/register` | A01, A02 | `(auth)/login/page.tsx`, `(auth)/register/page.tsx` |
| Shell theo role | G01, G02 | `../components/layout/app-shell.tsx` |
| `/dashboard` | S01, S01a | `(student)/dashboard/page.tsx` |
| `/course-offerings` | S02 | `(student)/course-offerings/page.tsx` |
| `/materials` | S03 | `(student)/materials/page.tsx` |
| `/materials/{documentId}/viewer` | S04, S04a | `(student)/materials/[documentId]/viewer/page.tsx` |
| `/personal-documents` | S05, S05a | `(student)/personal-documents/page.tsx` |
| `#personal-ai-assistant` | S06, S06a, G03 | `../components/personal-documents/personal-document-assistant.tsx` |
| `/chat` | Legacy redirect S06 | `(student)/chat/page.tsx` |
| `/review` | S07 | `(student)/review/page.tsx` |
| `/review/{courseId}` | S08, S08a, S08b | `(student)/review/[courseId]/page.tsx` |
| `/quiz/create` | S09, S09a, S09b | `(student)/quiz/create/page.tsx` |
| `/plan` | S10, S10a, S10b | `(student)/plan/page.tsx` |
| `/teacher/dashboard` | T01 | `teacher/dashboard/page.tsx` |
| `/teacher/course-offerings` | T02, T02a | `teacher/course-offerings/page.tsx` |
| `/teacher/enrollments` | T03, T03a | `teacher/enrollments/page.tsx` |
| `/teacher/documents` | T04, T04a, T04b | `teacher/documents/page.tsx` |
| `/teacher/quizzes/create` | T05 | `teacher/quizzes/create/page.tsx` |
| Teacher review/publish | T05a, T05b (TK) | Chưa có route riêng; chốt tích hợp trước khi thêm |
| `/admin/dashboard` | D01 | `admin/dashboard/page.tsx` |
| `/admin/users` | D02 | `admin/users/page.tsx` |
| `/admin/catalog` | D03 | `admin/catalog/page.tsx` |
| `/admin/course-offerings` | D04 | `admin/course-offerings/page.tsx` |
| `/admin/feedback` | D05 | `admin/feedback/page.tsx` |
| `/admin/audit` | D06 | `admin/audit/page.tsx` |
| `/admin/settings` | D07 | `admin/settings/page.tsx` |

## 11. Ranh giới và việc chưa hoàn tất

- Browser chỉ gọi Java `/api/v1`; không gọi Python, vector DB hoặc model provider trực tiếp.
- Single Orchestrator chỉ phục vụ Personal Assistant Student; không multi-agent. Hỏi đáp, tóm tắt, Quiz phải grounded trên PDF được cấp quyền.
- Course Material và Personal Document chỉ PDF có text layer; không PPTX/DOCX/OCR.
- Teacher chỉ AI Quiz Generator, không Personal Chatbot/AI Tutor.
- Java sở hữu scoring, lifecycle, enrollment, progress, Streak và Daily Goal actual.
- Các màn Admin khung/demo, Teacher review/publish, persist draft từ chat, render artifact PDF và các workflow chưa nối Java phải được triển khai/kiểm thử riêng. Không coi đầy đủ wireframe là đầy đủ code.
- Luồng form Quiz riêng hiện có UI gọi Java và fixture; contract test Java/Python và kiểm thử tích hợp production còn phải hoàn tất.
- Không triển khai thêm API hoặc code cho toàn bộ khung TK chỉ vì đưa chúng vào tài liệu này.

## 12. Nhật ký và checklist cập nhật

| Baseline | Phạm vi | Thay đổi đã chốt |
|---|---|---|
| UI-2026-10-06 | Toàn bộ FE | Đổi tên tài liệu thành `ui-design.md`; tập trung Auth/Student/Teacher/Admin và khung phụ |
| UI-2026-10-06 | S05/S06 | Kho mặc định; bấm Hỏi đáp mới mở AI bên trong; không có menu Assistant |
| UI-2026-10-06 | S07–S09 | Khôi phục form sinh đề riêng; chat tạo Quiz là đường vào tùy chọn khác |
| UI-2026-10-06 | T04/T05 | PDF-only, Teacher Quiz, không Teacher chatbot/Tutor |

Mỗi lần sửa UI phải ghi thêm dòng (ngày, ID khung, cũ → mới, route/contract ảnh hưởng) thay vì xóa lịch sử.

- [ ] Đã xác định ID khung và vai trò bị ảnh hưởng.
- [ ] Đã sửa cả wireframe, nút bấm, đích đến và trạng thái liên quan.
- [ ] Không tạo menu/route ngoài baseline mà chưa được chốt.
- [ ] Đã phân biệt UI thực, fixture và khung TK.
- [ ] Đã đối chiếu API/spec/plan nếu thay đổi dữ liệu hoặc workflow.
- [ ] Đã test điều hướng, quyền, empty/error và desktop/mobile.
- [ ] Đã ghi nhật ký và báo phần chưa hoàn tất.
