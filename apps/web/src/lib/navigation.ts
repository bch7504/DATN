import type { UserRole } from "@/types/auth";

/** Args: pathname (required app path), optional role. Input: trusted Next pathname without query. Output: safe in-app parent for direct visits; no side effects. Errors: unknown paths use the role dashboard. */
export function parentRoute(pathname: string, role?: UserRole | null): string {
  if (/^\/teacher\/assignments\/[^/]+\/edit$/.test(pathname)) return pathname.slice(0, -5);
  if (/^\/teacher\/assignments\/[^/]+$/.test(pathname)) return "/teacher/assignments";
  if (pathname === "/teacher/course-offerings/new") return "/teacher/course-offerings";
  if (/^\/teacher\/documents\/[^/]+\/upload$/.test(pathname)) return pathname.slice(0, -7);
  if (/^\/teacher\/documents\//.test(pathname)) return "/teacher/documents";
  if (/^\/teacher\/quizzes\/[^/]+$/.test(pathname)) return pathname.endsWith("/create") ? "/teacher/dashboard" : "/teacher/quizzes/create";
  if (/^\/materials\//.test(pathname)) return "/materials";
  if (/^\/assignments\//.test(pathname)) return "/assignments";
  if (/^\/course-offerings\//.test(pathname)) return "/course-offerings";
  const result = pathname.match(/^(\/review\/[^/]+)\/attempts\/[^/]+\/result$/);
  if (result) return result[1];
  const taking = pathname.match(/^(\/review\/[^/]+)\/attempts\/[^/]+$/);
  if (taking) return taking[1];
  const items = pathname.match(/^(\/review\/[^/]+)\/items$/);
  if (items) return items[1];
  if (/^\/review\//.test(pathname)) return "/review";
  if (/^\/quiz\/drafts\/[^/]+\/accept$/.test(pathname)) return pathname.slice(0, -7);
  if (/^\/quiz\/drafts\//.test(pathname)) return "/quiz/create";
  if (pathname === "/quiz/create") return "/review";
  const plan = pathname.match(/^\/plan\/([^/]+)\//);
  if (plan) return `/plan?planId=${encodeURIComponent(plan[1])}`;
  if (pathname === "/plan/new") return "/plan";
  if (/^\/admin\/users\//.test(pathname)) return "/admin/users";
  if (/^\/admin\/feedback\//.test(pathname)) return "/admin/feedback";
  if (/^\/admin\/course-offerings\//.test(pathname)) return "/admin/course-offerings";
  const catalog = pathname.match(/^\/admin\/catalog\/(subjects|semesters)\//);
  if (catalog) return `/admin/catalog/${catalog[1]}`;
  return role === "TEACHER" ? "/teacher/dashboard" : role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
}
