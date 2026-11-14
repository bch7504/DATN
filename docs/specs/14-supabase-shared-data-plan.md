# SPEC-14 — Phương án dùng chung dữ liệu qua Supabase

Ngày chốt: 14/11/2026. Trạng thái: **đã ghi phương án; chưa triển khai hoặc chuyển dữ liệu lên Supabase**.

## Mục tiêu của lần thực hiện

Sếp muốn người khác pull code có thể kết nối và sử dụng cùng dữ liệu tài khoản, lớp, tài liệu và embedding. Phương án đã chọn là PostgreSQL và Object Storage dùng chung. Chưa có server riêng; Supabase là phương án dự kiến cho lần sau. Lần này chỉ ghi spec và commit/push các thay đổi local, giữ hệ thống chạy bằng hạ tầng local hiện có.

Git chỉ lưu mã nguồn và tài liệu cấu hình mẫu. Không đưa database, tệp PDF đã tải lên, vector dump, mật khẩu hoặc khóa truy cập vào repository.

## Hiện trạng và dung lượng tham chiếu

Số đo metadata local trong lần khảo sát ngày 14/11/2026:

| Thành phần | Dung lượng/số lượng đã ghi nhận |
|---|---|
| Toàn bộ database local | 29.570.739 byte, khoảng 29,6 MB |
| Các bảng schema `app`, gồm index | 3.252.224 byte |
| Các bảng schema `ai`, gồm index | 16.957.440 byte |
| Metadata tài liệu trong `app.documents` | 24 bản ghi, tổng `file_size` 10.774.023 byte |

Tổng `file_size` không phải phép đo đầy đủ bucket: chưa tính riêng ảnh trang, ảnh Quiz và các object khác. Cần kiểm kê lại trước khi chuyển thật. Các số này không phải kết quả kiểm thử tải Supabase.

