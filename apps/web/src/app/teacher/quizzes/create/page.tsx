"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, ListChecks, Loader2, Send, Sparkles } from "lucide-react";
import { teacherDocApi } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { TeacherDocument } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface TeacherQuizForm {
  documentId: string;
  questionCount: number;
  difficulty: Difficulty;
  topic: string;
  pageFrom: number;
  pageTo: number;
  instructions: string;
}

/** Teacher-only UI for requesting a grounded MCQ_SINGLE draft from one owned Course Material PDF. */
export default function TeacherQuizStudioPage() {
  const { isDemo } = useAuth();
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [form, setForm] = useState<TeacherQuizForm>({
    documentId: "",
    questionCount: 15,
    difficulty: "MEDIUM",
    topic: "",
    pageFrom: 1,
    pageTo: 1,
    instructions: "",
  });

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const data = (await teacherDocApi.getDocuments()).filter((document) => document.status === "READY");
        if (!active) return;
        const requestedId = new URLSearchParams(window.location.search).get("documentId");
        const selected = data.find((document) => document.id === requestedId) ?? data[0];
        setDocuments(data);
        if (selected) {
          setForm((current) => ({ ...current, documentId: selected.id, pageTo: selected.totalPages }));
        }
      } catch (loadError: unknown) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Không thể tải nguồn PDF.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === form.documentId),
    [documents, form.documentId]
  );

  /** Updates source selection and clamps the default page range to that PDF. */
  const handleDocumentChange = (documentId: string): void => {
    const document = documents.find((item) => item.id === documentId);
    setForm((current) => ({
      ...current,
      documentId,
      pageFrom: 1,
      pageTo: document?.totalPages ?? 1,
    }));
    setGenerated(false);
  };

  /** Validates the form; demo mode produces a labelled fixture, while production waits for the Java contract. */
  const handleGenerate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setGenerated(false);
    if (!selectedDocument) {
      setError("Hãy chọn một Course Material PDF ở trạng thái READY.");
      return;
    }
    if (form.pageFrom < 1 || form.pageTo > selectedDocument.totalPages || form.pageFrom > form.pageTo) {
      setError(`Khoảng trang phải nằm trong 1–${selectedDocument.totalPages}.`);
      return;
    }
    if (!isDemo) {
      setError("Java API cho Teacher Quiz Generation chưa được triển khai. FE không gọi trực tiếp Python AI Service.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setIsGenerating(false);
    setGenerated(true);
  };

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" text="Đang tải AI Quiz Studio..." /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/teacher/documents" aria-label="Quay lại kho học liệu" className="mt-1 rounded-lg border border-slate-200 bg-white p-2 text-slate-600"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Teacher · AI Quiz Generator</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Tạo Quiz sau buổi học</h1>
          <p className="mt-1 text-sm text-slate-500">Chọn PDF, phạm vi trang và số lượng câu hỏi. Bản nháp phải được Teacher duyệt trước khi công bố.</p>
        </div>
      </div>

      {isDemo && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">Dữ liệu demo · thao tác tạo bên dưới chỉ minh họa UI, không gọi model thật.</div>}
      {error && <ErrorAlert message={error} onRetry={() => setError(null)} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={handleGenerate} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <section>
            <div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">1</span><h2 className="font-bold text-slate-900">Chọn nguồn PDF</h2></div>
            <select value={form.documentId} onChange={(event) => handleDocumentChange(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-red-400">
              {documents.length === 0 && <option value="">Không có PDF READY</option>}
              {documents.map((document) => <option key={document.id} value={document.id}>{document.title} · {document.totalPages} trang</option>)}
            </select>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">2</span><h2 className="font-bold text-slate-900">Cấu hình bộ câu hỏi</h2></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Số câu hỏi
                <input type="number" min={5} max={30} value={form.questionCount} onChange={(event) => setForm((current) => ({ ...current, questionCount: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" />
              </label>
              <label className="text-xs font-bold text-slate-700">Độ khó
                <select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as Difficulty }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal outline-none focus:border-red-400"><option value="EASY">Dễ</option><option value="MEDIUM">Trung bình</option><option value="HARD">Khó</option></select>
              </label>
              <label className="text-xs font-bold text-slate-700">Từ trang
                <input type="number" min={1} max={selectedDocument?.totalPages ?? 1} value={form.pageFrom} onChange={(event) => setForm((current) => ({ ...current, pageFrom: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" />
              </label>
              <label className="text-xs font-bold text-slate-700">Đến trang
                <input type="number" min={1} max={selectedDocument?.totalPages ?? 1} value={form.pageTo} onChange={(event) => setForm((current) => ({ ...current, pageTo: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" />
              </label>
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-700">Chủ đề trọng tâm (tùy chọn)
              <input value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))} placeholder="Ví dụ: ACID và Isolation Level" className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" />
            </label>
            <label className="mt-4 block text-xs font-bold text-slate-700">Yêu cầu bổ sung (tùy chọn)
              <textarea rows={3} value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Nêu yêu cầu sư phạm; không thể thay thế system rule, schema hoặc source scope." className="mt-1 w-full resize-none rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" />
            </label>
          </section>

          <button type="submit" disabled={documents.length === 0 || isGenerating} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tạo bản nháp...</> : <><Sparkles className="h-4 w-4" /> Tạo bản nháp MCQ_SINGLE</>}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900"><FileText className="h-4 w-4 text-red-600" /> Nguồn đã chọn</div>
            <p className="mt-3 text-sm font-semibold text-slate-800">{selectedDocument?.title ?? "Chưa có nguồn"}</p>
            <dl className="mt-3 space-y-2 text-xs text-slate-600"><div className="flex justify-between"><dt>Phạm vi</dt><dd>Trang {form.pageFrom}–{form.pageTo}</dd></div><div className="flex justify-between"><dt>Số câu</dt><dd>{form.questionCount}</dd></div><div className="flex justify-between"><dt>Định dạng</dt><dd>MCQ_SINGLE · 4 lựa chọn</dd></div></dl>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-xs leading-5 text-slate-700">
            <div className="flex items-center gap-2 font-bold text-red-700"><ListChecks className="h-4 w-4" /> Quy tắc bắt buộc</div>
            <ul className="mt-2 list-disc space-y-1 pl-4"><li>Mỗi câu đúng một đáp án.</li><li>Citation phải thuộc PDF và khoảng trang đã chọn.</li><li>AI không chấm điểm hoặc tự công bố.</li><li>Teacher review, sửa và quyết định publish.</li></ul>
          </div>
          {generated && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5" /> Đã tạo fixture demo</div>
              <p className="mt-2 text-xs leading-5">Bản nháp {form.questionCount} câu ở trạng thái <code>REVIEW_REQUIRED</code>. Khi Java contract được triển khai, bước tiếp theo là màn duyệt/sửa rồi công bố.</p>
              <button type="button" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"><Send className="h-3.5 w-3.5" /> Mở màn duyệt (demo)</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
