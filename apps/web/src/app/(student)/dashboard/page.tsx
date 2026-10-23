"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Flame,
  GraduationCap,
  RotateCcw,
  Settings,
  Target,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { catalogApi, reviewApi, studentApi } from "@/lib/api-client";
import type { CourseOffering, Semester, Subject } from "@/types/course-offering";
import type { DailyGoalProgress, StudyStreak } from "@/types/review";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { StatusBadge } from "@/components/ui/status-badge";

/** Student dashboard backed exclusively by Java APIs for the active MVP semester. */
export default function StudentDashboardPage(): React.JSX.Element {
  const { user } = useAuth();
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semester, setSemester] = useState<Semester | null>(null);
  const [dailyGoal, setDailyGoal] = useState<DailyGoalProgress | null>(null);
  const [streak, setStreak] = useState<StudyStreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [goalUnavailable, setGoalUnavailable] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [targetPages, setTargetPages] = useState(8);
  const [targetQuiz, setTargetQuiz] = useState(10);
  const [targetTasks, setTargetTasks] = useState(2);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  useEffect(() => {
    let active = true;

    /**
     * Args: none.
     * Input: authenticated Student session and public Java APIs.
     * Output: void; stores each independently available dashboard section.
     * Errors: a failed optional aggregate never hides successfully loaded Course Offerings.
     */
    async function loadDashboard(): Promise<void> {
      const [offeringResult, subjectResult, semesterResult, goalResult, streakResult] = await Promise.allSettled([
        studentApi.getOfferings(),
        catalogApi.getSubjects(),
        catalogApi.getSemesters(),
        reviewApi.getDailyGoalProgress(),
        reviewApi.getStudyStreak(),
      ]);
      if (!active) return;

      if (offeringResult.status === "fulfilled") {
        setOfferings(offeringResult.value.filter((item) => item.status === "ACTIVE"));
      } else {
        setLoadError(offeringResult.reason instanceof Error ? offeringResult.reason.message : "Không thể tải lớp học phần.");
      }
      if (subjectResult.status === "fulfilled") {
        setSubjects(subjectResult.value.filter((item) => item.status === "ACTIVE"));
      }
      if (semesterResult.status === "fulfilled") {
        setSemester(semesterResult.value.find((item) => item.status === "ACTIVE") ?? null);
      }
      if (goalResult.status === "fulfilled") {
        setDailyGoal(goalResult.value);
        setTargetPages(goalResult.value.targetPages);
        setTargetQuiz(goalResult.value.targetQuizQuestions);
        setTargetTasks(goalResult.value.targetTasks);
      } else {
        setGoalUnavailable(true);
      }
      if (streakResult.status === "fulfilled") setStreak(streakResult.value);
      setIsLoading(false);
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const materialCount = useMemo(
    () => offerings.reduce((total, offering) => total + (offering.materialsCount ?? 0), 0),
    [offerings],
  );

  /**
   * Args: form submit event.
   * Input: positive Student-selected targets.
   * Output: void; replaces displayed goal with Java's computed response.
   * Errors: keeps the modal open and shows the returned API message.
   */
  async function saveGoal(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSavingGoal(true);
    setLoadError(null);
    try {
      const updated = await reviewApi.updateDailyGoalConfig({
        targetPages,
        targetQuizQuestions: targetQuiz,
        targetTasks,
      });
      setDailyGoal(updated);
      setGoalUnavailable(false);
      setIsGoalModalOpen(false);
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "Không thể cập nhật mục tiêu ngày.");
    } finally {
      setIsSavingGoal(false);
    }
  }

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" text="Đang tải tổng quan học kỳ..." /></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-red-500 p-6 text-white shadow-sm lg:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-100">{semester?.name ?? "Chưa có học kỳ ACTIVE"}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight lg:text-3xl">Xin chào, {user?.displayName ?? "Sinh viên PTIT"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-red-50">
            Theo dõi một học kỳ thống nhất gồm {subjects.length} môn. Tất cả lớp, học liệu, Quiz và tiến độ dưới đây được lấy trực tiếp từ hệ thống.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/course-offerings" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-red-700 shadow-sm">
              <GraduationCap className="h-4 w-4" /> Mở danh sách môn học
            </Link>
            <Link href="/review" className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-red-800/30 px-4 py-2.5 text-xs font-bold text-white">
              <RotateCcw className="h-4 w-4" /> Không gian ôn tập
            </Link>
          </div>
        </div>
      </section>

      {loadError && <ErrorAlert message={loadError} onRetry={() => window.location.reload()} />}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Số liệu học kỳ">
        <MetricCard icon={BookOpen} label="Danh mục MVP" value={`${subjects.length} môn`} detail="Môn học đang hoạt động" />
        <MetricCard icon={GraduationCap} label="Đã tham gia" value={`${offerings.length} lớp`} detail="Enrollment đã được duyệt" />
        <MetricCard icon={CalendarDays} label="Học liệu đã công bố" value={`${materialCount} PDF`} detail="Theo dữ liệu lớp học phần" />
        <MetricCard icon={Flame} label="Study Streak" value={streak ? `${streak.currentStreak} ngày` : "Chưa có"} detail={streak ? `Kỷ lục ${streak.longestStreak} ngày` : "Chưa có dữ liệu hoạt động"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Môn học trong học kỳ</h2>
              <p className="mt-1 text-xs text-slate-500">Chỉ hiển thị lớp thật mà tài khoản hiện tại đã được duyệt.</p>
            </div>
            <Link href="/course-offerings" className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600">Quản lý lớp <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>

          {offerings.length === 0 ? (
            <EmptyState title="Chưa tham gia lớp học phần" description="Nhập mã do Giảng viên cung cấp để tham gia một trong các môn của học kỳ." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {offerings.map((offering) => (
                <article key={offering.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-red-50 px-2.5 py-1 font-mono text-xs font-bold text-red-700">{offering.code}</span>
                    <StatusBadge status="APPROVED" size="sm" />
                  </div>
                  <h3 className="mt-3 text-sm font-extrabold text-slate-900">{offering.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">Giảng viên: {offering.teacherName || "Chưa cập nhật"}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">{offering.materialsCount ?? 0} tài liệu PDF</span>
                    <Link href={`/course-offerings?offeringId=${offering.id}`} className="inline-flex items-center gap-1 font-bold text-red-600">Mở môn học <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Target className="h-4 w-4 text-red-600" /><h2 className="text-sm font-extrabold text-slate-900">Mục tiêu ngày</h2></div>
              {!goalUnavailable && <button type="button" onClick={() => setIsGoalModalOpen(true)} className="rounded-lg border border-red-200 p-1.5 text-red-600" aria-label="Cài đặt mục tiêu ngày"><Settings className="h-3.5 w-3.5" /></button>}
            </div>
            {dailyGoal ? (
              <div className="mt-4 space-y-3">
                <GoalLine label="Đọc PDF" actual={dailyGoal.actualPages} target={dailyGoal.targetPages} percentage={dailyGoal.pagesPercentage} />
                <GoalLine label="Câu Quiz" actual={dailyGoal.actualQuizQuestions} target={dailyGoal.targetQuizQuestions} percentage={dailyGoal.quizPercentage} />
                <GoalLine label="Nhiệm vụ" actual={dailyGoal.actualTasks} target={dailyGoal.targetTasks} percentage={dailyGoal.tasksPercentage} />
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">API mục tiêu ngày chưa cung cấp dữ liệu. Giao diện không tự tạo số liệu thay thế.</p>
            )}
          </section>

          <section className="rounded-3xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-red-800"><RotateCcw className="h-4 w-4" /> Ôn tập có nguồn</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">Mở Quiz đã duyệt và nội dung cần ôn lại được Java tổng hợp từ các câu trả lời sai.</p>
            <Link href="/review" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white">Mở Ôn tập <ArrowRight className="h-3.5 w-3.5" /></Link>
          </section>
        </aside>
      </div>

      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="goal-dialog-title">
          <form onSubmit={saveGoal} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 id="goal-dialog-title" className="text-lg font-extrabold text-slate-900">Cấu hình mục tiêu ngày</h2>
            <p className="mt-1 text-xs text-slate-500">Sinh viên chỉ đặt mục tiêu; Java tính kết quả thực tế.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <GoalInput label="Trang PDF" value={targetPages} onChange={setTargetPages} />
              <GoalInput label="Câu Quiz" value={targetQuiz} onChange={setTargetQuiz} />
              <GoalInput label="Nhiệm vụ" value={targetTasks} onChange={setTargetTasks} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setIsGoalModalOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">Hủy</button>
              <button type="submit" disabled={isSavingGoal} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{isSavingGoal ? "Đang lưu..." : "Lưu mục tiêu"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}

/** Args: typed metric presentation values. Input: Java-derived dashboard state. Output: one stat card. Errors: none. */
function MetricCard({ icon: Icon, label, value, detail }: MetricCardProps): React.JSX.Element {
  return <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span><strong className="block text-xl text-slate-900">{value}</strong><span className="block truncate text-[11px] text-slate-500">{detail}</span></span></div>;
}

interface GoalLineProps {
  label: string;
  actual: number;
  target: number;
  percentage: number;
}

/** Args: server-computed actual, target and percentage. Input: DailyGoalProgress. Output: progress row. Errors: none. */
function GoalLine({ label, actual, target, percentage }: GoalLineProps): React.JSX.Element {
  return <div><div className="mb-1 flex justify-between text-xs text-slate-600"><span>{label}</span><strong>{actual}/{target}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-red-600" style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} /></div></div>;
}

interface GoalInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

/** Args: goal label/value/change handler. Input: positive integer field. Output: controlled input. Errors: browser validation rejects values below one. */
function GoalInput({ label, value, onChange }: GoalInputProps): React.JSX.Element {
  return <label className="text-xs font-bold text-slate-700">{label}<input required type="number" min={1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-red-500" /></label>;
}
