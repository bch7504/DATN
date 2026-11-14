# Sơ đồ báo cáo StudyFlow

Mở [inventory UML](uml-inventory.md) để xem danh sách và vị trí chèn hình. Bộ này là thiết kế, không phải ảnh chứng minh hệ thống đã chạy.

## Nguồn và cách dùng

- `.puml`: nguồn UML chính để chỉnh sửa; `.png`: ảnh độ phân giải cao dùng trong báo cáo; `.xmi`: bản trao đổi của bảy sơ đồ được chọn để nhập vào Visual Paradigm. Không duy trì SVG, Mermaid, PDF hoặc gallery ảnh riêng.
- ERD vật lý dùng nguồn `chuong-3/erd-physical-03-studyflow-overview.puml` và ảnh cùng tên. Đây là thiết kế mục tiêu 27 bảng `app` + 4 bảng `ai`, chưa phải bằng chứng migration đã chạy.
- Word: dùng PNG cùng tên với nguồn PUML. Đường nối dùng đoạn thẳng/vuông góc và hạn chế giao cắt. Chỉ hình có nhiều bước/cột mới dùng bố cục và trang ngang; hình ngắn dùng dọc. Sequence vẫn tiến triển thời gian từ trên xuống, Activity chia swimlane; ERD tổng quan dùng trang phù hợp hoặc phụ lục khổ lớn, không xoay chữ hay thu nhỏ tới mức không đọc được.
- Trước mỗi ảnh có câu dẫn; dưới ảnh có số hình/tên; sau ảnh có đoạn giải thích. Không lấy số hình của bản PDF cũ làm số hình hiện hành.
- Màu sắc theo mẫu tham khảo của từng loại biểu đồ Visual Paradigm; không bắt buộc màu xám hay một palette duy nhất cho mọi hình. Phân biệt trạng thái/nhánh bằng ký hiệu và nhãn, không chỉ bằng màu.
- Hai biểu đồ kiến trúc/phạm vi, Use Case tổng quát, ba Sequence và ba Class chức năng dùng nền trắng, khối trắng, chữ/viền/mũi tên màu đen theo ảnh mẫu báo cáo. Class Diagram đặt toàn bộ lớp trên một canvas, không chia bằng package hoặc khung khu vực: `view` ở trên, `DAO` ở giữa và `entity` ở dưới. Dependency dùng nét đứt có mũi tên mở; association dùng nét liền; aggregation/composition dùng hình thoi rỗng/đặc theo ký pháp Visual Paradigm.
- Ảnh có nền trắng được nhúng trực tiếp vào file. Theo yêu cầu mới, ba Sequence và các ảnh nửa được đo sát nội dung, chỉ chừa mép 4 px mỗi phía ở hệ tọa độ render (8 px trong PNG 2x) để tránh cắt nét. Các loại biểu đồ khác giữ lề trái 100 px, phải 150 px, trên/dưới 80 px. Đường nối dùng đoạn thẳng hoặc vuông góc, không dùng đường cong.
- Activity Diagram có khung ngoài khép kín bốn cạnh, hàng tiêu đề riêng và các đường phân chia swimlane nối đúng từ cạnh trên tới cạnh dưới của khung; khung này được nhúng trong PNG, không phải viền của trình xem.

### Bảng màu đang sử dụng

