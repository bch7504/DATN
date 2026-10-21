"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ApiClientError, reviewApi } from "@/lib/api-client";
import { CourseReviewSummary } from "@/types/review";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { ErrorAlert } from "@/components/ui/error-states";
import {
  RotateCcw,
  Sparkles,
  GraduationCap,
  Layers,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

/** Args: none. Input: authenticated Student session and approved Course Offerings from Java.
 * Output: React review-course list. Errors: displays API status/message/trace and allows an actual retry.
 */
export default function StudentReviewLevel1Page(): React.ReactElement {
  const [summaries, setSummaries] = useState<CourseReviewSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<{ code?: string; message: string; traceId?: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    /** Args: none. Input: current Student session and GET /student/course-offerings response.
     * Output: Promise<void>; updates summary list/loading/error state.
     * Errors: captures Java's safe error envelope or a network error for display.
     */
    async function loadData(): Promise<void> {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await reviewApi.getCourseSummaries();
        if (mounted) setSummaries(data);
      } catch (err: unknown) {
        if (mounted) {
          setLoadError(err instanceof ApiClientError
            ? { code: `HTTP ${err.status} · ${err.code}`, message: err.message, traceId: err.traceId }
            : { message: err instanceof Error ? err.message : "Không thể tải danh sách môn học ôn tập." });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-100 text-ptit-red">
              <RotateCcw className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              Không gian Ôn tập & Quiz theo Môn học
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Danh sách lớp học phần bạn đã được duyệt; dữ liệu Quiz và lịch sử sẽ xuất hiện khi backend hỗ trợ.
          </p>
        </div>
        {summaries.some((summary) => summary.quizDataAvailable !== false) && (
          <Link
            href="/quiz/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-ptit-red text-white rounded-xl text-xs font-bold shadow-sm transition flex-shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sinh đề thi trắc nghiệm AI</span>
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        Danh sách môn học lấy từ các lớp bạn đã được duyệt. Backend hiện chưa lưu Quiz, lịch sử làm bài hoặc câu cần ôn, nên các số liệu này sẽ chưa hiển thị.
      </div>

      {loadError && (
        <ErrorAlert
          code={loadError.code}
          message={loadError.message}
          traceId={loadError.traceId}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      )}

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải dữ liệu ôn tập..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {!summaries.length && !loadError && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Bạn chưa được duyệt tham gia lớp học phần nào.</div>}
          {summaries.map((summary) => {
            const isPersonal = summary.isPersonal;
            const hasReviewItems = (summary.reviewItemsCount ?? 0) > 0;
            const hasQuizData = summary.quizDataAvailable !== false;

            return (
              <div
                key={summary.courseOfferingId}
                className="p-5 rounded-3xl bg-white border border-slate-200   transition flex flex-col justify-between group"
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${
                        isPersonal
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : "bg-red-100 text-ptit-red border border-red-200"
                      }`}
                    >
                      {isPersonal ? (
                        <>
                          <Layers className="w-3.5 h-3.5" /> PERSONAL
                        </>
                      ) : (
                        <>
                          <GraduationCap className="w-3.5 h-3.5" /> {summary.courseCode}
                        </>
                      )}
                    </span>

                    {!hasQuizData ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                        Chưa có dữ liệu Quiz
                      </span>
                    ) : hasReviewItems ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        <span>{summary.reviewItemsCount} câu cần ôn lại</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Đã vững kiến thức</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Teacher */}
                  <h3 className="font-bold text-slate-900 text-base mb-1  transition">
                    {summary.courseName}
                  </h3>
                  {!isPersonal && summary.teacherName && (
                    <p className="text-xs text-slate-500 mb-4">
                      Giảng viên: <span className="font-medium text-slate-700">{summary.teacherName}</span>
                    </p>
                  )}
                  {isPersonal && (
                    <p className="text-xs text-slate-500 mb-4">
                      Tự luyện tập độc lập từ tài liệu cá nhân
                    </p>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 pb-4">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Số bài Quiz
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                        {summary.totalQuizzes === null ? "Chưa có dữ liệu" : `${summary.totalQuizzes} bài`}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Điểm trung bình
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                        {summary.averageScore === null ? "Chưa có dữ liệu" : `${summary.averageScore.toFixed(1)}/10`}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {hasQuizData ? (
                    <span className="text-xs text-slate-400">
                      {summary.totalAttempts ?? 0} lượt làm · {summary.reviewItemsCount ?? 0} câu cần ôn
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Tính năng Quiz chưa khả dụng</span>
                  )}
                  {hasQuizData && (
                    <Link
                      href={`/review/${summary.courseOfferingId}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-ptit-red"
                    >
                      <span>Vào ôn tập</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
