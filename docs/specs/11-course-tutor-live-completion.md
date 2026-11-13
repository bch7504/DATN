# SPEC-11 — Hoàn thiện luồng Slide và giáo trình hỗ trợ

**Ngày thực hiện:** 12–13/11/2026

**Vai trò:** Architect/Integration
**Tiếp nối:** SPEC-10; không thay thế lịch sử kiểm tra tại SPEC-09/10.

## 1. Hiện trạng ban đầu

- Bảng chọn nhiều tài liệu, API liên kết nguồn và schema version 5 đã có mã.
- Retrieval vẫn tìm chung rồi cộng điểm ưu tiên slide, chưa đúng luồng mở rộng nguồn tuần tự.
- Giảng viên local có đủ bốn slide và bốn giáo trình Kỹ thuật số; bảy tệp mới chưa lập chỉ mục.
- Java test từng treo khi ByteBuddy tự attach trên Windows.

## 2. Phạm vi và luồng đã sửa

1. Student mở một trang slide đã công bố trong lớp có ghi danh được duyệt.
2. Java cấp phạm vi slide và các giáo trình đính kèm từ lúc tải slide, còn được công bố trong cùng lớp.
3. Python chỉ tìm bằng chứng ở trang đang xem. Nếu không đủ để trả lời, tìm trên toàn bộ phần được phép của slide.
4. Chỉ khi slide chưa đủ căn cứ, Python mới tìm thêm trong giáo trình hỗ trợ. LLM không dùng kiến thức riêng để lấp chỗ thiếu.
5. Khi hết phạm vi mà vẫn chưa đủ căn cứ, trả `NO_EVIDENCE` với câu trả lời rỗng và không có citation.
6. Java đọc lại quyền và trạng thái công bố trong transaction mới sau khi AI hoàn tất. Citation phải thuộc cả phạm vi ban đầu lẫn phạm vi hiện tại. Nguồn bị thu hồi hoặc đổi version trong lúc xử lý trả `409 AI_SOURCE_SCOPE_CHANGED` và không lưu câu trả lời.
7. Giao diện hiển thị nguồn `SLIDE|SUPPORTING`, tên tài liệu và trang; thao tác công bố nhiều tài liệu báo rõ số mục đã thành công nếu một bước bị lỗi.
8. Sau khi chạy dữ liệu thật, phát hiện signed URL hết hạn khi chờ hàng đợi và lease 10 phút không đủ cho PDF dài có nhiều hình. Java làm mới URL của job chờ, Python cho xử lý lại lỗi tải có giới hạn và worker gia hạn lease mỗi 30 giây; khi mất lease, tác vụ xử lý bị hủy và không ghi index cũ.
9. Giao diện có nút **Thử xử lý lại** cho tài liệu FAILED. API vẫn kiểm owner và chỉ cho phép lỗi tải tệp; không ép trạng thái READY hoặc tạo bản sao PDF. Kho tự cập nhật metadata mỗi 10 giây khi còn job đang xử lý, giữ nguyên lựa chọn tài liệu.
10. Giảng viên chỉ đính kèm tối đa 10 giáo trình PDF trong form tải slide lên; tổng cả bộ tối đa 20 MiB. Java lưu bộ tài liệu trong cùng kho và transaction. Khi công bố slide, Java tự công bố các giáo trình đi kèm; nếu còn tệp chưa READY thì chặn công bố bộ đó. Không có nút hoặc cửa sổ chọn/đổi giáo trình trong kho lớp.

## 3. Contract

- Internal request/response giữ schema version 5 đã chốt ở SPEC-10.
- Public upload bổ sung multipart `supportingFiles` (0–10 PDF); chỉ nhận tệp chính `SLIDE_PDF|REFERENCE_PDF`. `SUPPORTING_PDF` được Java tạo từ tệp đính kèm slide. Bỏ API PUT sửa nguồn sau khi tải lên; GET nguồn vẫn chỉ đọc và kiểm quyền.
- Migration tiến V30 giữ các cặp nguồn cũ thành bộ tài liệu đính kèm, không sửa migration đã chạy. Công bố slide tự công bố các giáo trình đã READY vào cùng lớp; nguồn chưa READY trả `409 SUPPORTING_DOCUMENT_NOT_READY`.
- Nội bộ: `POST /internal/v1/course-materials/ask` vẫn nhận phạm vi do Java cấp; mỗi bước chỉ được thu hẹp phạm vi đó.
- Công khai: Tutor bổ sung lỗi `409 AI_SOURCE_SCOPE_CHANGED`; caller cần đặt lại câu hỏi sau khi tải trạng thái học liệu mới.
- Bổ sung `POST /api/v1/teacher/documents/{id}/retry-index`, không body, trả `204`; lỗi `401|403|404|409` theo contract. Java giữ nguyên operation key và version để không tạo chunk/job trùng. Signed URL chỉ được đổi với cùng document/version/owner/source/MIME. Kết quả terminal thành công hoặc bị thu hồi không được mở lại.
- `AI_READ_TIMEOUT` mặc định và `.env.example` là `120s`. Không đọc hoặc chỉnh `.env` thật.
- Personal Assistant và Quiz giữ nguyên phạm vi riêng, không dùng fallback của Course Tutor.

