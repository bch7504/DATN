/** Java-owned approval lifecycle; a PENDING proposal has no active class or join code. */
export interface OpeningRequest {
  id: string; teacherId: string; teacherName: string; subjectCode: string; subjectName: string;
  credits: number; semesterId: string; semesterName: string; code: string; name: string;
  status: "PENDING" | "APPROVED" | "REJECTED"; courseOfferingId: string | null;
  decisionReason: string | null; createdAt: string; decidedAt: string | null;
}
export interface SubmitOpeningRequest {
  subjectCode: string; subjectName: string; credits: number; semesterId: string; code: string; name?: string;
}
export interface ApproveOpeningRequest { subjectId?: string; subjectCode?: string; subjectName?: string; credits?: number; }
