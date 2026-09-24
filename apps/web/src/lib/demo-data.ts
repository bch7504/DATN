import type { MaterialSummary, QuizSummary, StudentDashboardSummary } from "@/types/api";

export const studentDashboard: StudentDashboardSummary = {
  studyStreak: {
    currentStreak: 6,
    longestStreak: 14,
    activityDays: ["2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"],
  },
  dailyGoal: [
    { key: "SLIDES", label: "Slide đã xem", actual: 3, target: 5, percent: 60 },
    { key: "QUIZ_QUESTIONS", label: "Câu Quiz hoàn thành", actual: 6, target: 10, percent: 60 },
    { key: "STUDY_TASKS", label: "Study Task hoàn thành", actual: 1, target: 2, percent: 50 },
  ],
  aggregateProgress: { viewedSlides: 38, totalSlides: 62, percent: 61 },
};

export const materials: MaterialSummary[] = [
  { id: "doc-slide-1", title: "Thiết kế cơ sở dữ liệu quan hệ", type: "PPTX", subject: "Cơ sở dữ liệu", owner: "TS. Nguyễn Minh Anh", status: "READY", progress: 64 },
  { id: "doc-pdf-1", title: "Đề cương học phần", type: "PDF", subject: "Cơ sở dữ liệu", owner: "TS. Nguyễn Minh Anh", status: "READY" },
  { id: "doc-slide-2", title: "Tìm kiếm và biểu diễn tri thức", type: "PPTX", subject: "Trí tuệ nhân tạo", owner: "ThS. Lê Hoàng", status: "PROCESSING" },
];

export const personalDocuments: MaterialSummary[] = [
  { id: "personal-1", title: "Ghi chú chuẩn hóa dữ liệu.pdf", type: "PDF", subject: "Cơ sở dữ liệu", owner: "Bạn", status: "READY" },
  { id: "personal-2", title: "Tổng hợp SQL nâng cao.pdf", type: "PDF", subject: "Cơ sở dữ liệu", owner: "Bạn", status: "READY" },
  { id: "personal-3", title: "Bài đọc tuần 5.pdf", type: "PDF", subject: "Trí tuệ nhân tạo", owner: "Bạn", status: "PROCESSING" },
];

export const quizzes: QuizSummary[] = [
  { id: "quiz-1", title: "Ôn tập chuẩn hóa dữ liệu", status: "REVIEW_REQUIRED", questionCount: 10, sourceNames: ["Ghi chú chuẩn hóa dữ liệu.pdf"] },
  { id: "quiz-2", title: "SQL nâng cao", status: "READY", questionCount: 12, sourceNames: ["Tổng hợp SQL nâng cao.pdf"] },
  { id: "quiz-3", title: "Đại số quan hệ", status: "ARCHIVED", questionCount: 8, sourceNames: ["Ghi chú chuẩn hóa dữ liệu.pdf"], score: 87.5 },
];

export const weeklyTasks = [
  { day: "T2", time: "08:00", title: "Xem slide Chuẩn hóa", tone: "red" },
  { day: "T3", time: "19:00", title: "Làm Quiz SQL", tone: "gold" },
  { day: "T5", time: "14:00", title: "Ôn Trí tuệ nhân tạo", tone: "blue" },
  { day: "T7", time: "09:00", title: "Tổng kết tuần", tone: "green" },
];
