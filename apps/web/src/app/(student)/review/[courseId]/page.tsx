"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  quizApi,
  reviewApi,
  studentApi,
  ApiClientError,
} from "@/lib/api-client";
import { Quiz, QuizAttempt, QuizQuestion } from "@/types/quiz";
import {
  ReviewItem,
  CourseWorkspaceProgress,
  CourseReviewSummary,
} from "@/types/review";
import { CourseOffering } from "@/types/course-offering";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { ErrorAlert } from "@/components/ui/error-states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  GraduationCap,
  Layers,
  RotateCcw,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Play,
  Check,
  X,
  Presentation,
  ShieldCheck,
  Award,
} from "lucide-react";

interface PageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export default function StudentCourseReviewWorkspacePage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const courseId = unwrappedParams.courseId;
  const isPersonal = courseId === "PERSONAL";

  const [activeTab, setActiveTab] = useState<"QUIZZES" | "REVIEW_ITEMS" | "PROGRESS">("QUIZZES");

  // Data states
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [progress, setProgress] = useState<CourseWorkspaceProgress | null>(null);
  const [courseOffering, setCourseOffering] = useState<CourseOffering | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Take Quiz Modal State
  const [activeQuizToTake, setActiveQuizToTake] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState<boolean>(false);
  const [latestAttemptResult, setLatestAttemptResult] = useState<QuizAttempt | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [quizList, attemptList, revList, progData, offerings] = await Promise.all([
        quizApi.getQuizzes(courseId),
        quizApi.getAttempts(),
        reviewApi.getReviewItems(courseId),
        !isPersonal ? reviewApi.getCourseWorkspaceProgress(courseId) : Promise.resolve(null),
        !isPersonal ? studentApi.getOfferings() : Promise.resolve([]),
      ]);

      setQuizzes(quizList);
      // Filter attempts belonging to this course's quizzes
      const quizIds = quizList.map((q) => q.id);
      setAttempts(attemptList.filter((a) => quizIds.includes(a.quizId)));
      setReviewItems(revList);
      setProgress(progData);

      if (!isPersonal) {
        const found = offerings.find((o) => o.id === courseId);
        if (found) setCourseOffering(found);
      }
    } catch (err: unknown) {
      setErrorMessage("Không thể tải thông tin ôn tập của môn học.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Handle Taking Quiz
  const handleStartQuiz = (quiz: Quiz) => {
    setActiveQuizToTake(quiz);
    setUserAnswers({});
    setLatestAttemptResult(null);
  };

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuizToTake) return;
    setIsSubmittingAttempt(true);
    try {
      const answersPayload = activeQuizToTake.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: userAnswers[q.id] || "",
      }));

      const result = await quizApi.submitAttempt({
        quizId: activeQuizToTake.id,
        answers: answersPayload,
      });

      setLatestAttemptResult(result);
      // Refresh attempts & review items
      const updatedAttempts = await quizApi.getAttempts();
      const quizIds = quizzes.map((q) => q.id);
      setAttempts(updatedAttempts.filter((a) => quizIds.includes(a.quizId)));

      const updatedReviewItems = await reviewApi.getReviewItems(courseId);
      setReviewItems(updatedReviewItems);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        alert(err.message);
      } else {
        alert("Lỗi khi nộp bài thi.");
      }
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  const courseDisplayName = isPersonal
    ? "Kho Quiz & Ôn tập cá nhân"
    : courseOffering
    ? `${courseOffering.code} - ${courseOffering.name}`
    : "Không gian môn học";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/review" className="hover:text-ptit-red flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Danh sách môn học
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">{courseDisplayName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-ptit-red font-mono font-bold text-xs">
              {isPersonal ? "PERSONAL" : courseOffering?.code || "COURSE"}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              {courseDisplayName}
            </h1>
          </div>
          {!isPersonal && courseOffering?.teacherName && (
            <p className="text-xs text-slate-500">
              Giảng viên phụ trách: <span className="font-semibold text-slate-700">{courseOffering.teacherName}</span> • Học kỳ: {courseOffering.semesterName}
            </p>
          )}
          {isPersonal && (
            <p className="text-xs text-slate-500">
              Không gian quản lý các bài trắc nghiệm độc lập do bạn tự tạo từ PDF cá nhân.
            </p>
          )}
        </div>

        <Link
          href="/quiz/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-ptit-red hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex-shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ Tạo Quiz mới từ PDF</span>
        </Link>
      </div>

      {errorMessage && (
        <ErrorAlert message={errorMessage} onRetry={() => loadData()} />
      )}

      {/* 3 Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("QUIZZES")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "QUIZZES"
              ? "border-ptit-red text-ptit-red"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>1. Quản lý Quiz & Lịch sử ({quizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("REVIEW_ITEMS")}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "REVIEW_ITEMS"
              ? "border-ptit-red text-ptit-red"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>2. Nội dung cần ôn lại ({reviewItems.length})</span>
        </button>

        {!isPersonal && (
          <button
            onClick={() => setActiveTab("PROGRESS")}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === "PROGRESS"
                ? "border-ptit-red text-ptit-red"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>3. Xem tiến độ môn học</span>
          </button>
        )}
      </div>

      {/* SUB-TAB CONTENTS */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải dữ liệu môn học..." />
        </div>
      ) : (
        <div>
          {/* ======================================================== */}
          {/* SUB-TAB 1: QUẢN LÝ QUIZ & LỊCH SỬ LÀM BÀI KHÔNG GHI ĐÈ    */}
          {/* ======================================================== */}
          {activeTab === "QUIZZES" && (
            <div className="space-y-6">
              {/* Quiz list */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Danh sách bài Quiz trong môn học:
                </h3>
                {quizzes.length === 0 ? (
                  <EmptyState
                    title="Chưa có bài Quiz nào"
                    description="Môn học này chưa có bài thi ôn tập nào. Bạn hãy tự tạo đề thi trắc nghiệm từ tài liệu cá nhân để bắt đầu ôn tập."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-red-200 shadow-2xs transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded bg-red-50 text-ptit-red text-[11px] font-bold">
                              {quiz.questions.length} câu trắc nghiệm
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Tạo ngày: {new Date(quiz.createdAt).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mb-2">
                            {quiz.title}
                          </h4>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Loại: {quiz.isPersonal ? "Quiz cá nhân" : "Lớp học phần"}
                          </span>
                          <button
                            onClick={() => handleStartQuiz(quiz)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-ptit-red hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" /> Làm bài thi
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attempt History Table (Never Overwrites History) */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Bảng Lịch sử làm bài (Attempt History - Không ghi đè):
                  </h3>
                  <span className="text-xs text-slate-500">
                    Tổng số lượt làm: <b>{attempts.length} lần</b>
                  </span>
                </div>

                {attempts.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                    Bạn chưa hoàn thành lượt làm bài nào. Hãy bấm &quot;Làm bài thi&quot; ở trên để kiểm tra kiến thức.
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Lần làm</th>
                          <th className="py-3 px-4">Tên bài Quiz</th>
                          <th className="py-3 px-4">Điểm số</th>
                          <th className="py-3 px-4">Tỷ lệ</th>
                          <th className="py-3 px-4">Thời gian hoàn thành</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {attempts.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              Lần {att.attemptNumber}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800">
                              {att.quizTitle}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-slate-900">
                                {att.score}/{att.maxScore}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                  att.percentage >= 80
                                    ? "bg-emerald-100 text-emerald-800"
                                    : att.percentage >= 50
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {att.percentage}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(att.completedAt).toLocaleString("vi-VN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB 2: NỘI DUNG CẦN ÔN LẠI TỔNG HỢP TỪ CÂU SAI        */}
          {/* ======================================================== */}
          {activeTab === "REVIEW_ITEMS" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Cơ chế tổng hợp ôn tập chính xác:</span> Danh sách câu hỏi dưới đây được hệ thống tự động tổng hợp từ các phương án trả lời sai trong các lần làm bài Quiz của môn học này (tuyệt đối không dùng AI suy đoán điểm yếu). Bạn có thể bấm nút trực tiếp để nhảy đến Slide hoặc trang tài liệu đối chiếu.
                </div>
              </div>

              {reviewItems.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">Không có câu hỏi nào cần ôn lại!</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Chúc mừng bạn đã trả lời chính xác tất cả các câu hỏi trong các lần làm bài, hoặc chưa phát sinh câu trả lời sai nào.
                  </p>
                </div>
              ) : (
                reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Từ bài Quiz: {item.quizTitle}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                          {item.questionText}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-ptit-red text-[11px] font-bold border border-red-200 flex-shrink-0">
                        Sai {item.timesWrong} lần
                      </span>
                    </div>

                    {/* Wrong vs Correct Answer Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-red-500 flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Đáp án bạn đã chọn (Sai):
                        </div>
                        <p className="font-semibold line-through decoration-red-500">
                          {item.wrongOptionText}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Đáp án chính xác:
                        </div>
                        <p className="font-semibold">{item.correctOptionText}</p>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                      <span className="font-bold text-slate-800">Giải thích chi tiết: </span>
                      {item.explanation}
                    </div>

                    {/* Source Link Jump Button */}
                    {item.citation && (
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-ptit-red" />
                          <span>
                            Nguồn: <b>{item.citation.documentName}</b>{" "}
                            {item.citation.slideNumber ? `(Slide ${item.citation.slideNumber})` : ""}
                            {item.citation.pageNumber ? `(Trang ${item.citation.pageNumber})` : ""}
                          </span>
                        </div>

                        {item.citation.slideNumber ? (
                          <Link
                            href={`/materials/${item.citation.documentId}/viewer`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-ptit-red rounded-xl text-xs font-bold transition self-start sm:self-auto cursor-pointer"
                          >
                            <Presentation className="w-3.5 h-3.5" />
                            <span>Ôn lại ngay tại Slide {item.citation.slideNumber}</span>
                          </Link>
                        ) : (
                          <Link
                            href="/chat"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition self-start sm:self-auto cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Mở hỏi AI về tài liệu</span>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SUB-TAB 3: XEM TIẾN ĐỘ MÔN HỌC & NHẬT KÝ HOẠT ĐỘNG 7 NGÀY */}
          {/* ======================================================== */}
          {activeTab === "PROGRESS" && progress && (
            <div className="space-y-6">
              {/* Viewing Progress Header Card */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Tiến độ xem slide bài giảng: {progress.documentTitle}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đã xem {progress.viewedSlides} trên tổng số {progress.totalSlides} slide bài giảng
                    </p>
                  </div>
                  <span className="text-2xl font-extrabold text-ptit-red">
                    {progress.viewingPercentage}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ptit-red rounded-full transition-all duration-500"
                    style={{ width: `${progress.viewingPercentage}%` }}
                  />
                </div>
              </div>

              {/* Slides Grid Checklist */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Danh sách Slide bài giảng & Trạng thái đã học:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {progress.slides.map((slide) => (
                    <div
                      key={slide.slideNumber}
                      className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 transition ${
                        slide.viewed
                          ? "bg-emerald-50/60 border-emerald-200 text-slate-800"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          slide.viewed
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {slide.slideNumber}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{slide.title}</div>
                        <div className="text-[10px] mt-0.5 flex items-center gap-1.5">
                          {slide.viewed ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành xem
                            </span>
                          ) : (
                            <span className="text-slate-400">Chưa xem</span>
                          )}
                          {slide.viewedAt && (
                            <span className="text-slate-400">
                              • {new Date(slide.viewedAt).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7 Days Learning Activity Log */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Nhật ký hoạt động học tập môn này (7 ngày gần nhất):
                </h4>

                {progress.recentActivities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có hoạt động nào trong 7 ngày qua.</p>
                ) : (
                  <div className="space-y-2">
                    {progress.recentActivities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-ptit-red" />
                          <span className="text-slate-700 font-medium">{act.description}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(act.timestamp).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAKE QUIZ MODAL */}
      {activeQuizToTake && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ptit-red">
                  Làm bài thi trắc nghiệm
                </span>
                <h3 className="font-bold text-slate-900 text-base font-display">
                  {activeQuizToTake.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveQuizToTake(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
              {latestAttemptResult ? (
                /* Result View */
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <Award className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900">
                    Kết quả làm bài: {latestAttemptResult.score}/{latestAttemptResult.maxScore} điểm ({latestAttemptResult.percentage}%)
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Lượt làm thứ {latestAttemptResult.attemptNumber} đã được ghi lại vào Lịch sử làm bài. Mọi câu trả lời sai đã tự động được bổ sung vào mục &quot;Nội dung cần ôn lại&quot;.
                  </p>
                  <button
                    onClick={() => setActiveQuizToTake(null)}
                    className="px-6 py-2.5 bg-ptit-red hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    Đóng và xem kết quả
                  </button>
                </div>
              ) : (
                /* Questions to Answer */
                activeQuizToTake.questions.map((q, idx) => (
                  <div key={q.id} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="font-bold text-slate-900 text-sm">
                      Câu {idx + 1}: {q.questionText}
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const isSelected = userAnswers[q.id] === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectAnswer(q.id, opt.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                              isSelected
                                ? "bg-red-50 border-red-300 text-ptit-red font-semibold"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                isSelected
                                  ? "bg-ptit-red text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            {!latestAttemptResult && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Đã trả lời: {Object.keys(userAnswers).length}/{activeQuizToTake.questions.length} câu
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveQuizToTake(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={isSubmittingAttempt || Object.keys(userAnswers).length === 0}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-ptit-red hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    {isSubmittingAttempt ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />}
                    <span>Nộp bài & Chấm điểm</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
