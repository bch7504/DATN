"use client";

import React, { useState, useEffect } from "react";
import { studentApi } from "@/lib/api-client";
import { CourseOffering, CourseEnrollment } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  GraduationCap,
  PlusCircle,
  Clock,
  CheckCircle2,
  Archive,
  BookOpen,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function StudentCourseOfferingsPage() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"APPROVED" | "PENDING" | "ARCHIVED">("APPROVED");

  const loadData = async () => {
    try {
      const [offeringsData, enrollmentsData] = await Promise.all([
        studentApi.getOfferings(),
        studentApi.getEnrollments(),
      ]);
      setOfferings(offeringsData);
      setEnrollments(enrollmentsData);
    } catch (err: unknown) {
      console.error("Failed to load courses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      await studentApi.joinCourse(joinCode.trim());
      setJoinCode("");
      await loadData();
      setActiveTab("PENDING");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể tham gia lớp với mã này.";
      setJoinError(msg);
    } finally {
      setIsJoining(false);
    }
  };

  const pendingEnrollments = enrollments.filter((e) => e.status === "PENDING");
  const approvedOfferings = offerings.filter((o) => o.status === "ACTIVE");
  const archivedOfferings = offerings.filter((o) => o.status === "ARCHIVED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Lớp học phần của bạn
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Nhập mã tham gia lớp từ Giảng viên để đăng ký vào Lớp học phần
          </p>
        </div>

        {/* Join Code Input Form */}
        <form onSubmit={handleJoin} className="flex items-center gap-2 max-w-md w-full md:w-auto">
          <div className="relative flex-1">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã tham gia (VD: AI2026PTIT)"
              className="w-full pl-3 pr-3 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isJoining || !joinCode.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm flex-shrink-0"
          >
            {isJoining ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <PlusCircle className="w-4 h-4" /> Tham gia
              </>
            )}
          </button>
        </form>
      </div>

      {joinError && (
        <ErrorAlert message={joinError} onRetry={() => setJoinError(null)} />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("APPROVED")}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "APPROVED"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã được duyệt ({approvedOfferings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PENDING")}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "PENDING"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Đang chờ duyệt ({pendingEnrollments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ARCHIVED")}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "ARCHIVED"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Lưu trữ ({archivedOfferings.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải danh sách Lớp học phần..." />
        </div>
      ) : (
        <div>
          {/* APPROVED TAB */}
          {activeTab === "APPROVED" && (
            <div>
              {approvedOfferings.length === 0 ? (
                <EmptyState
                  title="Chưa có Lớp học phần được duyệt"
                  description="Bạn chưa được duyệt vào lớp học phần nào. Hãy nhập mã tham gia lớp từ Giảng viên ở ô phía trên."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedOfferings.map((offering) => (
                    <div
                      key={offering.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-red-200 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-red-800 font-mono font-bold text-xs">
                            {offering.code}
                          </span>
                          <StatusBadge status="APPROVED" size="sm" />
                        </div>
                        <span className="text-xs text-slate-500">
                          {offering.semesterName}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-base mb-1">
                        {offering.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        Giảng viên: <span className="font-medium text-slate-700">{offering.teacherName}</span>
                      </p>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Học liệu: <b>{offering.materialsCount || 4} tài liệu</b>
                        </span>
                        <Link
                          href={`/materials?offeringId=${offering.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition"
                        >
                          <BookOpen className="w-3.5 h-3.5" /> Mở học liệu
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PENDING TAB */}
          {activeTab === "PENDING" && (
            <div>
              {pendingEnrollments.length === 0 ? (
                <EmptyState
                  title="Không có yêu cầu chờ duyệt"
                  description="Bạn không có yêu cầu tham gia lớp nào đang chờ Giảng viên phê duyệt."
                />
              ) : (
                <div className="space-y-3">
                  {pendingEnrollments.map((enr) => (
                    <div
                      key={enr.id}
                      className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-mono font-bold text-xs">
                            {enr.offeringCode}
                          </span>
                          <StatusBadge status="PENDING" size="sm" />
                          <span className="text-xs text-slate-500">
                            Yêu cầu lúc: {new Date(enr.requestedAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          {enr.offeringName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Giảng viên phụ trách: <b>{enr.teacherName}</b>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-100/70 px-3 py-2 rounded-xl">
                        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                        <span>Chưa thể mở học liệu khi chưa được duyệt</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ARCHIVED TAB */}
          {activeTab === "ARCHIVED" && (
            <div>
              {archivedOfferings.length === 0 ? (
                <EmptyState
                  title="Không có lớp học phần lưu trữ"
                  description="Các lớp học phần thuộc các học kỳ trước sẽ xuất hiện tại đây."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {archivedOfferings.map((offering) => (
                    <div
                      key={offering.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {offering.code}
                        </span>
                        <StatusBadge status="ARCHIVED" size="sm" />
                      </div>
                      <h4 className="font-bold text-slate-700 text-sm">
                        {offering.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {offering.semesterName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
