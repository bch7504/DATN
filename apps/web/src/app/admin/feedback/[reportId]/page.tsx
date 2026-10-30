"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminApi } from "@/lib/api-client";
import { findAdminRecord } from "@/lib/admin-detail";
import type { AdminFeedback, AdminFeedbackStatus } from "@/types/admin";
import { AdminHeader, adminDate, adminErrorMessage, adminInput, adminPrimaryButton, adminSecondaryButton } from "@/components/admin/admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: none. Input: reportId route segment and authorized Admin API. Output: standalone report resolution screen. Errors: displayed in-page. */
export default function AdminFeedbackDetailPage(): ReactElement {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<AdminFeedback | null>(null);
  const [status, setStatus] = useState<AdminFeedbackStatus>("OPEN");
  const [resolution, setResolution] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const preferredPage = Math.max(0, Number.parseInt(new URLSearchParams(window.location.search).get("page") ?? "0", 10) || 0);
    findAdminRecord(reportId, (page) => adminApi.getFeedbackReports(page, 20), preferredPage)
      .then((record) => {
        if (!active) return;
        setReport(record);
        if (record) { setStatus(record.status); setResolution(record.resolution ?? ""); }
        else setError("Không tìm thấy phản hồi.");
      })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reportId]);

  /** Args: form event. Input: report status/resolution and authorized Admin. Output: Promise<void>; saves resolution via Java. Errors: shows API/validation error. */
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!report) return;
    setBusy(true); setError(null); setSuccess(false);
    try { setReport(await adminApi.updateFeedbackReport(report.id, { status, resolution: resolution.trim() })); setSuccess(true); }
    catch (cause: unknown) { setError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-3xl space-y-5">
    <Link href="/admin/feedback" className={adminSecondaryButton}>← Danh sách phản hồi</Link>
    <AdminHeader title="Xem và xử lý phản hồi" description="Nội dung báo cáo và kết quả xử lý." />
    {loading && <LoadingSpinner size="lg" text="Đang tải phản hồi..." />}
    {error && <ErrorAlert message={error} />}
    {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Đã cập nhật phản hồi.</p>}
    {!loading && report && <form onSubmit={(event) => void save(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><h2 className="text-xl font-bold text-slate-900">{report.title}</h2><p className="mt-1 text-xs text-slate-500">{report.type} · {adminDate(report.createdAt)}</p><p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-700">{report.content}</p></div>
      <label className="block text-sm font-semibold">Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as AdminFeedbackStatus)} className={`mt-1 ${adminInput}`}><option value="OPEN">Chưa xử lý</option><option value="RESOLVED">Đã xử lý</option></select></label>
      <label className="block text-sm font-semibold">Cách xử lý<textarea rows={5} value={resolution} onChange={(event) => setResolution(event.target.value)} className={`mt-1 ${adminInput}`} placeholder="Ghi lại kết quả xử lý nếu có" /></label>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Link href="/admin/feedback" className={adminSecondaryButton}>Về danh sách</Link><button disabled={busy} className={adminPrimaryButton}>{busy ? "Đang lưu..." : "Lưu xử lý"}</button></div>
    </form>}
  </main>;
}
