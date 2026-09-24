# StudyFlow — Kế hoạch triển khai Java Backend

**Vai trò thực hiện:** `BACKEND_AGENT` theo `AGENTS.md`  
**Trạng thái:** Kế hoạch và target structure; chưa scaffold dependency, migration hoặc chạy service  
**Baseline nghiệp vụ:** `Semester → Course Offering → Course Enrollment`

## 1. Mục tiêu và boundary

Java Spring Boot là public API duy nhất cho Web và system of record của toàn bộ nghiệp vụ:

- auth/session/RBAC và account status;
- Subject, Semester, Course Offering, join code, Course Enrollment;
- Teacher Library, publication, slide metadata, Note;
- Personal Document metadata và conversation history;
- Quiz lifecycle, validation, attempt/scoring;
- Content Progress, Statistics, Study Plan/Calendar;
- feedback, audit, settings;
- authorization trước khi cấp signed URL hoặc gọi Python.

Java không parse/chunk/embed, không đọc/ghi vector và không sinh nội dung AI. Tích hợp AI chỉ qua internal contract trong `docs/api-plan.md`.

## 2. Công nghệ dự kiến

- Java 21 LTS, Spring Boot 3.x, Maven Wrapper.
- Spring Web, Validation, Security, Data JPA, Actuator.
- PostgreSQL schema `app`; Flyway chỉ chạy migration của Java.
- JWT access ngắn hạn + refresh session rotate/reuse detection.
- Object Storage qua adapter S3-compatible; Python AI qua HTTP client có timeout.
- OpenAPI cho public API; Testcontainers PostgreSQL/MinIO và WireMock/fake AI cho integration test.

Dependency version được khóa khi scaffold. Không thêm message broker trong MVP; async outbox/database job chỉ dùng khi có yêu cầu tải thực tế.

## 3. Target file structure

Mỗi business module dùng cấu trúc `api → application → domain → infrastructure`; domain không phụ thuộc controller/JPA/provider.

```text
services/backend/
├── pom.xml
├── mvnw
├── mvnw.cmd
├── README.md
├── src/main/java/com/studyflow/
│   ├── StudyFlowApplication.java
│   ├── common/
│   │   ├── api/              # ErrorEnvelope, pagination, request context
│   │   ├── config/           # Jackson, clock, security-safe config
│   │   ├── exception/        # typed business/validation exceptions
│   │   └── persistence/      # shared ID/audit base types, không chứa domain rule
│   ├── auth/
│   │   ├── api/              # AuthController, request/response DTO
│   │   ├── application/      # Login, register, refresh, logout use cases
│   │   ├── domain/           # RefreshSession, token contracts
│   │   └── infrastructure/   # SecurityFilterChain, JWT/password adapters
│   ├── user/
│   ├── academic/             # Subject, Semester
│   ├── courseoffering/       # CourseOffering, join-code lifecycle
│   ├── enrollment/           # request/approve/reject/access policy
│   ├── document/             # Teacher/Personal metadata và upload lifecycle
│   ├── publication/          # document ↔ Course Offering
│   ├── slide/                # artifact metadata, signed access, view event
│   ├── note/                 # Student + Slide note
│   ├── conversation/         # Personal RAG conversation/history/citation record
│   ├── review/               # Quiz draft/review/attempt/scoring
│   ├── progress/             # Content Progress/Statistics
│   ├── study/                # Study Plan/Task/Session/Calendar
│   ├── feedback/
│   ├── audit/
│   ├── settings/
│   └── integration/
│       ├── ai/
│       │   ├── AiClient.java
│       │   ├── HttpAiClient.java
│       │   ├── dto/          # internal schema v2 request/response
│       │   └── AiClientConfiguration.java
│       └── storage/
│           ├── ObjectStorage.java
│           ├── S3ObjectStorage.java
│           └── StorageConfiguration.java
├── src/main/resources/
│   ├── application.yml       # chỉ placeholder/env binding, không secret
│   └── db/migration/         # migration tiến của schema app
└── src/test/java/com/studyflow/
    ├── contract/             # public/internal contract tests
    ├── integration/          # Testcontainers + fake AI/storage
    └── <module>/             # unit/application/domain tests theo module
```

Trong mỗi module, file mẫu:

```text
courseoffering/
├── api/
│   ├── TeacherCourseOfferingController.java
│   ├── AdminCourseOfferingController.java
│   └── dto/{CreateCourseOfferingRequest,CourseOfferingResponse}.java
├── application/
│   ├── CourseOfferingService.java
│   └── CourseOfferingAccessPolicy.java
├── domain/
│   ├── CourseOffering.java
│   ├── CourseOfferingStatus.java
│   └── CourseOfferingRepository.java
└── infrastructure/persistence/
    ├── CourseOfferingJpaEntity.java
    ├── SpringDataCourseOfferingRepository.java
    └── JpaCourseOfferingRepository.java
```

## 4. Quy tắc implementation

