"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { materialApi } from "@/lib/api-client";
import { TeacherDocument, Slide, SlideTutorResponse } from "@/types/material";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { ErrorAlert } from "@/components/ui/error-states";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Send,
  FileEdit,
  Bot,
  AlertCircle,
  FileText,
  ShieldCheck,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Save,
  Clock,
} from "lucide-react";

interface PageProps {
  params: Promise<{
    documentId: string;
  }>;
}

interface TutorMessage {
  id: string;
  sender: "USER" | "AI";
  text: string;
  status?: "ANSWERED" | "NO_EVIDENCE";
  citations?: SlideTutorResponse["citations"];
}

export default function SlideViewerPage({ params }: PageProps) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const documentId = unwrappedParams.documentId;

  const [document, setDocument] = useState<TeacherDocument | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Right pane tab: NOTES or TUTOR
  const [activeRightTab, setActiveRightTab] = useState<"NOTES" | "TUTOR">("TUTOR");

  // Notes state
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Tutor state
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([
    {
      id: "initial_tutor_msg",
      sender: "AI",
      text: "Xin chào! Tôi là Trợ lý AI Slide Tutor. Hãy đặt bất kỳ câu hỏi nào về nội dung của slide hiện tại, tôi sẽ giải thích và đối chiếu với giáo trình của môn học.",
      status: "ANSWERED",
    },
  ]);

  // Thumbnail active ref for smooth auto-scrolling
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Load document and slides
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const docs = await materialApi.getMaterials();
        const found = docs.find((d) => d.id === documentId);
        if (!found) {
          if (mounted) setErrorMsg("Không tìm thấy tài liệu này.");
          return;
        }

        if (mounted) setDocument(found);

        // Policy Check: PDF has no viewer
        if (found.fileType !== "PPTX") {
          if (mounted) {
            setErrorMsg(
              "Tài liệu PDF giảng viên không có chế độ xem trực tuyến (Viewer) theo quy định MVP. Vui lòng tải tệp PDF để đọc ngoại tuyến."
            );
          }
          return;
        }

        const slideList = await materialApi.getSlides(documentId);
        if (mounted) {
          setSlides(slideList);
        }
      } catch (err: unknown) {
        if (mounted) {
          setErrorMsg(
            err instanceof Error ? err.message : "Lỗi khi tải dữ liệu slide."
          );
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [documentId]);

  const currentSlide = slides[currentSlideIndex];

  // Load note and record slide view when slide changes
  useEffect(() => {
    if (!currentSlide) return;

    let mounted = true;
    async function loadNoteAndView() {
      try {
        const note = await materialApi.getSlideNote(
          documentId,
          currentSlide.slideNumber
        );
        if (mounted) setNoteContent(note);
        await materialApi.recordSlideView(documentId, currentSlide.slideNumber);
      } catch {
        // Safe fallback
      }
    }

    loadNoteAndView();

    // Smoothly scroll active thumbnail into view
    thumbnailRefs.current[currentSlideIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

    return () => {
      mounted = false;
    };
  }, [documentId, currentSlide, currentSlideIndex]);

  // Keyboard navigation ← / →
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document?.fileType !== "PPTX" ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, document]);

  const handleSaveNote = async () => {
    if (!currentSlide) return;
    setIsSavingNote(true);
    try {
      await materialApi.saveSlideNote(
        documentId,
        currentSlide.slideNumber,
        noteContent
      );
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 2000);
      setSlides((prev) =>
        prev.map((s, idx) =>
          idx === currentSlideIndex
            ? { ...s, hasNote: noteContent.trim().length > 0 }
            : s
        )
      );
    } catch {
      alert("Không thể lưu ghi chú. Vui lòng thử lại.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleAskTutor = async (questionToAsk?: string) => {
    const q = (questionToAsk || tutorQuestion).trim();
    if (!q || !currentSlide) return;

    const userMsg: TutorMessage = {
      id: `usr_${Date.now()}`,
      sender: "USER",
      text: q,
    };

    setTutorMessages((prev) => [...prev, userMsg]);
    setTutorQuestion("");
    setTutorLoading(true);

    try {
      const response = await materialApi.askSlideTutor(
        documentId,
        currentSlide.slideNumber,
        q
      );

      const aiMsg: TutorMessage = {
        id: `ai_${Date.now()}`,
        sender: "AI",
        text:
          response.status === "ANSWERED"
            ? response.answer || "Không có phản hồi."
            : "Không tìm thấy căn cứ trong nội dung slide này. Slide AI Tutor chỉ giải đáp kiến thức có trong phạm vi học liệu được phân quyền (NO_EVIDENCE).",
        status: response.status,
        citations: response.citations,
      };

      setTutorMessages((prev) => [...prev, aiMsg]);
    } catch {
      setTutorMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: "AI",
          text: "Đã xảy ra lỗi khi kết nối đến Trợ lý học tập.",
          status: "NO_EVIDENCE",
        },
      ]);
    } finally {
      setTutorLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-800">
        <LoadingSpinner size="lg" text="Đang tải và chuẩn bị trình đọc Slide..." />
      </div>
    );
  }

  if (errorMsg || !document) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
        <ErrorAlert message={errorMsg || "Không tìm thấy tài liệu"} />
        <div className="mt-4 text-center">
          <Link
            href="/course-offerings"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ptit-red  text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Lớp học phần
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col bg-white text-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-200">
      {/* Top Header Bar (Nền Trắng Sạch Sẽ) */}
      <div className="h-14 px-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-xl text-slate-500   transition cursor-pointer"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {document.title}
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Trang Slide: <strong className="text-ptit-red">{currentSlideIndex + 1}</strong> / {slides.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[11px] text-ptit-red font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-ptit-red" />
            <span>Học viện Công nghệ Bưu chính Viễn thông · Chỉ xem trực tuyến</span>
          </div>
        </div>
      </div>

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-white">
        {/* Left: Thumbnails Panel (Nền Trắng/Xám Sáng) */}
        <aside className="w-48 sm:w-52 bg-slate-50/70 border-r border-slate-200 p-2.5 overflow-y-auto space-y-2 flex-shrink-0 hidden md:block">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
            <span>Danh sách Slide</span>
            <span className="font-mono">{slides.length} slide</span>
          </div>
          {slides.map((s, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <button
                key={s.slideNumber}
                ref={(el) => {
                  thumbnailRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition border cursor-pointer ${
                  isActive
                    ? "bg-red-50 border-red-300 text-ptit-red font-bold shadow-xs ring-1 ring-red-200"
                    : "bg-white border-slate-200 text-slate-700  "
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-[10px] ${
                      isActive ? "text-ptit-red font-bold" : "text-slate-400"
                    }`}
                  >
                    Slide {s.slideNumber}
                  </span>
                  {s.hasNote && (
                    <span title="Có ghi chú">
                      <FileEdit className="w-3 h-3 text-amber-500" />
                    </span>
                  )}
                </div>
                <div className="truncate font-medium text-[11px]">
                  {s.title}
                </div>
              </button>
            );
          })}
        </aside>

        {/* Center: Slide Canvas (Nền Trắng / Xám Nhẹ, Card Nổi Bật, Chuyển Trang Mượt Mà) */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-100/50 p-4 lg:p-6 overflow-hidden">
          {/* Slide Card với animation mượt mà theo slideNumber */}
          <div
            key={currentSlide?.slideNumber}
            className="flex-1 bg-white text-slate-900 rounded-2xl p-6 lg:p-10 shadow-sm overflow-y-auto flex flex-col justify-between border border-slate-200 relative animate-in fade-in zoom-in-98 duration-150 ease-out"
          >
            <div>
              {/* Slide Number & School Header */}
              <div className="flex items-center justify-between border-b border-red-100 pb-4 mb-6">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ptit-red font-display">
                  Học viện Công nghệ Bưu chính Viễn thông · Bài giảng chính thức
                </span>
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                  Slide {currentSlide?.slideNumber} / {slides.length}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight mb-6 font-display">
                {currentSlide?.title}
              </h1>

              {/* Bullets */}
              <ul className="space-y-4 text-sm lg:text-base text-slate-700 leading-relaxed">
                {currentSlide?.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-ptit-red mt-2 flex-shrink-0 shadow-2xs" />
                    <span className="text-slate-800 font-normal">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Slide Footer */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Học liệu Lớp học phần PTIT</span>
              <span>Bản quyền nội dung thuộc Giảng viên phụ trách</span>
            </div>
          </div>

          {/* Slide Control Bar (Nền Trắng, Nút Bấm Sáng Sủa) */}
          <div className="h-12 mt-3 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((prev) => prev - 1)}
                className="px-3.5 py-1.5 rounded-xl bg-white  disabled:opacity-40 border border-slate-300 shadow-2xs transition flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Slide trước
              </button>

              <button
                type="button"
                disabled={currentSlideIndex === slides.length - 1}
                onClick={() => setCurrentSlideIndex((prev) => prev + 1)}
                className="px-3.5 py-1.5 rounded-xl bg-ptit-red  text-white disabled:opacity-40 shadow-2xs transition flex items-center gap-1.5 font-bold cursor-pointer"
              >
                Slide kế tiếp <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-slate-400 text-[11px]">
                Dùng phím ← / → trên bàn phím để chuyển trang nhanh
              </span>
              <span className="font-mono text-xs text-slate-500 font-bold">
                {currentSlideIndex + 1} / {slides.length}
              </span>
            </div>
          </div>
        </main>

        {/* Right Panel: Notes & Slide AI Tutor (Nền Trắng Sáng) */}
        <aside className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveRightTab("TUTOR")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRightTab === "TUTOR"
                  ? "bg-ptit-red text-white shadow-xs"
                  : "text-slate-500  "
              }`}
            >
              <Bot className="w-4 h-4" /> AI Slide Tutor
            </button>

            <button
              type="button"
              onClick={() => setActiveRightTab("NOTES")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRightTab === "NOTES"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "text-slate-500  "
              }`}
            >
              <FileEdit className="w-4 h-4" /> Ghi chú cá nhân
            </button>
          </div>

          {/* TAB 1: AI SLIDE TUTOR */}
          {activeRightTab === "TUTOR" && (
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              {/* Tutor Messages Container */}
              <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs bg-slate-50/40">
                {tutorMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "USER" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] p-3.5 rounded-2xl leading-relaxed ${
                        msg.sender === "USER"
                          ? "bg-ptit-red text-white rounded-br-xs shadow-xs"
                          : "bg-white text-slate-800 rounded-bl-xs border border-slate-200 shadow-2xs"
                      }`}
                    >
                      {msg.status === "NO_EVIDENCE" && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 mb-2">
                          <AlertCircle className="w-3 h-3 text-amber-700" /> NO_EVIDENCE
                        </div>
                      )}
                      <p className="whitespace-pre-line">{msg.text}</p>

                      {/* Citation Chip */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                          {msg.citations.map((c, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-red-50 text-ptit-red px-2 py-0.5 rounded border border-red-200 font-mono font-semibold"
                              title={c.excerpt}
                            >
                              Slide {c.slideNumber}: {c.excerpt.slice(0, 36)}...
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {tutorLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-white rounded-xl border border-slate-200 w-fit">
                    <LoadingSpinner size="sm" />
                    <span>Trợ lý AI đang đối chiếu nội dung slide...</span>
                  </div>
                )}
              </div>

              {/* Sample Question Chips */}
              <div className="p-2 border-t border-slate-100 bg-white flex flex-wrap gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleAskTutor("Tóm tắt ý chính của slide này")}
                  className="px-2.5 py-1 rounded-lg bg-slate-50  text-slate-700  border border-slate-200 transition cursor-pointer"
                >
                  💡 Tóm tắt ý chính
                </button>
                <button
                  type="button"
                  onClick={() => handleAskTutor("Đưa ra ví dụ minh họa cho nội dung slide này")}
                  className="px-2.5 py-1 rounded-lg bg-slate-50  text-slate-700  border border-slate-200 transition cursor-pointer"
                >
                  🔍 Ví dụ minh họa
                </button>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskTutor();
                }}
                className="p-3 bg-white border-t border-slate-200 flex gap-2"
              >
                <input
                  type="text"
                  value={tutorQuestion}
                  onChange={(e) => setTutorQuestion(e.target.value)}
                  placeholder="Đặt câu hỏi về slide này..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900"
                />
                <button
                  type="submit"
                  disabled={tutorLoading || !tutorQuestion.trim()}
                  className="p-2 bg-ptit-red  disabled:opacity-40 text-white rounded-xl transition cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: NOTES (Ghi Chú Cá Nhân Trên Nền Sáng) */}
          {activeRightTab === "NOTES" && (
            <div className="flex-1 flex flex-col p-4 bg-white space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Ghi chú riêng cho Slide {currentSlide?.slideNumber}</span>
                {noteSavedFeedback && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu tự động!
                  </span>
                )}
              </div>

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Ghi chú nhanh kiến thức quan trọng của slide này..."
                className="flex-1 w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Ghi chú được lưu tự động trên tài khoản cá nhân.
                </span>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-ptit-red  text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {isSavingNote ? <LoadingSpinner size="sm" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Lưu ghi chú</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
