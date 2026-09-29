"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { reviewApi, studentApi } from "@/lib/api-client";
import { DailyGoalProgress, StudyStreak } from "@/types/review";
import { CourseOffering } from "@/types/course-offering";
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
  AlertCircle,
  CheckCircle2,
  Settings,
  ArrowRight,
  Clock,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const [dailyGoal, setDailyGoal] = useState<DailyGoalProgress | null>(null);
  const [streak, setStreak] = useState<StudyStreak | null>(null);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);

  // Daily Goal Config Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [targetSlides, setTargetSlides] = useState(8);
  const [targetQuiz, setTargetQuiz] = useState(10);
  const [targetTasks, setTargetTasks] = useState(2);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [goalData, streakData, offeringsData] = await Promise.all([
          reviewApi.getDailyGoalProgress(),
          reviewApi.getStudyStreak(),
          studentApi.getOfferings(),
        ]);
        if (!mounted) return;
        setDailyGoal(goalData);
        setStreak(streakData);
        setOfferings(offeringsData.filter((o) => o.status === "ACTIVE"));
        setTargetSlides(goalData.targetSlides);
        setTargetQuiz(goalData.targetQuizQuestions);
        setTargetTasks(goalData.targetTasks);
      } catch (err: unknown) {
        console.error("Failed to load dashboard data:", err);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGoal(true);
    try {
      const updated = await reviewApi.updateDailyGoalConfig({
        targetSlides,
        targetQuizQuestions: targetQuiz,
        targetTasks,
      });
      setDailyGoal(updated);
      setIsGoalModalOpen(false);
    } catch {
      alert("Lỗi khi cập nhật mục tiêu.");
    } finally {
      setIsSavingGoal(false);
    }
  };

  const overview = {
    viewedSlides: 38,
    totalPublishedSlides: 62,
    completedTasks: 9,
    totalTasks: 12,
    completedQuizzes: 7,
    averageQuizScore: 84.0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-600 rounded-3xl p-6 lg:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Chào mừng trở lại · Học kỳ 1 (2026 - 2027)
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display">
            Xin chào, {user?.displayName || "Sinh viên PTIT"}!
          </h1>
          <p className="mt-2 text-white/90 text-xs sm:text-sm leading-relaxed">
            Hôm nay bạn đã hoàn thành bài giảng và câu hỏi trắc nghiệm. Hãy tiếp tục duy trì nhịp độ học tập để giữ vững chuỗi Streak {streak?.currentStreak || 5} ngày nhé!
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href="/review"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-ptit-red hover:bg-red-50 rounded-xl text-xs font-bold shadow-sm transition"
            >
              <RotateCcw className="w-4 h-4" /> Không gian Ôn tập
            </Link>
            <Link
              href="/course-offerings"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition"
            >
              <GraduationCap className="w-4 h-4" /> Lớp học phần của tôi
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Flame className="w-6 h-6 fill-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Study Streak
            </div>
            <div className="text-2xl font-extrabold text-slate-800 font-display">
              {streak?.currentStreak || 5}{" "}
              <span className="text-xs font-normal text-slate-500">ngày</span>
            </div>
            <div className="text-[11px] text-amber-700 font-semibold mt-0.5 truncate">
              Kỷ lục: {streak?.longestStreak || 12} ngày liên tục
            </div>
          </div>
        </div>

        {/* Slide Progress Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-ptit-red border border-red-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Slide bài giảng
            </div>
            <div className="text-2xl font-extrabold text-slate-800 font-display">
              {overview.viewedSlides}
              <span className="text-sm font-normal text-slate-400">
                /{overview.totalPublishedSlides}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
              Đạt {Math.round((overview.viewedSlides / overview.totalPublishedSlides) * 100)}% toàn bộ môn
            </div>
          </div>
        </div>

        {/* Daily Goal Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Target className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Mục tiêu ngày
              </span>
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Cài đặt mục tiêu"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 font-display">
              {dailyGoal ? dailyGoal.actualSlides + dailyGoal.actualQuizQuestions + dailyGoal.actualTasks : 16}
              <span className="text-sm font-normal text-slate-400">
                /{dailyGoal ? dailyGoal.targetSlides + dailyGoal.targetQuizQuestions + dailyGoal.targetTasks : 20}
              </span>
            </div>
            <div className="text-[11px] text-blue-700 font-semibold mt-0.5 truncate">
              Hoàn thành 80% chỉ tiêu
            </div>
          </div>
        </div>

        {/* Quiz Avg Score Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Award className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Điểm Quiz TB
            </div>
            <div className="text-2xl font-extrabold text-slate-800 font-display">
              {overview.averageQuizScore}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 truncate">
              Đã làm {overview.completedQuizzes} lượt ôn thi
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Course Offerings (Col 7 or 8) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Lớp học phần đang theo học
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xem học liệu bài giảng slide và câu hỏi ôn thi gắn với từng môn học
                </p>
              </div>
              <Link
                href="/course-offerings"
                className="inline-flex items-center gap-1 text-xs font-bold text-ptit-red hover:underline"
              >
                Xem tất cả lớp <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {offerings.map((offering) => (
                <div
                  key={offering.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-red-200 bg-white hover:shadow-sm transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-ptit-red font-mono font-bold text-xs border border-red-100">
                        {offering.code}
                      </span>
                      <StatusBadge status="APPROVED" size="sm" />
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-ptit-red transition mb-1">
                      {offering.name}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Giảng viên: <span className="font-medium text-slate-700">{offering.teacherName}</span>
                    </p>

                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Tiến độ xem slide</span>
                        <span className="font-bold text-slate-800">75%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-ptit-red" style={{ width: "75%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {offering.materialsCount || 4} học liệu
                    </span>
                    <Link
                      href={`/course-offerings?offeringId=${offering.id}`}
                      className="font-bold text-ptit-red hover:underline inline-flex items-center gap-0.5"
                    >
                      Vào lớp học <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Review Action Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-red-50 via-white to-amber-50 border border-red-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-ptit-red text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-display">
                  Có 3 câu hỏi trắc nghiệm cần ôn tập lại
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Được hệ thống tự động tổng hợp từ các lần làm bài chưa chính xác. Bạn có thể nhảy đến đúng slide để xem lại lý thuyết.
                </p>
              </div>
            </div>

            <Link
              href="/review"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-ptit-red hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex-shrink-0"
            >
              <span>Ôn tập ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Daily Goal Breakdown & Weekly Activity (Col 4 or 5) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Daily Goal Detail Box */}
          {dailyGoal && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-ptit-red" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Chi tiết Mục tiêu Ngày
                  </h3>
                </div>
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="text-xs font-semibold text-ptit-red hover:underline cursor-pointer"
                >
                  Cài đặt
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Xem slide bài giảng</span>
                    <span className="font-bold text-slate-900">
                      {dailyGoal.actualSlides}/{dailyGoal.targetSlides} slide
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ptit-red rounded-full"
                      style={{ width: `${dailyGoal.slidesPercentage}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Làm câu Quiz</span>
                    <span className="font-bold text-slate-900">
                      {dailyGoal.actualQuizQuestions}/{dailyGoal.targetQuizQuestions} câu
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ptit-red rounded-full"
                      style={{ width: `${dailyGoal.quizPercentage}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Nhiệm vụ học tập</span>
                    <span className="font-bold text-slate-900">
                      {dailyGoal.actualTasks}/{dailyGoal.targetTasks} task
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${dailyGoal.tasksPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-normal">
                Điểm actual do Java backend tính tự động dựa trên nhật ký học tập.
              </div>
            </div>
          )}

          {/* 7-Days Streak Activity Heatmap */}
          {streak && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Chuỗi Streak 7 ngày
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-600">
                  {streak.currentStreak} ngày liên tiếp
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center pt-1">
                {streak.weeklyActivity.map((day, idx) => (
                  <div key={idx} className="space-y-1">
                    <div
                      className={`h-9 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                        day.active
                          ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                          : "bg-slate-100 text-slate-400 border border-transparent"
                      }`}
                      title={`${day.date}: ${day.count} hoạt động`}
                    >
                      {day.active ? <Flame className="w-4 h-4 fill-amber-500 text-amber-500" /> : "—"}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">
                      {day.day}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Goal Config Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-ptit-red" />
                <h3 className="font-bold text-slate-900 text-sm font-display">
                  Cài đặt Mục tiêu ngày (Daily Goal)
                </h3>
              </div>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mục tiêu số slide xem mỗi ngày:
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={targetSlides}
                  onChange={(e) => setTargetSlides(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mục tiêu câu Quiz mỗi ngày:
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={targetQuiz}
                  onChange={(e) => setTargetQuiz(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mục tiêu nhiệm vụ (Task):
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={targetTasks}
                  onChange={(e) => setTargetTasks(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingGoal}
                  className="px-5 py-2 bg-ptit-red hover:bg-red-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {isSavingGoal ? "Đang lưu..." : "Lưu mục tiêu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
