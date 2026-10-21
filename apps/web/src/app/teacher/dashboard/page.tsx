"use client";

import React from "react";
import Link from "next/link";
import { FolderKanban, GraduationCap, PlusCircle, Sparkles, UserCheck } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { teacherApi } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import type { CourseOffering } from "@/types/course-offering";

/**
 * Shows only Course Offerings returned for the authenticated Teacher.
 * Args: none. Input: current auth user and the public Java Teacher API.
 * Output: dashboard UI; no data mutations. Errors: API failures show a retry action,
 * never a fabricated empty or populated dashboard.
 */
export default function TeacherDashboardPage(): React.JSX.Element {
  const { user } = useAuth();
  const [offerings, setOfferings] = React.useState<CourseOffering[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = React.useState(0);

  React.useEffect((): (() => void) | void => {
    if (!user?.id) {
      setOfferings([]);
      return;
    }

    let active = true;
    setIsLoading(true);
    setErrorMessage(null);
    setOfferings([]);

    teacherApi.getOfferings()
      .then((items: CourseOffering[]): void => {
        if (active) setOfferings(items);
      })
      .catch((error: unknown): void => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Không thể tải lớp học phần của bạn."
          );
        }
      })
      .finally((): void => {
        if (active) setIsLoading(false);
      });

    return (): void => {
      active = false;
    };
  }, [user?.id, reloadVersion]);

  const activeOfferings = offerings.filter((offering) => offering.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-red-800 rounded-3xl p-6 lg:p-8 text-white shadow-lg">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Cổng Giảng viên PTIT
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Xin chào, {user?.displayName || "Thầy/Cô"}!
          </h1>
          <p className="mt-2 text-white/90 text-sm leading-relaxed">
            {isLoading
              ? "Đang tải lớp học phần của bạn..."
              : errorMessage
                ? "Chưa thể tải dữ liệu lớp học phần. Vui lòng thử lại."
                : activeOfferings.length === 0
                  ? "Bạn chưa có lớp học phần nào đang mở."
                  : `Bạn đang có ${activeOfferings.length} lớp học phần đang mở.`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" text="Đang tải dữ liệu giảng viên..." />
        </div>
      ) : errorMessage ? (
        <ErrorAlert
          message={errorMessage}
          onRetry={(): void => setReloadVersion((version) => version + 1)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Lớp đang giảng dạy
                </div>
                <div className="text-2xl font-extrabold text-slate-800">
                  {activeOfferings.length}
                </div>
              </div>
            </div>
            <Link
              href="/teacher/enrollments"
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-red-300 transition"
            >
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Yêu cầu tham gia
                </div>
                <div className="text-sm font-bold text-red-700">Xem và duyệt</div>
              </div>
            </Link>
            <Link
              href="/teacher/documents"
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Kho học liệu PDF
                </div>
                <div className="text-sm font-bold text-blue-700">Quản lý học liệu</div>
              </div>
            </Link>
          </div>

          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Lớp học phần phụ trách
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh sách được tải từ tài khoản giảng viên hiện tại.
                </p>
              </div>
              <Link
                href="/teacher/course-offerings"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" /> Quản lý lớp học phần
              </Link>
            </div>

            {offerings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <GraduationCap className="w-10 h-10 mx-auto text-slate-400" />
                <h3 className="mt-3 font-bold text-slate-900">Chưa có lớp học phần nào</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Bạn có thể mở lớp mới tại trang quản lý lớp học phần.
                </p>
                <Link
                  href="/teacher/course-offerings"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
                >
                  <PlusCircle className="w-4 h-4" /> Đến trang tạo lớp
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {offerings.map((offering) => (
                  <div
                    key={offering.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-mono font-bold text-xs">
                          {offering.code}
                        </span>
                        <StatusBadge status={offering.status} size="sm" />
                        {offering.semesterName && (
                          <span className="text-xs text-slate-500">
                            {offering.semesterName}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-base">
                        {offering.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                      <Link
                        href={`/teacher/enrollments?offeringId=${offering.id}`}
                        className="text-red-700 hover:underline"
                      >
                        Duyệt sinh viên
                      </Link>
                      <Link
                        href={`/teacher/documents?offeringId=${offering.id}`}
                        className="text-slate-700 hover:underline"
                      >
                        Kho học liệu
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
