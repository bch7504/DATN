"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { catalogApi, openingRequestApi } from "@/lib/api-client";
import type { Semester } from "@/types/course-offering";
import type { OpeningRequest } from "@/types/course-opening";

/** Args: none. Input: Teacher-entered subject/class proposal and Java semesters.
 * Output: request form and PENDING acknowledgement, no direct class creation.
 * Errors: Java validation/availability shown inline. */
export default function NewTeacherCourseOfferingPage(): ReactElement {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [credits, setCredits] = useState(3);
  const [semesterId, setSemesterId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<OpeningRequest | null>(null);
  useEffect(() => {
    let active = true;
    catalogApi.getSemesters().then((items) => { if (active) setSemesters(items); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được học kỳ."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  /** Args: form event. Input: free subject text, credits1..30, open semester and class code.
   * Output: Promise<void>; submits one request and shows confirmed status. Errors: displayed inline. */
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setBusy(true); setError("");
    try { setSubmitted(await openingRequestApi.submit({ subjectCode: subjectCode.trim(), subjectName: subjectName.trim(), credits, semesterId, code: code.trim(), name: name.trim() || undefined })); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Gửi yêu cầu không thành công."); }
    finally { setBusy(false); }
  }
  const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal";
  return <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
    <Link href="/teacher/course-offerings" className="inline-flex items-center gap-2 text-sm font-semibold text-red-700"><ArrowLeft className="h-4 w-4" />Lớp học phần</Link>
    <header><h1 className="text-2xl font-extrabold text-slate-900">Yêu cầu mở lớp học phần</h1><p className="mt-2 text-sm text-slate-500">Nhập môn muốn giảng dạy. Admin sẽ kiểm tra thông tin môn học và duyệt trước khi lớp hoạt động.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && <p role="status">Đang tải học kỳ...</p>}
    {submitted ? <section className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5"><h2 className="font-bold text-amber-800">Đã gửi yêu cầu · Chờ Admin duyệt</h2><p className="text-sm">{submitted.code} · {submitted.subjectName}</p><p className="text-sm text-slate-500">Theo dõi kết quả trong mục Lớp học phần. Mã tham gia chỉ có sau khi yêu cầu được duyệt.</p><Link href="/teacher/course-offerings" className="inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Về lớp học phần</Link></section> : !loading && <form onSubmit={(event) => void submit(event)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-semibold">Tên môn học<input required maxLength={255} value={subjectName} onChange={(event) => setSubjectName(event.target.value)} className={inputClass} placeholder="Nhập môn muốn mở lớp" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Mã môn đề xuất<input required maxLength={50} pattern="[A-Za-z0-9][A-Za-z0-9._-]*" value={subjectCode} onChange={(event) => setSubjectCode(event.target.value.toUpperCase())} className={inputClass} placeholder="VD: KTS" /></label><label className="block text-sm font-semibold">Số tín chỉ<input required type="number" min={1} max={30} value={credits} onChange={(event) => setCredits(Number(event.target.value))} className={inputClass} /></label></div>
      <label className="block text-sm font-semibold">Học kỳ áp dụng<select required value={semesterId} onChange={(event) => setSemesterId(event.target.value)} className={inputClass}><option value="">Chọn học kỳ</option>{semesters.filter((item) => item.status === "ACTIVE" && item.offeringCreationEnabled).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="block text-sm font-semibold">Mã lớp đề xuất<input required maxLength={50} pattern="[A-Za-z0-9][A-Za-z0-9._-]*" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className={inputClass} placeholder="VD: KTS-02" /></label>
      <label className="block text-sm font-semibold">Tên lớp hiển thị (tùy chọn)<input maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="VD: Kỹ thuật số · Nhóm 02" /></label>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><Link href="/teacher/course-offerings" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Hủy</Link><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />{busy ? "Đang gửi..." : "Gửi yêu cầu mở lớp"}</button></div>
    </form>}
  </main>;
}
