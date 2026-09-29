"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { Sparkles, ArrowRightLeft } from "lucide-react";
import { UserRole } from "@/types/auth";

export function DemoBanner() {
  const { isDemo, role, switchDemoRole } = useAuth();

  if (!isDemo) return null;

  return (
    <aside
      aria-label="Thông báo chế độ demo"
      className="bg-gradient-to-r from-amber-500 via-red-600 to-amber-600 text-white text-xs font-medium py-1.5 px-4 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]">
            <Sparkles className="w-3 h-3" /> Dữ liệu demo
          </span>
          <span className="hidden sm:inline">
            Hệ thống đang hoạt động ở chế độ Demo Flow MVP (Học viện CNBCVT). Mọi thay đổi dữ liệu chỉ có hiệu lực trong phiên làm việc.
          </span>
          <span className="sm:hidden">
            Chế độ Demo Flow MVP
          </span>
        </div>

        {role && (
          <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded text-[11px]">
            <span className="text-white/80">Vai trò:</span>
            <span className="font-bold underline decoration-amber-300">
              {role === "STUDENT" && "Sinh viên"}
              {role === "TEACHER" && "Giảng viên"}
              {role === "ADMIN" && "Quản trị viên"}
            </span>
            <div className="flex items-center gap-1 ml-1.5 pl-1.5 border-l border-white/20">
              <span className="text-white/70 hidden md:inline">Đổi vai trò:</span>
              <button
                type="button"
                onClick={() => switchDemoRole("STUDENT")}
                className={`px-1.5 py-0.2 rounded hover:bg-white/20 transition ${
                  role === "STUDENT" ? "bg-white/30 font-bold" : ""
                }`}
                title="Chuyển sang Sinh viên"
              >
                SV
              </button>
              <button
                type="button"
                onClick={() => switchDemoRole("TEACHER")}
                className={`px-1.5 py-0.2 rounded hover:bg-white/20 transition ${
                  role === "TEACHER" ? "bg-white/30 font-bold" : ""
                }`}
                title="Chuyển sang Giảng viên"
              >
                GV
              </button>
              <button
                type="button"
                onClick={() => switchDemoRole("ADMIN")}
                className={`px-1.5 py-0.2 rounded hover:bg-white/20 transition ${
                  role === "ADMIN" ? "bg-white/30 font-bold" : ""
                }`}
                title="Chuyển sang Quản trị viên"
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
