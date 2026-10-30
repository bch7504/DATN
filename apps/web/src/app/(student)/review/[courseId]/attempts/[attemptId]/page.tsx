"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { quizApi } from "@/lib/api-client";
import { clearQuizAttemptSession, readQuizAttemptSession, saveQuizResultSession, updateQuizAttemptSession, type QuizAttemptSession } from "@/lib/quiz-attempt-session";
import { ErrorAlert } from "@/components/ui/error-states";

/** Args: none. Input: Java-created attempt ID, authorized Student and same-tab recovery DTO. Output: dedicated quiz taking screen. Errors: missing recovery/API failure shown inline; never creates another attempt on reload. */
export default function QuizAttemptPage(): ReactElement {
  const { courseId, attemptId } = useParams<{ courseId: string; attemptId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<QuizAttemptSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    const restored = readQuizAttemptSession(user.id, courseId, attemptId);
    setSession(restored); setAnswers(restored?.answers ?? {}); setReady(true);
  }, [user, courseId, attemptId]);
  /** Args: questionId and option index 0–3. Input: current owned attempt. Output: void; updates choice and reload recovery. Errors: displays storage failure without discarding current choice. */
  function select(questionId: string, option: number): void {
    if (!session) return;
    const next = { ...answers, [questionId]: option };
    setAnswers(next);
    try { updateQuizAttemptSession(session, next); }
    catch { setError("Không lưu được bản tạm trong trình duyệt. Hãy nộp bài trước khi tải lại trang."); }
  }
  /** Args: none. Input: current answer indices and Java attempt ID. Output: Promise<void>; Java scores/persists, then opens result route. Errors: keeps answers and displays API failure. */
  async function submit(): Promise<void> {
    if (!session || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await quizApi.submitAttemptToBackend(attemptId, answers);
      saveQuizResultSession(session.ownerId, courseId, session.attempt.quizTitle, result);
      clearQuizAttemptSession(attemptId);
      router.replace(`/review/${encodeURIComponent(courseId)}/attempts/${encodeURIComponent(attemptId)}/result`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không nộp được bài."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-5 pb-12">
    <Link href={`/review/${encodeURIComponent(courseId)}`} className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Kho ôn tập</Link>
    <header><p className="text-xs font-bold uppercase tracking-wider text-red-600">Làm bài trắc nghiệm</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">{session?.attempt.quizTitle ?? "Lượt làm Quiz"}</h1></header>
    {error && <ErrorAlert message={error} />}
    {ready && !session && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Không có dữ liệu lượt làm trong thẻ trình duyệt này. Quay lại kho ôn tập để xem lịch sử hoặc bắt đầu lượt mới.</p>}
    {session && <>{session.attempt.questions.map((question, index) => <section key={question.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Câu {index + 1}. {question.questionText}</h2>{question.options.map((option) => <label key={option.index} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${answers[question.id] === option.index ? "border-red-300 bg-red-50 text-red-800" : "border-slate-200 text-slate-700"}`}><input type="radio" name={question.id} checked={answers[question.id] === option.index} disabled={busy} onChange={() => select(question.id, option.index)} className="accent-red-600" /><span><strong>{String.fromCharCode(65 + option.index)}.</strong> {option.text}</span></label>)}</section>)}<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Đã trả lời {Object.keys(answers).length}/{session.attempt.questions.length} câu</p><button disabled={busy || !Object.keys(answers).length} type="button" onClick={() => void submit()} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang nộp..." : "Nộp bài và xem kết quả"}</button></div></>}
  </main>;
}
