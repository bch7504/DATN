/**
 * Standard API error envelope returned by Java backend on 4xx/5xx responses.
 * As defined in docs/api-plan.md Section 1.
 */
export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

/**
 * Standard paginated list response wrapper from Java backend.
 */
export interface PaginatedList<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

/**
 * System processing and entity lifecycle statuses.
 */
export type DocumentStatus =
  | "UPLOADING"
  | "PENDING_PROCESSING"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "DELETING";

export type EnrollmentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REMOVED";

export type CourseOfferingStatus =
  | "ACTIVE"
  | "ARCHIVED"
  | "LOCKED";

export type QuizStatus =
  | "GENERATING"
  | "REVIEW_REQUIRED"
  | "READY"
  | "ARCHIVED";
