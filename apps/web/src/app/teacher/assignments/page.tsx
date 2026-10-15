"use client";

import { FormEvent, useEffect, useRef, useState, type ReactElement } from "react";
import { AlertCircle, ClipboardList, Download, Plus, Send } from "lucide-react";
import { assignmentApi, AssignmentStats, CourseAssignment, teacherApi } from "@/lib/api-client";
import { CourseOffering } from "@/types/course-offering";

/** Args: none. Input: authenticated Teacher actions and Java assignment/report DTOs. Output: management page ReactElement. Errors: Java API failures are rendered as an alert. */
export default function TeacherAssignmentsPage(): ReactElement {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [offeringId, setOfferingId] = useState("");
  const [items, setItems] = useState<CourseAssignment[]>([]);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewStudentId, setReviewStudentId] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [success, setSuccess] = useState("");
  const listRequest = useRef(0);
  const reportRequest = useRef(0);

  async function loadOfferings(): Promise<void> {
    try { const data = await teacherApi.getOfferings(); setOfferings(data); if (!offeringId && data[0]) setOfferingId(data[0].id); }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được lớp học phần."); }
  }
  async function loadAssignments(id: string): Promise<void> {
    const request = ++listRequest.current;
    ++reportRequest.current;
    setItems([]); setStats(null); setReviewStudentId(null); setLoading(true);
    try { if (id) { const data = await assignmentApi.listForTeacher(id); if (request === listRequest.current) { setItems(data); setError(""); } } }
    catch (e) { if (request === listRequest.current) setError(e instanceof Error ? e.message : "Không tải được danh sách bài tập."); }
    finally { if (request === listRequest.current) setLoading(false); }
  }
  // Fetch once on entry; class changes are handled by the separate assignments effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadOfferings(); }, []);
  useEffect(() => { void loadAssignments(offeringId); }, [offeringId]);

  /** Args: optional owned draft. Output: void; fills/resets the existing form; no API writes. */
  function editDraft(item?: CourseAssignment): void {
    setEditingId(item?.id ?? null); setTitle(item?.title ?? ""); setDescription(item?.description ?? "");
    if (item) {
      const date = new Date(item.dueAt);
      setDueAt(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    } else setDueAt("");
    setSuccess("");
  }

  async function createDraft(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!offeringId || !dueAt) return;
    setBusy(true); setError("");
    try {
      const input = { title: title.trim(), description: description.trim(), dueAt: new Date(dueAt).toISOString() };
      if (editingId) await assignmentApi.update(editingId, input);
      else await assignmentApi.create(offeringId, input);
      editDraft(); setSuccess("Đã lưu bản nháp."); await loadAssignments(offeringId);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tạo được bài tập."); }
    finally { setBusy(false); }
  }
  async function publish(id: string): Promise<void> {
    setBusy(true); setError(""); try { await assignmentApi.publish(id); await loadAssignments(offeringId); }
    catch (e) { setError(e instanceof Error ? e.message : "Không công bố được bài tập."); }
    finally { setBusy(false); }
  }
  async function showReport(id: string): Promise<void> {
    const request = ++reportRequest.current;
    setStats(null); setReviewStudentId(null);
    try { const data = await assignmentApi.stats(id); if (request === reportRequest.current) { setStats(data); setError(""); } }
    catch (e) { if (request === reportRequest.current) setError(e instanceof Error ? e.message : "Không tải được tình trạng nộp bài."); }
  }
  /** Args: form submit event. Input: selected submitted Student, score 0..100 and optional feedback.
   * Output: void; saves review and reloads report. Errors: shown in-page, form retained for retry.
   */
  async function saveReview(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!stats || !reviewStudentId) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await assignmentApi.review(stats.assignmentId, reviewStudentId, { score: Number(score), feedback: feedback.trim() });
      setSuccess("Đã lưu điểm và nhận xét."); await showReport(stats.assignmentId);
    } catch (e) { setError(e instanceof Error ? e.message : "Không lưu được nhận xét."); }
    finally { setBusy(false); }
  }
  async function download(assignmentId: string, studentId: string, attachmentId: string, name: string): Promise<void> {
    try {
      const blob = await assignmentApi.downloadForTeacher(assignmentId, studentId, attachmentId);
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được tệp."); }
  }

  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Dành cho giảng viên</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Giao bài tập về nhà</h1><p className="mt-2 text-sm text-slate-500">Tạo bài, công bố cho sinh viên và xem cụ thể ai đã nộp, ai chưa nộp.</p></header>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
    {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    <label className="block max-w-xl text-sm font-semibold text-slate-700">Lớp học phần<select disabled={busy} value={offeringId} onChange={(e) => { editDraft(); setOfferingId(e.target.value); }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Chọn lớp</option>{offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.code} · {offering.name}</option>)}</select></label>
    <form onSubmit={(e) => void createDraft(e)} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <h2 className="md:col-span-2 text-lg font-bold">{editingId ? "Sửa bản nháp" : "Tạo bài tập mới"}</h2>
      <label className="text-sm font-semibold">Tên bài<input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" placeholder="Ví dụ: Bài tập chương 1" /></label>
      <label className="text-sm font-semibold">Hạn nộp<input required type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" /></label>
      <label className="text-sm font-semibold md:col-span-2">Hướng dẫn<textarea required maxLength={10000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" placeholder="Mô tả yêu cầu bài tập..." /></label>
      <div className="md:col-span-2"><button disabled={!offeringId || busy || offerings.find((item) => item.id === offeringId)?.status !== "ACTIVE"} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Lưu bản nháp</button>{editingId && <button type="button" disabled={busy} onClick={() => editDraft()} className="ml-3 text-sm">Hủy sửa</button>}</div>
    </form>
    {loading && <p role="status">Đang tải bài tập...</p>}
    {!loading && items.some((item) => item.status === "DRAFT") && <div className="flex flex-wrap gap-2">{items.filter((item) => item.status === "DRAFT").map((item) => <button key={item.id} disabled={busy} onClick={() => editDraft(item)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Sửa bản nháp: {item.title}</button>)}</div>}
    <section className="space-y-3"><h2 className="text-lg font-bold">Bài tập trong lớp</h2>{items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500"><ClipboardList className="mx-auto mb-2 h-7 w-7" />Chưa có bài tập trong lớp này.</div> : items.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-sm text-slate-500">Hạn: {new Date(item.dueAt).toLocaleString("vi-VN")} · {item.status === "DRAFT" ? "Bản nháp" : "Đã công bố"}</p></div><div className="flex gap-2">{item.status === "DRAFT" && <button disabled={busy} onClick={() => void publish(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white"><Send className="h-4 w-4" />Công bố</button>}{item.status === "PUBLISHED" && <button onClick={() => void showReport(item.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Tình trạng nộp</button>}</div></article>)}</section>
    {stats && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><div><h2 className="text-lg font-bold">{stats.title}</h2><p className="mt-1 text-sm text-slate-600">Đã nộp: {stats.submittedCount}/{stats.approvedStudentCount} · Chưa nộp: {stats.notSubmittedCount}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-2">Sinh viên</th><th className="p-2">Trạng thái</th><th className="p-2">Thời điểm</th><th className="p-2">Bài làm</th><th className="p-2">Điểm / Nhận xét</th></tr></thead><tbody>{stats.students.map((student) => <tr key={student.studentId} className="border-b last:border-0"><td className="p-2"><div className="font-semibold">{student.fullName}</div><div className="text-xs text-slate-500">{student.email}</div></td><td className="p-2">{student.submissionState === "NOT_SUBMITTED" ? <span className="text-amber-700">Chưa nộp</span> : student.status === "LATE" ? <span className="text-orange-700">Nộp muộn</span> : <span className="text-emerald-700">Đã nộp đúng hạn</span>}</td><td className="p-2">{student.submittedAt ? new Date(student.submittedAt).toLocaleString("vi-VN") : "—"}</td><td className="p-2">{student.answerText && <p className="mb-1 max-w-sm whitespace-pre-wrap">{student.answerText}</p>}{student.attachments?.map((file) => <button key={file.id} onClick={() => void download(stats.assignmentId, student.studentId, file.id, file.fileName)} className="mr-3 inline-flex items-center gap-1 text-red-700 hover:underline"><Download className="h-4 w-4" />{file.fileName}</button>)}</td><td className="p-2">{student.submissionState === "SUBMITTED" && <><p>{student.score == null ? "Chưa chấm" : `${student.score}/100`}</p><p className="whitespace-pre-wrap">{student.teacherFeedback}</p><button disabled={busy} onClick={() => { setReviewStudentId(student.studentId); setScore(student.score == null ? "" : String(student.score)); setFeedback(student.teacherFeedback ?? ""); }} className="mt-2 text-red-700 underline">Chấm / sửa nhận xét</button></>}</td></tr>)}</tbody></table></div>
      {reviewStudentId && <form onSubmit={(event) => void saveReview(event)} className="space-y-3 rounded-xl bg-slate-50 p-4"><h3 className="font-semibold">Nhận xét: {stats.students.find((item) => item.studentId === reviewStudentId)?.fullName}</h3><label className="block text-sm">Điểm (0–100)<input type="number" min={0} max={100} step="0.01" required value={score} onChange={(event) => setScore(event.target.value)} className="ml-3 rounded border p-2" /></label><label className="block text-sm">Nhận xét<textarea maxLength={10000} value={feedback} onChange={(event) => setFeedback(event.target.value)} className="mt-1 w-full rounded border p-2" /></label><button disabled={busy} className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50">Lưu nhận xét</button><button type="button" disabled={busy} onClick={() => setReviewStudentId(null)} className="ml-3">Hủy</button></form>}
    </section>}
  </main>;
}
