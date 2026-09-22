# Feature Specification — Student Learning

## 1. Mục tiêu

Cho phép Student truy cập đúng lớp/môn, học liệu đã public và sử dụng Slide Viewer, Note, Tutor theo đúng loại file.

## 2. Functional requirements

| ID | Priority | Requirement |
|---|---|---|
| STU-FR-001 | MUST | Student xem các Class đang có membership active. |
| STU-FR-002 | MUST | Student xem ClassSubject và Teacher của lớp mình. |
| STU-FR-003 | MUST | Danh sách học liệu chỉ chứa publication active; PPTX xếp trước PDF. |
| STU-FR-004 | MUST | PPTX READY được xem theo slide trên Web, không tải file gốc. |
| STU-FR-005 | MUST | PDF public được tải xuống sau khi Java kiểm quyền. |
| STU-FR-006 | MUST | Student lưu một Note riêng cho từng document/slide. |
| STU-FR-007 | MUST | Slide AI Tutor trả lời kèm citation thuộc PPTX được phép. |
| STU-BR-001 | MUST | PDF Teacher không có viewer, Note, Tutor hoặc page progress. |
| STU-BR-002 | MUST | Publication bị revoke làm mất quyền Student ngay lập tức. |

## 3. Public API contracts

### Class và material queries

| Endpoint | Input/args | Output | Errors |
|---|---|---|---|
| `GET /api/v1/student/classes` | pagination | Class active của Student | `401` |
| `GET /api/v1/student/classes/{classId}/subjects` | `classId` | ClassSubject + Teacher | `404` ngoài membership |
| `GET /api/v1/student/class-subjects/{id}/materials` | `id`, pagination | Publication active, PPTX trước | `404` ngoài scope |
| `GET /api/v1/student/materials/{id}/slides` | PPTX `READY` | slide number + artifact URL ngắn hạn | `409 DOCUMENT_NOT_READY` |
| `GET /api/v1/student/materials/{id}/download` | PDF public | redirect/signed URL ngắn hạn | `403 FILE_TYPE_NOT_DOWNLOADABLE`, `404` |

Material response không chứa storage key hoặc PPTX original URL.

### Note

`GET/PUT /api/v1/student/materials/{documentId}/slides/{number}/note`

- **Args/input:** document PPTX public, `number >= 1`; PUT body `{content}` tối đa 10.000 ký tự.
- **Output:** `{documentId, slideNumber, content, updatedAt}`.
- **Errors:** `404` ngoài scope/slide không tồn tại; `409 PUBLICATION_REVOKED`; `422` quá giới hạn.
- **Side effect:** upsert theo `(studentId, documentId, slideNumber)` và event `NOTE_SAVED`.

### Slide view event

`POST /api/v1/student/materials/{documentId}/slides/{number}/view-events`

- **Input:** header `Idempotency-Key`, slide hợp lệ.
- **Output:** `202` với progress snapshot.
- **Errors:** `404`, `409 PUBLICATION_REVOKED`.
- **Side effect:** ghi event idempotent và cập nhật distinct slide progress.

### Slide AI Tutor

`POST /api/v1/student/materials/{documentId}/slides/{number}/tutor`

- **Input:** `{question}` 1–2.000 ký tự; Java tự tạo allowed slide scope.
- **Output:** `{status:"ANSWERED|NO_EVIDENCE", answer, citations, traceId}`.
- **Citation:** `{documentId, slideNumber, excerpt}`; đúng document và slide cho phép.
- **Errors:** `409 DOCUMENT_NOT_READY`; `422 INVALID_QUESTION`; `503 AI_SERVICE_UNAVAILABLE`.

## 4. Data và side effects

- Đọc `class_students → class_subjects → document_publications → documents`.
- Slide artifact lấy từ `slides`; Note ghi `slide_notes`.
- Progress ghi `learning_progress` và `learning_events`.
- Java revalidate mọi citation trước khi trả Web.

## 5. Acceptance criteria

### STU-AC-001 — Phân loại hành vi file

- **Given** một ClassSubject có PPTX và PDF đã public
- **When** Student thuộc lớp mở danh sách học liệu
- **Then** PPTX có Viewer/Note/Tutor nhưng không download; PDF chỉ có download.

### STU-AC-002 — Revoke publication

- **Given** Student đang có quyền với một publication
- **When** Teacher revoke publication
- **Then** lần gọi API tiếp theo không trả tài liệu, slide, note hoặc Tutor access.

### STU-AC-003 — Citation isolation

- **Given** Student hỏi trên slide 12 của document A
- **When** Python trả citation thuộc document B hoặc slide ngoài scope
- **Then** Java loại response, ghi safe error code và không trả citation sai cho Student.
