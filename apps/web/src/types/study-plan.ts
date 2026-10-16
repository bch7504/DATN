export type StudyPlanStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type StudyPlanItemType = "STUDY_SESSION" | "TASK" | "QUIZ";
export type StudyPlanItemStatus = "TODO" | "COMPLETED" | "CANCELLED";

export interface StudyPlan {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status: StudyPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanItem {
  id: string;
  planId: string;
  title: string;
  description?: string | null;
  type: StudyPlanItemType;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  dueAt?: string | null;
  reminderAt?: string | null;
  status: StudyPlanItemStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudyPlanRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface SaveStudyPlanItemRequest {
  title: string;
  description?: string;
  type: StudyPlanItemType;
  scheduledStart?: string;
  scheduledEnd?: string;
  dueAt?: string;
  reminderMinutesBefore?: number;
}

export interface CalendarProjection {
  from: string;
  to: string;
  items: StudyPlanItem[];
}
