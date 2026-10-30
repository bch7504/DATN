# Thiết kế lớp — Giảng viên giao bài tập và xem bài nộp

Ngày đối chiếu code: 30/10/2026. Bản thiết kế để dựng trong Visual Paradigm theo ba vùng View – DAO – Entity.

## 1. Phạm vi và quy ước

- Luồng: danh sách bài tập → tạo nháp → chi tiết → sửa nháp/công bố → xem tình trạng nộp → xem/tải tệp. Bao gồm thông báo trong ứng dụng, nhắc hạn, báo hết hạn và hàng đợi email liên quan.
- Thao tác Student nhập câu trả lời, tải tệp và nộp/nộp lại thuộc sơ đồ tiếp theo. Trong sơ đồ này Teacher chỉ đọc dữ liệu bài nộp.
- Tên View kết thúc bằng `.view`; tên DAO kết thúc bằng `DAO`; Entity dùng tên nghiệp vụ bình thường.
- Các tên DAO là tên thiết kế ánh xạ tới Repository/Store/Port có thật; không phải các file `...DAO.java` hiện có.
- Lời gọi thật đi qua Java API và application service. Phụ thuộc View → DAO trong mô hình rút gọn không có nghĩa frontend kết nối trực tiếp database.
- `AssignmentService` và `NotificationService` vẫn sở hữu luật nghiệp vụ, kiểm quyền và phối hợp truy cập dữ liệu. Không chuyển các luật này vào DAO chỉ để giống mẫu trình bày.
- Lược getter/setter, constructor JPA, loading/error và chi tiết HTTP trong hình.

**Phạm vi đầy đủ bên dưới gồm 6 View, 10 DAO và 10 Entity.** Enum và DTO không được tính là bảng dữ liệu.

## 2. Vùng View

Tên View là tên thiết kế; không khẳng định mỗi View là một class TypeScript hoặc một file riêng.

| View | Màn thực tế | Thuộc tính | Thao tác |
| --- | --- | --- | --- |
| `TeacherAssignments.view` | `/teacher/assignments` | `offerings: CourseOffering[]`; `offeringId: UUID [0..1]`; `items: CourseAssignment[]` | `changeOffering(offeringId: UUID): void`; `openAssignment(item: CourseAssignment): void`; mở màn tạo mới |
| `NewAssignment.view` | `/teacher/assignments/new` | `offerings: CourseOffering[]`; `offeringId: UUID`; `title: String`; `description: String`; `dueAt: DateTime` | `loadEditor(): Promise<void>`; `saveDraft(): Promise<void>` |
| `EditAssignment.view` | `/teacher/assignments/{assignmentId}/edit` | `assignmentId: UUID`; `offeringId: UUID`; `title: String`; `description: String`; `dueAt: DateTime` | `loadEditor(): Promise<void>`; `saveDraft(): Promise<void>` |
| `AssignmentDetail.view` | `/teacher/assignments/{assignmentId}` | `assignment: CourseAssignment`; `offering: CourseOffering`; `report: AssignmentStats [0..1]` | `loadDetail(): Promise<void>`; `publish(): Promise<void>`; `refreshReport(): Promise<void>`; `previewAttachment(studentId: UUID, attachmentId: UUID, fileName: String): Promise<void>`; `download(studentId: UUID, attachmentId: UUID, fileName: String): Promise<void>` |
| `AssignmentPreview.view` | Popup trong màn chi tiết | `url: String`; `fileName: String`; `contentType: String` | hiển thị PDF/ảnh; `closePreview(): void` |
| `NotificationBell.view` | Chuông và popup dùng chung của Teacher | `userId: UUID`; `notifications: StudentNotification[]`; `unreadOnly: boolean`; `unreadCount: int [0..1]`; `page: int`; `totalPages: int` | `refreshUnreadCount(): Promise<void>`; `loadPage(nextPage: int, append: boolean): Promise<void>`; `markRead(notificationId: UUID): Promise<void>` |

