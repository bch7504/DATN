"use client";

import React, { useState } from "react";

export default function AdminSettingsPage() {
  const [maintenanceNotice, setMaintenanceNotice] = useState(false);
  return <div className="space-y-6"><div><h1 className="text-2xl font-extrabold text-slate-900">Cài đặt hệ thống</h1><p className="mt-1 text-sm text-slate-500">Thiết lập vận hành chung; không cấu hình model hoặc secret từ trình duyệt.</p></div><div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><label className="flex items-center justify-between gap-4"><span><strong className="block text-sm text-slate-800">Hiển thị thông báo bảo trì</strong><span className="text-xs text-slate-500">Dữ liệu demo, chưa gửi thay đổi đến Java Backend.</span></span><input type="checkbox" checked={maintenanceNotice} onChange={(event) => setMaintenanceNotice(event.target.checked)} className="h-5 w-5 accent-[#d71920]" /></label></div></div>;
}
