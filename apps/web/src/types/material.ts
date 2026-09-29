import { DocumentStatus } from "./api";

export type DocumentType = "PPTX" | "PDF";

export interface TeacherDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: DocumentType;
  fileSize: number; // in bytes
  status: DocumentStatus;
  totalSlides?: number; // for PPTX
  totalPages?: number; // for PDF
  downloadUrl?: string; // only for PDF
  publishedOfferings: {
    offeringId: string;
    offeringCode: string;
    offeringName: string;
    publishedAt: string;
  }[];
  createdAt: string;
}

export interface Slide {
  slideNumber: number;
  title: string;
  bullets: string[];
  notes?: string;
  isViewed?: boolean;
  hasNote?: boolean;
}

export interface SlideNote {
  documentId: string;
  slideNumber: number;
  content: string;
  updatedAt: string;
}

export interface SlideCitation {
  documentId: string;
  documentName?: string;
  slideNumber: number;
  excerpt: string;
}

export interface SlideTutorResponse {
  status: "ANSWERED" | "NO_EVIDENCE";
  answer: string | null;
  citations: SlideCitation[];
  traceId?: string;
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
