"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  GripHorizontal,
  Save,
  Send,
  StickyNote,
} from "lucide-react";
import { materialApi } from "@/lib/api-client";
import { CourseMaterialTutorHistory, CourseMaterialTutorResponse, SlideTextLayer, TeacherDocument } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

type TutorTimelineEntry =
  | { id: string; type: "page-context"; pageNumber: number }
  | {
      id: string;
      type: "exchange";
      pageNumber: number;
      question: string;
      response: CourseMaterialTutorResponse;
    };

/** Convert Java-owned persisted USER/ASSISTANT turns into visual Tutor exchanges. */
function historyToTimeline(history: CourseMaterialTutorHistory): TutorTimelineEntry[] {
  const entries: TutorTimelineEntry[] = [];
  let pendingQuestion: CourseMaterialTutorHistory["messages"][number] | null = null;
  for (const message of history.messages) {
    if (message.role === "USER") {
      pendingQuestion = message;
      continue;
    }
    if (!pendingQuestion) continue;
    const status = message.status === "ANSWERED" ? "ANSWERED" : "NO_EVIDENCE";
    entries.push({
      id: `history-${pendingQuestion.id}-${message.id}`,
      type: "exchange",
      pageNumber: pendingQuestion.pageNumber,
      question: pendingQuestion.content,
      response: {
        conversationId: history.conversationId,
        status,
        answer: status === "ANSWERED" ? message.content : null,
        citations: message.citations,
      },
    });
    pendingQuestion = null;
  }
  return entries;
}

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
  const [tutorTimeline, setTutorTimeline] = useState<TutorTimelineEntry[]>([]);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isTutorHistoryLoaded, setIsTutorHistoryLoaded] = useState(false);
  const [isTutorHistoryLoading, setIsTutorHistoryLoading] = useState(false);
  const [backHref, setBackHref] = useState("/materials");
  const [slideImageUrl, setSlideImageUrl] = useState<string | null>(null);
  const [slideError, setSlideError] = useState<string | null>(null);
  const [isSlideLoading, setIsSlideLoading] = useState(false);
  const [slideReloadKey, setSlideReloadKey] = useState(0);
  const [textLayer, setTextLayer] = useState<SlideTextLayer | null>(null);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(true);
  const [noteHeight, setNoteHeight] = useState(220);
  const [noteContent, setNoteContent] = useState("");
  const [savedNoteContent, setSavedNoteContent] = useState("");
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const noteDrag = useRef<{ startY: number; startHeight: number } | null>(null);
  const tutorEntrySequence = useRef(0);
  const tutorMessagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * @param prefix required stable entry category used only by this Tutor timeline
   * @returns a unique client-side key; no server state or business result is changed
   * @throws never
   */
  const nextTutorEntryId = useCallback((prefix: "page" | "exchange"): string => {
    tutorEntrySequence.current += 1;
    return `${prefix}-${documentId}-${tutorEntrySequence.current}`;
  }, [documentId]);

  /** Args: none. Input: optional courseId/offeringId supplied by class or material links. Output: void; restores the matching dedicated return route. Errors: malformed or missing values fall back to the material list. */
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const courseId = query.get("courseId");
    const offeringId = query.get("offeringId");
    setBackHref(courseId ? `/course-offerings/${encodeURIComponent(courseId)}` : offeringId ? `/materials/class/${encodeURIComponent(offeringId)}` : "/materials");
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

  /** Args: route document id. Output: void; starts a separate in-view Tutor timeline for that document. Errors: none. */
  useEffect(() => {
    tutorEntrySequence.current = 0;
    setTutorTimeline([]);
    setTutorError(null);
    setIsTutorHistoryLoaded(false);
  }, [documentId]);

  /** Args: authorized SLIDE_PDF. Output: restores Java-owned long-term Tutor memory. Errors: shown in Tutor panel. */
  useEffect(() => {
    if (!document || document.id !== documentId || document.materialType !== "SLIDE_PDF") return;
    let active = true;
    setIsTutorHistoryLoading(true);
    setTutorError(null);
    materialApi.getTutorHistory(document.id).then((history) => {
      if (active) setTutorTimeline(historyToTimeline(history));
    }).catch((loadError: unknown) => {
      if (active) setTutorError(loadError instanceof Error ? loadError.message : "Không thể tải lịch sử AI Tutor.");
    }).finally(() => {
      if (active) {
        setIsTutorHistoryLoading(false);
        setIsTutorHistoryLoaded(true);
      }
    });
    return () => { active = false; };
  }, [document, documentId]);

  /** Args: authorized document and current page. Output: appends one compact page marker without deleting prior exchanges. Errors: none. */
  useEffect(() => {
    if (!document || document.id !== documentId || document.materialType !== "SLIDE_PDF" || !isTutorHistoryLoaded) return;
    setTutorTimeline((current) => {
      const latestMarker = [...current].reverse().find((entry) => entry.type === "page-context");
      if (latestMarker?.pageNumber === pageNumber) return current;
      return [...current, { id: nextTutorEntryId("page"), type: "page-context", pageNumber }];
    });
  }, [document, documentId, isTutorHistoryLoaded, nextTutorEntryId, pageNumber]);

  /** Args: Tutor timeline changes. Output: keeps the latest page marker or answer visible. Errors: none. */
  useEffect(() => {
    tutorMessagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [tutorTimeline, tutorError, isAsking]);

  /** Args: current authorized SLIDE_PDF and page. Output: void; loads an authenticated PNG and revokes its temporary URL. Errors: rendered inside the viewer. */
  useEffect(() => {
    if (!document || document.materialType !== "SLIDE_PDF") return;
    let active = true;
    let objectUrl: string | null = null;
    setIsSlideLoading(true);
    setSlideError(null);
    setSlideImageUrl(null);
    setTextLayer(null);
    const imageRequest = materialApi.getSlideImage(document.id, pageNumber).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (active) setSlideImageUrl(objectUrl);
      else URL.revokeObjectURL(objectUrl);
    });
    const textRequest = materialApi.getSlideTextLayer(document.id, pageNumber)
      .then((layer) => { if (active) setTextLayer(layer); })
      .catch(() => { if (active) setTextLayer(null); });
    Promise.all([imageRequest, textRequest]).catch((loadError: unknown) => {
      if (active) setSlideError(loadError instanceof Error ? loadError.message : "Không thể hiển thị slide.");
    }).finally(() => {
      if (active) setIsSlideLoading(false);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document, pageNumber, slideReloadKey]);

  /** Args: authorized slide/page. Output: own persisted note. Errors: rendered in the note panel. */
  useEffect(() => {
    if (!document || document.materialType !== "SLIDE_PDF") return;
    let active = true;
    setIsNoteLoading(true);
    setNoteError(null);
    materialApi.getPageNote(document.id, pageNumber).then((note) => {
      if (!active) return;
      setNoteContent(note.content);
      setSavedNoteContent(note.content);
    }).catch((loadError: unknown) => {
      if (active) setNoteError(loadError instanceof Error ? loadError.message : "Không thể tải ghi chú của slide.");
    }).finally(() => {
      if (active) setIsNoteLoading(false);
    });
    return () => { active = false; };
  }, [document, pageNumber]);

  /**
   * @param event form submission from the Tutor panel
   * @returns Promise<void>; stores the grounded response in local UI state
   * @throws no error to React; Java/Python failures are rendered as an alert
   */
  async function handleAskTutor(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!document || isAsking) return;
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) return;
    const askedPage = pageNumber;
    setTutorError(null);
    setIsAsking(true);
    try {
      const result = await materialApi.askTutor(document.id, askedPage, normalizedQuestion);
      setTutorTimeline((current) => [
        ...current,
        {
          id: nextTutorEntryId("exchange"),
          type: "exchange",
          pageNumber: askedPage,
          question: normalizedQuestion,
          response: result,
        },
      ]);
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
    setTutorError(null);
  }

  /** Args: current note. Output: persisted owner-scoped note. Errors: rendered in the note panel. */
  async function saveNote(): Promise<void> {
    if (!document || isNoteSaving || noteContent.length > 5000) return;
    setIsNoteSaving(true);
    setNoteError(null);
    try {
      const saved = await materialApi.savePageNote(document.id, pageNumber, noteContent);
      setNoteContent(saved.content);
      setSavedNoteContent(saved.content);
    } catch (saveError: unknown) {
      setNoteError(saveError instanceof Error ? saveError.message : "Không thể lưu ghi chú.");
    } finally {
      setIsNoteSaving(false);
    }
  }

  /** Args: pointer-down on the note handle. Output: captures the resize origin. Errors: none. */
  function startNoteResize(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!isNoteOpen) setIsNoteOpen(true);
    noteDrag.current = { startY: event.clientY, startHeight: noteHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  /** Args: captured pointer movement. Output: resizes to 120–420px or hides below 80px. Errors: none. */
  function resizeNote(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!noteDrag.current) return;
    const nextHeight = noteDrag.current.startHeight + noteDrag.current.startY - event.clientY;
    if (nextHeight < 80) {
      setIsNoteOpen(false);
      return;
    }
    setIsNoteOpen(true);
    setNoteHeight(Math.min(420, Math.max(120, nextHeight)));
  }

  /** Args: pointer-up/cancel. Output: ends note resizing. Errors: none. */
  function stopNoteResize(): void {
    noteDrag.current = null;
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

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} aria-label="Quay lại học liệu" className="rounded-lg border border-slate-200 p-2 text-slate-600">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600"><FileText className="h-3.5 w-3.5" /> Slide PDF</div>
            <h1 className="truncate text-lg font-extrabold text-slate-900">{document.title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={pageNumber <= 1} onClick={() => selectPage(pageNumber - 1)} className="rounded-xl bg-red-600 p-2 text-white disabled:opacity-40" aria-label="Slide trước">
            <ChevronLeft className="h-4 w-4" />
          </button>
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
          <button type="button" disabled={pageNumber >= document.totalPages} onClick={() => selectPage(pageNumber + 1)} className="rounded-xl bg-red-600 p-2 text-white disabled:opacity-40" aria-label="Slide sau">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid min-h-[72vh] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <aside className={`order-2 flex self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[width] ${isTutorOpen ? "h-[min(760px,calc(100dvh-2rem))] w-full flex-col xl:sticky xl:top-4 xl:w-[360px]" : "w-full flex-col xl:sticky xl:top-4 xl:w-20"}`} aria-label="AI Tutor theo slide">
          <button type="button" onClick={() => setIsTutorOpen((open) => !open)} aria-expanded={isTutorOpen} className={`flex w-full shrink-0 items-center gap-3 p-4 text-left ${isTutorOpen ? "border-b border-slate-200" : "justify-center"}`}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-sm"><Bot className="h-6 w-6" /></span>
            {isTutorOpen && <span><span className="block text-sm font-extrabold text-slate-900">AI Tutor</span><span className="block text-xs text-slate-500">Nhấn lại để ẩn</span></span>}
          </button>
          {isTutorOpen && <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-slate-200 p-5">
            <h2 className="mt-2 text-xl font-extrabold text-slate-900">Hội thoại AI Tutor</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-red-600">Hiện đang ở trang {pageNumber}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Câu trả lời chỉ dùng nội dung Slide PDF đã được giảng viên công bố và luôn kèm nguồn theo số slide.</p>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable]" aria-live="polite" data-testid="tutor-scroll-region">
            {tutorTimeline.length <= 1 && !tutorError && (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                <BookOpen className="mb-3 h-6 w-6 text-red-600" />
                Chọn đúng slide đang xem rồi đặt câu hỏi. Nếu tài liệu không có đủ căn cứ, hệ thống sẽ thông báo không tìm thấy bằng chứng.
              </div>
            )}
            {isTutorHistoryLoading && <LoadingSpinner size="sm" text="Đang tải lịch sử AI Tutor..." />}
            {tutorTimeline.map((entry) => entry.type === "page-context" ? (
              <div key={entry.id} className="flex items-center gap-2 py-1 text-[11px] font-semibold text-slate-400" role="status">
                <span className="h-px flex-1 bg-slate-200" />
                <span>Đang xem trang {entry.pageNumber}</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            ) : (
              <div key={entry.id} className="space-y-3">
                <div className="ml-8 rounded-2xl rounded-br-md bg-red-600 px-4 py-3 text-sm leading-6 text-white">
                  <p className="whitespace-pre-wrap">{entry.question}</p>
                  <p className="mt-1 text-[11px] font-semibold text-red-100">Hỏi tại trang {entry.pageNumber}</p>
                </div>
                <div className="space-y-3 rounded-2xl rounded-bl-md border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                    {entry.response.status === "ANSWERED" ? "Câu trả lời có nguồn" : "Không đủ bằng chứng"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {entry.response.answer ?? "Không tìm thấy nội dung phù hợp trong phạm vi tài liệu được phép."}
                  </p>
                  {entry.response.citations.length > 0 && (
                    <div className="space-y-2 border-t border-red-100 pt-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Nguồn tham khảo</h3>
                      {entry.response.citations.map((citation, index) => (
                        <button
                          type="button"
                          key={`${entry.id}-${citation.documentId}-${citation.pageNumber}-${index}`}
                          onClick={() => selectPage(citation.pageNumber)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left"
                        >
                          <span className="text-xs font-bold text-red-600">Trang {citation.pageNumber}</span>
                          <span className="mt-1 block text-sm leading-5 text-slate-600">{citation.excerpt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {tutorError && <ErrorAlert message={tutorError} />}
            {isAsking && <LoadingSpinner size="sm" text={`AI Tutor đang trả lời theo trang ${pageNumber}...`} />}
            <div ref={tutorMessagesEndRef} />
          </div>

          <form onSubmit={handleAskTutor} className="shrink-0 border-t border-slate-200 bg-white p-4">
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
          </div>}
        </aside>

        <div className="order-1 min-w-0 space-y-3">
        <section className="flex min-h-[560px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm" aria-label="Trình xem slide">
          {isSlideLoading && <LoadingSpinner size="lg" text={`Đang hiển thị slide ${pageNumber}...`} />}
          {!isSlideLoading && slideError && (
            <div className="w-full max-w-lg space-y-3">
              <ErrorAlert message={slideError} />
              <button type="button" onClick={() => setSlideReloadKey((value) => value + 1)} className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white">
                Thử hiển thị lại
              </button>
            </div>
          )}
          {!isSlideLoading && !slideError && slideImageUrl && (
            <div className="relative inline-block max-w-full cursor-text" tabIndex={0} aria-label={`Trang ${pageNumber}, có thể chọn và sao chép chữ`}>
              <img src={slideImageUrl} alt={`Trang ${pageNumber}: ${document.title}`} draggable={false} className="block max-h-[72vh] max-w-full object-contain shadow-lg" />
              {textLayer && <svg className="absolute inset-0 h-full w-full overflow-hidden" viewBox={`0 0 ${textLayer.pageWidth} ${textLayer.pageHeight}`} preserveAspectRatio="none" aria-label="Lớp chữ có thể bôi đen">
                {textLayer.items.map((item, index) => <text key={`${index}-${item.x}-${item.y}`} x={item.x} y={item.y + item.height} fontSize={Math.max(1, item.height)} textLength={Math.max(1, item.width)} lengthAdjust="spacingAndGlyphs" fill="rgba(0,0,0,0.001)" style={{ userSelect: "text", cursor: "text" }}>{item.text}</text>)}
              </svg>}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={isNoteOpen ? { height: `${noteHeight}px` } : undefined} aria-label={`Ghi chú trang ${pageNumber}`}>
          <div role="separator" aria-orientation="horizontal" onPointerDown={startNoteResize} onPointerMove={resizeNote} onPointerUp={stopNoteResize} onPointerCancel={stopNoteResize} className="flex h-7 touch-none cursor-ns-resize items-center justify-center border-b border-slate-100 bg-slate-50 text-slate-400"><GripHorizontal className="h-5 w-5" /></div>
          <button type="button" onClick={() => setIsNoteOpen((open) => !open)} aria-expanded={isNoteOpen} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left">
            <span className="flex items-center gap-2 font-bold text-slate-900"><StickyNote className="h-5 w-5 text-red-600" /> Ghi chú trang {pageNumber}{noteContent !== savedNoteContent && <span className="text-xs font-normal text-amber-600">Chưa lưu</span>}</span>
            {isNoteOpen ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronUp className="h-5 w-5 text-slate-500" />}
          </button>
          {isNoteOpen && <div className="flex h-[calc(100%_-_76px)] min-h-0 flex-col border-t border-slate-100 px-5 pb-4 pt-3">
            {noteError && <div className="mb-2"><ErrorAlert message={noteError} /></div>}
            {isNoteLoading ? <LoadingSpinner size="sm" text="Đang tải ghi chú..." /> : <textarea value={noteContent} maxLength={5000} onChange={(event) => setNoteContent(event.target.value)} placeholder="Nhập ghi chú riêng cho trang này..." className="min-h-20 flex-1 resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" />}
            <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{noteContent.length}/5.000 ký tự</span><button type="button" onClick={() => void saveNote()} disabled={isNoteLoading || isNoteSaving || noteContent === savedNoteContent} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" /> {isNoteSaving ? "Đang lưu..." : "Lưu ghi chú"}</button></div>
          </div>}
        </section>
        </div>
      </div>
    </div>
  );
}
