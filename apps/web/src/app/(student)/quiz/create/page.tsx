"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, FileText, Search } from "lucide-react";
import { personalDocApi, quizApi } from "@/lib/api-client";
import type { PersonalDocument } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: none. Input: owner READY PDFs and Student prompt. Output: dedicated generation form; successful creation opens the persisted draft route. Errors: shown inline. */
export default function StudentQuizCreatePage(): ReactElement {
  const router = useRouter();
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    personalDocApi.getDocuments()
      .then((items) => { if (active) setDocuments(items.filter((item) => item.status === "READY")); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được tài liệu nguồn."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  /** Args: required READY document ID. Input: current owner source selection. Output: void; toggles up to ten documents. Errors: displays selection limit. */
  function toggleDocument(id: string): void {
    if (selectedDocIds.includes(id)) setSelectedDocIds((current) => current.filter((value) => value !== id));
    else if (selectedDocIds.length >= 10) setError("Chỉ được chọn tối đa 10 tài liệu nguồn.");
    else setSelectedDocIds((current) => [...current, id]);
  }

  /** Args: form submit event. Input: 1–10 READY PDF IDs and a prompt of 1–500 characters. Output: Promise<void>; creates Java generation and opens its review route. Errors: validation/API error appears inline. */
  async function handleGenerate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedDocIds.length || !prompt.trim()) { setError("Hãy chọn tài liệu nguồn và nhập yêu cầu sinh Quiz."); return; }
    setBusy(true); setError(null);
    try {
      const draft = await quizApi.createDraft({ prompt: prompt.trim(), sourceDocumentIds: selectedDocIds });
      router.push(`/quiz/drafts/${encodeURIComponent(draft.id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể sinh Quiz."); }
    finally { setBusy(false); }
  }

  const filtered = documents.filter((item) => `${item.title} ${item.fileName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <main className="mx-auto max-w-5xl space-y-6 pb-12">
    <Link href="/review" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Ôn tập & Quiz</Link>
    <header><h1 className="text-2xl font-extrabold text-slate-900">Sinh đề thi trắc nghiệm AI</h1><p className="mt-2 text-sm text-slate-500">Chọn PDF cá nhân và nhập yêu cầu. Bạn sẽ duyệt bộ câu hỏi trước khi chấp nhận vào kho ôn tập.</p></header>
    {error && <ErrorAlert message={error} onRetry={() => setError(null)} />}
    {loading ? <LoadingSpinner text="Đang tải tài liệu nguồn..." /> : <form onSubmit={(event) => void handleGenerate(event)} className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><label htmlFor="quiz-prompt" className="block font-bold text-slate-800">1. Yêu cầu sinh bộ câu hỏi</label><textarea id="quiz-prompt" required rows={7} maxLength={500} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ví dụ: Tạo 10 câu hỏi mức độ vận dụng về hệ nhị phân, kèm giải thích và trích dẫn nguồn..." className="w-full rounded-xl border border-slate-300 p-3 text-sm" /><p className="text-right text-xs text-slate-400">{prompt.length}/500</p><p className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-slate-600">Mỗi câu có đúng 4 lựa chọn và một đáp án đúng. Quiz phải có nguồn trích dẫn từ PDF bạn đã chọn.</p><button disabled={busy || !selectedDocIds.length || !prompt.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Sparkles className="h-4 w-4" />{busy ? "Đang gửi yêu cầu..." : "Sinh bản nháp Quiz"}</button></section>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-800">2. Chọn tài liệu PDF nguồn ({selectedDocIds.length}/10)</h2><label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Tìm tài liệu nguồn" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên tài liệu..." className="w-full py-2.5 text-sm outline-none" /></label>{!documents.length && <p className="text-sm text-slate-500">Chưa có PDF ở trạng thái READY. <Link href="/personal-documents" className="text-red-700 underline">Mở tài liệu cá nhân</Link></p>}<div className="max-h-96 space-y-2 overflow-y-auto">{filtered.map((item) => <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selectedDocIds.includes(item.id) ? "border-red-300 bg-red-50" : "border-slate-200"}`}><input type="checkbox" checked={selectedDocIds.includes(item.id)} onChange={() => toggleDocument(item.id)} className="mt-1 accent-red-600" /><FileText className="mt-0.5 h-4 w-4 shrink-0 text-red-600" /><span><span className="block text-sm font-semibold text-slate-800">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.fileName}</span></span></label>)}</div></section>
    </form>}
  </main>;
}
