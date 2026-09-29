"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Flame,
  Target,
  GraduationCap,
  BookOpen,
  Award,
  ChevronRight,
  Sparkles,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function StudentDashboardPage() {
  const { user } = useAuth();

  // Demo dashboard data conforming to docs/api-plan.md Section 4.6
  const overview = {
    viewedSlides: 38,
    totalPublishedSlides: 62,
    completedTasks: 9,
    totalTasks: 12,
    completedQuizzes: 7,
    averageQuizScore: 84.0,
  };

  const streak = {
    currentStreak: 6,
    longestStreak: 14,
    activityDays: ["2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29"],
  };

  const dailyGoal = {
    slideTarget: 5,
    slideActual: 3,
    quizQuestionTarget: 10,
    quizQuestionActual: 6,
    taskTarget: 2,
    taskActual: 1,
  };

  const activeOfferings = [
    {
      id: "offering_dbi_01",
      code: "DBI-01",
      name: "Cơ sở dữ liệu",
      teacher: "TS. Nguyễn Văn B",
      viewedSlides: 18,
      totalPublishedSlides: 28,
      progressPercent: 64,
      completedQuizzes: 3,
      averageQuizScore: 78.0,
    },
    {
      id: "offering_ai_02",
      code: "AI-02",
      name: "Trí tuệ nhân tạo",
      teacher: "TS. Trần Thị Giảng Viên",
      viewedSlides: 20,
      totalPublishedSlides: 34,
      progressPercent: 58,
      completedQuizzes: 4,
      averageQuizScore: 88.5,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-600 rounded-3xl p-6 lg:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Chào mừng trở lại
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Xin chào, {user?.displayName || "Sinh viên"}!
          </h1>
          <p className="mt-2 text-white/90 text-sm leading-relaxed">
            Hôm nay bạn đã hoàn thành 3 slide và 6 câu Quiz. Hãy tiếp tục duy trì nhịp độ học tập để giữ vững chuỗi Streak 6 ngày nhé!
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Study Streak
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {streak.currentStreak}{" "}
              <span className="text-xs font-medium text-slate-500">ngày</span>
            </div>
            <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
              Kỷ lục: {streak.longestStreak} ngày
            </div>
          </div>
        </div>

        {/* Slide Progress Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Slide đã học
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {overview.viewedSlides}
              <span className="text-sm font-normal text-slate-400">
                /{overview.totalPublishedSlides}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Tỷ lệ hoàn thành: {Math.round((overview.viewedSlides / overview.totalPublishedSlides) * 100)}%
            </div>
          </div>
        </div>

        {/* Daily Goal Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Mục tiêu hôm nay
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {dailyGoal.slideActual + dailyGoal.quizQuestionActual + dailyGoal.taskActual}
              <span className="text-sm font-normal text-slate-400">
                /{dailyGoal.slideTarget + dailyGoal.quizQuestionTarget + dailyGoal.taskTarget}
              </span>
            </div>
            <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
              Đang đạt 58% chỉ tiêu
            </div>
          </div>
        </div>

        {/* Quiz Avg Score Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Điểm Quiz TB
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {overview.averageQuizScore}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              Đã làm {overview.completedQuizzes} bài quiz
            </div>
          </div>
        </div>
      </div>

      {/* Active Course Offerings Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Lớp học phần đang theo học
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi tiến độ xem slide bài giảng và kết quả ôn thi từng môn
            </p>
          </div>
          <Link
            href="/course-offerings"
            className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
          >
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeOfferings.map((offering) => (
            <div
              key={offering.id}
              className="p-5 rounded-2xl border border-slate-200/70 hover:border-red-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-mono font-bold text-xs">
                    {offering.code}
                  </span>
                  <StatusBadge status="ACTIVE" size="sm" />
                </div>
                <span className="text-xs text-slate-500">
                  {offering.teacher}
                </span>
              </div>

              <h3 className="font-bold text-slate-800 text-base group-hover:text-red-600 transition">
                {offering.name}
              </h3>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Tiến độ xem slide</span>
                  <span className="font-bold text-slate-800">
                    {offering.viewedSlides}/{offering.totalPublishedSlides} ({offering.progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-600 transition-all duration-500"
                    style={{ width: `${offering.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                <span>Quiz: {offering.completedQuizzes} bài</span>
                <span className="font-semibold text-emerald-700">
                  Điểm TB: {offering.averageQuizScore}
                </span>
                <Link
                  href={`/course-offerings?offeringId=${offering.id}`}
                  className="font-bold text-ptit-red hover:underline flex items-center gap-0.5"
                >
                  Vào lớp học <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
