"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api-client";
import type { AdminFeedback, AdminFeedbackStatus, AdminPage } from "@/types/admin";
import { AdminHeader, AdminPagination, AdminStatus, adminDate, adminErrorMessage, adminInput, adminSecondaryButton, adminTable, adminTd, adminTh } from "@/components/admin/admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";

/** Args: none. Input: Admin feedback page and status update API. Output: report queue and resolution editor. Errors: shown inline. */
export default function AdminFeedbackPage(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<AdminFeedbackStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminPage<AdminFeedback> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const queryStatus = new URLSearchParams(window.location.search).get("status");
    if (queryStatus === "OPEN" || queryStatus === "RESOLVED") setFilter(queryStatus);
    setReady(true);
  }, []);
  useEffect((): (() => void) => {
    if (!ready) return (): void => {};
    let active = true;
    adminApi.getFeedbackReports(page, 20, filter === "ALL" ? undefined : filter)
      .then((result) => { if (active) { setData(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [ready, page, filter, reload]);

  return <div className="space-y-5">
    <AdminHeader title="Phản hồi hệ thống" description="Xem báo cáo từ sinh viên và giảng viên, ghi nhận cách xử lý." />
    <label className="block max-w-xs text-xs font-semibold text-slate-600">Trạng thái<select value={filter} onChange={(event) => { setFilter(event.target.value as AdminFeedbackStatus | "ALL"); setPage(0); setLoading(true); }} className={`mt-1 ${adminInput}`}><option value="ALL">Tất cả</option><option value="OPEN">Chưa xử lý</option><option value="RESOLVED">Đã xử lý</option></select></label>
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-12"><LoadingSpinner size="lg" text="Đang tải phản hồi..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Chưa có phản hồi phù hợp" description="Báo cáo mới sẽ xuất hiện khi người dùng gửi qua hệ thống." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className={adminTable}><thead><tr>{["Tiêu đề", "Loại", "Người gửi", "Tạo lúc", "Trạng thái", ""].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((report) => <tr key={report.id}><td className={adminTd}>{report.title}</td><td className={adminTd}>{report.type}</td><td className={`${adminTd} font-mono text-xs`}>{report.reporterId}</td><td className={adminTd}>{adminDate(report.createdAt)}</td><td className={adminTd}><AdminStatus status={report.status} /></td><td className={adminTd}><Link href={`/admin/feedback/${encodeURIComponent(report.id)}?page=${page}`} className={adminSecondaryButton}>Xem & xử lý</Link></td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}

  </div>;
}
