# Sơ đồ báo cáo StudyFlow

Mở [gallery tổng](index.html), [PDF sơ đồ](luong-use-case-studyflow.pdf) hoặc [inventory UML](uml-inventory.md). Gallery ghi đúng số hình, đoạn chèn và thuyết minh lấy từ ba chương hiện hành; mỗi chương có gallery riêng. Bộ này là thiết kế, không phải ảnh chứng minh hệ thống đã chạy.

## Nguồn và cách dùng

- `.puml`: nguồn UML hiện hành; `.svg` và `.png`: ảnh xuất tương ứng. Các `.mmd` cùng tên là bản mô tả Mermaid phụ đã được đồng bộ nội dung nhưng không dùng để render đè bộ UML báo cáo.
- ERD vật lý dùng nguồn `chuong-3/erd-physical-03-studyflow-overview.puml` và ảnh cùng tên. Đây là thiết kế mục tiêu 27 bảng `app` + 4 bảng `ai`, chưa phải bằng chứng migration đã chạy.
- Word: ưu tiên SVG, dùng PNG nếu trình soạn thảo không hỗ trợ. Đường nối dùng đoạn thẳng/vuông góc và hạn chế giao cắt. Chỉ hình có nhiều bước/cột mới dùng bố cục và trang ngang; hình ngắn dùng dọc. Sequence vẫn tiến triển thời gian từ trên xuống, Activity chia swimlane; ERD tổng quan dùng trang phù hợp hoặc phụ lục khổ lớn, không xoay chữ hay thu nhỏ tới mức không đọc được.
- Trước mỗi ảnh có câu dẫn; dưới ảnh có số hình/tên; sau ảnh có đoạn giải thích. Không lấy số hình của bản PDF cũ làm số hình hiện hành.
- Màu sắc theo mẫu tham khảo của từng loại biểu đồ Visual Paradigm; không bắt buộc màu xám hay một palette duy nhất cho mọi hình. Phân biệt trạng thái/nhánh bằng ký hiệu và nhãn, không chỉ bằng màu.
- Mỗi ảnh xuất có nền trắng được nhúng trực tiếp vào file, với lề trái 100 px, lề phải 150 px, lề trên 80 px và lề dưới 80 px; khung hệ thống, package và swimlane không được nằm sát mép ảnh. Đường nối dùng đoạn thẳng hoặc vuông góc, không dùng đường cong.
- Activity Diagram có khung ngoài khép kín bốn cạnh, hàng tiêu đề riêng và các đường phân chia swimlane nối đúng từ cạnh trên tới cạnh dưới của khung; khung này được nhúng trong SVG/PNG, không phải viền của trình xem.

### Bảng màu đang sử dụng