| Loại hình | Mẫu tham khảo và cách áp dụng |
|---|---|
| Use Case | Elip/actor xanh nhạt `#7ACFF5`, viền và association tối; boundary nền trắng để dễ đọc. [Mẫu Use Case](https://cdn-images.visual-paradigm.com/guide/uml/what-is-use-case-diagram/02-use-case-diagram-annotated.png) |
| Activity | Action/decision xanh nhạt, nút đầu/cuối và control flow đen. [Mẫu Activity](https://cdn-images.visual-paradigm.com/guide/uml/what-is-activity-diagram/02-basic-activity-diagram.png) |
| Class / Entity | Nền và khung lớp màu trắng, chữ/viền/connector màu đen; View nằm trên, DAO ở giữa, Entity ở dưới. Stereotype, thuộc tính, phương thức, bội số và loại quan hệ được ghi bằng ký pháp UML. [Mẫu Class](https://cdn-images.visual-paradigm.com/guide/uml/what-is-class-diagram/02-simple-class.png) |
| Sequence | Header participant/activation xanh nhạt, lifeline và thông điệp tối, khung alt/loop nền trắng. [Mẫu Sequence](https://cdn-images.visual-paradigm.com/guide/uml/what-is-sequence-diagram/01-sequence-diagram-example.png) |
| State | State xanh nhạt; initial/final đen, transition có nhãn điều kiện. [Mẫu State](https://cdn-images.visual-paradigm.com/guide/uml/what-is-state-machine-diagram/05-simple-state-machine-diagram.png) |
| ERD | Bảng cam nhạt `#F5B879`, nhãn PK/FK rõ ràng và đường chân quạ tối. [Mẫu Physical ERD](https://cdn-images.visual-paradigm.com/guide/data-modeling/what-is-erd/12-physical-data-model-example.png) |
| Kiến trúc / phạm vi | Nền trắng, khung/khối/chữ/mũi tên màu đen; các khung lồng thể hiện Platform → Frontend/Backend/AI → Data/Storage. Luồng sử dụng chính đi từ trên xuống dưới, còn kho dữ liệu và Model Provider là các nhánh phụ hoặc dịch vụ bên ngoài |

Các mẫu UML trên cùng dùng xanh nhạt; tham khảo theo từng loại không có nghĩa mỗi loại bắt buộc phải khác màu. Màu đỏ chỉ dẫn trong ảnh mẫu là chú giải giảng dạy, không được sao chép thành màu trạng thái nghiệp vụ. Ghi chú StudyFlow dùng nền vàng nhạt dễ đọc. Đây là lựa chọn trình bày dựa trên các mẫu đã dẫn, không phải quy định màu duy nhất của Visual Paradigm.

## Ký pháp tham khảo Visual Paradigm

Use Case dùng actor ngoài system boundary, mục tiêu người dùng trong elip và association đường liền. `include` biểu diễn hành vi bắt buộc được dùng lại; `extend` là hành vi tùy chọn và hướng về Use Case gốc. Không dùng chúng thay cho quan hệ trước/sau. [Hướng dẫn Use Case](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-use-case-diagram/).

Activity dùng nút bắt đầu/kết thúc, action, decision, nhãn điều kiện và swimlane để phân trách nhiệm Student/Frontend/Java/Python/Teacher khi có nhiều bên tham gia. [Hướng dẫn Activity](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-activity-diagram/).

Sequence dùng lifeline, lời gọi/phản hồi và các khung `alt`, `opt`, `loop`; thứ tự dọc là thời gian, không xoay toàn bộ biểu đồ để ép ngang. [Hướng dẫn Sequence](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-sequence-diagram/).

Ba Sequence AI dùng `->` cho lời gọi đồng bộ, `-->` cho kết quả trả về đúng bên gọi và `->>` cho sự kiện giao diện/công việc bất đồng bộ. Khi A gọi B, B có thể gọi C; C phải trả về B trước khi B tiếp tục rồi trả về A. Không nối máy móc mọi bước từ đối tượng nhận của bước ngay trước. Mỗi đầu mũi tên gọi và trả về phải chạm một activation. Activation kéo dài từ lúc nhận lời gọi đến lúc trả kết quả, kể cả khi đang chờ lời gọi con. Tác nhân, giao diện và worker có activation cho lượt tương tác; lời gọi vào chính đối tượng dùng activation lồng. PNG và XMI cùng giữ thời điểm bắt đầu/kết thúc, không cắt ngắn thanh bằng tọa độ giả. Quiz trả HTTP `202` trước khi công việc nền hoàn tất, giao diện hỏi trạng thái bằng các lượt gọi riêng. Các số bước trong Chương 3 khớp từng thông điệp của hình; các nhánh `alt` là thay thế nhau.

Class dùng tên lớp, thuộc tính/phương thức có kiểu, bội số và dependency; lớp miền không đồng nhất với bảng vật lý. Ba biểu đồ lớp chức năng Chương 3 dùng form View–DAO–Entity: View thể hiện giao diện, DAO thể hiện điểm truy cập hoặc trao đổi dữ liệu và Entity thể hiện dữ liệu miền. Biểu đồ lớp thực thể tổng quan ở Hình 3.2 chỉ mô tả miền dữ liệu nên không lặp lại View và DAO. [Hướng dẫn Class](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-class-diagram/).

State Diagram dùng initial/final pseudo-state, state bo góc, transition có sự kiện/điều kiện; composite state chỉ dùng khi cần gom một giai đoạn có trạng thái con. [Hướng dẫn State Machine](https://www.visual-paradigm.com/guide/uml-unified-modeling-language/what-is-state-machine-diagram/).

ERD dùng entity dạng bảng, cột có kiểu, ký hiệu PK/FK/nullable và quan hệ chân quạ. Đây là ERD vật lý đề xuất nên không thay thế bằng Class Diagram. [Hướng dẫn ERD](https://www.visual-paradigm.com/guide/data-modeling/what-is-entity-relationship-diagram/).

Tất cả hình hiện hành được dựng bằng PlantUML theo ký pháp UML tham khảo Visual Paradigm. PUML không phải file dự án Visual Paradigm `.vpp`; nếu cần chỉnh sửa, sửa nguồn PUML rồi render lại PNG và tạo lại XMI liên quan.

## XMI dùng với Visual Paradigm

Thư mục `visual-paradigm/` chứa bảy file XMI cho Use Case tổng quát, ba biểu đồ lớp AI và ba biểu đồ tuần tự AI. XMI giữ các phần tử và quan hệ UML để nhập vào Visual Paradigm; vị trí hiển thị có thể cần căn lại sau khi import. PUML vẫn là nguồn chuẩn của nội dung.

## Vị trí chèn trong báo cáo hiện hành

| Chương / phần | Hình | Nội dung |
|---|---|---|
| Chương 1, mục 1.2 | 1.1 | Phạm vi và hai nguồn học liệu |
| Chương 2, mục 2.4.1–2.4.4 | 2.1–2.4 | Use Case tổng quát và ba vai trò |
| Chương 3, mục 3.1–3.3 | 3.1–3.3 | Kiến trúc, biểu đồ lớp thực thể, ERD vật lý |
| Chương 3, mục 3.4.1–3.4.3 | 3.4–3.6 | Lớp xử lý ba chức năng AI |
| Chương 3, mục 3.5.1–3.5.3 | 3.7–3.9 | Activity RAG, Tutor, Quiz |
| Chương 3, mục 3.5.4–3.5.6 | 3.10–3.12 | Sequence RAG, Tutor, Quiz |
| Chương 3, mục 3.5.7–3.5.8 | 3.13–3.14 | Lập chỉ mục tài liệu và vòng đời Quiz |

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
node docs/diagrams/render-plantuml.mjs "<dependency-prefix>" chuong-3/sequence-10-personal-rag --split
node docs/diagrams/generate-xmi.mjs
node --test docs/diagrams/tests/sequence-contract.test.mjs
node docs/diagrams/validate-diagrams.mjs
```

Renderer đọc nguồn PlantUML local và chỉ ghi PNG cùng tên, không gửi tài liệu tới máy chủ PlantUML. Công cụ XMI đọc đúng bảy nguồn PUML được cho phép và ghi bản trao đổi vào `visual-paradigm/`. Công cụ kiểm tra yêu cầu mỗi PNG có đúng một nguồn PUML cùng tên, đủ bảy file XMI và không cho phép SVG/MMD/PDF xuất hiện trong thư mục sơ đồ.

Khi chỉ sửa Sequence, dùng `node docs/diagrams/generate-xmi.mjs --sequence-only` rồi render riêng ba nguồn `sequence-10-personal-rag`, `sequence-11-slide-tutor`, `sequence-12-quiz`. Kiểm tra phát hiện lời gọi thiếu return, trả nhầm bên, bên gọi tiếp tục khi bên nhận chưa trả, nhánh chưa kết thúc và activation lệch. Đồng thời đối chiếu lớp/phương thức, số bước báo cáo và loại thông điệp trong XMI. Các file XMI mẫu sếp tự export được giữ nguyên, không tính vào bảy bản xuất chuẩn. Việc kiểm tra cấu trúc XMI không thay thế nghiệm thu trực tiếp bằng phiên bản Visual Paradigm đang dùng.

Thêm `--split` khi render Sequence để tạo hai PNG `-part-1.png` và `-part-2.png` bên cạnh ảnh toàn bộ. **Hai nửa của mỗi sequence có cùng kích thước canvas**. Chiều cao từng ảnh nửa được khóa theo mốc ảnh gốc ban đầu bằng comment `' Split PNG height: ...` trong PUML: RAG **7638 px**, Tutor **3932 px**, Quiz **7622 px**. Không lấy chiều cao ảnh toàn bộ sau khi tăng font làm mốc mới, nên ảnh nửa không tự dài thêm qua mỗi lần render. Renderer chọn điểm cắt cân đối theo chiều cao, không cắt chữ, rồi giãn bước trong chiều cao đã chốt; không thu nhỏ hoặc kéo méo chữ để ép vừa khung.

Nguồn PUML, PNG toàn bộ và các PNG nửa nay cùng dùng chữ **26**, biểu tượng đầu cột **1,8 lần**, nét mũi tên dày hơn. Tên lớp/nhãn dài xuống dòng để chữ lớn vẫn đủ nội dung. Giữ nguyên thông điệp, số bước, activation và quan hệ; phần hai không lặp tên cột. Không cần PUML riêng cho từng nửa. PNG được xuất sát nội dung, không giữ khoảng trắng lớn quanh hình. Ba cặp ảnh hiện có ở `chuong-3/`: `sequence-10-personal-rag-part-1/2.png`, `sequence-11-slide-tutor-part-1/2.png`, `sequence-12-quiz-part-1/2.png`.