- Tạo và sửa dùng chung `AssignmentEditor`, nhưng có hai route và hai mục đích riêng nên trình bày thành hai View.
- Bảng tình trạng nộp nằm trong `AssignmentDetail.view`; hiện không có màn/route độc lập cho danh sách bài nộp.
- `AssignmentPreview.view` là biên giao diện mô hình hóa từ popup nhúng; chưa có component/file riêng. `url` là object URL tạm sau khi Java trả nội dung tệp, không phải storage key hay URL S3 công khai.
- Chuông có tên component `NotificationBell`, dù file vẫn tên `student-notification-bell.tsx`.
- User ID được lấy từ phiên đăng nhập; người dùng không nhập ID để tự nhận quyền.

## 3. Vùng DAO

Service phải kiểm tra Teacher đang hoạt động và quyền sở hữu lớp/bài tập trước khi trả dữ liệu. Các phương thức truy cập dữ liệu không tự cấp quyền.

| DAO thiết kế | Ánh xạ trong code | Phương thức cho phạm vi này |
| --- | --- | --- |
| `UserAccountDAO` | `UserAccountStore` | `findById(id: UUID): UserAccount [0..1]`; `findAllByIdIn(ids: UUID[]): UserAccount[]` |
| `SubjectDAO` | `SubjectRepository` | `findAllById(ids: UUID[]): Subject[]` |
| `SemesterDAO` | `SemesterRepository` | `findAllById(ids: UUID[]): Semester[]` |
| `CourseOfferingDAO` | `CourseOfferingRepository` | `findById(id: UUID): CourseOffering [0..1]`; `findByTeacherId(teacherId: UUID): CourseOffering[]` |
| `CourseEnrollmentDAO` | `CourseEnrollmentRepository` | `findByCourseOfferingIdAndStatus(offeringId: UUID, status: EnrollmentStatus): CourseEnrollment[]` |
| `CourseAssignmentDAO` | `CourseAssignmentRepository` | `findById(id: UUID): CourseAssignment [0..1]`; `findByCourseOfferingIdOrderByCreatedAtDesc(offeringId: UUID): CourseAssignment[]`; `save(item: CourseAssignment): CourseAssignment` |
| `AssignmentSubmissionDAO` | `AssignmentSubmissionRepository` | `findByAssignmentId(assignmentId: UUID): AssignmentSubmission[]`; `findByAssignmentIdAndStudentId(assignmentId: UUID, studentId: UUID): AssignmentSubmission [0..1]` |
| `AssignmentSubmissionAttachmentDAO` | `AssignmentSubmissionAttachmentRepository` | `findBySubmissionIdOrderByCreatedAt(submissionId: UUID): AssignmentSubmissionAttachment[]`; `findByIdAndSubmissionId(id: UUID, submissionId: UUID): AssignmentSubmissionAttachment [0..1]` |
| `NotificationDAO` | `NotificationStore` | Các phương thức tạo sự kiện bên dưới; `findOwned(userId: UUID, unreadOnly: boolean, page: int, size: int): PageResult<StudentNotification>`; `findOwned(notificationId: UUID, userId: UUID): StudentNotification [0..1]`; `save(item: StudentNotification): StudentNotification` |
| `NotificationEmailOutboxDAO` | `NotificationEmailOutbox`, `JdbcNotificationEmailOutbox` | `enqueue(notificationId: UUID, nextAttemptAt: Instant): void`; `lockDue(now: Instant, limit: int): PendingNotificationEmail[]`; `markSent(notificationId: UUID, deliveredAt: Instant): void`; `markSkipped(notificationId: UUID): void`; `markAttemptFailed(notificationId: UUID, attemptCount: int, retryAt: Instant, terminal: boolean): void` |

Các chữ ký đầy đủ để nhập vào Visual Paradigm:

```text
+createEventIfAbsent(recipientId: UUID, type: NotificationType,
  title: String, message: String, sourceType: String, sourceId: UUID,
  dueAt: Instant [0..1], createdAt: Instant, emailStudent: boolean): boolean
+createAssignmentPublishedIfAbsent(studentId: UUID, assignmentId: UUID,
  assignmentTitle: String, dueAt: Instant, createdAt: Instant): boolean
+createAssignmentDeadlineReminderIfAbsent(studentId: UUID, assignmentId: UUID,
  assignmentTitle: String, dueAt: Instant, createdAt: Instant): boolean
```

