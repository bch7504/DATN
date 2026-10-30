"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api-client";
import type { AdminDashboard } from "@/types/admin";
import { AdminHeader, adminErrorMessage } from "@/components/admin/admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

const cards: { key: keyof AdminDashboard; label: string; href: string }[] = [
  { key: "users", label: "Người dùng", href: "/admin/users" },
  { key: "students", label: "Sinh viên", href: "/admin/users?role=STUDENT" },
  { key: "teachers", label: "Giảng viên", href: "/admin/users?role=TEACHER" },
  { key: "activeOfferings", label: "Lớp đang mở", href: "/admin/course-offerings?status=ACTIVE" },
  { key: "pendingEnrollments", label: "Yêu cầu tham gia chờ duyệt", href: "/admin/course-offerings" },
  { key: "publishedDocuments", label: "Học liệu đã công bố", href: "/admin/course-offerings" },
  { key: "openFeedbackReports", label: "Phản hồi chưa xử lý", href: "/admin/feedback?status=OPEN" },
];

/** Args: none. Input: GET /admin/dashboard via current Admin session. Output: live operational metrics. Errors: shown with retry. */
export default function AdminDashboardPage(): React.JSX.Element {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect((): (() => void) => {
    let active = true;
    adminApi.getDashboard().then((result) => { if (active) { setData(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); });
    return (): void => { active = false; };
  }, [reload]);

  return <div className="space-y-6">
    <AdminHeader title="Tổng quan hệ thống" description="Số liệu vận hành lấy trực tiếp từ Java Backend." />
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setData(null); setReload((value) => value + 1); }} />}
    {!error && !data && <div className="py-12"><LoadingSpinner size="lg" text="Đang tải tổng quan..." /></div>}
    {data && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => <Link key={card.key} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
        <p className="mt-2 text-3xl font-extrabold text-slate-900">{data[card.key].toLocaleString("vi-VN")}</p>
        <p className="mt-3 text-xs font-semibold text-red-600">Xem chi tiết →</p>
      </Link>)}
    </div>}
  </div>;
}
