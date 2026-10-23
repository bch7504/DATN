import React from "react";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminSettingsPage(): React.JSX.Element {
  return <div className="space-y-6"><div><h1 className="text-2xl font-extrabold text-slate-900">Cài đặt hệ thống</h1><p className="mt-1 text-sm text-slate-500">Thiết lập vận hành chung; không cấu hình model hoặc secret từ trình duyệt.</p></div><EmptyState title="Chưa có cài đặt từ Backend" description="Các tùy chọn chỉ được hiển thị khi có API đọc và lưu cấu hình thật; công tắc mô phỏng đã được loại bỏ." /></div>;
}
