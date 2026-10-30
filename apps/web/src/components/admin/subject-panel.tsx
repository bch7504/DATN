"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api-client";
import type { AdminPage, AdminSubject, AdminSubjectInput, AdminSubjectStatus } from "@/types/admin";
import { AdminConfirmDialog, AdminModal, AdminPagination, AdminStatus, adminErrorMessage, adminInput, adminPrimaryButton, adminSecondaryButton, adminTable, adminTd, adminTh } from "./admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";

const blank: AdminSubjectInput = { code: "", name: "", credits: 3, description: "", status: "ACTIVE" };

/** Args: none. Input: Admin Subject CRUD API. Output: paginated catalog and edit/delete dialogs. Errors: shown inline; Java enforces references and uniqueness. */
export function SubjectPanel(): React.JSX.Element {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminPage<AdminSubject> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<AdminSubject | "new" | null>(null);
  const [form, setForm] = useState<AdminSubjectInput>(blank);
  const [deleting, setDeleting] = useState<AdminSubject | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let active = true;
    adminApi.getSubjects(page).then((result) => { if (active) { setData(result); setError(null); } })
      .catch((cause: unknown) => { if (active) setError(adminErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [page, reload]);

  /** Args: Subject or new marker. Input: row/create action. Output: populated form dialog. Errors: none. */
  function openForm(subject: AdminSubject | "new"): void {
    setEditing(subject); setActionError(null);
    setForm(subject === "new" ? { ...blank } : { code: subject.code, name: subject.name, credits: subject.credits, description: subject.description ?? "", status: subject.status });
  }

  /** Args: form event. Input: validated Subject fields. Output: Java create/update and refreshed list. Errors: inline. */
  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editing) return;
    const input = { ...form, code: form.code.trim(), name: form.name.trim(), description: form.description?.trim() || "" };
    if (!input.code || !input.name || !Number.isInteger(input.credits) || input.credits <= 0) { setActionError("Nhập mã, tên và số tín chỉ nguyên dương."); return; }
    setBusy(true); setActionError(null);
    try {
      if (editing === "new") await adminApi.createSubject(input);
      else await adminApi.updateSubject(editing.id, input);
      setEditing(null); setSuccess(editing === "new" ? "Đã thêm môn học." : "Đã cập nhật môn học."); setLoading(true); setReload((value) => value + 1);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  /** Args: none. Input: selected Subject ID. Output: deleted catalog entry and refreshed list. Errors: in-use/missing response shown inline. */
  async function remove(): Promise<void> {
    if (!deleting) return;
    setBusy(true); setActionError(null);
    try {
      await adminApi.deleteSubject(deleting.id);
      setDeleting(null); setSuccess("Đã xóa môn học."); setPage(0); setLoading(true); setReload((value) => value + 1);
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Môn học được giảng viên chọn khi mở lớp.</p><button type="button" onClick={() => openForm("new")} className={adminPrimaryButton}>+ Thêm môn học</button></div>
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {error && <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); setReload((value) => value + 1); }} />}
    {loading && !error ? <div className="py-10"><LoadingSpinner text="Đang tải môn học..." /></div> : !error && data && (data.items.length === 0 ? <EmptyState title="Chưa có môn học" description="Thêm môn học để giảng viên có thể mở lớp học phần." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className={adminTable}><thead><tr>{["Mã", "Tên môn học", "Tín chỉ", "Mô tả", "Trạng thái", ""].map((heading) => <th className={adminTh} key={heading}>{heading}</th>)}</tr></thead><tbody>{data.items.map((subject) => <tr key={subject.id}><td className={adminTd}>{subject.code}</td><td className={adminTd}>{subject.name}</td><td className={adminTd}>{subject.credits}</td><td className={`${adminTd} max-w-xs truncate`} title={subject.description ?? ""}>{subject.description || "—"}</td><td className={adminTd}><AdminStatus status={subject.status} /></td><td className={`${adminTd} whitespace-nowrap`}><button type="button" onClick={() => openForm(subject)} className={adminSecondaryButton}>Sửa</button><button type="button" onClick={() => { setDeleting(subject); setActionError(null); }} className="ml-2 text-sm font-semibold text-red-600">Xóa</button></td></tr>)}</tbody></table></div>)}
    {data && !error && !loading && <AdminPagination page={data.page} totalPages={data.totalPages} totalItems={data.totalItems} onChange={(next) => { setPage(next); setLoading(true); }} />}
    {editing && <AdminModal title={editing === "new" ? "Thêm môn học" : "Sửa môn học"} onClose={() => setEditing(null)} busy={busy}><form onSubmit={save} className="space-y-3">
      <label className="block text-sm font-semibold">Mã môn<input required maxLength={30} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Tên môn<input required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Số tín chỉ<input required min={1} step={1} type="number" value={form.credits} onChange={(event) => setForm({ ...form, credits: Number(event.target.value) })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Mô tả<textarea rows={3} value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Trạng thái<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AdminSubjectStatus })} className={`mt-1 ${adminInput}`}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng dùng</option></select></label>
      {actionError && <ErrorAlert message={actionError} />}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} disabled={busy} className={adminSecondaryButton}>Hủy</button><button type="submit" disabled={busy} className={adminPrimaryButton}>{busy ? "Đang lưu..." : "Lưu môn học"}</button></div>
    </form></AdminModal>}
    {deleting && <AdminConfirmDialog title="Xóa môn học?" message={`Môn ${deleting.code} sẽ bị xóa khỏi danh mục nếu chưa có lớp học phần tham chiếu.`} confirmLabel="Xóa môn học" onCancel={() => setDeleting(null)} onConfirm={() => void remove()} busy={busy} error={actionError} />}
  </div>;
}
