"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { catalogApi } from "@/lib/api-client";

interface CatalogMetrics {
  activeSubjects: number;
  availableSemesters: number;
}

/**
 * Displays only Admin dashboard metrics obtained from the Java catalog API.
 *
 * @returns A dashboard with real catalog counts and explicit unavailable states for unimplemented Admin APIs.
 */
export default function AdminDashboardPage(): React.JSX.Element {
  const [metrics, setMetrics] = useState<CatalogMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect((): (() => void) => {
    let cancelled = false;

    /**
     * Loads real catalog counts; no synthetic operational metrics are generated.
     *
     * @returns Nothing; updates dashboard state.
     * @throws Errors are converted into the visible error state.
     */
    async function loadMetrics(): Promise<void> {
      setMetrics(null);
      setError(null);
      try {
        const [subjects, semesters] = await Promise.all([
          catalogApi.getSubjects(),
          catalogApi.getSemesters(),
        ]);
        if (!cancelled) {
          setMetrics({
            activeSubjects: subjects.length,
            availableSemesters: semesters.length,
          });
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu quản trị từ Backend.");
        }
      }
    }

    void loadMetrics();
    return (): void => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 p-6 text-white shadow-lg lg:p-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" /> Quản trị hệ thống PTIT
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight lg:text-3xl">Bảng điều khiển quản trị</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">Chỉ hiển thị số liệu được lấy trực tiếp từ Java Backend.</p>
      </div>

      {error ? (
        <ErrorAlert message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : metrics === null ? (
        <div className="py-12"><LoadingSpinner size="lg" text="Đang tải dữ liệu quản trị..." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600"><BookOpen className="h-6 w-6" /></div>
            <div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Môn học đang hoạt động</div><div className="text-2xl font-extrabold text-slate-800">{metrics.activeSubjects}</div></div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600"><CalendarDays className="h-6 w-6" /></div>
            <div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Học kỳ từ Backend</div><div className="text-2xl font-extrabold text-slate-800">{metrics.availableSemesters}</div></div>
          </div>
        </div>
      )}

      <EmptyState title="Chưa có số liệu quản trị chi tiết" description="Thống kê người dùng, lớp học phần, tình trạng dịch vụ và nhật ký sẽ chỉ xuất hiện khi các Admin API tương ứng được triển khai. Dữ liệu mô phỏng đã được loại bỏ." />
    </div>
  );
}
