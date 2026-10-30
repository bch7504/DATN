"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { quizApi } from "@/lib/api-client";
import type { QuizDraft } from "@/types/quiz";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: none. Input: owner draftId from route. Output: persisted Quiz draft review screen. Errors: inline; no generated data is fabricated. */
export default function StudentQuizDraftPage(): ReactElement {
  const { draftId } = useParams<{ draftId: string }>();
  const router = useRouter();
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Args: none. Input: authorized draft ID. Output: Promise<void>; reloads Java draft/status and generation prompt. Errors: displays API failure. */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try { const result = await quizApi.getDraft(draftId); setDraft(result); setPrompt(result.prompt); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được bản nháp."); }
    finally { setLoading(false); }
  }, [draftId]);
  useEffect(() => { void load(); }, [load]);
  /** Args: none. Input: reviewed draft and revised prompt. Output: Promise<void>; creates a new generation, then opens its route. Errors: retains current draft and shows API error. */
  async function regenerate(): Promise<void> {
    if (!draft || !prompt.trim()) return;
    setBusy(true); setError(null);
    try { const result = await quizApi.regenerateDraft(draft.id, prompt.trim()); router.push(`/quiz/drafts/${encodeURIComponent(result.id)}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tạo lại được Quiz."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-4xl space-y-5 pb-12">
    <Link href="/quiz/create" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Tạo Quiz mới</Link>
    <header><h1 className="text-2xl font-extrabold text-slate-900">Duyệt bản nháp Quiz</h1><p className="mt-2 text-sm text-slate-500">Kiểm tra câu hỏi, lời giải và trích dẫn trước khi lưu vào kho ôn tập.</p></header>
    {error && <ErrorAlert message={error} onRetry={() => void load()} />}
    {loading && <LoadingSpinner text="Đang tải bản nháp..." />}
    {!loading && draft && <>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">{draft.questions.length} câu · {draft.status}</p><button type="button" onClick={() => void load()} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">Cập nhật trạng thái</button></div>{draft.status === "GENERATING" && <p role="status" className="text-sm text-slate-500">AI đang sinh bộ câu hỏi. Bấm cập nhật trạng thái để xem kết quả.</p>}{draft.status === "GENERATION_FAILED" && <p role="alert" className="text-sm text-red-700">Không tạo được bộ câu hỏi. Bạn có thể điều chỉnh yêu cầu và tạo lại.</p>}{draft.status === "REVIEW_REQUIRED" && <Link href={`/quiz/drafts/${encodeURIComponent(draft.id)}/accept`} className="inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">Chấp nhận và chọn nơi lưu →</Link>}{(draft.status === "READY" || draft.status === "PUBLISHED") && <Link href="/review" className="text-sm font-semibold text-emerald-700 underline">Quiz đã được chấp nhận · Mở kho ôn tập</Link>}</section>
      {draft.questions.map((question, index) => <article key={question.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">Câu {index + 1}. {question.questionText}</h2><div className="grid gap-2 sm:grid-cols-2">{question.options.map((option) => <p key={option.id} className={`rounded-xl border p-3 text-sm ${option.id === question.correctOptionId ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-700"}`}><strong>{option.id}.</strong> {option.text}{option.id === question.correctOptionId && " ✓"}</p>)}</div><p className="text-sm text-slate-600">{question.explanation}</p>{question.citation && <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">Nguồn: {question.citation.documentName} · trang {question.citation.pageNumber ?? "—"}{question.citation.excerpt && ` · ${question.citation.excerpt}`}</p>}</article>)}
      {draft.status !== "GENERATING" && <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><label className="block text-sm font-semibold">Điều chỉnh yêu cầu để tạo một bản nháp khác<textarea value={prompt} maxLength={500} onChange={(event) => setPrompt(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label><button type="button" disabled={busy || !prompt.trim()} onClick={() => void regenerate()} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50">{busy ? "Đang tạo lại..." : "Tạo lại bộ câu hỏi"}</button></section>}
    </>}
  </main>;
}
