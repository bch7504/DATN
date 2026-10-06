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
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
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
  { label: "Trợ lý tài liệu", href: "/chat", icon: Sparkles },
  { label: "Kế hoạch & Lịch", href: "/plan", icon: CalendarCheck },
  { label: "Ôn tập", href: "/review", icon: RotateCcw },
];

const TEACHER_NAV: NavItem[] = [
  { label: "Tổng quan", href: "/teacher/dashboard", icon: LayoutDashboard },
  { label: "Lớp học phần của tôi", href: "/teacher/course-offerings", icon: GraduationCap },
  { label: "Yêu cầu tham gia", href: "/teacher/enrollments", icon: UserCheck },
  { label: "Kho học liệu PDF", href: "/teacher/documents", icon: FolderKanban },
  { label: "AI Quiz Studio", href: "/teacher/quizzes/create", icon: ListChecks },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Tổng quan hệ thống", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Người dùng & Vai trò", href: "/admin/users", icon: Users },
  { label: "Môn học & Học kỳ", href: "/admin/catalog", icon: Layers },
  { label: "Feedback & Reports", href: "/admin/feedback", icon: ShieldAlert },
  { label: "Logs & Audit", href: "/admin/audit", icon: FileClock },
  { label: "Cấu hình", href: "/admin/settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, logout, isDemo, switchDemoRole } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

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
          className={`fixed inset-y-0 left-0 z-50 w-68 bg-white border-r border-[#e5e7eb] flex flex-col transition-all duration-200 ease-in-out lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:static lg:z-auto ${desktopSidebarCollapsed ? "lg:w-20" : "lg:w-68"}`}
        >
          {/* Brand Header */}
          <div className={`p-4 border-b border-[#f1f5f9] flex items-center justify-between ${desktopSidebarCollapsed ? "lg:flex-col lg:gap-3 lg:px-2" : ""}`}>
            <Link
              href="/"
              className="flex items-center gap-3 group focus:outline-none"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-10 h-10 rounded-full border-2 border-[#d71920] bg-white flex items-center justify-center shadow-sm flex-shrink-0  transition-transform">
                <PtitLogo size={24} />
              </div>
              <div className={`leading-tight ${desktopSidebarCollapsed ? "lg:hidden" : ""}`}>
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
              className="lg:hidden p-1.5 rounded-lg text-slate-400  "
              aria-label="Đóng thanh điều hướng"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setDesktopSidebarCollapsed((current) => !current)}
              className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-500  "
              aria-label={desktopSidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              title={desktopSidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            >
              {desktopSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>

          {/* Role Indicator */}
          <div className={`px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center ${desktopSidebarCollapsed ? "lg:justify-center" : "justify-between"}`}>
            <span
              className={`text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${roleBadgeColor}`}
            >
              <span className={desktopSidebarCollapsed ? "lg:hidden" : ""}>{roleTitle}</span>
              <span className={`hidden ${desktopSidebarCollapsed ? "lg:inline" : ""}`}>{roleTitle.slice(0, 2)}</span>
            </span>
            {isDemo && !desktopSidebarCollapsed && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Demo
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 ${desktopSidebarCollapsed ? "lg:hidden" : ""}`}>
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
                  title={desktopSidebarCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    isActive
                      ? "bg-[#fff1f2] text-[#d71920] font-semibold border border-[#fecdd3]"
                      : "text-[#334155]  "
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? "text-[#d71920]" : "text-[#64748b]"
                    }`}
                  />
                  <span className={`flex-1 truncate ${desktopSidebarCollapsed ? "lg:hidden" : ""}`}>{item.label}</span>
                  {isActive && !desktopSidebarCollapsed && (
                    <ChevronRight className="w-3.5 h-3.5 text-[#d71920]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Account & Logout in Sidebar Footer */}
          <div className="p-3 border-t border-[#e5e7eb] bg-white">
            <div className={`p-2 rounded-xl bg-slate-50 flex items-center gap-3 ${desktopSidebarCollapsed ? "lg:justify-center" : ""}`}>
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-sm border border-red-200 flex-shrink-0">
                {user?.displayName ? user.displayName.charAt(0) : "U"}
              </div>
              <div className={`flex-1 min-w-0 ${desktopSidebarCollapsed ? "lg:hidden" : ""}`}>
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
                className={`p-1.5 rounded-lg text-slate-400   transition ${desktopSidebarCollapsed ? "lg:hidden" : ""}`}
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
                className="lg:hidden p-2 rounded-lg text-slate-600  focus:outline-none"
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
                    crumbs.push("Lớp học phần", "Xem học liệu PDF");
                  } else if (pathname?.startsWith("/materials")) {
                    crumbs.push("Lớp học phần", "Kho học liệu");
                  } else if (pathname === "/dashboard") {
                    crumbs.push("Bảng điều khiển");
                  } else if (pathname?.startsWith("/course-offerings")) {
                    crumbs.push("Lớp học phần");
                  } else if (pathname?.startsWith("/personal-documents")) {
                    crumbs.push("Tài liệu cá nhân");
                  } else if (pathname?.startsWith("/chat")) {
                    crumbs.push("Trợ lý tài liệu cá nhân");
                  } else if (pathname?.startsWith("/quiz/create")) {
                    crumbs.push("Ôn tập", "Sinh đề thi trắc nghiệm AI");
                  } else if (pathname?.startsWith("/review/")) {
                    crumbs.push("Ôn tập", "Không gian môn học");
                  } else if (pathname?.startsWith("/review")) {
                    crumbs.push("Ôn tập");
                  } else if (pathname?.startsWith("/plan")) {
                    crumbs.push("Kế hoạch & Lịch");
                  } else if (pathname === "/teacher/dashboard") {
                    crumbs.push("Bảng điều khiển");
                  } else if (pathname?.startsWith("/teacher/course-offerings")) {
                    crumbs.push("Quản lý Lớp học phần");
                  } else if (pathname?.startsWith("/teacher/enrollments")) {
                    crumbs.push("Phê duyệt sinh viên");
                  } else if (pathname?.startsWith("/teacher/documents")) {
                    crumbs.push("Kho học liệu PDF");
                  } else if (pathname?.startsWith("/teacher/quizzes")) {
                    crumbs.push("AI Quiz Studio");
                  } else if (pathname === "/admin/dashboard") {
                    crumbs.push("Bảng điều khiển");
                  } else if (pathname?.startsWith("/admin/users")) {
                    crumbs.push("Quản lý người dùng");
                  } else if (pathname?.startsWith("/admin/catalog")) {
                    crumbs.push("Môn học & Học kỳ");
                  } else if (pathname?.startsWith("/admin/course-offerings")) {
                    crumbs.push("Giám sát Lớp học phần");
                  } else if (pathname?.startsWith("/admin/feedback")) {
                    crumbs.push("Phản hồi");
                  } else if (pathname?.startsWith("/admin/audit")) {
                    crumbs.push("Nhật ký hệ thống");
                  } else if (pathname?.startsWith("/admin/settings")) {
                    crumbs.push("Cài đặt hệ thống");
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
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600   border border-slate-200 transition"
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
