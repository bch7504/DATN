"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  MessageCircle,
  Send,
} from "lucide-react";
import { materialApi } from "@/lib/api-client";
import { CourseMaterialTutorResponse, TeacherDocument } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/**
 * Displays one authorized Course Material PDF beside its page-aware AI Tutor.
 *
 * @returns Student viewer UI backed only by the Java public API.
 * @throws no error to the route; loading and API failures are rendered in place.
 */
export default function CourseMaterialViewerPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;
  const [document, setDocument] = useState<TeacherDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [question, setQuestion] = useState("");
  const [tutorResult, setTutorResult] = useState<CourseMaterialTutorResponse | null>(null);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [backHref, setBackHref] = useState("/course-offerings");

  /** Args: none. Input: optional Course Offering ID supplied by the class detail link. Output: void; restores the safest class return URL. Errors: malformed or missing values fall back to the class list. */
  useEffect(() => {
    const offeringId = new URLSearchParams(window.location.search).get("offeringId");
    if (offeringId) setBackHref(`/course-offerings?offeringId=${encodeURIComponent(offeringId)}`);
  }, []);

  useEffect(() => {
    let active = true;
    materialApi.getMaterials().then((items) => {
      if (active) setDocument(items.find((item) => item.id === documentId) ?? null);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Không thể mở tài liệu.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [documentId]);

  const previewUrl = useMemo(() => {
    if (!document) return "";
    return `${materialApi.getDownloadUrl(document.id)}#page=${pageNumber}&view=FitH`;
  }, [document, pageNumber]);

  /**
   * @param event form submission from the Tutor panel
   * @returns Promise<void>; stores the grounded response in local UI state
   * @throws no error to React; Java/Python failures are rendered as an alert
   */
  async function handleAskTutor(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!document || isAsking) return;
    setTutorError(null);
    setIsAsking(true);
    try {
      const result = await materialApi.askTutor(document.id, pageNumber, question);
      setTutorResult(result);
      setQuestion("");
    } catch (askError: unknown) {
      setTutorError(askError instanceof Error ? askError.message : "Không thể gửi câu hỏi đến AI Tutor.");
    } finally {
      setIsAsking(false);
    }
  }

  /**
   * @param nextPage requested 1-based PDF page
   * @returns void; clamps the value to this document's known page range
   */
  function selectPage(nextPage: number): void {
    if (!document) return;
    setPageNumber(Math.min(document.totalPages, Math.max(1, Math.trunc(nextPage) || 1)));
  }

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" text="Đang tải tài liệu..." /></div>;
  }
  if (error) return <ErrorAlert message={error} />;
  if (!document) {
    return <ErrorAlert message="Tài liệu không tồn tại hoặc chưa được công bố cho lớp bạn đã được duyệt." />;
  }
  if (document.materialType !== "SLIDE_PDF") {
    return <ErrorAlert message="Tài liệu tham khảo chỉ được tải xuống; không có trình xem slide hoặc AI Tutor." />;
  }

  const downloadUrl = materialApi.getDownloadUrl(document.id, true);
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} aria-label="Quay lại lớp học phần" className="rounded-lg border border-slate-200 p-2 text-slate-600">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600"><FileText className="h-3.5 w-3.5" /> Slide PDF</div>
            <h1 className="truncate text-lg font-extrabold text-slate-900">{document.title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="current-page" className="text-sm font-semibold text-slate-700">Slide đang xem</label>
          <input
            id="current-page"
            type="number"
            min={1}
            max={document.totalPages}
            value={pageNumber}
            onChange={(event) => selectPage(Number(event.target.value))}
            className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
          <span className="text-sm text-slate-500">/ {document.totalPages}</span>
          <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">
            <ExternalLink className="h-4 w-4" /> Mở slide
          </a>
          <a href={downloadUrl} download className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">
            <Download className="h-4 w-4" /> Tải PDF
          </a>
        </div>
      </header>

      <div className="grid min-h-[72vh] gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Trình xem Slide PDF">
          <iframe key={previewUrl} src={previewUrl} title={`PDF ${document.title}`} className="h-[72vh] w-full bg-slate-50" />
        </section>

        <aside className="flex min-h-[560px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="AI Tutor theo slide">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center gap-2 text-red-600"><MessageCircle className="h-5 w-5" /><span className="text-sm font-extrabold uppercase tracking-wide">AI Tutor</span></div>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900">Hỏi về slide {pageNumber}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Câu trả lời chỉ dùng nội dung Slide PDF đã được giảng viên công bố và luôn kèm nguồn theo số slide.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
            {!tutorResult && !tutorError && (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                <BookOpen className="mb-3 h-6 w-6 text-red-600" />
                Chọn đúng slide đang xem rồi đặt câu hỏi. Nếu tài liệu không có đủ căn cứ, hệ thống sẽ thông báo không tìm thấy bằng chứng.
              </div>
            )}
            {tutorError && <ErrorAlert message={tutorError} />}
            {tutorResult && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                    {tutorResult.status === "ANSWERED" ? "Câu trả lời có nguồn" : "Không đủ bằng chứng"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {tutorResult.answer ?? "Không tìm thấy nội dung phù hợp trong phạm vi tài liệu được phép."}
                  </p>
                </div>
                {tutorResult.citations.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-slate-900">Nguồn tham khảo</h3>
                    {tutorResult.citations.map((citation, index) => (
                      <button
                        type="button"
                        key={`${citation.documentId}-${citation.pageNumber}-${index}`}
                        onClick={() => selectPage(citation.pageNumber)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left"
                      >
                        <span className="text-xs font-bold text-red-600">Slide {citation.pageNumber}</span>
                        <span className="mt-1 block text-sm leading-5 text-slate-600">{citation.excerpt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleAskTutor} className="border-t border-slate-200 p-4">
            <label htmlFor="tutor-question" className="sr-only">Câu hỏi cho AI Tutor</label>
            <textarea
              id="tutor-question"
              value={question}
              maxLength={2000}
              rows={3}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={`Đặt câu hỏi về slide ${pageNumber}...`}
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
            <button
              type="submit"
              disabled={isAsking || !question.trim()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAsking ? <LoadingSpinner size="sm" text="Đang tìm trong slide..." /> : <><Send className="h-4 w-4" /> Gửi câu hỏi</>}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
