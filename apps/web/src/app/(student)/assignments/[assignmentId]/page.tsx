"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Download, Paperclip, Upload } from "lucide-react";
import { assignmentApi, type CourseAssignment } from "@/lib/api-client";
import { MathText } from "@/components/quiz/math-text";
import type { StartQuizAttemptResponse, SubmitAttemptResponse } from "@/types/quiz";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pptx";

/** Args: none. Input: assignmentId route parameter and authorized Java API. Output: assignment submission screen. Errors: shown in-page. */
export default function StudentAssignmentDetailPage(): ReactElement {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [item, setItem] = useState<CourseAssignment | null>(null);
  const [answer, setAnswer] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [quizAttempt, setQuizAttempt] = useState<StartQuizAttemptResponse | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<SubmitAttemptResponse | null>(null);

  /** Args: none. Input: current authorized Student assignment list. Output: Promise<void>; refreshes selected assignment. Errors: displays API/404 error. */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const list = await assignmentApi.listForStudent();
      const found = list.find((entry) => entry.id === assignmentId) ?? null;
      setItem(found);
      setError(found ? "" : "Không tìm thấy bài tập hoặc bạn không có quyền xem.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được bài tập."); }
    finally { setLoading(false); }
  }, [assignmentId]);
  useEffect(() => { void load(); }, [load]);

  /** Args: selected browser File objects. Input: Java attachment metadata for the current submission. Output: void; validates and stores files. Errors: displays size/count validation. */
  function selectFiles(chosen: File[]): void {
    const prior = item?.submission?.attachments ?? [];
    let message = "";
    if (prior.length + chosen.length > 5) message = `Bài nộp này chỉ còn được thêm tối đa ${5 - prior.length} tệp.`;
    else if (chosen.some((file) => !file.size || file.size > 10 * 1024 * 1024)) message = "Mỗi tệp phải không rỗng và không vượt quá 10 MB.";
    else if (prior.reduce((sum, file) => sum + file.sizeBytes, 0) + chosen.reduce((sum, file) => sum + file.size, 0) > 25 * 1024 * 1024) message = "Tổng dung lượng bài nộp không được vượt quá 25 MB.";
    setError(message);
    setFiles(message ? [] : chosen);
  }

  /** Args: none. Input: answer and selected files. Output: Promise<void>; stores the submission via Java and reloads it. Errors: displays validation/API failure. */
  async function submit(): Promise<void> {
    if (!item) return;
    if (!answer.trim() && files.length === 0) { setError("Hãy nhập câu trả lời hoặc chọn ít nhất một ảnh/tệp."); return; }
    setBusy(true); setError(""); setSuccess("");
    try {
      await assignmentApi.submit(item.id, answer, files);
      setAnswer(""); setFiles([]);
      setSuccess("Đã lưu bài nộp. Bạn có thể xem lại bài hiện tại bên dưới.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Nộp bài chưa thành công."); }
    finally { setBusy(false); }
  }

  /** Args: attachment ID and original filename. Input: current authorized assignment. Output: Promise<void>; downloads private file. Errors: displays Java API failure. */
  async function download(attachmentId: string, fileName: string): Promise<void> {
    if (!item) return;
    try {
      const blob = await assignmentApi.downloadForStudent(item.id, attachmentId);
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được tệp."); }
  }

  /** Args: none. Input: current published QUIZ assignment and authorized Student. Output: question payload without answer keys. Errors: displayed in-page. */
  async function startQuiz(): Promise<void> {
    if (!item || item.type !== "QUIZ") return;
    setBusy(true); setError(""); setSuccess(""); setQuizResult(null);
    try { setQuizAttempt(await assignmentApi.startQuiz(item.id)); setQuizAnswers({}); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không bắt đầu được bài trắc nghiệm."); }
    finally { setBusy(false); }
  }

  /** Args: none. Input: one option for every current Quiz question. Output: Java-scored result and refreshed assignment submission. Errors: incomplete/API failure shown in-page. */
  async function submitQuiz(): Promise<void> {
    if (!item || !quizAttempt || item.type !== "QUIZ") return;
    if (quizAttempt.questions.some((question) => quizAnswers[question.id] === undefined)) {
      setError("Hãy chọn một đáp án cho tất cả câu hỏi."); return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await assignmentApi.submitQuiz(item.id, quizAttempt.attemptId, quizAnswers);
      setQuizResult(result);
      setSuccess(`Đã nộp bài. Điểm của bạn: ${(result.score / 10).toFixed(1)}/10.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Nộp bài trắc nghiệm chưa thành công."); }
    finally { setBusy(false); }
  }

  const prior = item?.submission;
  const overdue = item && Date.parse(item.dueAt) <= Date.now();
  const status = prior ? prior.status === "LATE" ? "Đã nộp muộn" : "Đã nộp" : overdue ? "Quá hạn · Chưa nộp" : "Chưa nộp";
  return <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
    <Link href="/assignments" className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline"><ArrowLeft className="h-4 w-4" />Danh sách bài tập</Link>
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Bài tập lớp học</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Chi tiết bài tập</h1></header>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
    {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    {loading && <p role="status">Đang tải bài tập...</p>}
    {!loading && item && <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">{item.title}</h2><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.description}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${prior ? "bg-emerald-50 text-emerald-700" : overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{status}</span></div>
      <p className="text-sm text-slate-500">Hạn nộp: {new Date(item.dueAt).toLocaleString("vi-VN")}</p>
      {prior && <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold text-slate-700">Bài đã nộp {prior.submittedAt ? `lúc ${new Date(prior.submittedAt).toLocaleString("vi-VN")}` : ""}</p>{prior.score !== null && <p className="mt-2 text-lg font-extrabold text-red-700">Điểm: {(prior.score / 10).toFixed(1)}/10</p>}{prior.answerText && <p className="mt-2 whitespace-pre-wrap">{prior.answerText}</p>}{prior.attachments?.map((file) => <button key={file.id} type="button" onClick={() => void download(file.id, file.fileName)} className="mt-2 mr-3 inline-flex items-center gap-1 text-red-700 hover:underline"><Download className="h-4 w-4" />{file.fileName}</button>)}</div>}
      {item.type === "QUIZ" ? <div className="space-y-4">
        {!quizAttempt && <button type="button" disabled={busy} onClick={() => void startQuiz()} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang mở đề..." : prior ? "Làm lượt mới" : "Bắt đầu làm Quiz"}</button>}
        {quizAttempt && !quizResult && <><div className="space-y-4">{quizAttempt.questions.map((question, index) => <fieldset key={question.id} className="rounded-xl border border-slate-200 p-4"><legend className="px-1 font-bold text-slate-900">Câu {index + 1}. <MathText text={question.questionText} /></legend><div className="mt-3 grid gap-2">{question.options.map((option) => <label key={option.index} className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 text-sm"><input type="radio" name={question.id} checked={quizAnswers[question.id] === option.index} onChange={() => setQuizAnswers((current) => ({ ...current, [question.id]: option.index }))} /><span>{String.fromCharCode(65 + option.index)}. <MathText text={option.text} /></span></label>)}</div></fieldset>)}</div><button type="button" disabled={busy} onClick={() => void submitQuiz()} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang chấm..." : "Nộp bài trắc nghiệm"}</button></>}
        {quizResult && <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-lg font-extrabold text-emerald-800">{(quizResult.score / 10).toFixed(1)}/10 · đúng {quizResult.correctAnswersCount}/{quizResult.totalQuestionsCount} câu</p>{quizResult.questionReviews.map((review) => <div key={review.questionId} className="rounded-lg bg-white p-3 text-sm"><p className="font-bold">Câu {review.questionOrder}: {review.isCorrect ? "Đúng" : "Sai"}</p><MathText text={review.explanation} className="mt-1 text-slate-600" />{review.citations.map((citation) => <p key={`${citation.documentId}-${citation.pageNumber}`} className="mt-1 text-xs text-slate-500">Nguồn trang {citation.pageNumber}: <MathText text={citation.excerpt} /></p>)}</div>)}</div>}
      </div> : <><label className="block text-sm font-semibold text-slate-700">Câu trả lời <span className="font-normal text-slate-400">(không bắt buộc nếu có đính kèm)</span><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={3} maxLength={20000} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" placeholder="Nhập câu trả lời của bạn..." /></label>
      <div><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Paperclip className="h-4 w-4" />Chọn ảnh / tệp<input type="file" disabled={busy} multiple accept={ACCEPTED} className="sr-only" onChange={(event) => { selectFiles(Array.from(event.target.files || [])); event.target.value = ""; }} /></label><p className="mt-2 text-xs text-slate-500">Tối đa 5 tệp cho cả bài nộp, 10 MB mỗi tệp, 25 MB tổng. PDF, ảnh PNG/JPG, DOCX, XLSX hoặc PPTX. Tệp mới được thêm vào bài nộp hiện tại.</p>{files.map((file) => <p key={`${file.name}-${file.size}`} className="mt-1 text-sm text-slate-600">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>)}</div>
      <button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4" />{busy ? "Đang nộp..." : prior ? "Cập nhật bài nộp" : "Nộp bài"}</button></>}
    </article>}
  </main>;
}
