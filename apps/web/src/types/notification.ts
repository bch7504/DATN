export type NotificationType = "STUDY_PLAN_DEADLINE";

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
