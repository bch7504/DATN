"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Users,
  Layers,
  GraduationCap,
  ShieldCheck,
  FileClock,
  Sparkles,
  ChevronRight,
  Server,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const metrics = {
    totalUsers: 1420,
    students: 1350,
    teachers: 68,
    activeOfferings: 32,
    activeSemesters: 1,
    systemStatus: "HEALTHY",
  };

  const systemLogs = [
    {
      id: "log_01",
      action: "COURSE_OFFERING_CREATED",
      actor: "teacher@ptit.edu.vn",
      detail: "Mở lớp DBI-01 (Cơ sở dữ liệu)",
      time: "10 phút trước",
    },
    {
      id: "log_02",
      action: "STUDENT_ENROLLMENT_APPROVED",
      actor: "teacher@ptit.edu.vn",
      detail: "Duyệt sinh viên student@ptit.edu.vn vào lớp AI-02",
      time: "25 phút trước",
    },
    {
      id: "log_03",
      action: "SEMESTER_CONFIG_UPDATED",
      actor: "admin@ptit.edu.vn",
      detail: "Kích hoạt Học kỳ 1 · 2026-2027",
      time: "2 giờ trước",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Quản trị Hệ thống PTIT
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
            Bảng điều khiển Giám sát & Quản trị
          </h1>
          <p className="mt-2 text-white/80 text-sm leading-relaxed">
            Giám sát vận hành danh mục đào tạo, phân quyền tài khoản và theo dõi tính khả dụng của toàn bộ hệ thống StudyFlow.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tổng người dùng
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {metrics.totalUsers}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {metrics.students} SV · {metrics.teachers} GV
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Lớp học phần active
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {metrics.activeOfferings}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Đang mở tham gia
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Học kỳ hiện tại
            </div>
            <div className="text-lg font-extrabold text-slate-800 truncate">
              HK1 · 2026-2027
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              Đang diễn ra
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Dịch vụ hệ thống
            </div>
            <div className="text-lg font-extrabold text-emerald-700">
              Ổn định (Healthy)
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Java Backend & Database
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Nhật ký kiểm toán hệ thống gần đây
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi các sự kiện cấu hình, tạo lớp và phê duyệt quyền
            </p>
          </div>
          <Link
            href="/admin/logs"
            className="text-xs font-bold text-red-600  flex items-center gap-1"
          >
            Toàn bộ nhật ký <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {systemLogs.map((log) => (
            <div key={log.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <FileClock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="font-mono font-bold text-slate-700">
                    {log.action}
                  </span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-slate-600">{log.detail}</span>
                </div>
              </div>
              <div className="text-slate-400 flex-shrink-0">
                {log.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
