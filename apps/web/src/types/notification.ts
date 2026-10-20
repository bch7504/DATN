export type NotificationType = "STUDY_PLAN_DEADLINE" | "ASSIGNMENT_PUBLISHED" | "ASSIGNMENT_DEADLINE";

export interface StudentNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  sourceId: string;
  dueAt: string | null;
  readAt: string | null;
  createdAt: string;
}
