"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api-client";
import type { AdminFeedback, AdminFeedbackStatus, AdminPage } from "@/types/admin";
import { AdminHeader, AdminModal, AdminPagination, AdminStatus, adminDate, adminErrorMessage, adminInput, adminPrimaryButton, adminSecondaryButton, adminTable, adminTd, adminTh } from "@/components/admin/admin-ui";
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
  const [selected, setSelected] = useState<AdminFeedback | null>(null);
  const [status, setStatus] = useState<AdminFeedbackStatus>("OPEN");
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  /** Args: selected report. Input: row action. Output: report content and resolution form. Errors: none. */
  function openReport(report: AdminFeedback): void {
    setSelected(report); setStatus(report.status); setResolution(report.resolution ?? ""); setActionError(null);
  }

  /** Args: form event. Input: report ID/status/resolution. Output: updated report and refreshed queue. Errors: shown in modal. */
  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setActionError(null);
    try {
      await adminApi.updateFeedbackReport(selected.id, { status, resolution: resolution.trim() });
      setSelected(null); setSuccess("Đã cập nhật phản hồi."); setLoading(true); setReload((value) => value + 1);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <AdminHeader title="Phản hồi hệ thống" description="Xem báo cáo từ sinh viên và giảng viên, ghi nhận cách xử lý." />
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    <label className="block max-w-xs text-xs font-semibold text-slate-600">Trạng thái<select value={filter} onChange={(event) => { setFilter(event.target.value as AdminFeedbackStatus | "ALL"); setPage(0); setLoading(true); }} className={`mt-1 ${adminInput}`}><option value="ALL">Tất cả</option><option value="OPEN">Chưa xử lý</option><option value="RESOLVED">Đã xử lý</option></select></label>
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-12"><LoadingSpinner size="lg" text="Đang tải phản hồi..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Chưa có phản hồi phù hợp" description="Báo cáo mới sẽ xuất hiện khi người dùng gửi qua hệ thống." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className={adminTable}><thead><tr>{["Tiêu đề", "Loại", "Người gửi", "Tạo lúc", "Trạng thái", ""].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((report) => <tr key={report.id}><td className={adminTd}>{report.title}</td><td className={adminTd}>{report.type}</td><td className={`${adminTd} font-mono text-xs`}>{report.reporterId}</td><td className={adminTd}>{adminDate(report.createdAt)}</td><td className={adminTd}><AdminStatus status={report.status} /></td><td className={adminTd}><button type="button" onClick={() => openReport(report)} className={adminSecondaryButton}>Xem & xử lý</button></td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}
    {selected && <AdminModal title={selected.title} onClose={() => setSelected(null)} busy={busy}><form onSubmit={save} className="space-y-4">
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="mb-2 text-xs text-slate-500">{selected.type} · {adminDate(selected.createdAt)}</p><p className="whitespace-pre-wrap break-words">{selected.content}</p></div>
      <label className="block text-sm font-semibold">Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as AdminFeedbackStatus)} className={`mt-1 ${adminInput}`}><option value="OPEN">Chưa xử lý</option><option value="RESOLVED">Đã xử lý</option></select></label>
      <label className="block text-sm font-semibold">Cách xử lý<textarea rows={4} value={resolution} onChange={(event) => setResolution(event.target.value)} className={`mt-1 ${adminInput}`} placeholder="Ghi lại kết quả xử lý nếu có" /></label>
      {actionError && <ErrorAlert message={actionError} />}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setSelected(null)} disabled={busy} className={adminSecondaryButton}>Đóng</button><button type="submit" disabled={busy} className={adminPrimaryButton}>{busy ? "Đang lưu..." : "Lưu xử lý"}</button></div>
    </form></AdminModal>}
  </div>;
}