Theo [bảng giá Supabase](https://supabase.com/pricing) được đối chiếu ngày chốt, Free có 500 MB database, 1 GB file storage, 5 GB egress và 5 GB cached egress riêng biệt; dự án có thể bị tạm dừng sau một tuần không hoạt động. Dung lượng hiện tại phù hợp để bắt đầu thử nghiệm đồ án, nhưng chưa có bằng chứng về hiệu năng khi nhiều người cùng dùng. Phải kiểm tra lại hạn mức tại thời điểm triển khai, theo dõi tăng trưởng vector và lưu lượng tải PDF. Chi phí LLM/embedding và nơi chạy ứng dụng là phần riêng.

## Kiến trúc dự kiến

```text
Next.js → Java Backend → Python AI API/Worker
                 │               │
                 ├── Supabase PostgreSQL: app / ai + pgvector
                 └── Supabase Storage: bucket private
```

- Supabase thay nơi lưu database và tệp; không tự chạy thay Next.js, Java, Python hoặc dịch vụ chuyển PPTX sang PDF.
- Giai đoạn đầu, thành viên có thể chạy ứng dụng local và trỏ đến cùng hạ tầng Supabase. Nếu cần một URL demo chung, phải triển khai thêm các dịch vụ ứng dụng.
- Frontend tiếp tục chỉ gọi Java. Không thêm truy cập trực tiếp Supabase từ trình duyệt, không đổi sang Supabase Auth trong phạm vi này.
- Java vẫn quản lý đăng nhập, phân quyền, công bố tài liệu, Quiz, chấm điểm và tiến độ. Python chỉ truy cập schema `ai` và nhận authorized scope từ Java.
- Dữ liệu dùng chung không có nghĩa mọi tài khoản xem được mọi tài liệu: giữ quyền owner đối với Personal Document và quyền công bố/enrollment đối với học liệu lớp.

## Phạm vi chuyển dữ liệu trong lần triển khai sau

1. Schema `app`: dữ liệu nghiệp vụ, liên kết và lịch sử Flyway hiện có.
2. Schema `ai`: dữ liệu lập chỉ mục, chunk, embedding và lịch sử Alembic hiện có.
3. Toàn bộ object đang được các bản ghi hợp lệ tham chiếu: PDF đã chuẩn hóa và các tài nguyên ảnh liên quan. Không chỉ chuyển metadata hoặc embedding.
4. Cấu hình kết nối Java, Python và S3 tại môi trường chạy, không lưu giá trị thật vào Git.

Giữ UUID, document version, object key và quan hệ công bố để citation/ghi chú/Quiz không bị đứt liên kết. Không tự tạo embedding lại nếu dữ liệu vector tương thích và còn đủ; nếu phải lập chỉ mục lại, phải kiểm tra model, chiều vector và phiên bản tài liệu trước.

## Các bước thực hiện dự kiến

### S14-01 — Chuẩn bị đích và kiểm tra tương thích

- Tạo project Supabase, chọn vùng phù hợp; ghi Project Ref/URL không chứa secret.
- Tạo bucket private dự kiến `studyflow-documents`; lấy endpoint, region và S3 credentials từ Dashboard vào cấu hình server riêng.
- Kiểm tra PostgreSQL/pgvector, quyền tạo schema/role, vị trí extension và `search_path`. Không giả định extension trên Supabase nằm cùng schema với local.
- Dùng kết nối TLS. Java/Python chạy lâu dài dùng direct connection nếu mạng hỗ trợ, hoặc session pooler cho IPv4 theo [hướng dẫn kết nối](https://supabase.com/docs/guides/database/connecting-to-postgres). Không mặc định dùng transaction pooler khi chưa kiểm tra prepared statement/session behavior.
- Kiểm tra S3 endpoint có path prefix, ký URL và Python kiểm tra URL nguồn theo [hướng dẫn S3](https://supabase.com/docs/guides/storage/s3/authentication). Không chỉ thay hostname rồi coi là tương thích.
- Kiểm kê object, dữ liệu và tổng dung lượng; xác định rõ dữ liệu được phép chuyển. Việc đọc/export dữ liệu thật và secret phải được cấp quyền rõ trong lần thực hiện đó theo `AGENTS.md`.

### S14-02 — Sao lưu và chuyển thử

- Chuẩn bị bản sao phục hồi ngoài Git, chốt thời điểm dữ liệu và tạm dừng ghi khi chuyển chính thức để database/tệp không lệch nhau.
- Chỉ xuất/nhập phần `app` và `ai` cùng các dependency cần thiết; giữ bảng lịch sử migration. Kiểm tra phiên bản công cụ backup/restore tương thích với hai đầu.
- Không ghi đè các schema Supabase quản lý như `auth`, `storage`; không restore toàn bộ cluster hoặc role superuser local sang Supabase.
- Tạo lại ownership/grants tối thiểu: Java dùng role `app`, Python dùng role `ai`; tài khoản migration tách khỏi tài khoản chạy ứng dụng. Không dùng tài khoản quản trị database cho tất cả service.
- Copy object bytes qua giao thức S3, giữ object key và metadata cần thiết. Database backup không bao gồm nội dung bucket.
- Thử trên đích riêng và đối chiếu số bản ghi, tham chiếu, kích thước/checksum object trước khi chuyển kết nối chính thức. Không xóa nguồn local sau khi copy.

### S14-03 — Đổi cấu hình và phối hợp nhóm

- Cập nhật template/hướng dẫn cấu hình với placeholder cho database URL, role, TLS, Storage endpoint/region/bucket và thông tin dịch vụ nội bộ.
- Không chuyển tiếp S3 key hoặc database password xuống Frontend. S3 credentials theo cơ chế Supabase có quyền rộng, phải giữ phía server và Java vẫn kiểm quyền trước khi cấp URL ngắn hạn.
- Không công khai schema `app`/`ai` qua Data API cho client; không dựa vào bucket private để thay thế quyền nghiệp vụ.
- Chốt một đầu mối chạy Flyway/Alembic trên database chung. Không để mỗi máy tự chạy seed/reset dữ liệu hoặc tự thay schema lúc khởi động.
- Chốt cách chạy AI worker để tránh xử lý trùng job; kiểm tra cơ chế claim/idempotency trước khi cho nhiều worker dùng chung dữ liệu.
- JWT/cookie, internal service token, SMTP và dịch vụ chuyển PPTX cần cấu hình phù hợp với cách chạy thực tế. Không chia sẻ các khóa local được công bố trong README để vận hành cloud.

### S14-04 — Nghiệm thu và chuyển chính thức

- Từ ít nhất hai máy, cùng xem được dữ liệu được cấp quyền; thay đổi hợp lệ ở một máy xuất hiện ở máy còn lại.
- Kiểm tra đăng nhập Student/Teacher/Admin; mỗi Teacher vẫn đúng môn/lớp của mình.
- Teacher tải slide kèm tài liệu hỗ trợ → xử lý `READY` → công bố cho lớp. Kiểm tra thêm PPTX → PDF nếu dịch vụ chuyển đổi được bật.
- Student có enrollment `APPROVED` mở PDF, ghi Note, hỏi Tutor; câu trả lời giữ citation đúng `documentId + pageNumber`, hoặc `NO_EVIDENCE` khi thiếu bằng chứng.
- Teacher sinh/duyệt/giao Quiz → Student nộp → Teacher xem kết quả và thống kê.
- Kiểm tra từ chối Student ngoài lớp, Teacher khác owner và truy cập Personal Document của người khác. Đường dẫn cũ tới object phải còn hoạt động qua Java cấp quyền.
- Đo kết nối, thời gian truy xuất và dung lượng/egress. Chỉ chuyển chính thức khi đạt; nếu lỗi, dừng ghi cloud và đối soát dữ liệu phát sinh trước khi quay về local. Không chuyển qua lại hai database có ghi đồng thời.

## Hợp đồng và tiêu chí hoàn thành

Đã đối chiếu kiến trúc với [API plan](../api-plan.md): phương án này giữ nguyên public/internal API, không tạo endpoint mới. Nếu triển khai làm thay đổi request/response hoặc quyền, phải cập nhật API plan và test hai phía trong cùng task.

Chỉ ghi **đã hoàn thành Supabase** khi dữ liệu `app`/`ai`, object thực và cấu hình ứng dụng đã chuyển, quyền được giữ, luồng học/Quiz đạt và truy cập từ hai máy đã được kiểm tra. Việc tạo project hoặc restore database riêng lẻ chưa đủ.

## Kết quả của lần này và bàn giao

- Đã ghi phương án và liên kết trong danh mục specs; chưa thêm dependency, sửa code dịch vụ hay thay cấu hình runtime.
- Chưa tạo project/bucket, chuyển database/tệp, cấp role, chạy migration hoặc nghiệm thu Supabase. Local vẫn là nguồn dữ liệu hiện hành.
- Chưa có Project Ref/URL và cấu hình kết nối Supabase. Khi thực hiện tiếp, cần chuẩn bị các thông tin đó qua kênh cấu hình riêng; không dán password/key vào chat hoặc tài liệu.
- Kiểm tra lần này: rà soát trạng thái Git, đối chiếu tài liệu Supabase, kiểm tra đường dẫn liên kết và `git diff --check`. Không chạy lại build/test dịch vụ vì chỉ thay Markdown.
