"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, PlusCircle } from "lucide-react";
import { catalogApi, teacherApi } from "@/lib/api-client";
import type { Semester, Subject } from "@/types/course-offering";

/** Args: none. Input: Teacher session and Java subject/semester catalog. Output: dedicated class creation screen. Errors: validation and API failures appear in-page. */
export default function NewTeacherCourseOfferingPage(): ReactElement {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ code: string; name: string; joinCode: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    /** Args: none. Input: public Java catalog. Output: Promise<void>; initializes form options. Errors: displays API failure. */
    async function load(): Promise<void> {
      try {
        const [subjectList, semesterList] = await Promise.all([catalogApi.getSubjects(), catalogApi.getSemesters()]);
        if (cancelled) return;
        setSubjects(subjectList);
        setSemesters(semesterList);
        setSubjectId(subjectList[0]?.id ?? "");
        setCode(subjectList[0]?.code ?? "");
        setSemesterId(semesterList.find((entry) => entry.status === "ACTIVE")?.id ?? semesterList.find((entry) => entry.offeringCreationEnabled)?.id ?? "");
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được môn học và học kỳ."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  /** Args: subjectId string from Java catalog. Input: selected subject. Output: void; updates subject and suggested class code. Errors: none. */
  function selectSubject(nextId: string): void {
    setSubjectId(nextId);
    setCode(subjects.find((entry) => entry.id === nextId)?.code ?? "");
  }

  /** Args: form submit event. Input: Teacher-entered class data and selected catalog IDs. Output: Promise<void>; creates a class via Java and reveals the one-time join code. Errors: shows API/validation error. */
  async function create(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!subjectId || !semesterId) { setError("Hãy chọn môn học và học kỳ."); return; }
    setBusy(true); setError("");
    try {
      const offering = await teacherApi.createOffering({ subjectId, semesterId, code: code.trim() || undefined, name: name.trim() || undefined });
      setCreated({ code: offering.code, name: offering.name, joinCode: offering.joinCode ?? null });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tạo lớp học phần không thành công."); }
    finally { setBusy(false); }
  }

  /** Args: none. Input: one-time join code returned by Java. Output: Promise<void>; copies to clipboard. Errors: displays clipboard failure. */
  async function copyJoinCode(): Promise<void> {
    if (!created?.joinCode) return;
    try { await navigator.clipboard.writeText(created.joinCode); setCopied(true); }
    catch { setError("Không sao chép được mã tham gia. Hãy chọn và sao chép thủ công."); }
  }

  const availableSemesters = semesters.filter((entry) => entry.offeringCreationEnabled || entry.status === "ACTIVE");
  return <main className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
    <Link href="/teacher/course-offerings" className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline"><ArrowLeft className="h-4 w-4" />Danh sách lớp học phần</Link>
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Dành cho giảng viên</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Mở lớp học phần mới</h1><p className="mt-2 text-sm text-slate-500">Chọn môn học và học kỳ, sau đó đặt mã lớp nếu cần phân biệt các nhóm.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && <p role="status">Đang tải môn học và học kỳ...</p>}
    {created ? <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-emerald-800">Đã mở lớp {created.code} · {created.name}</h2>{created.joinCode && <div className="space-y-2 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">Mã tham gia lớp</p><p className="select-all font-mono text-2xl font-bold text-red-700">{created.joinCode}</p><p className="text-xs text-amber-700">Mã đầy đủ chỉ hiển thị một lần. Hãy sao chép trước khi rời trang.</p><button type="button" onClick={() => void copyJoinCode()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Đã sao chép" : "Sao chép mã"}</button></div>}<Link href="/teacher/course-offerings" className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Về danh sách lớp</Link></section> : !loading && <form onSubmit={(event) => void create(event)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-semibold text-slate-700">Môn học đào tạo<select required value={subjectId} onChange={(event) => selectSubject(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="">Chọn môn học</option>{subjects.map((entry) => <option key={entry.id} value={entry.id}>{entry.code} · {entry.name} ({entry.credits} tín chỉ)</option>)}</select></label>
      <label className="block text-sm font-semibold text-slate-700">Học kỳ áp dụng<select required value={semesterId} onChange={(event) => setSemesterId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="">Chọn học kỳ</option>{availableSemesters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      <label className="block text-sm font-semibold text-slate-700">Mã lớp<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" placeholder="Tự điền theo mã môn học" /><span className="mt-1 block text-xs font-normal text-slate-500">Có thể sửa để phân biệt các nhóm lớp.</span></label>
      <label className="block text-sm font-semibold text-slate-700">Tên lớp hiển thị (tùy chọn)<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" placeholder="VD: Giải tích 2 · Nhóm 01" /></label>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><Link href="/teacher/course-offerings" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Hủy</Link><button disabled={busy || !subjectId || !semesterId} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><PlusCircle className="h-4 w-4" />{busy ? "Đang tạo..." : "Xác nhận mở lớp"}</button></div>
    </form>}
  </main>;
}
