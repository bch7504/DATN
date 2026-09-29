import { CourseOfferingStatus, EnrollmentStatus } from "./api";

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface Semester {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "UPCOMING" | "CLOSED";
  offeringCreationEnabled: boolean;
}

export interface CourseOffering {
  id: string;
  code: string;
  name: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  semesterId: string;
  semesterName: string;
  teacherId: string;
  teacherName: string;
  joinCode: string;
  joinCodeEnabled: boolean;
  status: CourseOfferingStatus;
  enrolledCount: number;
  pendingCount: number;
  materialsCount?: number;
  createdAt: string;
}

export interface CourseEnrollment {
  id: string;
  offeringId: string;
  offeringCode: string;
  offeringName: string;
  subjectName?: string;
  semesterName?: string;
  teacherName?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: EnrollmentStatus;
  requestedAt: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export interface JoinOfferingRequest {
  joinCode: string;
}

export interface CreateOfferingRequest {
  subjectId: string;
  semesterId: string;
  code?: string;
  name?: string;
}
