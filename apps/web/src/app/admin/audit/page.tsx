import React from "react";
import { AdminDataPage } from "@/components/admin/admin-data-page";

export default function AdminAuditPage(): React.JSX.Element {
  return <AdminDataPage title="Nhật ký hệ thống" description="Audit metadata cho thao tác quản trị; không ghi prompt, nội dung tài liệu hoặc secret." columns={["Thời gian", "Tác nhân", "Hành động", "Đối tượng", "Trace ID"]} rows={[]} emptyTitle="Chưa có nhật ký từ Backend" emptyDescription="Nhật ký thật sẽ được hiển thị khi API kiểm toán hệ thống được triển khai; không sử dụng sự kiện mẫu." />;
}
