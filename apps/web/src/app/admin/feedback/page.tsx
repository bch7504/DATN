import { AdminDataPage } from "@/components/admin/admin-data-page";

export default function AdminFeedbackPage() {
  return <AdminDataPage title="Phản hồi hệ thống" description="Theo dõi phản hồi vận hành mà không hiển thị nội dung tài liệu hoặc hội thoại riêng tư." columns={["Mã", "Loại", "Người gửi", "Thời gian", "Trạng thái"]} rows={[{ id: "f1", cells: ["FB-102", "Lỗi hiển thị slide", "Student", "29/09/2026 09:10"], status: "Mới" }, { id: "f2", cells: ["FB-099", "Góp ý giao diện", "Teacher", "28/09/2026 16:20"], status: "Đang xử lý" }]} />;
}