`true` nghĩa là vừa tạo thông báo; `false` nghĩa là sự kiện đã tồn tại. Lỗi persistence được chuyển về service để rollback transaction.

Nếu thể hiện nhắc hạn và hết hạn trong cùng hình, `CourseAssignmentDAO` có thêm:

```text
+findByStatusAndReminderAtLessThanEqualAndReminderSentAtIsNull(
  status: AssignmentStatus, now: Instant): CourseAssignment[]
+findByStatusAndDueAtLessThanEqualAndExpiryNotifiedAtIsNull(
  status: AssignmentStatus, now: Instant): CourseAssignment[]
```

`AssignmentReminderJob` gọi tác vụ nhắc hạn/hết hạn; `NotificationEmailDeliveryJob` xử lý email. Đây là các job thực thi, không phải Entity hoặc View. Có thể đặt chúng trong ghi chú cạnh vùng thông báo.

## 4. Vùng Entity

Các thuộc tính có visibility private (`-`). UUID tham chiếu giữ theo implementation; các association trong mục 5 mô tả ý nghĩa nghiệp vụ của chúng.

### 4.1 UserAccount — app.users

```text
-id: UUID
-email: String
-username: String
-passwordHash: String
-fullName: String
-timeZone: String
-role: UserRole
-status: UserStatus
-emailVerifiedAt: Instant [0..1]
-createdAt: Instant
-updatedAt: Instant
```

Teacher và Student là hai vai trò `TEACHER`/`STUDENT` của cùng entity. Code không có hai entity con độc lập `Teacher` và `Student`.

### 4.2 Subject — app.subjects

```text
-id: UUID
-code: String
-name: String
-credits: int
-description: String [0..1]
-status: String
-createdAt: Instant
-updatedAt: Instant
```

### 4.3 Semester — app.semesters

```text
-id: UUID
-code: String
-name: String
-academicYear: String
-startDate: LocalDate
-endDate: LocalDate
-status: SemesterStatus
-offeringCreationEnabled: boolean
-createdAt: Instant
-updatedAt: Instant
```

Subject và Semester cung cấp mã/tên môn và học kỳ cho danh sách lớp. Không đưa thao tác quản trị danh mục vào chức năng giao bài tập.

### 4.4 CourseOffering — app.course_offerings

```text
-id: UUID
-subjectId: UUID
-semesterId: UUID
-teacherId: UUID
-code: String
-name: String
-joinCodeHash: String [0..1]
-joinCodeHint: String [0..1]
-joinEnabled: boolean
-status: CourseOfferingStatus
-archivedAt: Instant [0..1]
-lockedAt: Instant [0..1]
-createdAt: Instant
-updatedAt: Instant
+isOwnedBy(teacherId: UUID): boolean
```

Tạo lớp, đổi mã lớp và duyệt ghi danh thuộc chức năng khác.

### 4.5 CourseEnrollment — app.course_enrollments

```text
-id: UUID
-courseOfferingId: UUID
-studentId: UUID
-status: EnrollmentStatus
-requestedAt: Instant
-decidedAt: Instant [0..1]
-decidedBy: UUID [0..1]
-removedAt: Instant [0..1]
-decisionNote: String [0..1]
-createdAt: Instant
-updatedAt: Instant
+isApproved(): boolean
```

Enrollment xác định mọi Student hiện được duyệt, kể cả người chưa có bài nộp. Luồng này chỉ đọc trạng thái, không approve/reject.

### 4.6 CourseAssignment — app.course_assignments

```text
-id: UUID
-courseOfferingId: UUID
-teacherId: UUID
-title: String
-description: String
-dueAt: Instant
-reminderAt: Instant
-reminderSentAt: Instant [0..1]
-expiryNotifiedAt: Instant [0..1]
-status: AssignmentStatus
-publishedAt: Instant [0..1]
-createdAt: Instant
-updatedAt: Instant
+update(title: String, description: String, dueAt: Instant,
  reminderAt: Instant, now: Instant): void
+publish(now: Instant): void
+markReminderSent(now: Instant): void
+markExpiryNotified(now: Instant): void
```

