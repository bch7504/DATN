"use client";

import React, { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { PtitLogo } from "@/components/ui/ptit-logo";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  FileText,
  CalendarCheck,
  RotateCcw,
  Users,
  Layers,
  Settings,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserCheck,
  FolderKanban,
  FileClock,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { UserRole } from "@/types/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const STUDENT_NAV: NavItem[] = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Lớp học phần", href: "/course-offerings", icon: GraduationCap },
  { label: "Tài liệu cá nhân", href: "/personal-documents", icon: FileText },
  { label: "Hỏi đáp tài liệu (RAG)", href: "/chat", icon: MessageSquare },
  { label: "Kế hoạch học tập", href: "/plan", icon: CalendarCheck },
  { label: "Ôn tập & Quiz", href: "/review", icon: RotateCcw },
];

const TEACHER_NAV: NavItem[] = [
  { label: "Bảng điều khiển", href: "/teacher/dashboard", icon: LayoutDashboard },
  { label: "Quản lý Lớp học phần", href: "/teacher/course-offerings", icon: GraduationCap },
  { label: "Phê duyệt sinh viên", href: "/teacher/enrollments", icon: UserCheck },
  { label: "Kho tài liệu giảng dạy", href: "/teacher/documents", icon: FolderKanban },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Bảng điều khiển", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Quản lý người dùng", href: "/admin/users", icon: Users },
  { label: "Môn học & Học kỳ", href: "/admin/catalog", icon: Layers },
  { label: "Giám sát Lớp học phần", href: "/admin/course-offerings", icon: GraduationCap },
  { label: "Nhật ký hệ thống", href: "/admin/logs", icon: FileClock },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, logout, isDemo, switchDemoRole } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  let navItems: NavItem[] = STUDENT_NAV;
  let roleTitle = "HỌC VIÊN";
  let roleBadgeColor = "bg-red-50 text-red-700 border-red-200";

  if (role === "TEACHER") {
    navItems = TEACHER_NAV;
    roleTitle = "GIẢNG VIÊN";
    roleBadgeColor = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (role === "ADMIN") {
    navItems = ADMIN_NAV;
    roleTitle = "QUẢN TRỊ VIÊN";
    roleBadgeColor = "bg-purple-50 text-purple-700 border-purple-200";
  }

  const roleNameMap: Record<UserRole, string> = {
    STUDENT: "Sinh viên",
    TEACHER: "Giảng viên",
    ADMIN: "Quản trị viên",
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#172033] flex flex-col antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-68 bg-white border-r border-[#e5e7eb] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:static lg:z-auto`}
        >
          {/* Brand Header */}
          <div className="p-4 border-b border-[#f1f5f9] flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 group focus:outline-none"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-10 h-10 rounded-full border-2 border-[#d71920] bg-white flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                <PtitLogo size={24} />
              </div>
              <div className="leading-tight">
                <span className="font-extrabold text-[#172033] text-base tracking-tight block">
                  StudyFlow <span className="text-[#d71920]">· PTIT</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider block mt-0.5">
                  Học viện CNBCVT
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Đóng thanh điều hướng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role Indicator */}
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <span
              className={`text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${roleBadgeColor}`}
            >
              {roleTitle}
            </span>
            {isDemo && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Demo
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Chức năng
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  item.href !== "/teacher/dashboard" &&
                  item.href !== "/admin/dashboard" &&
                  pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    isActive
                      ? "bg-[#fff1f2] text-[#d71920] font-semibold border border-[#fecdd3]"
                      : "text-[#334155] hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? "text-[#d71920]" : "text-[#64748b]"
                    }`}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-[#d71920]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Account & Logout in Sidebar Footer */}
          <div className="p-3 border-t border-[#e5e7eb] bg-white">
            <div className="p-2 rounded-xl bg-slate-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-sm border border-red-200 flex-shrink-0">
                {user?.displayName ? user.displayName.charAt(0) : "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {user?.displayName || "Người dùng PTIT"}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {user?.email || "user@ptit.edu.vn"}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Topbar */}
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#e5e7eb] px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
                aria-label="Mở thanh điều hướng"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="font-semibold text-slate-800">
                  {role ? roleNameMap[role] : "Sinh viên"}
                </span>
                <span className="text-slate-300">/</span>
                {(() => {
                  const crumbs: string[] = [];
                  if (pathname?.startsWith("/materials/") && pathname?.includes("/viewer")) {
                    crumbs.push("Lớp học phần", "Xem slide bài giảng");
                  } else if (pathname?.startsWith("/materials")) {
                    crumbs.push("Lớp học phần", "Kho học liệu");
                  } else if (pathname === "/dashboard") {
                    crumbs.push("Bảng điều khiển");
                  } else if (pathname?.startsWith("/course-offerings")) {
                    crumbs.push("Lớp học phần");
                  } else if (pathname?.startsWith("/personal-documents")) {
                    crumbs.push("Tài liệu cá nhân");
                  } else if (pathname?.startsWith("/chat")) {
                    crumbs.push("Hỏi đáp tài liệu (RAG)");
                  } else if (pathname?.startsWith("/quiz/create")) {
                    crumbs.push("Ôn tập & Quiz", "Sinh đề thi trắc nghiệm AI");
                  } else if (pathname?.startsWith("/review/")) {
                    crumbs.push("Ôn tập & Quiz", "Không gian môn học");
                  } else if (pathname?.startsWith("/review")) {
                    crumbs.push("Ôn tập & Quiz");
                  } else if (pathname?.startsWith("/plan")) {
                    crumbs.push("Kế hoạch học tập");
                  } else if (pathname === "/teacher/dashboard") {
                    crumbs.push("Bảng điều khiển");
                  } else if (pathname?.startsWith("/teacher/course-offerings")) {
                    crumbs.push("Quản lý Lớp học phần");
                  } else if (pathname?.startsWith("/teacher/enrollments")) {
                    crumbs.push("Phê duyệt sinh viên");
                  } else if (pathname?.startsWith("/teacher/documents")) {
                    crumbs.push("Kho tài liệu giảng dạy");
                  } else if (pathname === "/admin/dashboard") {
                    crumbs.push("Bảng điều khiển");
                  } else if (pathname?.startsWith("/admin/users")) {
                    crumbs.push("Quản lý người dùng");
                  } else if (pathname?.startsWith("/admin/catalog")) {
                    crumbs.push("Môn học & Học kỳ");
                  } else if (pathname?.startsWith("/admin/course-offerings")) {
                    crumbs.push("Giám sát Lớp học phần");
                  } else if (pathname?.startsWith("/admin/logs")) {
                    crumbs.push("Nhật ký hệ thống");
                  } else {
                    crumbs.push(
                      navItems.find((n) => pathname?.startsWith(n.href))?.label ||
                        "Bảng điều khiển"
                    );
                  }

                  return crumbs.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-slate-300">/</span>}
                      <span
                        className={
                          idx === crumbs.length - 1
                            ? "text-ptit-red font-bold"
                            : "text-slate-600 font-medium"
                        }
                      >
                        {crumb}
                      </span>
                    </React.Fragment>
                  ));
                })()}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isDemo && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Dữ liệu demo</span>
                </div>
              )}

              <button
                type="button"
                onClick={logout}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất
              </button>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
