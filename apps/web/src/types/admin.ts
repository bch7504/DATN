import type { PaginatedList } from "./api";

/** Public Java Admin DTOs from docs/api-plan.md §6. */
export interface AdminDashboard {
  users: number;
  students: number;
  teachers: number;
  activeOfferings: number;
  pendingEnrollments: number;
  publishedDocuments: number;
  openFeedbackReports: number;
}

export type AdminUserRole = "STUDENT" | "TEACHER" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "LOCKED";
export interface AdminUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
}
export interface AdminUserUpdate {
  role?: AdminUserRole;
  status?: AdminUserStatus;
}

export type AdminSubjectStatus = "ACTIVE" | "INACTIVE";
export interface AdminSubject {
  id: string;
  code: string;
  name: string;
  credits: number;
  description: string | null;
  status: AdminSubjectStatus;
}
export interface AdminSubjectInput {
  code: string;
  name: string;
  credits: number;
  description?: string;
  status?: AdminSubjectStatus;
}

export type AdminSemesterStatus = "UPCOMING" | "ACTIVE" | "CLOSED";
export interface AdminSemester {
  id: string;
  code: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: AdminSemesterStatus;
  offeringCreationEnabled: boolean;
}
export interface AdminSemesterInput {
  code: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: AdminSemesterStatus;
  offeringCreationEnabled: boolean;
}

export type AdminOfferingStatus = "ACTIVE" | "LOCKED" | "ARCHIVED";
export interface AdminOffering {
  id: string;
  code: string;
  name: string;
  subjectCode: string;
  semesterCode: string;
  teacherId: string;
  teacherName: string;
  status: AdminOfferingStatus;
  approvedStudents: number;
  createdAt: string;
}

export type AdminFeedbackStatus = "OPEN" | "RESOLVED";
export interface AdminFeedback {
  id: string;
  reporterId: string;
  type: string;
  title: string;
  content: string;
  status: AdminFeedbackStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface AdminFeedbackUpdate {
  status: AdminFeedbackStatus;
  resolution?: string;
}

export interface AdminSystemLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  status: string;
  traceId: string;
  createdAt: string;
}

export interface AdminSettings {
  registrationEnabled: boolean;
}

export type AdminPage<T> = PaginatedList<T>;
