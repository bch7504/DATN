"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api-client";
import type { AdminPage, AdminSystemLog } from "@/types/admin";
import { AdminHeader, AdminPagination, adminDate, adminErrorMessage, adminTable, adminTd, adminTh } from "@/components/admin/admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";

/** Args: none. Input: GET /admin/system-logs. Output: paginated safe audit metadata. Errors: shown with retry. */
export default function AdminAuditPage(): React.JSX.Element {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminPage<AdminSystemLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect((): (() => void) => {
    let active = true;
    adminApi.getSystemLogs(page).then((result) => { if (active) { setData(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [page, reload]);

  return <div className="space-y-5">
    <AdminHeader title="Nhật ký hệ thống" description="Chỉ hiển thị metadata thao tác quản trị; không có tài liệu, prompt hay thông tin đăng nhập." />
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-12"><LoadingSpinner size="lg" text="Đang tải nhật ký..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Chưa có nhật ký" description="Thao tác quản trị mới sẽ được ghi tại đây." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className={adminTable}><thead><tr>{["Thời gian", "Tác nhân", "Hành động", "Đối tượng", "Kết quả", "Trace ID"].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((entry) => <tr key={entry.id}><td className={adminTd}>{adminDate(entry.createdAt)}</td><td className={`${adminTd} font-mono text-xs`}>{entry.actorId}</td><td className={adminTd}>{entry.action}</td><td className={`${adminTd} font-mono text-xs`}>{entry.targetType}: {entry.targetId}</td><td className={adminTd}>{entry.status}</td><td className={`${adminTd} font-mono text-xs`}>{entry.traceId || "—"}</td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}
  </div>;
}
