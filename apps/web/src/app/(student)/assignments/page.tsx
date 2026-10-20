"use client";

import { useEffect, useState, type ReactElement } from "react";
import { AlertCircle, ClipboardList, Download, Paperclip, Upload } from "lucide-react";
import { assignmentApi, CourseAssignment } from "@/lib/api-client";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pptx";

/** Student assignment list and submission form.
 * Uses Java APIs only; Java validates ownership and streams private attachments.
 */
/** Args: none. Input: authenticated Student actions and assignment DTOs from Java. Output: submission page ReactElement. Errors: API and file validation issues are shown in-page. */
export default function StudentAssignmentsPage(): ReactElement {
  const [items, setItems] = useState<CourseAssignment[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");

  async function load(): Promise<void> {
    setLoading(true);
    try { setItems(await assignmentApi.listForStudent()); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được danh sách bài tập."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function submit(item: CourseAssignment): Promise<void> {
    const selected = files[item.id] || [];
    if (!answers[item.id]?.trim() && selected.length === 0) {
      setError("Hãy nhập câu trả lời hoặc chọn ít nhất một ảnh/tệp."); return;
    }
    setBusy(item.id); setError(""); setSuccess("");
    try {
      await assignmentApi.submit(item.id, answers[item.id] || "", selected);
      setAnswers((current) => ({ ...current, [item.id]: "" }));
      setFiles((current) => ({ ...current, [item.id]: [] }));
      setSuccess("Đã lưu bài nộp. Bạn có thể xem lại bài hiện tại bên dưới.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Nộp bài chưa thành công."); }
    finally { setBusy(null); }
  }

  function priorAttachments(item: CourseAssignment): NonNullable<CourseAssignment["submission"]>["attachments"] {
    return item.submission?.attachments || [];
  }

  /** Args: selected files and current assignment. Input: metadata only; Java revalidates bytes and access.
   * Output: void, updates selection or an error. Limits: 5 files, 10 MiB each, 25 MiB total including existing files.
   */
  function selectFiles(item: CourseAssignment, chosen: File[]): void {
    const prior = priorAttachments(item);
    let message = "";
    if (prior.length + chosen.length > 5) message = `Bài nộp này chỉ còn được thêm tối đa ${5 - prior.length} tệp.`;
    else if (chosen.some((file) => !file.size || file.size > 10 * 1024 * 1024)) message = "Mỗi tệp phải không rỗng và không vượt quá 10 MB.";
    else if (prior.reduce((sum, file) => sum + file.sizeBytes, 0) + chosen.reduce((sum, file) => sum + file.size, 0) > 25 * 1024 * 1024) message = "Tổng dung lượng bài nộp không được vượt quá 25 MB.";
    setError(message);
    setFiles((current) => ({ ...current, [item.id]: message ? [] : chosen }));
  }

  async function download(item: CourseAssignment, attachmentId: string, fileName: string): Promise<void> {
    try {
      const blob = await assignmentApi.downloadForStudent(item.id, attachmentId);
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được tệp."); }
  }

  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Bài tập lớp học</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Bài tập về nhà</h1><p className="mt-2 text-sm text-slate-500">Xem hạn nộp, gửi câu trả lời và đính kèm ảnh hoặc tài liệu.</p></header>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
    {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    <button disabled={busy !== null || loading} onClick={() => void load()} className="text-sm text-red-700 underline">Tải lại bài tập</button>
    {loading && <p role="status">Đang tải bài tập...</p>}
    {!loading && !items.length && !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500"><ClipboardList className="mx-auto mb-3 h-8 w-8" />Hiện chưa có bài tập được giao.</div>}
    <section className="space-y-4">{items.map((item) => {
      const selected = files[item.id] || [];
      const prior = item.submission;
      return <article key={item.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">{item.title}</h2><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.description}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${prior ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{prior ? (prior.status === "LATE" ? "Đã nộp muộn" : "Đã nộp") : "Chưa nộp"}</span></div>
        <p className="text-sm text-slate-500">Hạn nộp: {new Date(item.dueAt).toLocaleString("vi-VN")}</p>
        {prior && <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold text-slate-700">Bài đã nộp {prior.submittedAt ? `lúc ${new Date(prior.submittedAt).toLocaleString("vi-VN")}` : ""}</p>{prior.answerText && <p className="mt-2 whitespace-pre-wrap">{prior.answerText}</p>}{prior.attachments?.map((file) => <button key={file.id} type="button" onClick={() => void download(item, file.id, file.fileName)} className="mt-2 mr-3 inline-flex items-center gap-1 text-red-700 hover:underline"><Download className="h-4 w-4" />{file.fileName}</button>)}</div>}
        <label className="block text-sm font-semibold text-slate-700">Câu trả lời <span className="font-normal text-slate-400">(không bắt buộc nếu có đính kèm)</span><textarea value={answers[item.id] || ""} onChange={(e) => setAnswers((current) => ({ ...current, [item.id]: e.target.value }))} rows={3} maxLength={20000} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" placeholder="Nhập câu trả lời của bạn..." /></label>
        <div><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Paperclip className="h-4 w-4" />Chọn ảnh / tệp<input type="file" disabled={busy !== null} multiple accept={ACCEPTED} className="sr-only" onChange={(e) => { selectFiles(item, Array.from(e.target.files || [])); e.target.value = ""; }} /></label><p className="mt-2 text-xs text-slate-500">Tối đa 5 tệp cho cả bài nộp, 10 MB mỗi tệp, 25 MB tổng. PDF, ảnh PNG/JPG, DOCX, XLSX hoặc PPTX. Tệp mới được thêm vào bài nộp hiện tại.</p>{selected.map((file) => <p key={`${file.name}-${file.size}`} className="mt-1 text-sm text-slate-600">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>)}</div>
        <button type="button" disabled={busy !== null || loading} onClick={() => void submit(item)} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4" />{busy === item.id ? "Đang nộp..." : prior ? "Cập nhật bài nộp" : "Nộp bài"}</button>
      </article>;
    })}</section>
  </main>;
}
