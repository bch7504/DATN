export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
export type DocumentType = "PDF" | "PPTX";
export type ProcessingStatus =
  | "PENDING_PROCESSING"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "DELETING";
export type AnswerStatus = "ANSWERED" | "NO_EVIDENCE";
export type QuizStatus =
  | "GENERATING"
  | "REVIEW_REQUIRED"
  | "READY"
  | "REJECTED"
  | "GENERATION_FAILED"
  | "ARCHIVED";

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details: Record<string, string | number | boolean | null>;
  traceId: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

export interface Citation {
  documentId: string;
  documentName: string;
  location: { kind: "PAGE" | "SLIDE"; value: number };
  excerpt: string;
}

export interface MaterialSummary {
  id: string;
  title: string;
  type: DocumentType;
  subject: string;
  owner: string;
  status: ProcessingStatus;
  progress?: number;
}

export interface QuizSummary {
  id: string;
  title: string;
  status: QuizStatus;
  questionCount: number;
  sourceNames: string[];
  score?: number;
}

export type DailyGoalMetricKey = "SLIDES" | "QUIZ_QUESTIONS" | "STUDY_TASKS";

export interface DailyGoalMetric {
  key: DailyGoalMetricKey;
  label: string;
  actual: number;
  target: number;
  percent: number;
}

export interface StudyStreakSummary {
  currentStreak: number;
  longestStreak: number;
  activityDays: string[];
}

export interface StudentDashboardSummary {
  studyStreak: StudyStreakSummary;
  dailyGoal: DailyGoalMetric[];
  aggregateProgress: {
    viewedSlides: number;
    totalSlides: number;
    percent: number;
  };
}
