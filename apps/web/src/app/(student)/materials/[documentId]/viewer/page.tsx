"use client";

import React, { useState, useEffect, use } from "react";
import { materialApi } from "@/lib/api-client";
import { Slide, TeacherDocument, SlideCitation } from "@/types/material";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { ErrorAlert } from "@/components/ui/error-states";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileEdit,
  Bot,
  Send,
  Save,
  Check,
  Sparkles,
  BookOpen,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface TutorMessage {
  id: string;
  sender: "USER" | "AI";
  text: string;
  status?: "ANSWERED" | "NO_EVIDENCE";
  citations?: SlideCitation[];
}

export default function SlideViewerPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.documentId;

  const [document, setDocument] = useState<TeacherDocument | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Notes state
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Tutor state
  const [activeRightTab, setActiveRightTab] = useState<"NOTES" | "TUTOR">("TUTOR");
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([
    {
      id: "welcome",
      sender: "AI",
      text: "Xin chào! Tôi là Trợ lý AI Slide Tutor. Bạn có thể đặt câu hỏi về nội dung kiến thức trên slide đang xem.",
    },
  ]);

  // Load document and slides
  useEffect(() => {
    async function loadData() {
      try {
        const [docData, slidesData] = await Promise.all([
          materialApi.getDocument(documentId),
          materialApi.getSlides(documentId),
        ]);
        setDocument(docData);
        setSlides(slidesData);
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Không thể tải slide bài giảng."
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
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
    return () => {
      mounted = false;
    };
  }, [documentId, currentSlide]);

  // Keyboard navigation
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
    } catch (err: unknown) {
      alert("Không thể lưu ghi chú: " + (err instanceof Error ? err.message : ""));
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
            : "Không tìm thấy căn cứ trong nội dung slide này. Slide AI Tutor chỉ giải đáp kiến thức có trong phạm vi học liệu được phân quyền.",
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <LoadingSpinner size="lg" text="Đang chuẩn bị trình đọc Slide..." />
      </div>
    );
  }

  if (errorMsg || !document) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <ErrorAlert message={errorMsg || "Không tìm thấy tài liệu"} />
        <div className="mt-4">
          <Link
            href="/materials"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại kho học liệu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Top Header Bar */}
      <div className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/materials"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="truncate">
            <h2 className="text-xs font-bold text-slate-200 truncate">
              {document.title}
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">
              Slide {currentSlideIndex + 1} / {slides.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bản quyền PTIT (Chỉ xem web)</span>
          </div>
        </div>
      </div>

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Thumbnails Panel (approx 200px) */}
        <aside className="w-48 bg-slate-900/90 border-r border-slate-800 p-2 overflow-y-auto space-y-2 flex-shrink-0 hidden md:block">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
            Danh sách Slide
          </div>
          {slides.map((s, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <button
                key={s.slideNumber}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition border ${
                  isActive
                    ? "bg-red-600/20 border-red-500 text-white font-bold"
                    : "bg-slate-800/40 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-slate-400">
                    Slide {s.slideNumber}
                  </span>
                  {s.hasNote && (
                    <span title="Có ghi chú">
                      <FileEdit className="w-3 h-3 text-amber-400" />
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

        {/* Center: Slide Canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 p-4 lg:p-6 overflow-hidden">
          {/* Slide Slide Card */}
          <div className="flex-1 bg-white text-slate-900 rounded-2xl p-6 lg:p-10 shadow-xl overflow-y-auto flex flex-col justify-between border border-slate-200 relative">
            <div>
              {/* Slide Number & School Mark */}
              <div className="flex items-center justify-between border-b border-red-100 pb-4 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Học viện Công nghệ Bưu chính Viễn thông · AI-02
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  Slide {currentSlide?.slideNumber} / {slides.length}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight mb-6">
                {currentSlide?.title}
              </h1>

              {/* Bullets */}
              <ul className="space-y-4 text-sm lg:text-base text-slate-700 leading-relaxed">
                {currentSlide?.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-600 mt-2 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Slide Footer */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Học phần: Trí tuệ Nhân tạo (INT1415)</span>
              <span>Giảng viên: TS. Trần Thị Giảng Viên</span>
            </div>
          </div>

          {/* Slide Control Bar */}
          <div className="h-12 mt-3 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex((prev) => prev - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Slide trước
              </button>

              <button
                type="button"
                disabled={currentSlideIndex === slides.length - 1}
                onClick={() => setCurrentSlideIndex((prev) => prev + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition flex items-center gap-1"
              >
                Slide kế tiếp <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="hidden sm:inline text-slate-500 text-[11px]">
              Dùng phím ← / → trên bàn phím để chuyển slide
            </span>
          </div>
        </main>

        {/* Right Panel: Notes & Slide AI Tutor (340px) */}
        <aside className="w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col flex-shrink-0">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 p-1">
            <button
              type="button"
              onClick={() => setActiveRightTab("TUTOR")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeRightTab === "TUTOR"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Bot className="w-4 h-4" /> AI Slide Tutor
            </button>

            <button
              type="button"
              onClick={() => setActiveRightTab("NOTES")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeRightTab === "NOTES"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileEdit className="w-4 h-4" /> Ghi chú cá nhân
            </button>
          </div>

          {/* TAB 1: AI SLIDE TUTOR */}
          {activeRightTab === "TUTOR" && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Tutor Messages Container */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto text-xs">
                {tutorMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "USER" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] p-3 rounded-2xl leading-relaxed ${
                        msg.sender === "USER"
                          ? "bg-red-600 text-white rounded-br-none"
                          : "bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60"
                      }`}
                    >
                      {msg.status === "NO_EVIDENCE" && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
                          <AlertCircle className="w-3 h-3" /> NO_EVIDENCE
                        </div>
                      )}
                      <p>{msg.text}</p>

                      {/* Citation Chip */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1">
                          {msg.citations.map((c, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-900 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-mono"
                              title={c.excerpt}
                            >
                              Slide {c.slideNumber}: {c.excerpt.slice(0, 32)}...
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {tutorLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                    <LoadingSpinner size="sm" />
                    <span>Trợ lý đang đối chiếu kiến thức slide...</span>
                  </div>
                )}
              </div>

              {/* Sample Question Chips */}
              <div className="p-2 border-t border-slate-800/80 bg-slate-900/50 flex flex-wrap gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleAskTutor("Tóm tắt ý chính của slide này")}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  💡 Tóm tắt ý chính
                </button>
                <button
                  type="button"
                  onClick={() => handleAskTutor("Cho ví dụ minh họa về nội dung trên slide")}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  🔍 Cho ví dụ
                </button>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskTutor();
                }}
                className="p-3 border-t border-slate-800 flex items-center gap-2 bg-slate-900"
              >
                <input
                  type="text"
                  value={tutorQuestion}
                  onChange={(e) => setTutorQuestion(e.target.value)}
                  placeholder={`Hỏi về Slide ${currentSlide?.slideNumber}...`}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  disabled={tutorLoading || !tutorQuestion.trim()}
                  className="p-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: PERSONAL NOTES */}
          {activeRightTab === "NOTES" && (
            <div className="flex-1 flex flex-col p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ghi chú cho Slide {currentSlide?.slideNumber}</span>
                {noteSavedFeedback && (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold text-[11px]">
                    <Check className="w-3.5 h-3.5" /> Đã lưu
                  </span>
                )}
              </div>

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Gõ ghi chú cá nhân của bạn cho slide này..."
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none font-sans leading-relaxed"
              />

              <button
                type="button"
                disabled={isSavingNote}
                onClick={handleSaveNote}
                className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
              >
                {isSavingNote ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Lưu ghi chú slide
                  </>
                )}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
