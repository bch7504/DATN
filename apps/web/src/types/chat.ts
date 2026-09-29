/**
 * Personal RAG Citation contract per docs/api-plan.md Section 4.5
 */
export interface PersonalCitation {
  documentId: string;
  documentName: string;
  pageNumber: number;
  excerpt: string;
  sha256?: string;
}

/**
 * Message in a Personal RAG conversation
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "ANSWERED" | "NO_EVIDENCE";
  citations?: PersonalCitation[];
  createdAt: string;
}

/**
 * Personal RAG Conversation session
 */
export interface ChatConversation {
  id: string;
  title: string;
  selectedDocumentIds: string[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  selectedDocumentIds: string[]; // 1 to 10 unique IDs
  title?: string;
}

export interface SendMessageRequest {
  message: string; // 1 to 2000 chars, untrusted input
}
