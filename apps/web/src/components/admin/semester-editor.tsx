"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api-client";
import { findAdminRecord } from "@/lib/admin-detail";
import type { AdminSemesterInput, AdminSemesterStatus } from "@/types/admin";
import { AdminHeader, adminErrorMessage, adminInput, adminPrimaryButton, adminSecondaryButton } from "./admin-ui";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

const blank: AdminSemesterInput = { code: "", name: "", academicYear: "", startDate: "", endDate: "", status: "UPCOMING", offeringCreationEnabled: false };

/** Args: optional entityId, omitted for creation. Input: authenticated Admin and Java catalog. Output: dedicated semester editor. Errors: displayed inline. */
export function SemesterEditor({ entityId }: { entityId?: string }): React.JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState<AdminSemesterInput>(blank);
  const [loaded, setLoaded] = useState(!entityId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    if (!entityId) return;
    let active = true;
    findAdminRecord(entityId, (page) => adminApi.getSemesters(page))
      .then((record) => { if (active) { if (record) { setForm(record); setLoaded(true); } else setActionError("Không tìm thấy học kỳ."); } })
      .catch((cause: unknown) => { if (active) setActionError(adminErrorMessage(cause)); });
    return () => { active = false; };
  }, [entityId]);

  /** Args: form event. Input: required Semester fields and date range. Output: Java create/update and refreshed page. Errors: inline. */
  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (entityId && !loaded) return;
    const input = { ...form, code: form.code.trim(), name: form.name.trim(), academicYear: form.academicYear.trim(), offeringCreationEnabled: form.status === "CLOSED" ? false : form.offeringCreationEnabled };
    if (!input.code || !input.name || !input.academicYear || !input.startDate || !input.endDate || input.startDate > input.endDate) { setActionError("Nhập đủ thông tin và chọn ngày bắt đầu không sau ngày kết thúc."); return; }
    setBusy(true); setActionError(null);
    try {
      if (!entityId) await adminApi.createSemester(input);
      else await adminApi.updateSemester(entityId!, input);
      router.replace("/admin/catalog/semesters");
    } catch (cause: unknown) { setActionError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }


  return <main className="mx-auto max-w-2xl space-y-5">
    <Link href="/admin/catalog/semesters" className={adminSecondaryButton}>← Danh sách học kỳ</Link>
    <AdminHeader title={entityId ? "Sửa học kỳ" : "Thêm học kỳ"} description="Cập nhật thông tin danh mục đào tạo." />
    {!loaded && !actionError && <LoadingSpinner text="Đang tải học kỳ..." />}
    {!loaded && actionError && <ErrorAlert message={actionError} />}
    {loaded && <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-semibold">Mã học kỳ<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Tên học kỳ<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`mt-1 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Năm học<input required value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })} placeholder="2026-2027" className={`mt-1 ${adminInput}`} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Bắt đầu<input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className={`mt-1 ${adminInput}`} /></label><label className="block text-sm font-semibold">Kết thúc<input required type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className={`mt-1 ${adminInput}`} /></label></div>
      <label className="block text-sm font-semibold">Trạng thái<select value={form.status} onChange={(event) => { const status = event.target.value as AdminSemesterStatus; setForm({ ...form, status, offeringCreationEnabled: status === "CLOSED" ? false : form.offeringCreationEnabled }); }} className={`mt-1 ${adminInput}`}><option value="UPCOMING">Sắp diễn ra</option><option value="ACTIVE">Đang hoạt động</option><option value="CLOSED">Đã đóng</option></select></label>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.offeringCreationEnabled} disabled={form.status === "CLOSED"} onChange={(event) => setForm({ ...form, offeringCreationEnabled: event.target.checked })} /> Cho phép giảng viên mở lớp trong học kỳ này</label>
      {actionError && <ErrorAlert message={actionError} />}
      <div className="flex justify-end gap-2"><Link href="/admin/catalog/semesters" className={adminSecondaryButton}>Hủy</Link><button type="submit" disabled={busy} className={adminPrimaryButton}>{busy ? "Đang lưu..." : "Lưu học kỳ"}</button></div>
    </form>}
  </main>;
}