- Controller chỉ parse/validate DTO và gọi application service.
- Application service mở transaction, kiểm authorization và điều phối port.
- Domain giữ state transition; repository interface nằm phía domain/application.
- JPA entity không được trả trực tiếp ra API.
- Public/application method có kiểu đầy đủ và Javadoc ghi `args`, input/precondition, output/side effect, errors.
- Không dùng `Object`/map không schema tại boundary.
- Clock, ID generator, token, storage và AI client đều qua interface để test xác định.

## 5. Domain và state transition

### Course Offering/Enrollment

```text
Course Offering: DRAFT/OPEN → LOCKED → ARCHIVED
Enrollment:      PENDING → APPROVED | REJECTED
```

- Teacher role hợp lệ tự tạo lớp từ Subject/Semester active.
- Join code được normalize, lưu hash/hint, unique và rotate nguyên tử.
- Teacher owner duyệt Enrollment; Admin không duyệt từng request.
- `APPROVED` là điều kiện để cấp materials/slide/Tutor, trừ historical policy đã định nghĩa.
- Archive/lock không hard-delete enrollment, learning history hoặc Note.

### Document/Quiz

```text
Document: UPLOADING → PENDING_PROCESSING → PROCESSING → READY | FAILED → DELETING
Quiz:     GENERATING → REVIEW_REQUIRED → READY | REJECTED | GENERATION_FAILED → ARCHIVED
```

- Teacher PDF không gọi AI; Teacher PPTX và Personal PDF gọi pipeline đúng loại.
- Java kiểm lại mọi citation/source/Quiz output trước khi lưu.
- Quiz submit/scoring là transaction và không nhận score từ client/LLM.

## 6. Security và integration

- Endpoint dùng deny-by-default, role guard và resource-level access policy.
- Không lộ sự tồn tại của resource ngoài scope; không trả storage key/internal AI metadata.
- AI request có service credential, `X-Request-Id`, `X-Schema-Version: 2`, timeout và authorized document/version/location scope.
- Job mutation có `Idempotency-Key`; retry chỉ cho thao tác an toàn/idempotent.
- Upload kiểm extension, MIME thực, size và filename; signed URL tối đa 5 phút.
- Log/audit không chứa document, prompt, answer, Note, password, token hoặc secret.

## 7. Migration dự kiến

Migration chỉ tiến, không sửa migration đã chạy:

1. schema/extension cần cho `app`, users/roles/refresh sessions;
2. subjects, semesters;
3. course_offerings, join-code hash/hint/index;
4. course_enrollments và unique Student–Offering;
5. documents, publications, processing jobs metadata;
6. slides, notes, learning events;
7. conversations/messages/citations;
8. quizzes/questions/options/attempts/answers;
9. study plans/tasks/sessions;
10. feedback/audit/settings.

Chi tiết bảng/constraint tại `docs/database-plan.md`. Không tạo bảng vector trong schema `app`.

## 8. Milestone

| Mốc | Nội dung | Điều kiện hoàn thành |
|---|---|---|
| BE-M0 | Maven scaffold, config validation, error envelope, health | Build/test; không có secret mặc định |
| BE-M1 | Auth/session/RBAC/User | login/refresh/logout/role guard đạt |
| BE-M2 | Subject/Semester/Course Offering/join code | Teacher self-create, Admin catalog/monitor đúng |
| BE-M3 | Enrollment authorization | request/approve/reject và access policy đạt |
| BE-M4 | Document/publication/storage/PPTX handoff | file policy, owner scope, async status đạt |
| BE-M5 | Slide/Note/Personal conversation + AI adapter | contract v2, citation revalidation, NO_EVIDENCE đạt |
| BE-M6 | Quiz lifecycle/scoring | REVIEW_REQUIRED và Java scoring đạt |
| BE-M7 | Progress/Statistics/Study Plan | idempotent event, no Topic Mastery đạt |
| BE-M8 | Admin/audit/hardening/E2E | demo flow, performance/security đạt |

## 9. Test strategy

- Domain unit test cho mọi state transition và policy.
- MVC contract: valid input, invalid input, output/error schema cho từng public boundary.
- Repository integration với PostgreSQL; unique/FK/check/index được kiểm chứng.
- Access matrix: Student `PENDING/REJECTED`, Teacher khác owner, Admin privacy.
- AI adapter với fake server: timeout, malformed JSON, wrong schema, citation ngoài scope, `NO_EVIDENCE`.
- Storage test: MIME/size, signed URL, delete/retry idempotent.
- Quiz test: option trùng, answer index sai, client gửi score giả, submit lặp.
- E2E dùng seed tổng hợp theo `docs/demo-flow.md`.

## 10. Dependency và bàn giao

- FE phụ thuộc public contract; Python phụ thuộc internal contract, không phụ thuộc Java entity.
- Trước khi đổi wire shape phải cập nhật `docs/api-plan.md` và contract test hai phía.
- Docker chỉ thuộc kế hoạch toàn dự án; không chạy/triển khai container trong mốc lập kế hoạch này.
- Kết thúc mỗi mốc báo file đổi, migration, test command, contract ảnh hưởng và việc còn lại.

