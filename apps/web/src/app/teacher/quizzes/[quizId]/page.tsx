"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { assignmentApi, quizApi, teacherQuizApi } from "@/lib/api-client";
import type { QuizDraft } from "@/types/quiz";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { MathText } from "@/components/quiz/math-text";
import { QuizQuestionImage } from "@/components/quiz/quiz-question-image";

/** Args: none. Input: quizId route segment and Teacher-owned Java draft. Output: standalone Quiz review/publication screen. Errors: displayed inline. */
export default function TeacherQuizReviewPage(): ReactElement {
  const { quizId } = useParams<{ quizId: string }>();
  const router = useRouter();
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offeringId, setOfferingId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("Hoàn thành bộ câu hỏi trắc nghiệm sau buổi học.");
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  useEffect(() => { setOfferingId(new URLSearchParams(window.location.search).get("offeringId") ?? ""); }, []);
  /** Args: none. Input: authorized draft ID. Output: Promise<void>; refreshes persisted Java draft. Errors: displayed in-page. */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try { const loaded = await quizApi.getDraft(quizId); setDraft(loaded); setAssignmentTitle((current) => current || loaded.prompt.slice(0, 200)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được bản nháp Quiz."); }
    finally { setLoading(false); }
  }, [quizId]);
  useEffect(() => { void load(); }, [load]);
  /** Args: none. Input: reviewed Teacher-owned draft. Output: Promise<void>; publishes through Java and updates status. Errors: displayed in-page. */
  async function publish(): Promise<void> {
    if (draft?.status !== "REVIEW_REQUIRED") return;
    setBusy(true); setError(null);
    try { setDraft(await teacherQuizApi.publish(draft.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không công bố được Quiz."); }
    finally { setBusy(false); }
  }

  /** Args: none. Input: reviewed Teacher Quiz, source Course Offering and future due time. Output: publishes Quiz, creates/publishes linked class Assignment and opens it. Errors: displayed inline. */
  async function publishAndAssign(): Promise<void> {
    if (!draft || !offeringId || !assignmentTitle.trim() || !assignmentDueAt) { setError("Hãy nhập tên bài, hạn nộp và mở trang từ đúng lớp học phần."); return; }
    const dueAt = new Date(assignmentDueAt);
    if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now()) { setError("Hạn nộp phải ở tương lai."); return; }
    setBusy(true); setError(null);
    try {
      const published = draft.status === "REVIEW_REQUIRED" ? await teacherQuizApi.publish(draft.id) : draft;
      setDraft(published);
      const assignment = await assignmentApi.create(offeringId, { title: assignmentTitle.trim(), description: assignmentDescription.trim(), dueAt: dueAt.toISOString(), type: "QUIZ", quizId: published.id });
      await assignmentApi.publish(assignment.id);
      router.push(`/teacher/assignments/${encodeURIComponent(assignment.id)}?offeringId=${encodeURIComponent(offeringId)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể giao Quiz cho lớp."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-4xl space-y-5">
    <Link href="/teacher/quizzes/create" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Tạo Quiz mới</Link>
    <header><h1 className="text-2xl font-extrabold text-slate-900">Duyệt bộ câu hỏi Quiz</h1><p className="mt-2 text-sm text-slate-500">Kiểm tra câu hỏi, đáp án và nguồn trích dẫn trước khi công bố cho lớp.</p></header>
    {error && <ErrorAlert message={error} onRetry={() => void load()} />}
    {loading && <LoadingSpinner text="Đang tải bản nháp..." />}
    {!loading && draft && <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="text-sm font-semibold">{draft.questions.length} câu · {draft.status}</span>{draft.status === "REVIEW_REQUIRED" && <button type="button" disabled={busy} onClick={() => void publish()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang công bố..." : "Chỉ duyệt Quiz"}</button>}{draft.status === "PUBLISHED" && <span role="status" className="text-sm font-bold text-emerald-700">Quiz đã được duyệt.</span>}{draft.status === "GENERATING" && <button type="button" onClick={() => void load()} className="rounded-xl border px-4 py-2 text-sm">Cập nhật trạng thái</button>}</div>
      {offeringId && (draft.status === "REVIEW_REQUIRED" || draft.status === "PUBLISHED") && <section className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-5"><h2 className="font-bold text-slate-900">Giao bộ Quiz này thành bài tập</h2><label className="block text-sm font-semibold">Tên bài<input maxLength={200} value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label><label className="block text-sm font-semibold">Hạn nộp<input type="datetime-local" value={assignmentDueAt} onChange={(event) => setAssignmentDueAt(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label><label className="block text-sm font-semibold">Hướng dẫn<textarea rows={2} maxLength={10000} value={assignmentDescription} onChange={(event) => setAssignmentDescription(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label><button type="button" disabled={busy} onClick={() => void publishAndAssign()} className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang giao bài..." : "Duyệt và giao Quiz cho lớp"}</button></section>}
      {draft.questions.map((question, index) => <article key={question.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Câu {index + 1}. <MathText text={question.questionText} /></h2>{question.image && <QuizQuestionImage image={question.image} />}<div className="grid gap-2 sm:grid-cols-2">{question.options.map((option) => <p key={option.id} className={`rounded-xl border p-3 text-sm ${option.id === question.correctOptionId ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-700"}`}><strong>{option.id}.</strong> <MathText text={option.text} />{option.id === question.correctOptionId && " ✓"}</p>)}</div><MathText text={question.explanation} className="text-sm text-slate-600" />{question.citation && <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">Nguồn: {question.citation.documentName} · trang {question.citation.pageNumber ?? "—"}</p>}</article>)}
    </>}
  </main>;
}
