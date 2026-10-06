"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquareText,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { materialApi } from "@/lib/api-client";
import { CourseMaterialTutorResponse, MaterialPage, TeacherDocument } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

type SidePanelTab = "NOTE" | "TUTOR";

interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: CourseMaterialTutorResponse;
}

/**
 * Renders the authorized Course Material PDF workspace.
 * Input: documentId from the route. Output: page viewer, personal note editor and Student-only AI Tutor.
 * Errors: missing/forbidden documents are surfaced through the shared error state.
 */
export default function CourseMaterialViewerPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;
  const [document, setDocument] = useState<TeacherDocument | null>(null);
  const [pages, setPages] = useState<MaterialPage[]>([]);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [activeTab, setActiveTab] = useState<SidePanelTab>("TUTOR");
  const [note, setNote] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = useMemo(
    () => pages.find((page) => page.pageNumber === currentPageNumber) ?? pages[0],
    [pages, currentPageNumber]
  );

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const [documentData, pageData] = await Promise.all([
          materialApi.getDocument(documentId),
          materialApi.getPages(documentId),
        ]);
        if (!active) return;
        setDocument(documentData);
        setPages(pageData);
        setCurrentPageNumber(pageData[0]?.pageNumber ?? 1);
      } catch (loadError: unknown) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Không thể mở tài liệu PDF.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [documentId]);

  useEffect(() => {
    if (!currentPage) return;
    let active = true;
    const loadPageContext = async (): Promise<void> => {
      const savedNote = await materialApi.getPageNote(documentId, currentPage.pageNumber);
      if (active) setNote(savedNote);
      await materialApi.recordPageView(documentId, currentPage.pageNumber);
    };
    void loadPageContext();
    return () => {
      active = false;
    };
  }, [currentPage, documentId]);

  /** Saves the Student-owned note for the currently visible page. */
  const handleSaveNote = async (): Promise<void> => {
    if (!currentPage) return;
    setIsSavingNote(true);
    try {
      await materialApi.savePageNote(documentId, currentPage.pageNumber, note);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu ghi chú.");
    } finally {
      setIsSavingNote(false);
    }
  };

  /** Sends a grounded question for the current page and appends the structured result. */
  const handleAskTutor = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || !currentPage || isAsking) return;
    setQuestion("");
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: cleanQuestion },
    ]);
    setIsAsking(true);
    try {
      const result = await materialApi.askCourseMaterialTutor(
        documentId,
        currentPage.pageNumber,
        cleanQuestion
      );
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            result.status === "NO_EVIDENCE"
              ? "Không tìm thấy đủ bằng chứng trong học liệu được cấp quyền để trả lời câu hỏi này."
              : result.answer ?? "Không có nội dung trả lời.",
          result,
        },
      ]);
    } catch (askError: unknown) {
      setError(askError instanceof Error ? askError.message : "AI Tutor chưa thể trả lời.");
    } finally {
      setIsAsking(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" text="Đang mở PDF..." /></div>;
  }

  if (error && !document) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/materials" aria-label="Quay lại học liệu" className="rounded-lg border border-slate-200 p-2 text-slate-600">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
              <FileText className="h-3.5 w-3.5" /> PDF Viewer
            </div>
            <h1 className="truncate text-lg font-extrabold text-slate-900">{document?.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <button
            type="button"
            onClick={() => setCurrentPageNumber((value) => Math.max(1, value - 1))}
            disabled={currentPageNumber <= 1}
            className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            aria-label="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          Trang {currentPageNumber} / {document?.totalPages ?? pages.length}
          <button
            type="button"
            onClick={() => setCurrentPageNumber((value) => Math.min(pages.length, value + 1))}
            disabled={currentPageNumber >= pages.length}
            className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            aria-label="Trang sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={() => setError(null)} />}

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[150px_minmax(0,1fr)_360px]">
        <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 xl:block">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Trang tài liệu</div>
          <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {pages.map((page) => (
              <button
                key={page.pageNumber}
                type="button"
                onClick={() => setCurrentPageNumber(page.pageNumber)}
                className={`w-full rounded-xl border p-2 text-left ${
                  page.pageNumber === currentPageNumber
                    ? "border-red-300 bg-red-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="aspect-[3/4] rounded-md border border-slate-200 bg-slate-50 p-2 text-[7px] leading-relaxed text-slate-500">
                  {page.title}
                </div>
                <div className="mt-1.5 text-center text-xs font-bold text-slate-700">Trang {page.pageNumber}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:p-8">
          <article className="aspect-[3/4] w-full max-w-[610px] overflow-y-auto border border-slate-300 bg-white p-8 shadow-xl sm:p-12">
            <div className="mb-8 flex items-center justify-between border-b-2 border-red-600 pb-3 text-xs text-slate-500">
              <span>STUDYFLOW · COURSE MATERIAL</span>
              <span>Trang {currentPage?.pageNumber}</span>
            </div>
            <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">{currentPage?.title}</h2>
            <ul className="mt-8 space-y-5 text-base leading-7 text-slate-700">
              {currentPage?.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <aside className="flex min-h-[540px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-2 border-b border-slate-200 p-2">
            <button
              type="button"
              onClick={() => setActiveTab("NOTE")}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${activeTab === "NOTE" ? "bg-red-600 text-white" : "text-slate-600"}`}
            >
              <MessageSquareText className="mr-1.5 inline h-4 w-4" /> Ghi chú
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("TUTOR")}
              className={`rounded-lg px-3 py-2 text-xs font-bold ${activeTab === "TUTOR" ? "bg-red-600 text-white" : "text-slate-600"}`}
            >
              <Bot className="mr-1.5 inline h-4 w-4" /> AI Tutor
            </button>
          </div>

          {activeTab === "NOTE" ? (
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <h3 className="font-bold text-slate-900">Ghi chú cá nhân · Trang {currentPageNumber}</h3>
                <p className="mt-1 text-xs text-slate-500">Chỉ tài khoản của bạn được xem nội dung này.</p>
              </div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-[360px] flex-1 resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="Ghi lại ý chính của trang này..."
              />
              <button
                type="button"
                onClick={() => void handleSaveNote()}
                disabled={isSavingNote}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {isSavingNote ? "Đang lưu..." : "Lưu ghi chú"}
              </button>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="border-b border-slate-100 bg-red-50 p-4 text-xs text-slate-700">
                <div className="flex items-center gap-2 font-bold text-red-700"><Sparkles className="h-4 w-4" /> Course Material AI Tutor</div>
                <p className="mt-1">Ưu tiên ngữ cảnh trang {currentPageNumber}; câu trả lời luôn kèm citation theo trang.</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs leading-5 text-slate-500">
                    Hãy hỏi một khái niệm trong tài liệu. Nếu không đủ bằng chứng, hệ thống sẽ trả <code>NO_EVIDENCE</code>.
                  </div>
                )}
                {messages.map((message) => (
                  <div key={message.id} className={`rounded-xl p-3 text-sm ${message.role === "user" ? "ml-8 bg-slate-100" : "mr-4 border border-red-100 bg-red-50"}`}>
                    <p className="whitespace-pre-wrap leading-6 text-slate-800">{message.content}</p>
                    {message.result?.citations.map((citation) => (
                      <div key={`${citation.documentId}-${citation.pageNumber}`} className="mt-3 rounded-lg border border-red-200 bg-white p-2 text-xs text-slate-600">
                        <strong className="text-red-700">Trang {citation.pageNumber}</strong> · {citation.excerpt}
                      </div>
                    ))}
                  </div>
                ))}
                {isAsking && <LoadingSpinner size="sm" text="AI đang đối chiếu nguồn..." />}
              </div>
              <form onSubmit={handleAskTutor} className="border-t border-slate-200 p-3">
                <div className="flex gap-2">
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    rows={2}
                    placeholder="Hỏi về nội dung trang này..."
                    className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                  <button type="submit" disabled={!question.trim() || isAsking} className="self-end rounded-xl bg-red-600 p-3 text-white disabled:opacity-40" aria-label="Gửi câu hỏi">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
