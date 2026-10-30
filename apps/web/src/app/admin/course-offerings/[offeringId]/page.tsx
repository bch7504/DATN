"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminApi } from "@/lib/api-client";
import type { AdminOffering } from "@/types/admin";
import { AdminConfirmDialog, AdminHeader, AdminStatus, adminDate, adminErrorMessage, adminSecondaryButton } from "@/components/admin/admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: none. Input: offeringId route segment and authorized Admin API. Output: standalone class detail and control screen. Errors: shown in-page. */
export default function AdminCourseOfferingDetailPage(): ReactElement {
  const { offeringId } = useParams<{ offeringId: string }>();
  const [offering, setOffering] = useState<AdminOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<"lock" | "archive" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /** Args: none. Input: class ID and authorized Admin API. Output: Promise<void>; loads class metadata. Errors: displays API failure. */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try { setOffering(await adminApi.getCourseOffering(offeringId)); setError(""); }
    catch (cause) { setError(adminErrorMessage(cause)); }
    finally { setLoading(false); }
  }, [offeringId]);
  useEffect(() => { void load(); }, [load]);

  /** Args: none. Input: confirmed lock/archive action and current class. Output: Promise<void>; updates Java then refreshes metadata. Errors: displays action failure. */
  async function runAction(): Promise<void> {
    if (!offering || !action) return;
    setBusy(true); setActionError(null);
    try {
      if (action === "lock") await adminApi.lockOffering(offering.id);
      else await adminApi.archiveOffering(offering.id);
      setAction(null); await load();
    } catch (cause) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-3xl space-y-5">
    <Link href="/admin/course-offerings" className={adminSecondaryButton}>← Danh sách lớp học phần</Link>
    <AdminHeader title="Chi tiết lớp học phần" description="Thông tin lớp và trạng thái quản lý." />
    {error && <ErrorAlert message={error} onRetry={() => void load()} />}
    {loading && <LoadingSpinner size="lg" text="Đang tải lớp học phần..." />}
    {!loading && offering && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-red-700">{offering.code}</p><h2 className="text-xl font-bold text-slate-900">{offering.name}</h2></div><AdminStatus status={offering.status} /></div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Môn học</dt><dd>{offering.subjectCode}</dd></div><div><dt className="text-slate-500">Học kỳ</dt><dd>{offering.semesterCode}</dd></div><div><dt className="text-slate-500">Giảng viên</dt><dd>{offering.teacherName}</dd></div><div><dt className="text-slate-500">Sinh viên đã duyệt</dt><dd>{offering.approvedStudents}</dd></div><div><dt className="text-slate-500">Tạo lúc</dt><dd>{adminDate(offering.createdAt)}</dd></div></dl>
      {offering.status === "ACTIVE" && <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setAction("lock")} className={adminSecondaryButton}>Khóa lớp</button><button type="button" onClick={() => setAction("archive")} className={adminSecondaryButton}>Lưu trữ</button></div>}
    </section>}
    {action && offering && <AdminConfirmDialog title={action === "lock" ? "Khóa lớp học phần?" : "Lưu trữ lớp học phần?"} message={`Lớp ${offering.code} sẽ chuyển khỏi trạng thái đang mở; mã tham gia bị tắt.`} confirmLabel={action === "lock" ? "Khóa lớp" : "Lưu trữ lớp"} onCancel={() => setAction(null)} onConfirm={() => void runAction()} busy={busy} error={actionError} />}
  </main>;
}
