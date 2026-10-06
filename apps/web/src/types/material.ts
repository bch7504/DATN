import { DocumentStatus } from "./api";

export type DocumentType = "PDF";

export interface TeacherDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: DocumentType;
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
  updatedAt: string;
}

export interface PageCitation {
  documentId: string;
  documentName?: string;
  pageNumber: number;
  excerpt: string;
}

export interface CourseMaterialTutorResponse {
  status: "ANSWERED" | "NO_EVIDENCE";
  answer: string | null;
  citations: PageCitation[];
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
