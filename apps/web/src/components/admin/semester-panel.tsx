"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api-client";
import type { AdminPage, AdminSemester, AdminSemesterInput, AdminSemesterStatus } from "@/types/admin";
import { AdminConfirmDialog, AdminModal, AdminPagination, AdminStatus, adminErrorMessage, adminInput, adminPrimaryButton, adminSecondaryButton, adminTable, adminTd, adminTh } from "./admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";

const blank: AdminSemesterInput = { code: "", name: "", academicYear: "", startDate: "", endDate: "", status: "UPCOMING", offeringCreationEnabled: false };

/** Args: none. Input: Admin Semester CRUD API. Output: paginated catalog and edit/delete dialogs. Errors: shown inline; Java enforces class references and dates. */
export function SemesterPanel(): React.JSX.Element {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminPage<AdminSemester> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<AdminSemester | "new" | null>(null);
  const [form, setForm] = useState<AdminSemesterInput>(blank);
  const [deleting, setDeleting] = useState<AdminSemester | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let active = true;
    adminApi.getSemesters(page).then((result) => { if (active) { setData(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [page, reload]);

  /** Args: Semester or new marker. Input: row/create action. Output: populated form dialog. Errors: none. */
  function openForm(semester: AdminSemester | "new"): void {
    setEditing(semester); setActionError(null);
    setForm(semester === "new" ? { ...blank } : { code: semester.code, name: semester.name, academicYear: semester.academicYear, startDate: semester.startDate, endDate: semester.endDate, status: semester.status, offeringCreationEnabled: semester.offeringCreationEnabled });
  }

  /** Args: form event. Input: required Semester fields and date range. Output: Java create/update and refreshed page. Errors: inline. */
  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editing) return;
    const input = { ...form, code: form.code.trim(), name: form.name.trim(), academicYear: form.academicYear.trim(), offeringCreationEnabled: form.status === "CLOSED" ? false : form.offeringCreationEnabled };
    if (!input.code || !input.name || !input.academicYear || !input.startDate || !input.endDate || input.startDate > input.endDate) { setActionError("Nhập đủ thông tin và chọn ngày bắt đầu không sau ngày kết thúc."); return; }
    setBusy(true); setActionError(null);
    try {
      if (editing === "new") await adminApi.createSemester(input);
      else await adminApi.updateSemester(editing.id, input);
      setEditing(null); setSuccess(editing === "new" ? "Đã thêm học kỳ." : "Đã cập nhật học kỳ."); setLoading(true); setReload((value) => value + 1);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  /** Args: none. Input: selected Semester ID. Output: deleted entry and refreshed page. Errors: in-use/missing response shown inline. */
  async function remove(): Promise<void> {
    if (!deleting) return;
    setBusy(true); setActionError(null);
    try {
      await adminApi.deleteSemester(deleting.id);
      setDeleting(null); setSuccess("Đã xóa học kỳ."); setPage(0); setLoading(true); setReload((value) => value + 1);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Bật/tắt quyền mở lớp theo từng học kỳ.</p><button type="button" onClick={() => openForm("new")} className={adminPrimaryButton}>+ Thêm học kỳ</button></div>
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-10"><LoadingSpinner text="Đang tải học kỳ..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Chưa có học kỳ" description="Thêm học kỳ để thiết lập thời gian mở lớp." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className={adminTable}><thead><tr>{["Mã", "Tên / Năm học", "Thời gian", "Trạng thái", "Mở lớp", ""].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((semester) => <tr key={semester.id}><td className={adminTd}>{semester.code}</td><td className={adminTd}>{semester.name}<div className="text-xs text-slate-400">{semester.academicYear}</div></td><td className={adminTd}>{semester.startDate} – {semester.endDate}</td><td className={adminTd}><AdminStatus status={semester.status} /></td><td className={adminTd}>{semester.offeringCreationEnabled ? "Cho phép" : "Tắt"}</td><td className={`${adminTd} whitespace-nowrap`}><button type="button" onClick={() => openForm(semester)} className={adminSecondaryButton}>Sửa</button><button type="button" onClick={() => { setDeleting(semester); setActionError(null); }} className="ml-2 text-sm font-semibold text-red-600">Xóa</button></td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}
    {editing && <AdminModal title={editing === "new" ? "Thêm học kỳ" : "Sửa học kỳ"} onClose={() => setEditing(null)} busy={busy}><form onSubmit={save} className="space-y-3">
      <label className="block text-sm font-semibold">Mã học kỳ<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Tên học kỳ<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Năm học<input required value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} placeholder="2026-2027" className={`mt-1 ${adminInput}`} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Bắt đầu<input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className={`mt-1 ${adminInput}`} /></label><label className="block text-sm font-semibold">Kết thúc<input required type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className={`mt-1 ${adminInput}`} /></label></div>
      <label className="block text-sm font-semibold">Trạng thái<select value={form.status} onChange={(event) => { const status = event.target.value as AdminSemesterStatus; setForm({ ...form, status, offeringCreationEnabled: status === "CLOSED" ? false : form.offeringCreationEnabled }); }} className={`mt-1 ${adminInput}`}><option value="UPCOMING">Sắp diễn ra</option><option value="ACTIVE">Đang hoạt động</option><option value="CLOSED">Đã đóng</option></select></label>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.offeringCreationEnabled} disabled={form.status === "CLOSED"} onChange={(event) => setForm({ ...form, offeringCreationEnabled: event.target.checked })} /> Cho phép giảng viên mở lớp trong học kỳ này</label>
      {actionError && <ErrorAlert message={actionError} />}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} disabled={busy} className={adminSecondaryButton}>Hủy</button><button type="submit" disabled={busy} className={adminPrimaryButton}>{busy ? "Đang lưu..." : "Lưu học kỳ"}</button></div>
    </form></AdminModal>}
    {deleting && <AdminConfirmDialog title="Xóa học kỳ?" message={`Học kỳ ${deleting.code} chỉ có thể xóa nếu chưa có lớp học phần.`} confirmLabel="Xóa học kỳ" onCancel={() => setDeleting(null)} onConfirm={() => void remove()} busy={busy} error={actionError} />}
  </div>;
}
