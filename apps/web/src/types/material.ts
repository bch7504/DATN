import { DocumentStatus } from "./api";

export type DocumentType = "PDF";
export type CourseMaterialType = "SLIDE_PDF" | "REFERENCE_PDF";

export interface TeacherDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: DocumentType;
  materialType: CourseMaterialType;
  fileSize: number;
  status: DocumentStatus;
  totalPages: number;
  downloadUrl?: string;
  publishedOfferings: {
    offeringId: string;
    offeringCode: string;
    offeringName: string;
    publishedAt: string;
  }[];
  createdAt: string;
}

export interface MaterialPage {
  pageNumber: number;
  title: string;
  bullets: string[];
  notes?: string;
  isViewed?: boolean;
  hasNote?: boolean;
}

export interface PageNote {
  documentId: string;
  pageNumber: number;
  content: string;
  updatedAt: string | null;
}

export interface SlideTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SlideTextLayer {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  items: SlideTextItem[];
}

export interface PageCitation {
  documentId: string;
  documentName?: string;
  pageNumber: number;
  excerpt: string;
}

export interface CourseMaterialTutorResponse {
  conversationId: string | null;
  status: "ANSWERED" | "NO_EVIDENCE";
  answer: string | null;
  citations: PageCitation[];
  traceId?: string;
}

export interface CourseMaterialTutorMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  pageNumber: number;
  content: string;
  status: "ANSWERED" | "NO_EVIDENCE" | null;
  citations: PageCitation[];
  createdAt: string;
}

export interface CourseMaterialTutorHistory {
  conversationId: string | null;
  documentId: string;
  documentVersion: number;
  messages: CourseMaterialTutorMessage[];
}

export interface PersonalDocument {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  status: DocumentStatus;
  sha256?: string;
  uploadedAt: string;
  errorReason?: string;
}
