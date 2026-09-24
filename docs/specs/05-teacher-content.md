# Feature Specification — Teacher Course Offering và Content

## 1. Requirements

| ID | Requirement |
|---|---|
| TCH-FR-001 | Teacher tự tạo Course Offering từ Subject + Semester active. |
| TCH-FR-002 | Hệ thống sinh join code duy nhất; owner có thể regenerate/enable/disable. |
| TCH-FR-003 | Owner duyệt/từ chối enrollment `PENDING` và xem danh sách approved tối thiểu. |
| TCH-FR-004 | Teacher upload PDF/PPTX vào Library của mình. |
| TCH-FR-005 | Owner public/revoke document vào một hoặc nhiều Course Offering của mình. |
| TCH-FR-006 | Teacher archive lớp; không hard-delete lịch sử. |

## 2. API chính

- `POST /api/v1/teacher/course-offerings`: `{subjectId,semesterId,name,capacity?}` → lớp `OPEN` + join code one-time display.
- `GET/PATCH /api/v1/teacher/course-offerings/{id}`: owner-only metadata/status.
- `POST /api/v1/teacher/course-offerings/{id}/join-code/regenerate`: rotate code, code cũ vô hiệu.
- `PATCH /api/v1/teacher/course-offerings/{id}/join-code`: `{enabled}`.
- `GET /api/v1/teacher/course-offerings/{id}/enrollments`: filter status/search/pagination.
- `POST /api/v1/teacher/course-offerings/{id}/enrollments/{enrollmentId}/approve|reject`: idempotent transition.
- `POST /api/v1/teacher/documents`: PDF/PPTX <= 50 MB; trả processing status.
- `POST /api/v1/teacher/documents/{id}/publications`: `{courseOfferingIds}` owner-only.
- `DELETE /api/v1/teacher/documents/{id}/publications/{offeringId}`: revoke idempotent.

## 3. Acceptance

- Teacher không tạo lớp với Subject/Semester inactive hoặc sửa lớp Teacher khác.
- Join code không lưu/log dạng rõ sau thời điểm cần thiết; regenerate vô hiệu code cũ.
- Approve/reject chỉ áp dụng request thuộc lớp owner; transition sai trả `409`.
- Một file public nhiều lớp mà không nhân bản object/index.
- Teacher PDF không gửi sang AI; PPTX trả artifact/slide metadata theo job contract.
