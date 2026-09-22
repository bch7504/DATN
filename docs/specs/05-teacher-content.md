# Feature Specification — Teacher Content Management

## 1. Mục tiêu

Cho phép Teacher xem phạm vi giảng dạy, danh sách Student, quản lý kho tài liệu và phân phối file đúng ClassSubject được Admin gán.

## 2. Functional requirements

| ID | Priority | Requirement |
|---|---|---|
| TCH-FR-001 | MUST | Teacher xem ClassSubject active được phân công. |
| TCH-FR-002 | MUST | Teacher xem danh sách Student active trong ClassSubject được phân công. |
| TCH-FR-003 | MUST | Teacher upload và quản lý PDF/PPTX tối đa 50 MB. |
| TCH-FR-004 | MUST | File mới nằm trong library và chưa tự public. |
| TCH-FR-005 | MUST | Teacher public một document tới một hoặc nhiều ClassSubject được phân công. |
| TCH-FR-006 | MUST | Teacher revoke publication mà không xóa file library. |
| TCH-BR-001 | MUST | Teacher không dùng document của Teacher khác hoặc public ngoài assignment. |
| TCH-BR-002 | MUST | PPTX chỉ public khi `READY`; PDF public để Student tải xuống. |

## 3. Assignment và Student list contracts

### `GET /api/v1/teacher/class-subjects`

- **Input:** pagination, optional semester/year/status.
- **Output:** ClassSubject active do current Teacher phụ trách, kèm Class/Subject và số Student.
- **Errors:** `401`; không nhận `teacherId` từ client.

### `GET /api/v1/teacher/class-subjects/{id}/students`

- **Input:** assigned ClassSubject, pagination và optional search.
- **Output:** read-only `{studentId, fullName, email, membershipStatus, joinedAt}`.
- **Errors:** `404` nếu Teacher không được phân công.
- **Privacy:** không trả Personal Document, Note, chat, plan, Quiz result hoặc progress cá nhân.

## 4. Teacher Library contracts

### `POST /api/v1/teacher/documents`

- **Input:** multipart `file`; PDF/PPTX, MIME hợp lệ, `size <= 50 MB`.
- **Output:** `202` với document metadata và processing status.
- **Errors:** `413`, `415`, `422`, `503 STORAGE_UNAVAILABLE`.
- **Side effect:** lưu object; PPTX enqueue render/extract/index; PDF scan metadata rồi READY.

### Query/update/delete

- `GET /api/v1/teacher/documents`: chỉ document current Teacher, có pagination/filter status/type.
- `GET /api/v1/teacher/documents/{id}`: metadata, processing error an toàn và active publications.
- `PATCH /api/v1/teacher/documents/{id}`: chỉ sửa display name/description.
- `DELETE /api/v1/teacher/documents/{id}`: `409 DOCUMENT_HAS_ACTIVE_PUBLICATIONS`; phải revoke trước.
- `POST /api/v1/teacher/documents/{id}/retry`: chỉ document `FAILED`; enqueue idempotent.

Không endpoint nào trả storage key hoặc credential.

## 5. Publication contracts

### `POST /api/v1/teacher/documents/{id}/publications`

- **Input:** `{classSubjectIds:[...]}` có ít nhất một ID duy nhất.
- **Output:** `201` danh sách publication; publication đã tồn tại/revoked được re-activate thay vì tạo duplicate.
- **Errors:** `404 DOCUMENT_OR_ASSIGNMENT_NOT_FOUND`; `409 DOCUMENT_NOT_READY|UNSUPPORTED_PUBLICATION_TYPE`.
- **Validation:** document owner là Teacher hiện tại; tất cả ClassSubject được gán active; file type thuộc PDF/PPTX.
- **Side effect:** tạo/re-activate publication và audit từng target.

### `GET /api/v1/teacher/documents/{id}/publications`

- **Output:** ClassSubject, status, published/revoked timestamps thuộc document owner.

### `DELETE /api/v1/teacher/publications/{publicationId}`

- **Output:** `204`, idempotent.
- **Side effect:** chuyển `REVOKED`; Student mất quyền ở request tiếp theo; document vẫn trong library.

## 6. Processing behavior

- PPTX: `UPLOADING → PENDING_PROCESSING → PROCESSING → READY|FAILED`; READY có slide artifacts.
- PDF: metadata/virus/MIME validation rồi READY; không AI index và không sinh viewer.
- Retry dùng cùng logical document version/idempotency key; không tạo slide/chunk trùng.

## 7. Acceptance criteria

### TCH-AC-001 — Assignment isolation

- **Given** Teacher A không phụ trách ClassSubject X
- **When** A xem Student list hoặc public document tới X
- **Then** Java trả `404`, không lộ metadata của lớp.

### TCH-AC-002 — PDF publication

- **Given** PDF của Teacher ở trạng thái READY
- **When** Teacher public vào ClassSubject được gán
- **Then** Student thấy PDF với action Download và không thấy Viewer/Note/Tutor.

### TCH-AC-003 — Một file, nhiều publication

- **Given** một document thuộc Teacher
- **When** public cho hai ClassSubject hợp lệ
- **Then** có hai publication dùng chung document/object và không nhân bản file.

### TCH-AC-004 — Revoke

- **Given** publication đang active
- **When** Teacher revoke
- **Then** Student mất quyền ngay; library document và publication audit vẫn được giữ.
