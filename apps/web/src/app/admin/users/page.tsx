import { AdminDataPage } from "@/components/admin/admin-data-page";

export default function AdminUsersPage() {
  return <AdminDataPage title="Quản lý người dùng" description="Quản lý tài khoản, vai trò và trạng thái; Admin không đọc dữ liệu học tập riêng tư." columns={["Họ tên", "Email", "Vai trò", "Trạng thái"]} rows={[{ id: "u1", cells: ["Nguyễn Minh Anh", "student@ptit.edu.vn", "STUDENT"], status: "Hoạt động" }, { id: "u2", cells: ["Trần Thị Giảng Viên", "teacher@ptit.edu.vn", "TEACHER"], status: "Hoạt động" }]} primaryActionLabel="Thêm tài khoản" />;
}
