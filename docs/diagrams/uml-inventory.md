# Inventory và chuẩn biểu đồ StudyFlow

Tài liệu này ghi nhận các sơ đồ được giữ lại cho phần tổng quan hệ thống, tổng quan thực thể và phần AI. Các sơ đồ chi tiết của thành viên Backend đã được loại khỏi bộ này. Mỗi sơ đồ giữ nguồn PlantUML và ảnh PNG cùng tên; bảy sơ đồ được chọn có thêm bản XMI để trao đổi với Visual Paradigm.

| Source / asset chính | Loại | Form Visual Paradigm áp dụng | Kết quả rà soát |
|---|---|---|---|
| `chuong-1/flow-01-luong-chinh-studyflow.puml` | Biểu đồ luồng chính hệ thống | Luồng dọc Student → học liệu → AI → Quiz → tiến độ → kế hoạch → ôn lại | Thể hiện vai trò hỗ trợ của Teacher/Admin và vòng lặp học tập chính |
| `chuong-2/use-case-01-tong-quat.puml` | Use Case | Actor, ellipse, System Boundary và association riêng | Đã mở rộng đủ ba phân hệ và sắp lại bố cục |
| `chuong-3/component-01-kien-truc-he-thong.puml` | Component/kiến trúc | Khung tầng dọc đen–trắng, service boundary, database/storage/provider | Đồng bộ Next.js/TypeScript, Spring Boot/Java, FastAPI/Python, LangChain, PostgreSQL, Object Storage và OpenRouter |
| `chuong-3/class-entity-02-studyflow-overview.puml` | Class Diagram thực thể | Lớp ba ngăn, association/composition/dependency và bội số | Đồng bộ 31 thực thể với ERD; User dùng thuộc tính role, dữ liệu AI chỉ tham chiếu logic sang dữ liệu nghiệp vụ |
| `chuong-3/erd-physical-03-studyflow-overview.puml` | Physical ERD | Bảng cam, PK/FK/type, crow's foot | Đồng bộ 27 bảng app và 4 bảng ai; có PNG dùng trong báo cáo |
| `chuong-3/class-04-personal-rag.puml` | Class Personal Assistant | View–DAO–Entity, class ba ngăn và bội số | Đủ giao diện Tài liệu cá nhân, DAO nghiệp vụ/chỉ mục AI, entity hội thoại, tài liệu và kết quả |
| `chuong-3/class-05-slide-tutor.puml` | Class Course Material Tutor | View–DAO–Entity, class ba ngăn và bội số | Đủ Library/Viewer/Tutor/Note, DAO kiểm quyền/truy xuất PDF và entity tiến độ |
| `chuong-3/class-06-quiz.puml` | Class Quiz | View–DAO–Entity; composition cho source/question/attempt | Đủ Create/Status/Review/Attempt/Result, DAO sinh bản nháp và entity phục vụ chấm điểm Java |
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

Các nguồn PlantUML được xuất thành PNG cùng tên, gồm cả ERD vật lý và kiến trúc tổng quan. Toàn bộ ảnh có nền trắng nhúng trong file, lề ngoài và không chứa giao diện editor.