| Loại hình | Mẫu tham khảo và cách áp dụng |
|---|---|
| Use Case | Elip/actor xanh nhạt `#7ACFF5`, viền và association tối; boundary nền trắng để dễ đọc. [Mẫu Use Case](https://cdn-images.visual-paradigm.com/guide/uml/what-is-use-case-diagram/02-use-case-diagram-annotated.png) |
| Activity | Action/decision xanh nhạt, nút đầu/cuối và control flow đen. [Mẫu Activity](https://cdn-images.visual-paradigm.com/guide/uml/what-is-activity-diagram/02-basic-activity-diagram.png) |
| Class / Entity | Các ngăn lớp xanh nhạt, chữ và quan hệ tối; không dùng màu thay bội số. [Mẫu Class](https://cdn-images.visual-paradigm.com/guide/uml/what-is-class-diagram/02-simple-class.png) |
| Sequence | Header participant/activation xanh nhạt, lifeline và thông điệp tối, khung alt/loop nền trắng. [Mẫu Sequence](https://cdn-images.visual-paradigm.com/guide/uml/what-is-sequence-diagram/01-sequence-diagram-example.png) |
| State | State xanh nhạt; initial/final đen, transition có nhãn điều kiện. [Mẫu State](https://cdn-images.visual-paradigm.com/guide/uml/what-is-state-machine-diagram/05-simple-state-machine-diagram.png) |
| ERD | Bảng cam nhạt `#F5B879`, nhãn PK/FK rõ ràng và đường chân quạ tối. [Mẫu Physical ERD](https://cdn-images.visual-paradigm.com/guide/data-modeling/what-is-erd/12-physical-data-model-example.png) |
| Kiến trúc / phạm vi | Dùng khung nền trung tính lồng theo lớp Platform → Backend services → Data/Storage; thành phần xử lý xanh nhạt, dữ liệu xanh lục nhạt, Object Storage vàng nhạt và Model Provider tím nhạt |

Các mẫu UML trên cùng dùng xanh nhạt; tham khảo theo từng loại không có nghĩa mỗi loại bắt buộc phải khác màu. Màu đỏ chỉ dẫn trong ảnh mẫu là chú giải giảng dạy, không được sao chép thành màu trạng thái nghiệp vụ. Ghi chú StudyFlow dùng nền vàng nhạt dễ đọc. Đây là lựa chọn trình bày dựa trên các mẫu đã dẫn, không phải quy định màu duy nhất của Visual Paradigm.

## Ký pháp tham khảo Visual Paradigm

Use Case dùng actor ngoài system boundary, mục tiêu người dùng trong elip và association đường liền. `include` biểu diễn hành vi bắt buộc được dùng lại; `extend` là hành vi tùy chọn và hướng về Use Case gốc. Không dùng chúng thay cho quan hệ trước/sau. [Hướng dẫn Use Case](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-use-case-diagram/).

Activity dùng nút bắt đầu/kết thúc, action, decision, nhãn điều kiện và swimlane để phân trách nhiệm Student/Frontend/Java/Python/Teacher khi có nhiều bên tham gia. [Hướng dẫn Activity](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-activity-diagram/).

Sequence dùng lifeline, lời gọi/phản hồi và các khung `alt`, `opt`, `loop`; thứ tự dọc là thời gian, không xoay toàn bộ biểu đồ để ép ngang. [Hướng dẫn Sequence](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-sequence-diagram/).

Class dùng tên lớp, thuộc tính/phương thức có kiểu, bội số và dependency; lớp miền không đồng nhất với bảng vật lý. [Hướng dẫn Class](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-class-diagram/).

State Diagram dùng initial/final pseudo-state, state bo góc, transition có sự kiện/điều kiện; composite state chỉ dùng khi cần gom một giai đoạn có trạng thái con. [Hướng dẫn State Machine](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-state-machine-diagram/).

ERD dùng entity dạng bảng, cột có kiểu, ký hiệu PK/FK/nullable và quan hệ chân quạ. Đây là ERD vật lý đề xuất nên không thay thế bằng Class Diagram. [Hướng dẫn ERD](https://www.visual-paradigm.com/guide/data-modeling/what-is-entity-relationship-diagram/).

Các hình được dựng bằng PlantUML theo ký pháp UML tham khảo Visual Paradigm; **không phải file dự án Visual Paradigm `.vpp`**.

## Vị trí chèn trong báo cáo hiện hành

| Chương / phần | Hình | Nội dung |
|---|---|---|
| Chương 1, mục 1.2 | 1.1 | Phạm vi và hai nguồn học liệu |
| Chương 2, mục 2.4.1–2.4.4 | 2.1–2.4 | Use Case tổng quát và ba vai trò |
| Chương 3, mục 3.1–3.3 | 3.1–3.3 | Kiến trúc, entity, ERD |
| Chương 3, mục 3.4.1–3.4.3 | 3.4–3.6 | Lớp xử lý ba chức năng AI |
| Chương 3, mục 3.5.1–3.5.3 | 3.7–3.9 | Activity RAG, Tutor, Quiz |
| Chương 3, mục 3.5.4–3.5.6 | 3.10–3.12 | Sequence RAG, Tutor, Quiz |
| Chương 3, mục 3.5.7–3.5.11 | 3.13–3.17 | Enrollment, index, lifecycle, lịch và Dashboard |

## Đối chiếu bản `bao_cao_chuong_1_2_3.pdf` cũ

Số trang dưới đây tính từ trang đầu file PDF, không phải số in ở chân trang. Bản PDF gốc được giữ nguyên; ảnh thay thế đã chèn vào Markdown theo cấu trúc mới Chương 2 phân tích / Chương 3 thiết kế.

| Trang PDF cũ | Nhận xét / sửa cần thiết | Hình hiện hành thay thế |
|---|---|---|
| 19–20 | Chuẩn hóa actor/elip/boundary; bỏ quan hệ thao tác trước/sau trong Use Case | 2.1–2.4 |
| 24 | Giữ luồng Teacher duyệt; làm rõ PENDING chưa có quyền học | 3.13 |
| 25–26 | Personal Assistant chọn tool hỏi/tóm tắt/tạo Quiz; không cần hỏi trước khi tạo Quiz; nguồn câu sai là trang Personal PDF; Student tự lập lịch | 3.7, 3.9, 3.15, 3.16 |
| 27 | Giữ ba event tính Streak; không yêu cầu Daily Goal 100% | 3.17 |
| 28 | Sửa endpoint Tutor thành `/student/materials/{documentId}/pages/{pageNumber}/tutor` | 3.11 |
| 29 | Bổ sung public 202, polling Java và accept trước làm bài | 3.12 |
| 30 | Evidence gate trước model sinh đáp án; rewrite giới hạn cùng snapshot | 3.10 |
| 31–32 | Index trả 202/jobId, Java poll; không vẽ callback hay chờ đồng bộ đến READY | 3.1, 3.14 |
| 33 | Bổ sung grounding/no-evidence, đúng scope, đúng bốn phương án | 3.7–3.9 |
| 57–66 | Thay hình cũ theo mẫu từng loại của Visual Paradigm; caption ngoài hình; citation theo documentId và vị trí nguồn | 3.7–3.15 |
| 67–69 | Sửa ranh giới service, quyền tải tệp và quyền Admin; không dùng “HttpOnly Signed Query Token” | 3.1 và mục 3.6 |

Không giữ các số Recall/Factual Correctness/latency như kết quả thực nghiệm nếu chưa có dữ liệu đo. Không mặc định speaker notes là nguồn được phép; phải đi qua scope/policy. Định lượng chất lượng AI thực hiện theo kế hoạch AI hiện hành.

## Render và kiểm tra

Tooling chỉ phục vụ tài liệu, không thêm dependency production. Cần Node, Chrome và một thư mục dependency **bên ngoài repository** chứa `@plantuml/core@1.2026.8` và `puppeteer-core@24.16.0`.

```powershell
node docs/diagrams/render-plantuml.mjs "<dependency-prefix>"
node docs/diagrams/export-gallery.mjs "<dependency-prefix>"
node docs/diagrams/validate-diagrams.mjs
```

Renderer đọc nguồn local và ghi SVG/PNG cùng tên, không gửi tài liệu tới máy chủ PlantUML. Exporter tạo gallery và PDF sơ đồ từ các link hình của ba chương, không thay thế PDF báo cáo gốc. Công cụ trả exit code khác 0 nếu nguồn/link/schema hình không hợp lệ; chạy lại chỉ ghi đè artifact đã sinh trong `docs/diagrams`.
