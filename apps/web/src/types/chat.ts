/** Citation của Personal PDF theo page/chunk scope đã được Java xác thực. */
export interface PersonalCitation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  excerpt: string;
  sha256?: string;
}

export type AssistantCapability =
  | "ASK_DOCUMENT"
  | "SUMMARIZE_DOCUMENT"
  | "CREATE_QUIZ"
  | "NEEDS_CLARIFICATION";

export interface QuizDraftSummary {
  quizId: string;
  questionCount: number;
  difficulty?: string;
  pageFrom?: number;
  pageTo?: number;
  status: "REVIEW_REQUIRED" | "GENERATION_FAILED";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "ANSWERED" | "SUMMARIZED" | "QUIZ_CREATED" | "NEEDS_CLARIFICATION" | "NO_EVIDENCE";
  capability?: AssistantCapability;
  citations?: PersonalCitation[];
  quizDraft?: QuizDraftSummary;
  missingFields?: string[];
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  selectedDocumentIds: string[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  selectedDocumentIds: string[];
  title?: string;
}

export interface SendMessageRequest {
  message: string;
}
