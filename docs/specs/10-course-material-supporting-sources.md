# SPEC-10 — Nguồn hỗ trợ cho Slide AI Tutor

> Lịch sử đợt 11/11/2026. Luồng chọn nguồn sau khi công bố trong tài liệu này đã được thay bằng **đính kèm giáo trình ngay khi tải slide lên**, theo [SPEC-11](11-course-tutor-live-completion.md). Không triển khai nút chọn/đổi giáo trình trong kho lớp.

**Ngày chốt:** 11/11/2026  
**Mục tiêu:** Cho phép Giảng viên công bố một bộ gồm slide chính và giáo trình/tài liệu hỗ trợ; AI Tutor ưu tiên slide rồi mới tìm trong nguồn hỗ trợ được phép.

## 1. Hiện trạng ban đầu

- Kho Giảng viên thêm từng tài liệu vào lớp bằng nút riêng trên từng dòng.
- Course Material Tutor chỉ nhận đúng một `SLIDE_PDF`.
- `REFERENCE_PDF` chỉ tải xuống và không được lập chỉ mục.

## 2. Phạm vi thay đổi

1. Bổ sung loại `SUPPORTING_PDF` có lớp văn bản và được lập chỉ mục.
2. Kho chi tiết hiển thị bảng có chọn nhiều, STT, tên, loại, trạng thái và số trang.
3. Một thao tác **Thêm vào lớp** công bố nhiều tài liệu đã chọn.
4. Khi lựa chọn có slide chính và PDF hỗ trợ, Teacher liên kết nguồn hỗ trợ với slide trong chính lớp đã chọn.
5. Java lưu quan hệ lớp + slide chính + tài liệu hỗ trợ và dựng phạm vi đã kiểm quyền.
6. Python nhận nhiều tài liệu, ưu tiên trang hiện tại → slide chính → tài liệu hỗ trợ.
7. Câu trả lời hiển thị nguồn là slide hay tài liệu hỗ trợ; thiếu bằng chứng trả `NO_EVIDENCE`.

## 3. Quy tắc nghiệp vụ

- Slide chính phải là `SLIDE_PDF`, `READY`, thuộc Teacher và đã công bố trong lớp.
- Nguồn hỗ trợ phải là `SUPPORTING_PDF`, `READY`, thuộc cùng Teacher và đã công bố trong cùng lớp.
- Mỗi slide trong một lớp có tối đa 10 nguồn hỗ trợ, không trùng lặp và không tự liên kết chính nó.
- `REFERENCE_PDF` tiếp tục chỉ tải xuống, không được dùng làm evidence.
- Student chỉ mở Viewer/Tutor từ slide chính; không mở Tutor trực tiếp từ PDF hỗ trợ.
- Thu hồi một tài liệu khỏi lớp phải làm nó mất hiệu lực trong phạm vi Tutor ngay lập tức.
- Python không tự mở rộng sang tài liệu khác và không dùng kiến thức riêng để thay evidence.

## 4. Luồng chính

1. Teacher tải slide và PDF hỗ trợ vào kho riêng.
2. Teacher chọn một hoặc nhiều dòng, chọn lớp và bấm **Thêm vào lớp**.
3. Java kiểm tra quyền sở hữu, trạng thái tệp và lớp rồi công bố các tài liệu.
4. Teacher liên kết PDF hỗ trợ với slide chính trong lớp.
5. Student mở một trang slide và đặt câu hỏi.
6. Java kiểm tra enrollment/publication, dựng phạm vi slide chính + nguồn hỗ trợ còn hiệu lực.
7. Python tìm bằng chứng theo thứ tự ưu tiên; LLM chỉ trả lời trên bằng chứng đó.
8. Java kiểm tra lại citation và trả câu trả lời kèm tên nguồn, loại nguồn và số trang.

## 5. Luồng thay thế

- Không có bằng chứng đủ mạnh: trả `NO_EVIDENCE`.
- Nguồn hỗ trợ chưa `READY`, bị thu hồi hoặc không cùng lớp: bỏ khỏi phạm vi trước khi gọi Python.
- Có tài liệu không hợp lệ trong thao tác hàng loạt: không tự giả thành thành công; giao diện hiển thị rõ tài liệu thất bại.
- Student không còn enrollment `APPROVED`: Java từ chối trước khi gọi Python.

## 6. Điều kiện nghiệm thu

- Contract Java–Python schema version 5 chấp nhận 1–11 tài liệu và từ chối scope trùng/sai loại.
- Citation chỉ thuộc đúng version/page của slide hoặc nguồn hỗ trợ đã cấp quyền.
- Bảng kho chọn nhiều và thêm nhiều tài liệu vào một lớp bằng một thao tác.
- Unit/contract test bao phủ input hợp lệ, input sai và output schema.

## 7. Kết quả kiểm tra

- Frontend: `npm.cmd test -- --runInBand` — 123/123 test đạt.
- Python: `pytest tests/test_course_material_scope.py -q` — 3/3 test contract scope đạt.
- Python: Ruff trên các file AI thay đổi — đạt.
- Java: compile/testCompile đã đạt; lần chạy nhóm test chọn dừng do Surefire treo sau khi bắt đầu `CourseMaterialTutorAuthorizationTest`, không ghi nhận kết quả đạt giả.
