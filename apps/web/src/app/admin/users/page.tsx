import React from "react";
import { AdminDataPage } from "@/components/admin/admin-data-page";

export default function AdminUsersPage(): React.JSX.Element {
  return <AdminDataPage title="Quản lý người dùng" description="Quản lý tài khoản, vai trò và trạng thái; Admin không đọc dữ liệu học tập riêng tư." columns={["Họ tên", "Email", "Vai trò", "Trạng thái"]} rows={[]} emptyTitle="Chưa có dữ liệu người dùng" emptyDescription="Java Backend chưa cung cấp API quản lý người dùng cho giao diện này; hệ thống không hiển thị tài khoản giả." />;
}
