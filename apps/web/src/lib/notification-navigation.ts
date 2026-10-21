import type { NotificationType } from "@/types/notification";

export interface NotificationDestination {
  href: string;
  label: string;
}

/**
 * Maps a typed Java notification to a role-appropriate existing route.
 * Args: type (required public enum), role (required authenticated role).
 * Input: owner-scoped notification already fetched from Java; no hidden source data.
 * Output: a safe route and action label. Errors: none; unknown future types use the role dashboard.
 */
export function notificationDestination(
  type: NotificationType,
  role: "STUDENT" | "TEACHER",
): NotificationDestination {
  switch (type) {
    case "STUDY_PLAN_DEADLINE":
    case "STUDY_PLAN_ITEM_CREATED":
    case "STUDY_PLAN_ITEM_EXPIRED":
    case "STUDY_PLAN_ITEM_LATE_COMPLETED": return { href: "/plan", label: "Xem kế hoạch" };
    case "TEACHER_ENROLLMENT_REQUESTED": return { href: "/teacher/enrollments", label: "Xem yêu cầu" };
    case "TEACHER_ASSIGNMENT_SUBMITTED": return { href: "/teacher/assignments", label: "Xem bài nộp" };
    case "TEACHER_ASSIGNMENT_PUBLISHED":
    case "TEACHER_ASSIGNMENT_EXPIRED": return { href: "/teacher/assignments", label: "Xem bài tập" };
    case "TEACHER_MATERIAL_UPLOADED":
    case "TEACHER_MATERIAL_PUBLISHED":
    case "TEACHER_MATERIAL_REVOKED": return { href: "/teacher/documents", label: "Xem học liệu" };
    case "STUDENT_MATERIAL_PUBLISHED":
    case "STUDENT_MATERIAL_REVOKED": return { href: "/materials", label: "Xem học liệu" };
    case "STUDENT_ENROLLMENT_REQUESTED":
    case "STUDENT_ENROLLMENT_APPROVED":
    case "STUDENT_ENROLLMENT_REJECTED":
    case "STUDENT_ENROLLMENT_REMOVED": return { href: "/course-offerings", label: "Xem lớp học" };
    case "ASSIGNMENT_PUBLISHED":
    case "ASSIGNMENT_DEADLINE":
    case "STUDENT_ASSIGNMENT_EXPIRED":
    case "STUDENT_ASSIGNMENT_SUBMITTED": return { href: "/assignments", label: "Xem bài tập" };
    default: return role === "TEACHER"
      ? { href: "/teacher/dashboard", label: "Về bảng điều khiển" }
      : { href: "/dashboard", label: "Về bảng điều khiển" };
  }
}
