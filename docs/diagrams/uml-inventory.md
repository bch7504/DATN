# Inventory và chuẩn biểu đồ StudyFlow

Tài liệu này ghi nhận toàn bộ **22 sơ đồ nội dung** đang được sử dụng trong báo cáo. Các file SVG/PNG sinh từ cùng một source không được tính thành sơ đồ mới.

| Source / asset chính | Loại | Form Visual Paradigm áp dụng | Kết quả rà soát |
|---|---|---|---|
| `chuong-1/architecture-scope-01-pham-vi-studyflow.puml` | Sơ đồ phạm vi kiến trúc | Khối chức năng, connector thẳng, palette chung | Giữ loại; chuẩn hóa nền/lề/connector |
| `chuong-2/use-case-01-tong-quat.puml` | Use Case | Actor, ellipse, System Boundary và association riêng | Đã mở rộng đủ ba phân hệ và sắp lại bố cục |
| `chuong-2/use-case-02-student.puml` | Use Case | Actor, ellipse, System Boundary, `<<extend>>` nét đứt | Giữ nguyên nghiệp vụ; chuẩn hóa style/output |
| `chuong-2/use-case-03-teacher.puml` | Use Case | Actor, ellipse, System Boundary, Note UML | Giữ nguyên nghiệp vụ; chuẩn hóa style/output |
| `chuong-2/use-case-04-admin.puml` | Use Case | Actor, ellipse, System Boundary, Note UML | Giữ nguyên nghiệp vụ; chuẩn hóa style/output |
| `chuong-3/component-01-kien-truc-he-thong.puml` | Component/kiến trúc | Component, service boundary, database/storage/provider | Chuyển về Chương 3 theo vị trí sử dụng |
| `chuong-3/erd-logical-02-entity-overview.puml` | Logical ERD | Entity dạng bảng, PK/FK/type, crow's foot | Đã giữ đúng ERD; không chuyển thành Class Diagram |
| `chuong-3/erd-physical-03-studyflow-overview.puml` | Physical ERD | Bảng cam, PK/FK/type, crow's foot | Đồng bộ 27 bảng app và 4 bảng ai; có SVG và PNG |
| `chuong-3/class-04-personal-rag.puml` | Class | Class ba compartment, stereotype và quan hệ phân biệt | Đạt form; giữ nguyên quan hệ nghiệp vụ |
| `chuong-3/class-05-slide-tutor.puml` | Class Course Material Tutor | Như trên | Đã đổi scope từ slide/PPTX sang PDF/page |
| `chuong-3/class-06-quiz.puml` | Class | Như trên; có composition cho câu hỏi | Đạt form; giữ nguyên quan hệ nghiệp vụ |
| `chuong-3/activity-07-personal-rag.puml` | Activity/Swimlane | Initial, activity, decision, final, lane frame | Đã sửa nhánh kết thúc, connector và khung kín |
| `chuong-3/activity-08-slide-tutor.puml` | Activity/Swimlane Course Material Tutor | Như trên | PDF/page scope; connector và khung kín |
| `chuong-3/activity-09-quiz-generation.puml` | Activity/Swimlane | Như trên | Đã sửa nhánh kết thúc, connector và khung kín |
| `chuong-3/sequence-10-personal-rag.puml` | Sequence | `sd`, participant, lifeline, activation, `alt` | Đã thêm interaction frame chuẩn |
| `chuong-3/sequence-11-slide-tutor.puml` | Sequence Course Material Tutor | `sd`, participant, lifeline, activation, `alt` | PDF/page contract và interaction frame chuẩn |
| `chuong-3/sequence-12-quiz.puml` | Sequence | `sd`, activation, `alt`, `loop`, `opt` | Đã thêm interaction frame chuẩn |
| `chuong-3/activity-13-course-enrollment.puml` | Activity/Swimlane | Initial, activity, decision, final, lane frame | Đã sửa nhánh kết thúc, connector và khung kín |
| `chuong-3/sequence-14-document-indexing.puml` | Sequence | `sd`, activation, `loop`, `opt` | Đã thêm interaction frame chuẩn |
| `chuong-3/state-machine-15-quiz-lifecycle.puml` | State Machine | Initial/final, state, transition, composite state | Đạt form; không dùng notation Activity |
| `chuong-3/activity-16-study-plan.puml` | Activity/Swimlane | Initial, activity, decision, final, lane frame | Đã sửa nhánh kết thúc, connector và khung kín |
| `chuong-3/activity-17-dashboard-events.puml` | Activity/Swimlane | Initial, activity, decision, final, lane frame | Đã bổ sung khung kín; giữ nguyên luồng |

## Thống kê

- Use Case Diagram: **4**.
- Sequence Diagram: **4**.
- Activity Diagram/Swimlane: **6**.
- State Machine Diagram: **1**.
- Class Diagram: **3**.
- Component/kiến trúc hệ thống: **1**.
- Sơ đồ phạm vi kiến trúc: **1**.
- ERD logic/vật lý: **2**.
- Deployment Diagram: **0**.
- Mermaid, Draw.io hoặc nguồn UML khác: **0**.

Mọi source PlantUML được xuất thành SVG và PNG cùng tên, gồm cả ERD vật lý. Toàn bộ ảnh có nền trắng nhúng trong file, lề ngoài và không chứa giao diện editor.