`AssignmentStatus = {DRAFT, PUBLISHED}`. Không tự thêm `OVERDUE` vào enum. Hết hạn được xác định bằng `dueAt`; marker ghi nhận việc phát thông báo. Chỉ bản nháp mới được sửa.

### 4.7 AssignmentSubmission — app.assignment_submissions

```text
-id: UUID
-assignmentId: UUID
-studentId: UUID
-answerText: String [0..1]
-submittedAt: Instant
-status: SubmissionStatus
-createdAt: Instant
-updatedAt: Instant
```

`SubmissionStatus = {ON_TIME, LATE}`. Chưa nộp nghĩa là không có submission tương ứng; `NOT_SUBMITTED` chỉ là kết quả đối chiếu trong báo cáo.

Không đưa thao tác `resubmit()`/upload của Student vào sơ đồ Teacher. Code nghiệp vụ hiện không expose chấm điểm/nhận xét bài tập; không thêm chức năng này chỉ vì CSDL còn cột lịch sử.

### 4.8 AssignmentSubmissionAttachment — app.assignment_submission_attachments

```text
-id: UUID
-submissionId: UUID
-originalFileName: String
-contentType: String
-sizeBytes: long
-storageKey: String
-createdAt: Instant
```

Đây là metadata. Nội dung tệp được lấy qua `AssignmentAttachmentStorage.get(storageKey)` sau khi Java kiểm quyền; không đưa storage key sang View.

### 4.9 StudentNotification — app.notifications

```text
-id: UUID
-userId: UUID
-type: NotificationType
-title: String
-message: String
-sourceType: String
-sourceId: UUID
-dueAt: Instant [0..1]
-readAt: Instant [0..1]
-createdAt: Instant
+markRead(now: Instant): StudentNotification
```

Record `StudentNotification` hiện được dùng cho cả Teacher và Student. Giữ tên để đối chiếu code, kèm ghi chú “thông báo người dùng”. `sourceType/sourceId` là nguồn sự kiện đa hình, không phải FK cố định luôn trỏ tới CourseAssignment.

### 4.10 NotificationEmailOutbox — app.notification_email_outbox

```text
-notificationId: UUID
-status: String
-attemptCount: int
-nextAttemptAt: Instant
-deliveredAt: Instant [0..1]
```

Tên Entity trong thiết kế ánh xạ tới `NotificationEmailOutboxJpaEntity`. Trạng thái gồm `PENDING`, `SENT`, `SKIPPED`, `FAILED`. Khóa chính cũng là FK tới thông báo. Teacher nhận trong ứng dụng; email được xếp hàng cho Student đủ điều kiện.

## 5. Quan hệ Entity

| Đầu 1 | Quan hệ | Đầu còn lại | Vai trò/ràng buộc |
| --- | --- | --- | --- |
| UserAccount | `1 — 0..*` | CourseOffering | teacherId, người sở hữu có role TEACHER |
| Subject | `1 — 0..*` | CourseOffering | subjectId |
| Semester | `1 — 0..*` | CourseOffering | semesterId |
| CourseOffering | `1 — 0..*` | CourseEnrollment | ghi danh vào lớp |
| UserAccount | `1 — 0..*` | CourseEnrollment | studentId |
| CourseOffering | `1 — 0..*` | CourseAssignment | bài tập thuộc lớp |
| UserAccount | `1 — 0..*` | CourseAssignment | teacherId, người giao bài |
| CourseAssignment | `1 — 0..*` | AssignmentSubmission | bài nộp cho bài tập |
| UserAccount | `1 — 0..*` | AssignmentSubmission | studentId, người nộp |
| AssignmentSubmission | `1 ◆— 0..5` | AssignmentSubmissionAttachment | tệp thuộc riêng bài nộp, không chia sẻ |
| UserAccount | `1 — 0..*` | StudentNotification | userId, người nhận |
| StudentNotification | `1 ◆— 0..1` | NotificationEmailOutbox | hàng đợi email thuộc riêng thông báo |

