"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  personalDocApi,
  studentApi,
  quizApi,
  ApiClientError,
} from "@/lib/api-client";
import { PersonalDocument } from "@/types/material";
import { CourseOffering } from "@/types/course-offering";
import { QuizDraft, QuizQuestion } from "@/types/quiz";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { ErrorAlert } from "@/components/ui/error-states";
import {
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Check,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Layers,
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";

export default function StudentQuizCreatePage() {
  const router = useRouter();

  // Step 1: Input & Sources
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [approvedOfferings, setApprovedOfferings] = useState<CourseOffering[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>(
    "Tạo các câu hỏi trắc nghiệm kiểm tra hiểu biết về Khóa chính và Phụ thuộc hàm đầy đủ"
  );
  const [docSearch, setDocSearch] = useState<string>("");

  // States
  const [isLoadingInit, setIsLoadingInit] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 2: Review Draft
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  // Step 3: Accept Modal / Destination
  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);
  const [destinationType, setDestinationType] = useState<"COURSE_OFFERING" | "PERSONAL">("COURSE_OFFERING");
  const [selectedCourseOfferingId, setSelectedCourseOfferingId] = useState<string>("");
  const [isAccepting, setIsAccepting] = useState<boolean>(false);

  // Load initial READY docs and APPROVED course offerings
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [docs, offerings] = await Promise.all([
          personalDocApi.getDocuments(),
          studentApi.getOfferings(),
        ]);
        if (!mounted) return;
        const readyDocs = docs.filter((d) => d.status === "READY");
        const activeOffers = offerings.filter((o) => o.status === "ACTIVE");

        setDocuments(readyDocs);
        setApprovedOfferings(activeOffers);

        if (readyDocs.length > 0) {
          setSelectedDocIds([readyDocs[0].id]);
        }
        if (activeOffers.length > 0) {
          setSelectedCourseOfferingId(activeOffers[0].id);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        setErrorMessage("Không thể tải danh sách tài liệu hoặc lớp học phần.");
      } finally {
        if (mounted) setIsLoadingInit(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleDoc = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
    } else {
      if (selectedDocIds.length >= 10) {
        setErrorMessage("Chỉ được chọn tối đa 10 tài liệu làm nguồn sinh câu hỏi.");
        return;
      }
      setSelectedDocIds((prev) => [...prev, docId]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDocIds.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 tài liệu nguồn trạng thái READY.");
      return;
    }
    if (!prompt.trim()) {
      setErrorMessage("Vui lòng nhập định hướng yêu cầu tạo đề thi.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const generatedDraft = await quizApi.createDraft({
        prompt: prompt.trim(),
        sourceDocumentIds: selectedDocIds,
      });
      setDraft(generatedDraft);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Lỗi khi sinh đề thi trắc nghiệm AI.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!draft) return;
    setIsRegenerating(true);
    setErrorMessage(null);
    try {
      const regenerated = await quizApi.regenerateDraft(draft.id, prompt);
      setDraft(regenerated);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Không thể tạo lại bộ câu hỏi.");
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleConfirmAccept = async () => {
    if (!draft) return;
    if (destinationType === "COURSE_OFFERING" && !selectedCourseOfferingId) {
      setErrorMessage("Vui lòng chọn một Lớp học phần đã được duyệt để gán đề thi.");
      return;
    }

    setIsAccepting(true);
    setErrorMessage(null);
    try {
      const acceptedQuiz = await quizApi.acceptQuiz(draft.id, {
        destinationType,
        courseOfferingId: destinationType === "COURSE_OFFERING" ? selectedCourseOfferingId : undefined,
      });

      setShowAcceptModal(false);
      // Navigate to Review Hub of that course or personal
      if (acceptedQuiz.courseOfferingId) {
        router.push(`/review/${acceptedQuiz.courseOfferingId}`);
      } else {
        router.push("/review/PERSONAL");
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Lỗi khi lưu đề thi vào ngân hàng ôn tập.");
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const filteredDocs = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.fileName.toLowerCase().includes(docSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/review" className=" flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Ôn tập & Quiz
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">Tạo đề thi trắc nghiệm từ tài liệu cá nhân</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-100 text-ptit-red">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              Sinh Đề Thi Trắc Nghiệm Tự Động
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chọn PDF cá nhân và nhập yêu cầu để AI tạo các câu hỏi trắc nghiệm đơn (MCQ_SINGLE). Bạn sẽ duyệt đề trước khi đưa vào ngân hàng ôn tập.
          </p>
        </div>
      </div>

      {errorMessage && (
        <ErrorAlert message={errorMessage} onRetry={() => setErrorMessage(null)} />
      )}

      {isLoadingInit ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải dữ liệu chuẩn bị..." />
        </div>
      ) : isGenerating ? (
        /* GENERATING STATE */
        <div className="p-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-ptit-red flex items-center justify-center mx-auto animate-pulse border border-red-200">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 font-display">
            AI đang phân tích tài liệu và cấu trúc đề thi...
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hệ thống đang trích xuất các mệnh đề lý thuyết cốt lõi, tạo 4 phương án lựa chọn và chuẩn bị lời giải thích grounding chuẩn xác. Vui lòng đợi trong giây lát.
          </p>
          <div className="w-48 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-ptit-red rounded-full animate-progress w-2/3" />
          </div>
        </div>
      ) : !draft ? (
        /* STEP 1: FORM INPUT & SOURCE SELECTION */
        <form onSubmit={handleGenerate} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Prompt & Configuration */}
          <div className="lg:col-span-7 space-y-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                1. Định hướng câu hỏi (Prompt tự do theo ý bạn)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: Tạo 5 câu hỏi mức độ vận dụng về phép kết nối trong SQL, tập trung vào LEFT JOIN và EXISTS..."
                rows={4}
                maxLength={500}
                className="w-full p-3.5 text-xs sm:text-sm border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                required
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                <span>Prompt được dùng làm chỉ dẫn sinh đề, không thay thế phạm vi grounding.</span>
                <span>{prompt.length}/500</span>
              </div>
            </div>

            {/* Quick Prompt Suggestions */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Gợi ý mẫu định hướng ôn tập:
              </div>
              <div className="space-y-1.5">
                {[
                  "Tập trung vào câu hỏi định nghĩa và điều kiện dạng chuẩn 2NF, 3NF, BCNF",
                  "Tạo các câu hỏi trắc nghiệm tính toán hoặc phân tích bài toán thực tế",
                  "Các câu hỏi phân biệt sự khác nhau giữa các giải thuật và cấu trúc",
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(sug)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100  bg-slate-50  text-xs text-slate-700  transition flex items-center justify-between cursor-pointer"
                  >
                    <span>{sug}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Đã chọn: <b className="text-ptit-red">{selectedDocIds.length} tài liệu nguồn</b>
              </span>
              <button
                type="submit"
                disabled={selectedDocIds.length === 0 || !prompt.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-ptit-red  disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Sinh đề thi nháp (AI)
              </button>
            </div>
          </div>

          {/* Right: Sources Document Selector */}
          <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-ptit-red" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Chọn tài liệu PDF nguồn ({selectedDocIds.length}/10)
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Chỉ PDF READY
              </span>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Tìm tài liệu..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-ptit-red"
              />
            </div>

            {/* Doc list */}
            <div className="space-y-2 overflow-y-auto max-h-[340px] flex-1 pr-1">
              {documents.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <p>Bạn chưa có tài liệu cá nhân nào ở trạng thái READY.</p>
                  <Link
                    href="/personal-documents"
                    className="mt-2 inline-block font-bold text-ptit-red "
                  >
                    Tải lên PDF ngay
                  </Link>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Không tìm thấy tài liệu phù hợp.
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleToggleDoc(doc.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-red-50/70 border-red-200 text-slate-900"
                          : "bg-slate-50/70 border-transparent  text-slate-700"
                      }`}
                    >
                      <div className="mt-0.5 text-ptit-red flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-red-100" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs truncate">
                          {doc.title}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{doc.pageCount} trang</span>
                          <span>•</span>
                          <span>{(doc.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
              <Link
                href="/personal-documents"
                className="text-xs font-semibold text-ptit-red "
              >
                + Tải thêm tài liệu PDF mới
              </Link>
            </div>
          </div>
        </form>
      ) : (
        /* STEP 2: REVIEW REQUIRED DRAFT */
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200">
                REVIEW_REQUIRED
              </span>
              <span className="text-xs text-slate-600">
                Bản nháp đề thi gồm <b>{draft.questions.length} câu trắc nghiệm</b>. Bạn có thể xem lại hoặc chấp nhận lưu.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100  text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                <span>{isRegenerating ? "Đang tạo lại..." : "Tạo lại toàn bộ (Regenerate)"}</span>
              </button>

              <button
                onClick={() => setShowAcceptModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-ptit-red  text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Chấp nhận đề thi (Accept Quiz)</span>
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {draft.questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Câu {idx + 1}: {q.questionText}
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                    MCQ_SINGLE
                  </span>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => {
                    const isCorrect = opt.id === q.correctOptionId;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                          isCorrect
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            isCorrect
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                        {isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation & Citation */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Giải thích đáp án:</span>
                  </div>
                  <p className="text-slate-600">{q.explanation}</p>
                  {q.citation && (
                    <div className="pt-1 text-[11px] text-ptit-red font-medium flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>
                        Căn cứ trích dẫn: {q.citation.documentName}{" "}
                        {q.citation.pageNumber ? `(Trang ${q.citation.pageNumber})` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: ACCEPT QUIZ MODAL (DESTINATION PICKER) */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-100 text-ptit-red">
                  <Check className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-base font-display">
                  Chấp nhận & Lưu đề thi
                </h3>
              </div>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="text-slate-400  text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Nơi lưu trữ ôn tập (Destination):
              </label>
              <div className="space-y-2">
                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    destinationType === "COURSE_OFFERING"
                      ? "bg-red-50/70 border-red-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="destinationType"
                    checked={destinationType === "COURSE_OFFERING"}
                    onChange={() => setDestinationType("COURSE_OFFERING")}
                    className="mt-0.5 text-ptit-red focus:ring-red-500"
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-ptit-red" />
                      <span>Gắn vào Lớp học phần đã duyệt (APPROVED)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Bài thi sẽ xuất hiện trong mục Ôn tập của môn học này để theo dõi tiến độ và lịch sử làm bài.
                    </p>
                  </div>
                </label>

                {destinationType === "COURSE_OFFERING" && (
                  <div className="pl-6 pt-1">
                    <select
                      value={selectedCourseOfferingId}
                      onChange={(e) => setSelectedCourseOfferingId(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      {approvedOfferings.map((offering) => (
                        <option key={offering.id} value={offering.id}>
                          {offering.code} - {offering.name} ({offering.teacherName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    destinationType === "PERSONAL"
                      ? "bg-red-50/70 border-red-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="destinationType"
                    checked={destinationType === "PERSONAL"}
                    onChange={() => setDestinationType("PERSONAL")}
                    className="mt-0.5 text-ptit-red focus:ring-red-500"
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-ptit-red" />
                      <span>Lưu vào Kho Quiz cá nhân (PERSONAL)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Độc lập hoàn toàn, không liên kết với bất kỳ Lớp học phần nào.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600  rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={isAccepting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-ptit-red  text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                {isAccepting ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />}
                <span>Xác nhận lưu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