## 4. Kết quả kiểm tra

- Python: toàn bộ suite `138 passed, 1 skipped`; ca tích hợp PostgreSQL/pgvector opt-in được bật chạy riêng và đạt `1 passed`, dùng PDF tổng hợp cách ly và dọn đúng dữ liệu test.
- Java: các nhóm handler, library, access/publication, authorization, indexing, Tutor và internal HTTP client đều đạt. Bộ test bổ sung kiểm tra upload kèm giáo trình, chặn khi chưa READY, tự công bố cả bộ và trả lỗi 405 chuẩn cho API sửa nguồn cũ. Surefire đã nạp ByteBuddy agent mặc định, không còn cần tham số thủ công.
- Frontend: `124/124` test đạt; TypeScript không lỗi; lint không lỗi, còn một cảnh báo có sẵn về `<img>` trong Viewer.
- AI health có credential: `UP`, `READY`, schema version 5.

### Luồng thật qua Java API, PostgreSQL, Object Storage và OpenRouter

| Ca kiểm tra | Kết quả xác nhận |
|---|---|
| Hỏi định lý De Morgan khi đang ở slide trang 3 | `ANSWERED`, nguồn `SLIDE` trang 3, 12,2 giây |
| Hỏi XOR/XNOR nhiều đầu vào từ trang 1 | `ANSWERED`, nguồn `SUPPORTING` của giáo trình Chương 2 trang 18–19, 43,2 giây |
| Hỏi thời tiết/giá vàng | `NO_EVIDENCE`, answer rỗng, không citation, 4,9 giây |
| Thu hồi giáo trình rồi đặt lại câu hỏi XOR/XNOR | `NO_EVIDENCE`, không có citation của nguồn đã thu hồi; publication được phục hồi trong `finally` |
| Dùng `REFERENCE_PDF` làm nguồn hỗ trợ | Bị từ chối `409` |
| Sinh viên tải file slide | Bị từ chối `409` |
| Gọi Tutor trực tiếp từ `SUPPORTING_PDF` | Bị từ chối `409` |
| Xem slide | `200 image/png`, 115.415 byte cho trang được kiểm tra |
| Chọn chữ | Text-layer trả 14 mục trên trang 3 |
| Ghi chú | Lưu/đọc lại đúng nội dung; ghi chú đã có được giữ nguyên |
| Memory | Tải lại lịch sử có các trao đổi mới và citation giáo trình |
| Tải giáo trình hỗ trợ | `200 application/pdf` |
| Retry tệp FAILED do tải lỗi | `204`, dùng lại document/version/job identity |
| Retry tệp đã READY | Bị từ chối `409` |
| Migration V30 giữ liên kết bốn chương | GET xác nhận đúng cả 4 cặp slide/giáo trình |
| PDF tổng hợp tải cùng giáo trình | `201`, trả schema metadata; tạo đúng hai tài liệu riêng tư, không tự công bố |
| Giáo trình đính kèm tệp hỏng | `422`, rollback toàn bộ metadata; tài liệu có sẵn không bị thay đổi |
| Đính kèm giáo trình cho tài liệu tham khảo | `422`, không lưu tệp |
| Công bố bộ tổng hợp trước khi READY | `409`, không công bố một phần |
| Công bố slide khi cả bộ READY | `204`, slide và giáo trình cùng được công bố; GET trả đúng nguồn đính kèm |

Kiểm tra upload/công bố dùng hai PDF tổng hợp trên môi trường local; đã xóa đúng các tài liệu test sau khi kiểm tra, giữ nguyên toàn bộ tài liệu thật. Lần đầu phát hiện PUT nguồn cũ bị handler chung trả 500; đã bổ sung handler/test 405 thay vì phục hồi API sửa nguồn. Sau khi khởi động backend mới, API thật xác nhận `405 METHOD_NOT_ALLOWED`. Teacher và Student đăng nhập đều trả 204; Java `UP`, AI `UP/READY` schema 5 và trang `/login` trả 200.

Các số thời gian là từng request thử nghiệm, không phải KPI latency. Đây là nghiệm thu tích hợp qua API thật; không ghi thành full browser E2E ba vai trò.

## 5. Dữ liệu thật

- Đủ bốn slide (48 trang) và bốn giáo trình (139 trang) Kỹ thuật số đã READY, tổng 187 trang; công bố vào KTS-01 và ghép đúng bốn chương. Một PDF tham khảo có sẵn được giữ nguyên, không tạo bản sao.
- Luồng live Tutor/Note/Memory/thu hồi nguồn đã đạt như bảng trên.
- Các kết quả live ở trên được đo qua API; kiểm thử trình duyệt đầy đủ ba vai trò vẫn là bước nghiệm thu riêng.
