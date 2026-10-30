"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api-client";
import type { AdminOffering, AdminOfferingStatus, AdminPage } from "@/types/admin";
import { AdminConfirmDialog, AdminHeader, AdminPagination, AdminStatus, adminErrorMessage, adminInput, adminSecondaryButton, adminTable, adminTd, adminTh } from "@/components/admin/admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";

type OfferingAction = { offering: AdminOffering; kind: "lock" | "archive" };
const statuses: AdminOfferingStatus[] = ["ACTIVE", "LOCKED", "ARCHIVED"];

/** Args: none. Input: Admin monitoring APIs, optional status URL filter. Output: paginated offerings, details and lock/archive controls. Errors: shown inline. */
export default function AdminCourseOfferingsPage(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<AdminOfferingStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminPage<AdminOffering> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [action, setAction] = useState<OfferingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const queryStatus = new URLSearchParams(window.location.search).get("status");
    if (statuses.includes(queryStatus as AdminOfferingStatus)) setStatus(queryStatus as AdminOfferingStatus);
    setReady(true);
  }, []);
  useEffect((): (() => void) => {
    if (!ready) return (): void => {};
    let active = true;
    adminApi.getCourseOfferings(page, 20, status === "ALL" ? undefined : status)
      .then((result) => { if (active) { setData(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [ready, status, page, reload]);

  /** Args: selected Offering and action. Input: ACTIVE offering. Output: in-app confirmation dialog. Errors: none. */
  function prepareAction(offering: AdminOffering, kind: "lock" | "archive"): void {
    setActionError(null); setAction({ offering, kind });
  }

  /** Args: none. Input: confirmed action and Admin session. Output: updated Offering, refreshed list. Errors: shown in confirmation. */
  async function runAction(): Promise<void> {
    if (!action) return;
    setBusy(true); setActionError(null);
    try {
      if (action.kind === "lock") await adminApi.lockOffering(action.offering.id);
      else await adminApi.archiveOffering(action.offering.id);
      setSuccess(action.kind === "lock" ? "Đã khóa lớp học phần." : "Đã lưu trữ lớp học phần.");
      setAction(null); setLoading(true); setReload((value) => value + 1);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <AdminHeader title="Giám sát lớp học phần" description="Giảng viên sở hữu lớp và mã tham gia; quản trị viên xem metadata, khóa hoặc lưu trữ lớp đang mở." />
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {actionError && !action && <ErrorAlert message={actionError} />}
    <label className="block max-w-xs text-xs font-semibold text-slate-600">Trạng thái<select value={status} onChange={(event) => { setStatus(event.target.value as AdminOfferingStatus | "ALL"); setPage(0); setLoading(true); }} className={`mt-1 ${adminInput}`}><option value="ALL">Tất cả</option>{statuses.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-12"><LoadingSpinner size="lg" text="Đang tải lớp học phần..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Không có lớp phù hợp" description="Thử chọn trạng thái khác." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className={adminTable}><thead><tr>{["Mã / Tên lớp", "Môn / Học kỳ", "Giảng viên", "Sinh viên đã duyệt", "Trạng thái", ""].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((offering) => <tr key={offering.id}><td className={adminTd}><div className="font-semibold">{offering.code}</div><div className="text-xs text-slate-500">{offering.name}</div></td><td className={adminTd}>{offering.subjectCode} · {offering.semesterCode}</td><td className={adminTd}>{offering.teacherName}</td><td className={adminTd}>{offering.approvedStudents}</td><td className={adminTd}><AdminStatus status={offering.status} /></td><td className={`${adminTd} whitespace-nowrap`}><Link href={`/admin/course-offerings/${encodeURIComponent(offering.id)}`} className={adminSecondaryButton}>Chi tiết</Link>{offering.status === "ACTIVE" && <><button type="button" onClick={() => prepareAction(offering, "lock")} className="ml-2 text-sm font-semibold text-amber-700">Khóa</button><button type="button" onClick={() => prepareAction(offering, "archive")} className="ml-2 text-sm font-semibold text-red-600">Lưu trữ</button></>}</td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}
    {action && <AdminConfirmDialog title={action.kind === "lock" ? "Khóa lớp học phần?" : "Lưu trữ lớp học phần?"} message={`Lớp ${action.offering.code} sẽ chuyển khỏi trạng thái đang mở; mã tham gia bị tắt.`} confirmLabel={action.kind === "lock" ? "Khóa lớp" : "Lưu trữ lớp"} onCancel={() => setAction(null)} onConfirm={() => void runAction()} busy={busy} error={actionError} />}
  </div>;
}
