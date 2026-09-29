"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  GraduationCap,
  UserCheck,
  FolderKanban,
  FileUp,
  PlusCircle,
  Copy,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function TeacherDashboardPage() {
  const { user } = useAuth();

  const myOfferings = [
    {
      id: "offering_ai_02",
      code: "AI-02",
      name: "Trí tuệ nhân tạo",
      semester: "Học kỳ 1 · 2026-2027",
      joinCode: "AI2026PTIT",
      enrolledStudents: 45,
      pendingRequests: 3,
      publishedMaterials: 4,
    },
    {
      id: "offering_ds_01",
      code: "DSA-01",
      name: "Cấu trúc dữ liệu & Giải thuật",
      semester: "Học kỳ 1 · 2026-2027",
      joinCode: "DSA2026PTIT",
      enrolledStudents: 52,
      pendingRequests: 0,
      publishedMaterials: 6,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-red-800 rounded-3xl p-6 lg:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Cổng Giảng viên PTIT
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Xin chào, {user?.displayName || "Thầy/Cô"}!
          </h1>
          <p className="mt-2 text-white/90 text-sm leading-relaxed">
            Hệ thống ghi nhận 2 lớp học phần đang mở và có 3 yêu cầu tham gia lớp mới từ sinh viên đang chờ phê duyệt.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Lớp đang giảng dạy
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {myOfferings.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Tổng số sinh viên: 97
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Chờ phê duyệt
            </div>
            <div className="text-2xl font-extrabold text-red-600">3</div>
            <div className="text-[11px] text-red-700 font-medium mt-0.5">
              Cần xử lý yêu cầu
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Học liệu đã công bố
            </div>
            <div className="text-2xl font-extrabold text-slate-800">10</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              8 PPTX · 2 PDF
            </div>
          </div>
        </div>
      </div>

      {/* Course Offerings List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Danh sách Lớp học phần phụ trách
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mã tham gia lớp (Join Code) và kiểm duyệt sinh viên
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" /> Mở Lớp học phần mới
          </button>
        </div>

        <div className="space-y-4">
          {myOfferings.map((offering) => (
            <div
              key={offering.id}
              className="p-5 rounded-2xl border border-slate-200/80 hover:border-amber-300 bg-slate-50/50 hover:bg-white hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-mono font-bold text-xs">
                    {offering.code}
                  </span>
                  <StatusBadge status="ACTIVE" size="sm" />
                  <span className="text-xs text-slate-500">
                    {offering.semester}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {offering.name}
                </h3>
                <div className="text-xs text-slate-500 flex items-center gap-3 pt-1">
                  <span>Sinh viên: <b>{offering.enrolledStudents}</b></span>
                  <span>·</span>
                  <span>Học liệu: <b>{offering.publishedMaterials}</b></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono">
                  <span className="text-slate-400">Join code:</span>
                  <span className="font-bold text-slate-800">
                    {offering.joinCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(offering.joinCode)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    title="Sao chép mã"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {offering.pendingRequests > 0 && (
                  <Link
                    href="/teacher/enrollments"
                    className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition flex items-center gap-1"
                  >
                    Duyệt ({offering.pendingRequests})
                  </Link>
                )}

                <Link
                  href={`/teacher/documents?offeringId=${offering.id}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Kho học liệu
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
