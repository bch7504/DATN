/**
 * Review Hub types. Course progress is returned by Dashboard, not Review Hub.
 * Conforming to docs/frontend-implementation-plan.md Section 2
 */
import { Quiz, QuizAttempt, QuizCitation } from "./quiz";

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
  averageScore: number | null;
  latestAttemptAt?: string;
}

export interface CourseReviewWorkspace {
  courseOfferingId: string;
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  reviewItems: ReviewItem[];
}

export interface DailyGoalConfig {
  targetPages: number;
  targetQuizQuestions: number;
  targetTasks: number;
}

export interface DailyGoalProgress {
  date: string;
  targetPages: number;
  actualPages: number;
  pagesPercentage: number;
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
