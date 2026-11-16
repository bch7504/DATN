# SPEC-15 — Kết nối dữ liệu dùng chung với Supabase

Ngày thực hiện: 16/11/2026. Trạng thái: **đã chuyển dữ liệu và kết nối các service local với Supabase; đã kiểm tra API thật, chưa nghiệm thu từ máy thứ hai**.

## Mục tiêu và hiện trạng đầu vào

Triển khai phương án của [SPEC-14](14-supabase-shared-data-plan.md): thành viên dùng chung PostgreSQL, embedding và tệp PDF qua Supabase. Ban đầu `app`/`ai` và tệp nằm trong Docker local; Supabase chưa có bảng ứng dụng. Sếp đã tạo project, bucket private và điền cấu hình riêng; sau lần công cụ bị chặn, sếp đã cấp quyền rõ để sử dụng file này và tiếp tục.

Các tài khoản demo trong dữ liệu nguồn đã được đổi sang Giảng viên A–G (`teacher.a`–`teacher.g`, email tương ứng `@ptit.edu.vn`) và bổ sung Sinh viên A–J (`student.a`–`student.j`, `@stu.ptit.edu.vn`). Kỹ thuật số thuộc `teacher.c`. UUID, mật khẩu và tài nguyên cũ được giữ; sinh viên mới không tự được ghi danh. Hướng dẫn tại [Backend README](../../services/backend/README.md); các tên theo môn trong SPEC-13 là lịch sử trước lần đổi này.

## S15-01 — Cấu hình mẫu và preflight

- Thêm [mẫu Supabase](../../infrastructure/supabase/.env.example), không có secret thật, và dẫn đường từ root `.env.example`.
- Bản riêng `.env.supabase` bị Git bỏ qua, chứa thông tin migration và các runtime settings được tạo sau đó. Không đọc/in secret vào báo cáo; các công cụ chỉ nạp file được truyền rõ bằng `--config`, không nội suy biến môi trường trong giá trị.
- `scripts/supabase_check.py` kiểm tra kết nối PostgreSQL qua session pooler/TLS, metadata schema và bucket bằng signed S3 HEAD. Lỗi chỉ trả loại/mã an toàn.
- Preflight đạt: PostgreSQL 17.12; không có bảng ứng dụng hoặc extension vector trước khi chuyển; bucket tồn tại, private, S3 HEAD `200`.

## S15-02 — Sao chép database, embedding và tệp

1. Dừng Java, AI API và worker ghi dữ liệu; giữ Docker PostgreSQL/S3 và Frontend.
2. Xác nhận local không còn job index chờ/chạy. Local dùng PostgreSQL 17.11 và pgvector trong `public`.
3. Tạo snapshot native custom-format chỉ cho `app` và `ai`, lưu trong thư mục `.runtime` bị Git bỏ qua; không đưa archive vào source control.
4. Sao chép toàn bộ object source sang bucket đích, giữ object key và MIME; đọc lại và so SHA-256 từng tệp, đối chiếu manifest. Không ghi đè object có nội dung khác.
5. Cài extension vector đúng schema `public` để tương thích với dump; tạo role runtime riêng `studyflow_app` và `studyflow_ai` với mật khẩu được sinh riêng.
6. Restore trong một transaction, không restore owner/ACL hoặc ghi đè schema Supabase quản lý. Cấp mỗi role quyền trên schema/bảng/sequence của chính nó; thu hồi quyền anonymous trên schema/bảng ứng dụng.
7. Đối chiếu mọi bảng và kiểm tra đăng nhập từng role, quyền tách schema, phép cosine vector trước khi cho runtime kết nối.

Kết quả tại thời điểm chốt copy, trước khi runtime nhận ghi mới:

| Hạng mục | Kết quả |
|---|---|
| Bảng | 54: `app` 49, `ai` 5 |
| Tổng bản ghi đối chiếu | 1.820, khớp mọi bảng source/target |
| Snapshot | 4.875.500 byte; giữ local để phục hồi |
| Object | 13 tệp, 7.228.412 byte; hash và manifest khớp |
| Vector được kiểm tra | 903 chunk thực hiện được phép cosine |
| Role | Cả hai đăng nhập được; Java không có USAGE `ai`, Python không có USAGE `app` |

Con số metadata tài liệu trong SPEC-14 không bằng số object còn lưu: bản ghi xóa mềm/lịch sử không đồng nghĩa một tệp tồn tại. Lần này kiểm kê object thật và đã kiểm tra tải cả chín học liệu `READY` hiện có của Teacher Kỹ thuật số qua Java. Dữ liệu local được giữ nguyên; không xóa volume hoặc source. Sau khi runtime hoạt động, các bản ghi mới chỉ vào Supabase, số lượng không còn được kỳ vọng khớp snapshot cũ.

## S15-03 — Tương thích endpoint S3 và contract

