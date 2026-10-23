import React from "react";
import { AdminDataPage } from "@/components/admin/admin-data-page";

export default function AdminFeedbackPage(): React.JSX.Element {
  return <AdminDataPage title="Phản hồi hệ thống" description="Theo dõi phản hồi vận hành mà không hiển thị nội dung tài liệu hoặc hội thoại riêng tư." columns={["Mã", "Loại", "Người gửi", "Thời gian", "Trạng thái"]} rows={[]} emptyTitle="Chưa có phản hồi từ Backend" emptyDescription="Danh sách sẽ xuất hiện khi API phản hồi hệ thống được triển khai; không sử dụng phản hồi mẫu." />;
}
