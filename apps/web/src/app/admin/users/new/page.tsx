"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import Link from "next/link";
import { adminApi, catalogApi } from "@/lib/api-client";
import type { Subject } from "@/types/course-offering";
import type { AdminUser } from "@/types/admin";
import { AdminHeader, adminErrorMessage, adminInput, adminPrimaryButton, adminSecondaryButton } from "@/components/admin/admin-ui";

/** Args: none. Input: Admin-entered identity, initial password and ACTIVE Java subject catalog.
 * Output: real TEACHER account confirmation; errors: loading/validation/API inline, no fake success. */
export default function NewTeacherPage(): ReactElement {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<AdminUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [subjectId, setSubjectId] = useState("");
  useEffect(() => {
    let active = true;
    catalogApi.getSubjects().then(items => { if(active) setSubjects(items.filter(item => item.status === "ACTIVE")); })
      .catch((cause: unknown) => { if(active) setError(adminErrorMessage(cause)); })
      .finally(() => { if(active) setLoading(false); });
    return () => { active=false; };
  }, []);
  /** Args: form event. Input: validated account and one subject. Output: Promise<void>, confirmation and cleared password.
   * Errors: UTF-8 password limit or Java validation/duplicate/permission errors appear inline. */
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();setError("");
    if(new TextEncoder().encode(password).length>72) { setError("Mật khẩu tối đa 72 byte UTF-8.");return; }
    setBusy(true);
    try {
      setCreated(await adminApi.createTeacher({ fullName:fullName.trim(),email:email.trim(),username:username.trim(),password,subjectId }));
      setPassword("");
    } catch(cause: unknown) { setError(adminErrorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl space-y-5">
    <Link href="/admin/users" className={adminSecondaryButton}>← Danh sách tài khoản</Link>
    <AdminHeader title="Tạo tài khoản Giảng viên" description="Cấp tài khoản và chọn một môn giảng viên phụ trách." />
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status">Đang tải môn học...</p> : created ? <section role="status" className="space-y-3 rounded-2xl border border-green-200 bg-white p-5">
      <h2 className="font-bold">Đã tạo tài khoản Giảng viên</h2><p>{created.fullName} · {created.username}</p>
      <p>Môn phụ trách: {created.subjectName}</p><p className="text-sm text-slate-500">Giảng viên đăng nhập bằng tài khoản vừa cấp và mật khẩu ban đầu.</p>
      <Link href="/admin/users?role=TEACHER" className={adminPrimaryButton}>Xem danh sách Giảng viên</Link>
    </section> : <form onSubmit={event => void submit(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-semibold">Họ và tên<input required maxLength={100} value={fullName} onChange={event=>setFullName(event.target.value)} className={`mt-2 ${adminInput}`} /></label>
      <label className="block text-sm font-semibold">Email<input required type="email" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} className={`mt-2 ${adminInput}`} autoComplete="off" /></label>
      <label className="block text-sm font-semibold">Tên đăng nhập<input required minLength={3} maxLength={100} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,99}" value={username} onChange={event=>setUsername(event.target.value)} className={`mt-2 ${adminInput}`} autoComplete="off" /></label>
      <label className="block text-sm font-semibold">Mật khẩu ban đầu<input required type="password" minLength={8} maxLength={72} value={password} onChange={event=>setPassword(event.target.value)} className={`mt-2 ${adminInput}`} autoComplete="new-password" /><span className="mt-1 block text-xs font-normal text-slate-500">Từ 8 ký tự, tối đa 72 byte UTF-8.</span></label>
      <label className="block text-sm font-semibold">Môn phụ trách<select required value={subjectId} onChange={event=>setSubjectId(event.target.value)} className={`mt-2 ${adminInput}`}><option value="">Chọn một môn học</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}</select></label>
      {!subjects.length && <p className="text-sm text-amber-700">Chưa có môn hoạt động. Hãy thêm môn trong Danh mục trước khi cấp tài khoản.</p>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Link href="/admin/users" className={adminSecondaryButton}>Hủy</Link><button disabled={busy || !subjects.length} className={adminPrimaryButton}>{busy ? "Đang tạo..." : "Tạo tài khoản Giảng viên"}</button></div>
    </form>}
  </main>;
}