Python trước đó yêu cầu `STORAGE_ENDPOINT` chỉ có origin, nên endpoint Supabase `/storage/v1/s3` bị từ chối. Cập nhật downloader để cho phép prefix cấu hình và chỉ nhận signed URL cùng scheme/host/port, đúng ranh giới prefix; chặn dot-segment, backslash, URL khác origin và redirect. HTTP loopback vẫn chỉ được cho phép khi bật cờ local; runtime Supabase để cờ này false.

Không đổi request/response public/internal API. Đã ghi thay đổi cấu hình/kiểm tra URL trong [API plan](../api-plan.md). `INVALID_SIGNED_URL` và envelope lỗi giữ nguyên. Frontend vẫn gọi Java; Java vẫn kiểm owner/enrollment/publication. Không thêm production dependency, không thay Quiz lifecycle hoặc chấm điểm.

## S15-04 — Chạy ứng dụng và nghiệm thu

`scripts/supabase_run.py` chạy riêng `backend`, `ai` hoặc `worker` sau khi database đã được chuẩn bị và kiểm tra. Máy thành viên dùng [mẫu runtime riêng](../../infrastructure/supabase/runtime/.env.example), không cần mật khẩu quản trị, snapshot hoặc marker của máy gốc. Các tiến trình dùng role runtime, tắt bootstrap tài khoản local và Flyway tự động; một đầu mối chịu trách nhiệm nâng schema. Không khôi phục start-all và không triển khai hosting công khai trong lần này.

Đã kiểm tra ngày 16/11 qua API đang chạy với Supabase:

- Web `/login`: `200`; Java health `UP`; AI health `UP/READY`.
- Đăng nhập đủ 7 Teacher A–G, 10 Student A–J và Admin; Teacher C trả đúng môn KTS.
- Tải chín PDF `READY` của Teacher qua Java: đủ `200` và chữ ký PDF hợp lệ. Không in hoặc lưu nội dung PDF vào báo cáo.
- Student local đã được duyệt lớp: xem slide PNG `200`, đọc Note `200`, khôi phục hội thoại `200`; thấy bốn slide đã công bố.
- Student A chưa ghi danh: xem slide bị từ chối `403`; không tự ghi danh để làm test.
- Tutor gọi provider thật trên dữ liệu đã chuyển: `200 ANSWERED`, ba citation; chỉ ghi trạng thái/số lượng, không chép nội dung câu hỏi/trả lời hoặc PDF vào báo cáo.

## Kiểm tra mã và công cụ

- `pytest services/ai/tests/test_document_download.py`: 11 ca đạt (chạy tại service với venv tương ứng).
- `pytest scripts/tests/test_supabase_tools.py`: 4 ca đạt; fixture tổng hợp, kiểm cấu hình thiếu secret, redaction lỗi, không chuyển tiếp credentials qua redirect và máy thành viên không cần mật khẩu quản trị/marker local để chạy runtime.
- Ruff kiểm tra các script mới, downloader và test tương ứng: đạt; `git diff --check`: kiểm tra trước bàn giao.
- Smoke đầu dùng sai tên trường `processingStatus` nên bỏ qua lượt kiểm PDF. Đã sửa thành `status` và chạy riêng kiểm tải đủ chín PDF; không coi kết quả bỏ qua là đã kiểm PDF.
- Không cần build lại Frontend/Java cho thay đổi Supabase vì lần này không sửa source hai service đó; các thay đổi bộ nạp tài khoản từ trước có kiểm thử riêng trong lần tạo tài khoản.

## Bàn giao và giới hạn còn lại

- Hướng dẫn và command: [infrastructure/supabase/README.md](../../infrastructure/supabase/README.md).
- Chưa kiểm tra trực tiếp từ máy thứ hai; Git pull không cấp runtime password/S3/model key. Thành viên cần được cấp cấu hình riêng và chạy các service tương ứng.
- Chưa chạy lại toàn bộ luồng tạo/giao/làm Quiz, PPTX hoặc upload/index một PDF mới trên Supabase; database/ảnh và embedding cũ đã được sao chép nhưng smoke lần này không thay thế nghiệm thu các chức năng đó.
- Chưa kiểm thử tải đồng thời hoặc dự án bị pause vì không hoạt động. Cần theo dõi hạn mức Free và kiểm tra lại giá/hạn mức khi triển khai tiếp.
- Copy vào đích trống; các công cụ không tự reset database chung. Nếu gián đoạn, có thể còn object/role đã tạo trước khi restore; cần kiểm tra trước khi thử lại.
- `.env.supabase`, archive `.runtime`, mật khẩu/khóa và dữ liệu thật không nằm trong Git. Không quay về database local để ghi tiếp mà chưa đối soát dữ liệu mới trên cloud.
- Phạm vi bàn giao Git gồm mã, công cụ, migration và tài liệu; cấu hình riêng, archive và dữ liệu Supabase không nằm trong commit.
