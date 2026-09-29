/**
 * Review Hub 2-Level Types & Learning Analytics
 * Conforming to docs/frontend-implementation-plan.md Section 2
 */
import { QuizCitation } from "./quiz";

export interface ReviewItem {
  id: string;
  quizId: string;
  quizTitle: string;
  questionId: string;
  questionText: string;
  wrongOptionText: string;
  correctOptionText: string;
  explanation: string;
  citation?: QuizCitation;
  lastAttemptAt: string;
  timesWrong: number;
}

export interface CourseReviewSummary {
  courseOfferingId: string; // "PERSONAL" for personal quizzes group
  courseCode: string;
  courseName: string;
  teacherName?: string;
  isPersonal: boolean;
  totalQuizzes: number;
  totalAttempts: number;
  reviewItemsCount: number; // số câu cần ôn lại
  slideViewCount: number;
  totalSlides: number;
  viewingPercentage: number;
}

export interface SlideProgressItem {
  slideNumber: number;
  title: string;
  viewed: boolean;
  viewedAt?: string;
}

export interface LearningActivityLog {
  id: string;
  type: "VIEW_SLIDE" | "STUDY_TASK_COMPLETED" | "QUIZ_COMPLETED";
  description: string;
  courseCode?: string;
  timestamp: string;
}

export interface CourseWorkspaceProgress {
  courseOfferingId: string;
  courseCode: string;
  documentId: string;
  documentTitle: string;
  totalSlides: number;
  viewedSlides: number;
  viewingPercentage: number;
  slides: SlideProgressItem[];
  recentActivities: LearningActivityLog[];
}

export interface DailyGoalConfig {
  targetSlides: number;
  targetQuizQuestions: number;
  targetTasks: number;
}

export interface DailyGoalProgress {
  date: string;
  targetSlides: number;
  actualSlides: number;
  slidesPercentage: number;
  targetQuizQuestions: number;
  actualQuizQuestions: number;
  quizPercentage: number;
  targetTasks: number;
  actualTasks: number;
  tasksPercentage: number;
  isCompleted: boolean;
}

export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  weeklyActivity: {
    day: string; // "Thứ 2", "Thứ 3", ...
    date: string;
    active: boolean;
    count: number;
  }[];
}
