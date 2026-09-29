import { AdminDataPage } from "@/components/admin/admin-data-page";

export default function AdminCatalogPage() {
  return <AdminDataPage title="Môn học và học kỳ" description="Danh mục dùng chung để Teacher tự tạo Course Offering trong học kỳ được phép." columns={["Mã", "Tên", "Loại", "Trạng thái"]} rows={[{ id: "c1", cells: ["INT1340", "Trí tuệ nhân tạo", "Subject"], status: "ACTIVE" }, { id: "c2", cells: ["2026-1", "Học kỳ 1 năm 2026", "Semester"], status: "ACTIVE" }]} primaryActionLabel="Thêm danh mục" />;
}
