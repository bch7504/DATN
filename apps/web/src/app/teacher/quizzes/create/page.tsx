"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, ListChecks, Loader2, Sparkles } from "lucide-react";
import { teacherApi, teacherDocApi, teacherQuizApi } from "@/lib/api-client";
import type { TeacherDocument } from "@/types/material";
import type { CourseOffering } from "@/types/course-offering";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface TeacherQuizForm {
  documentIds: string[];
  courseOfferingId: string;
  questionCount: number;
  difficulty: Difficulty;
  topic: string;
  pageFrom: number;
  pageTo: number;
  instructions: string;
}

/** Teacher UI for requesting a grounded MCQ_SINGLE draft from an owned Course Material PDF. */
export default function TeacherQuizStudioPage(): React.JSX.Element {
  const router = useRouter();
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherQuizForm>({
    documentIds: [],
    courseOfferingId: "",
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
        const [documentItems, offeringItems] = await Promise.all([
          teacherDocApi.getDocuments(),
          teacherApi.getOfferings(),
        ]);
        if (!active) return;
        const ready = documentItems.filter((document) => document.status === "READY" && document.materialType === "SLIDE_PDF");
        const activeOfferings = offeringItems.filter((offering) => offering.status === "ACTIVE");
        const requestedId = new URLSearchParams(window.location.search).get("documentId");
        const requestedOfferingId = new URLSearchParams(window.location.search).get("offeringId");
        const selectedOfferingId = activeOfferings.some((item) => item.id === requestedOfferingId)
          ? requestedOfferingId ?? ""
          : activeOfferings[0]?.id ?? "";
        const selected = ready.find((document) => document.id === requestedId
          && document.publishedOfferings.some((publication) => publication.offeringId === selectedOfferingId));
        setDocuments(ready);
        setOfferings(activeOfferings);
        setForm((current) => ({
          ...current,
          documentIds: selected ? [selected.id] : [],
          courseOfferingId: selectedOfferingId,
          pageFrom: 1,
          pageTo: selected?.totalPages ?? 1,
        }));
      } catch (loadError: unknown) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu tạo Quiz.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const availableDocuments = useMemo(
    () => documents.filter((document) => document.publishedOfferings
      .some((publication) => publication.offeringId === form.courseOfferingId)),
    [documents, form.courseOfferingId],
  );

  const selectedDocuments = useMemo(
    () => availableDocuments.filter((document) => form.documentIds.includes(document.id)),
    [availableDocuments, form.documentIds],
  );
  const pageLimit = selectedDocuments.length > 0
    ? Math.min(...selectedDocuments.map((document) => document.totalPages))
    : 1;

  /** Args: owned active offering ID. Input: Teacher class selection. Output: resets source/page selection to avoid cross-class scope. Errors: none. */
  function handleOfferingChange(courseOfferingId: string): void {
    setForm((current) => ({ ...current, courseOfferingId, documentIds: [], pageFrom: 1, pageTo: 1 }));
  }

  /** Args: READY published SLIDE_PDF ID. Input: checkbox selection, maximum 10. Output: toggled source list and common valid page range. Errors: inline selection message. */
  function toggleDocument(documentId: string): void {
    setError(null);
    setForm((current) => {
      const exists = current.documentIds.includes(documentId);
      if (!exists && current.documentIds.length >= 10) {
        setError("Chỉ được chọn tối đa 10 tài liệu.");
        return current;
      }
      const documentIds = exists
        ? current.documentIds.filter((id) => id !== documentId)
        : [...current.documentIds, documentId];
      const selected = availableDocuments.filter((document) => documentIds.includes(document.id));
      const nextLimit = selected.length > 0 ? Math.min(...selected.map((document) => document.totalPages)) : 1;
      return { ...current, documentIds, pageFrom: 1, pageTo: nextLimit };
    });
  }

  /** Required form event; validates controls and calls only the Java public API. */
  async function handleGenerate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (selectedDocuments.length < 1 || selectedDocuments.length > 10) {
      setError("Hãy chọn từ 1 đến 10 Slide PDF đã công bố trong lớp.");
      return;
    }
    if (!form.courseOfferingId) {
      setError("Hãy chọn lớp học phần sử dụng bộ câu hỏi.");
      return;
    }
    if (form.questionCount < 1 || form.questionCount > 30) {
      setError("Số câu hỏi phải từ 1 đến 30.");
      return;
    }
    if (form.pageFrom < 1 || form.pageTo > pageLimit || form.pageFrom > form.pageTo) {
      setError(`Khoảng trang dùng chung phải nằm trong 1–${pageLimit}.`);
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const created = await teacherQuizApi.generate({
        documentIds: form.documentIds,
        courseOfferingId: form.courseOfferingId,
        instruction: form.instructions.trim() || "Tạo bộ câu hỏi trắc nghiệm sau buổi học từ tài liệu đã chọn.",
        questionCount: form.questionCount,
        difficulty: form.difficulty,
        topic: form.topic.trim() || undefined,
        pageFrom: form.pageFrom,
        pageTo: form.pageTo,
      });
      router.push(`/teacher/quizzes/${encodeURIComponent(created.id)}?offeringId=${encodeURIComponent(form.courseOfferingId)}`);
    } catch (generateError: unknown) {
      setError(generateError instanceof Error ? generateError.message : "Không thể tạo bản nháp Quiz.");
    } finally {
      setIsGenerating(false);
    }
  }

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
          <p className="mt-1 text-sm text-slate-500">Chọn lớp, một hoặc nhiều Slide PDF và phạm vi trang. Không có tài liệu nào được chọn mặc định.</p>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={() => setError(null)} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleGenerate} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <section>
            <div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">1</span><h2 className="font-bold text-slate-900">Chọn lớp và nguồn PDF</h2></div>
            <label className="block text-xs font-bold text-slate-700">Lớp học phần
              <select value={form.courseOfferingId} onChange={(event) => handleOfferingChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal outline-none focus:border-red-400">
                {offerings.length === 0 && <option value="">Không có lớp ACTIVE</option>}
                {offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.code} · {offering.name}</option>)}
              </select>
            </label>
            <fieldset className="mt-4">
              <legend className="text-xs font-bold text-slate-700">Slide PDF đã công bố · chọn 1–10 tài liệu</legend>
              {availableDocuments.length === 0 ? <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Lớp chưa có Slide PDF READY đã công bố.</p> : <div className="mt-2 grid gap-2 sm:grid-cols-2">{availableDocuments.map((document) => {
                const checked = form.documentIds.includes(document.id);
                return <label key={document.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}><input type="checkbox" checked={checked} onChange={() => toggleDocument(document.id)} className="mt-1 h-4 w-4 accent-red-600" /><span><span className="block text-sm font-semibold text-slate-800">{document.title}</span><span className="text-xs text-slate-500">{document.totalPages} trang</span></span></label>;
              })}</div>}
              <p className="mt-2 text-xs font-semibold text-red-700">Đã chọn {selectedDocuments.length}/10 tài liệu</p>
            </fieldset>
          </section>

          <section className="border-t border-slate-100 pt-5">
            <div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">2</span><h2 className="font-bold text-slate-900">Cấu hình bộ câu hỏi</h2></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Số câu hỏi<input type="number" min={1} max={30} value={form.questionCount} onChange={(event) => setForm((current) => ({ ...current, questionCount: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" /></label>
              <label className="text-xs font-bold text-slate-700">Độ khó<select value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as Difficulty }))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal outline-none focus:border-red-400"><option value="EASY">Dễ</option><option value="MEDIUM">Trung bình</option><option value="HARD">Khó</option></select></label>
              <label className="text-xs font-bold text-slate-700">Từ trang<input type="number" min={1} max={pageLimit} value={form.pageFrom} onChange={(event) => setForm((current) => ({ ...current, pageFrom: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" /></label>
              <label className="text-xs font-bold text-slate-700">Đến trang<input type="number" min={1} max={pageLimit} value={form.pageTo} onChange={(event) => setForm((current) => ({ ...current, pageTo: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" /></label>
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-700">Chủ đề trọng tâm (tùy chọn)<input value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))} placeholder="Ví dụ: Hệ đếm và chuyển đổi cơ số" className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" /></label>
            <label className="mt-4 block text-xs font-bold text-slate-700">Yêu cầu bổ sung (tùy chọn)<textarea rows={3} value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Nêu yêu cầu sư phạm; không thể thay quy tắc hệ thống hoặc phạm vi nguồn." className="mt-1 w-full resize-none rounded-xl border border-slate-300 p-3 text-sm font-normal outline-none focus:border-red-400" /></label>
          </section>

          <button type="submit" disabled={selectedDocuments.length === 0 || offerings.length === 0 || isGenerating} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tạo bản nháp...</> : <><Sparkles className="h-4 w-4" /> Tạo bản nháp MCQ_SINGLE</>}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900"><FileText className="h-4 w-4 text-red-600" /> Nguồn đã chọn</div>
            {selectedDocuments.length === 0 ? <p className="mt-3 text-sm text-slate-500">Chưa chọn nguồn</p> : <ul className="mt-3 space-y-2">{selectedDocuments.map((document) => <li key={document.id} className="rounded-lg bg-slate-50 p-2 text-sm font-semibold text-slate-800">{document.title}</li>)}</ul>}
            <dl className="mt-3 space-y-2 text-xs text-slate-600"><div className="flex justify-between"><dt>Phạm vi</dt><dd>Trang {form.pageFrom}–{form.pageTo}</dd></div><div className="flex justify-between"><dt>Số câu</dt><dd>{form.questionCount}</dd></div><div className="flex justify-between"><dt>Định dạng</dt><dd>MCQ_SINGLE · 4 lựa chọn</dd></div></dl>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-xs leading-5 text-slate-700">
            <div className="flex items-center gap-2 font-bold text-red-700"><ListChecks className="h-4 w-4" /> Quy tắc bắt buộc</div>
            <ul className="mt-2 list-disc space-y-1 pl-4"><li>Mỗi câu có đúng 4 lựa chọn và một đáp án đúng.</li><li>Citation phải thuộc PDF và khoảng trang đã chọn.</li><li>AI không chấm điểm hoặc tự công bố.</li><li>Giảng viên kiểm tra trước khi sử dụng.</li></ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
