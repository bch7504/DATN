# Inventory và chuẩn biểu đồ StudyFlow

Tài liệu này ghi nhận **16 sơ đồ nội dung** được giữ lại cho phần tổng quan hệ thống, tổng quan thực thể và phần AI. Các sơ đồ chi tiết của thành viên Backend đã được loại khỏi bộ này. Các file SVG/PNG/Draw.io sinh từ cùng một source không được tính thành sơ đồ mới.

| Source / asset chính | Loại | Form Visual Paradigm áp dụng | Kết quả rà soát |
|---|---|---|---|
| `chuong-1/architecture-scope-01-pham-vi-studyflow.puml` | Sơ đồ phạm vi kiến trúc | Khối chức năng, connector thẳng, palette chung | Giữ loại; chuẩn hóa nền/lề/connector |
| `chuong-2/use-case-01-tong-quat.puml` | Use Case | Actor, ellipse, System Boundary và association riêng | Đã mở rộng đủ ba phân hệ và sắp lại bố cục |
| `chuong-3/component-01-kien-truc-he-thong.puml` | Component/kiến trúc | Component, service boundary, database/storage/provider | Chuyển về Chương 3 theo vị trí sử dụng |
| `chuong-3/class-entity-02-studyflow-overview.puml` | Class Diagram thực thể | Lớp ba ngăn, association/composition/dependency và bội số | Đồng bộ 31 thực thể với ERD; User dùng thuộc tính role, dữ liệu AI chỉ tham chiếu logic sang dữ liệu nghiệp vụ |
| `chuong-3/erd-physical-03-studyflow-overview.puml` | Physical ERD | Bảng cam, PK/FK/type, crow's foot | Đồng bộ 27 bảng app và 4 bảng ai; có SVG và PNG |
| `chuong-3/class-04-personal-rag.puml` | Class Personal Assistant | View–Control–Entity/DTO, class ba ngăn và bội số | Đủ giao diện Tài liệu cá nhân, Java/Python control, entity hội thoại/chỉ mục và kết quả |
| `chuong-3/class-05-slide-tutor.puml` | Class Course Material Tutor | View–Control–Entity/DTO, class ba ngăn và bội số | Đủ Library/Viewer/Tutor/Note, kiểm quyền, PDF/page và entity tiến độ |
| `chuong-3/class-06-quiz.puml` | Class Quiz | View–Control–Entity/DTO; composition cho source/question/attempt | Đủ Create/Status/Review/Attempt/Result, sinh bản nháp AI và chấm điểm Java |
| `chuong-3/activity-07-personal-rag.puml` | Activity/Swimlane | Initial, activity, decision, final, lane frame | Đã sửa nhánh kết thúc, connector và khung kín |
| `chuong-3/activity-08-slide-tutor.puml` | Activity/Swimlane Course Material Tutor | Như trên | PDF/page scope; connector và khung kín |
| `chuong-3/activity-09-quiz-generation.puml` | Activity/Swimlane | Như trên | Đã sửa nhánh kết thúc, connector và khung kín |
| `chuong-3/sequence-10-personal-rag.puml` | Sequence | `sd`, participant, lifeline, activation, `alt` | Đã thêm interaction frame chuẩn |
| `chuong-3/sequence-11-slide-tutor.puml` | Sequence Course Material Tutor | `sd`, participant, lifeline, activation, `alt` | PDF/page contract và interaction frame chuẩn |
| `chuong-3/sequence-12-quiz.puml` | Sequence | `sd`, activation, `alt`, `loop`, `opt` | Đã thêm interaction frame chuẩn |
| `chuong-3/sequence-14-document-indexing.puml` | Sequence | `sd`, activation, `loop`, `opt` | Đã thêm interaction frame chuẩn |
| `chuong-3/state-machine-15-quiz-lifecycle.puml` | State Machine | Initial/final, state, transition, composite state | Đạt form; không dùng notation Activity |

## Thống kê

- Use Case Diagram: **1**.
- Sequence Diagram: **4**.
- Activity Diagram/Swimlane: **3**.
- State Machine Diagram: **1**.
- Class Diagram: **4**.
- Component/kiến trúc hệ thống: **1**.
- Sơ đồ phạm vi kiến trúc: **1**.
- ERD vật lý: **1**.
- Deployment Diagram: **0**.
- Draw.io: **16** bản chỉnh sửa tương ứng với 16 sơ đồ được giữ lại.

Mọi source PlantUML được xuất thành SVG và PNG cùng tên, gồm cả ERD vật lý. Toàn bộ ảnh có nền trắng nhúng trong file, lề ngoài và không chứa giao diện editor.
