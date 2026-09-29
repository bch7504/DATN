"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { reviewApi } from "@/lib/api-client";
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

export default function StudentReviewLevel1Page() {
  const [summaries, setSummaries] = useState<CourseReviewSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const data = await reviewApi.getCourseSummaries();
        if (mounted) setSummaries(data);
      } catch (err: unknown) {
        if (mounted) setErrorMessage("Không thể tải danh sách môn học ôn tập.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

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
            Chọn môn học đã được duyệt (APPROVED) để quản lý bộ câu hỏi, lịch sử làm bài và các nội dung cần ôn lại.
          </p>
        </div>

        <Link
          href="/quiz/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-ptit-red hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex-shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ Sinh Đề Thi Trắc Nghiệm AI</span>
        </Link>
      </div>

      {errorMessage && (
        <ErrorAlert message={errorMessage} onRetry={() => setErrorMessage(null)} />
      )}

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải dữ liệu ôn tập..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {summaries.map((summary) => {
            const isPersonal = summary.isPersonal;
            const hasReviewItems = summary.reviewItemsCount > 0;

            return (
              <div
                key={summary.courseOfferingId}
                className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-red-300 hover:shadow-md transition flex flex-col justify-between group"
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

                    {hasReviewItems ? (
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
                  <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-ptit-red transition">
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
                        {summary.totalQuizzes} bài
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Điểm trung bình
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                        {summary.averageScore === null ? "Chưa có" : `${summary.averageScore.toFixed(1)}/10`}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Quiz · câu sai · lịch sử
                  </span>
                  <Link
                    href={`/review/${summary.courseOfferingId}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-ptit-red hover:text-red-700 hover:underline"
                  >
                    <span>Vào ôn tập</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
