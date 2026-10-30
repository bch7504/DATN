"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api-client";
import { findAdminRecord } from "@/lib/admin-detail";
import type { AdminSubjectInput, AdminSubjectStatus } from "@/types/admin";
import { AdminHeader, adminErrorMessage, adminInput, adminPrimaryButton, adminSecondaryButton } from "./admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

const blank: AdminSubjectInput = { code: "", name: "", credits: 3, description: "", status: "ACTIVE" };

/** Args: optional entityId, omitted for creation. Input: authenticated Admin and Java catalog. Output: dedicated subject editor. Errors: displayed inline. */
export function SubjectEditor({ entityId }: { entityId?: string }): React.JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState<AdminSubjectInput>(blank);
  const [loaded, setLoaded] = useState(!entityId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    if (!entityId) return;
    let active = true;
    findAdminRecord(entityId, (page) => adminApi.getSubjects(page))
      .then((record) => { if (active) { if (record) { setForm({ ...record, description: record.description ?? "" }); setLoaded(true); } else setActionError("Không tìm thấy môn học."); } })
      .catch((cause: unknown) => { if (active) setActionError(adminErrorMessage(cause)); });
    return () => { active = false; };
  }, [entityId]);

  /** Args: form event. Input: validated Subject fields. Output: Java create/update and refreshed list. Errors: inline. */
  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (entityId && !loaded) return;
    const input = { ...form, code: form.code.trim(), name: form.name.trim(), description: form.description?.trim() || "" };
    if (!input.code || !input.name || !Number.isInteger(input.credits) || input.credits <= 0) { setActionError("Nhập mã, tên và số tín chỉ nguyên dương."); return; }
    setBusy(true); setActionError(null);
    try {
      if (!entityId) await adminApi.createSubject(input);
      else await adminApi.updateSubject(entityId!, input);
      router.replace("/admin/catalog/subjects");
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }


  return <main className="mx-auto max-w-2xl space-y-5">
    <Link href="/admin/catalog/subjects" className={adminSecondaryButton}>← Danh sách môn học</Link>
    <AdminHeader title={entityId ? "Sửa môn học" : "Thêm môn học"} description="Cập nhật thông tin danh mục đào tạo." />
    {!loaded && !actionError && <LoadingSpinner text="Đang tải môn học..." />}
    {!loaded && actionError && <ErrorAlert message={actionError} />}
    {loaded && <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-semibold">Mã môn<input required maxLength={30} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Tên môn<input required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Số tín chỉ<input required min={1} step={1} type="number" value={form.credits} onChange={(event) => setForm({ ...form, credits: Number(event.target.value) })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Mô tả<textarea rows={3} value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Trạng thái<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AdminSubjectStatus })} className={`mt-1 ${adminInput}`}><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng dùng</option></select></label>
      {actionError && <ErrorAlert message={actionError} />}
      <div className="flex justify-end gap-2"><Link href="/admin/catalog/subjects" className={adminSecondaryButton}>Hủy</Link><button type="submit" disabled={busy} className={adminPrimaryButton}>{busy ? "Đang lưu..." : "Lưu môn học"}</button></div>
    </form>}
  </main>;
}
