/**
 * Quiz & Assessment Data Types conforming to docs/api-plan.md Section 4.6 & 4.7
 * MCQ_SINGLE: 1 correct option among choices, Java backend owns lifecycle & scoring.
 */

export interface QuizOption {
  id: string; // e.g., "A", "B", "C", "D"
  text: string;
}

export interface QuizCitation {
  documentId: string;
  documentName: string;
  slideNumber?: number;
  pageNumber?: number;
  excerpt?: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  type: "MCQ_SINGLE";
  options: QuizOption[];
  correctOptionId: string; // "A" | "B" | "C" | "D"
  explanation: string;
  citation?: QuizCitation;
}

export type QuizDraftStatus = "GENERATING" | "REVIEW_REQUIRED" | "ACCEPTED" | "REJECTED";

export interface QuizDraft {
  id: string;
  prompt: string;
  sourceDocumentIds: string[];
  status: QuizDraftStatus;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  courseOfferingId?: string; // null or empty for PERSONAL quiz
  courseOfferingCode?: string;
  isPersonal: boolean;
  questionCount: number;
  questions: QuizQuestion[];
  createdAt: string;
  acceptedAt?: string;
}

export interface QuizAttemptAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  percentage: number;
  completedAt: string;
  answers: QuizAttemptAnswer[];
}

export interface CreateQuizDraftRequest {
  prompt: string;
  sourceDocumentIds: string[]; // 1 to 10 READY docs
}

export interface AcceptQuizRequest {
  draftId: string;
  destinationType: "COURSE_OFFERING" | "PERSONAL";
  courseOfferingId?: string;
  title: string;
}

export interface SubmitQuizAttemptRequest {
  quizId: string;
  answers: {
    questionId: string;
    selectedOptionId: string;
  }[];
}
