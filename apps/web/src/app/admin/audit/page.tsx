import { AdminDataPage } from "@/components/admin/admin-data-page";

export default function AdminAuditPage() {
  return <AdminDataPage title="Nhật ký hệ thống" description="Audit metadata cho thao tác quản trị; không ghi prompt, nội dung tài liệu hoặc secret." columns={["Thời gian", "Tác nhân", "Hành động", "Đối tượng", "Trace ID"]} rows={[{ id: "l1", cells: ["29/09/2026 09:30", "admin@ptit.edu.vn", "LOCK_COURSE_OFFERING", "DBI-01", "req_demo_102"] }, { id: "l2", cells: ["29/09/2026 08:45", "teacher@ptit.edu.vn", "APPROVE_ENROLLMENT", "enroll_demo_12", "req_demo_101"] }]} />;
}