- Hình thoi đen đặt ở AssignmentSubmission và StudentNotification. Căn cứ là sở hữu riêng và vòng đời; migration V6/V8 cũng đặt FK ON DELETE CASCADE cho hai quan hệ này.
- Cặp `(assignmentId, studentId)` duy nhất: mỗi Student có tối đa một bài nộp hiện tại cho một bài tập. Nộp lại thay nội dung hiện tại.
- Các liên kết còn lại dùng association thường. Không suy ra composition chỉ từ tên FK hoặc giả định xóa cha thì mất con.
- `CourseEnrollment.decidedBy` có thể được thể hiện bằng association tùy chọn tới UserAccount, vai trò người quyết định. Đây là liên kết phụ chỉ đọc trong luồng này.

## 6. Phụ thuộc giữa các vùng

Lời gọi thật đi qua Java API và application service:

```text
TeacherAssignments.view
  → CourseOfferingDAO, SubjectDAO, SemesterDAO, CourseAssignmentDAO
NewAssignment.view / EditAssignment.view
  → CourseOfferingDAO, CourseAssignmentDAO
AssignmentDetail.view
  → CourseAssignmentDAO, CourseOfferingDAO, CourseEnrollmentDAO,
    UserAccountDAO, AssignmentSubmissionDAO, AssignmentSubmissionAttachmentDAO
AssignmentPreview.view
  → dữ liệu tệp do AssignmentDetail.view lấy từ Java;
    backend dùng AssignmentSubmissionAttachmentDAO và AssignmentAttachmentStorage
NotificationBell.view
  → NotificationDAO
```

Khi công bố, AssignmentService đọc enrollment APPROVED và gọi NotificationStore; store có thể xếp hàng qua NotificationEmailOutbox. Thể hiện bằng dependency có nhãn service/API hoặc ghi chú, không biểu diễn DAO tự quyết định nghiệp vụ.

## 7. Quy tắc đặt cạnh hình

1. Lưu nháp chưa giao bài; công bố tạo thông báo cho Teacher và các Student hiện được duyệt.
2. Báo cáo dựa trên mọi enrollment hiện APPROVED, kể cả người được duyệt sau hạn. Chưa nộp được xác định bằng đối chiếu roster với submission.
3. Nhắc hạn chỉ gửi trước hạn cho Student chưa nộp. Hết hạn có thông báo cho Teacher và Student được duyệt chưa nộp; marker và khóa sự kiện chống trùng.
4. Thông báo Teacher nhận khi Student nộp lần đầu là sự kiện đầu vào từ sơ đồ Student nộp bài; không đưa thao tác submit của Student vào View Teacher.
5. AssignmentStats, StudentResult, AttachmentDownload và PendingNotificationEmail là DTO/projection, không phải bảng/entity riêng.
6. Không có lớp con Teacher/Student trong code hiện tại; thể hiện vai trò trên association tới UserAccount.

## 8. Nguồn đối chiếu

- [Danh sách bài tập](../apps/web/src/app/teacher/assignments/page.tsx), [tạo/sửa](../apps/web/src/app/teacher/assignments/assignment-editor.tsx), [chi tiết và popup](../apps/web/src/app/teacher/assignments/[assignmentId]/page.tsx).
- [Chuông thông báo](../apps/web/src/components/layout/student-notification-bell.tsx).
- [AssignmentService](../services/backend/src/main/java/com/studyflow/assignment/application/AssignmentService.java), [DTO bài tập/báo cáo](../services/backend/src/main/java/com/studyflow/assignment/api/AssignmentResponses.java), [Entity và repository bài tập](../services/backend/src/main/java/com/studyflow/assignment/domain/).
- [Lớp học phần](../services/backend/src/main/java/com/studyflow/courseoffering/domain/CourseOffering.java), [ghi danh](../services/backend/src/main/java/com/studyflow/enrollment/domain/CourseEnrollment.java), [người dùng](../services/backend/src/main/java/com/studyflow/user/domain/UserAccount.java).
- [NotificationStore](../services/backend/src/main/java/com/studyflow/notification/application/port/NotificationStore.java), [NotificationEmailOutbox](../services/backend/src/main/java/com/studyflow/notification/application/port/NotificationEmailOutbox.java).
- [API contract](api-plan.md), mục 5.5.
