import { getApiUrl, isDemoMode } from "./env";
import {
  DEMO_USERS,
  findDemoUser,
  DEMO_SUBJECTS,
  DEMO_SEMESTERS,
  demoOfferings,
  demoEnrollments,
  demoTeacherDocs,
  DEMO_SLIDES_AI,
  demoSlideNotes,
  demoPersonalDocs,
  demoConversations,
} from "./demo-data";
import { User, LoginRequest, RegisterRequest } from "@/types/auth";
import { ApiErrorEnvelope, PaginatedList } from "@/types/api";
import {
  Subject,
  Semester,
  CourseOffering,
  CourseEnrollment,
  CreateOfferingRequest,
} from "@/types/course-offering";
import {
  TeacherDocument,
  Slide,
  SlideTutorResponse,
  PersonalDocument,
} from "@/types/material";
import {
  ChatConversation,
  ChatMessage,
  CreateConversationRequest,
  SendMessageRequest,
} from "@/types/chat";

/**
 * Standard typed API client error encapsulating the Java backend error envelope.
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly traceId?: string;

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.message || `Lỗi API mã ${status}`);
    this.name = "ApiClientError";
    this.code = envelope.code || "UNKNOWN_ERROR";
    this.status = status;
    this.details = envelope.details;
    this.traceId = envelope.traceId;
  }
}

// In-memory demo session storage for offline/demo mode testing
let currentDemoUser: User = DEMO_USERS.STUDENT;

/**
 * Generic HTTP request helper calling Java backend at /api/v1 with HttpOnly cookie credentials.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Required for HttpOnly session cookie
  });

  if (!response.ok) {
    let errorEnvelope: ApiErrorEnvelope = {
      code: "HTTP_ERROR",
      message: `Yêu cầu thất bại với mã trạng thái ${response.status}`,
    };

    try {
      const parsed = await response.json();
      if (parsed && typeof parsed === "object") {
        errorEnvelope = {
          code: parsed.code || "HTTP_ERROR",
          message: parsed.message || errorEnvelope.message,
          details: parsed.details,
          traceId: parsed.traceId,
        };
      }
    } catch {
      // Body is not JSON
    }

    throw new ApiClientError(response.status, errorEnvelope);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return null as T;
  }

  return response.json();
}

/**
 * Auth API client implementations
 */
export const authApi = {
  async login(credentials: LoginRequest): Promise<User> {
    try {
      await apiFetch<void>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      return await this.getMe();
    } catch (err) {
      if (isDemoMode()) {
        console.info(
          "[Demo Mode] Đăng nhập tài khoản giả lập do backend không phản hồi hoặc đang ở chế độ demo."
        );
        const demoUser = findDemoUser(credentials.identifier);
        if (demoUser) {
          currentDemoUser = demoUser;
          return demoUser;
        }
      }
      throw err;
    }
  },

  async register(data: RegisterRequest): Promise<void> {
    try {
      await apiFetch<void>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (err) {
      if (isDemoMode()) {
        console.info("[Demo Mode] Giả lập đăng ký thành công cho:", data.email);
        return;
      }
      throw err;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<void>("/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      if (!isDemoMode()) {
        console.warn("Logout error:", err);
      }
    }
  },

  async getMe(): Promise<User> {
    try {
      return await apiFetch<User>("/me", {
        method: "GET",
      });
    } catch (err) {
      if (isDemoMode()) {
        return currentDemoUser;
      }
      throw err;
    }
  },

  setDemoUser(user: User): void {
    currentDemoUser = user;
  },
};

/**
 * Shared Catalog API (docs/api-plan.md Section 3)
 */
export const catalogApi = {
  async getSubjects(): Promise<Subject[]> {
    try {
      const res = await apiFetch<PaginatedList<Subject>>("/catalog/subjects?status=ACTIVE");
      return res.items;
    } catch (err) {
      if (isDemoMode()) return DEMO_SUBJECTS;
      throw err;
    }
  },

  async getSemesters(): Promise<Semester[]> {
    try {
      const res = await apiFetch<PaginatedList<Semester>>("/catalog/semesters");
      return res.items;
    } catch (err) {
      if (isDemoMode()) return DEMO_SEMESTERS;
      throw err;
    }
  },
};

/**
 * Student Course Offering & Enrollment API (docs/api-plan.md Section 4.1)
 */
export const studentApi = {
  async joinCourse(joinCode: string): Promise<CourseEnrollment> {
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      throw new ApiClientError(422, {
        code: "INVALID_JOIN_CODE",
        message: "Mã tham gia lớp không được để trống.",
      });
    }

    try {
      return await apiFetch<CourseEnrollment>("/student/course-enrollments/join", {
        method: "POST",
        body: JSON.stringify({ joinCode: cleanCode }),
      });
    } catch (err) {
      if (isDemoMode()) {
        const offering = demoOfferings.find(
          (o) => o.joinCode.toUpperCase() === cleanCode
        );
        if (!offering) {
          throw new ApiClientError(404, {
            code: "JOIN_CODE_NOT_FOUND",
            message: "Không tìm thấy Lớp học phần với mã tham gia này.",
          });
        }
        if (!offering.joinCodeEnabled || offering.status !== "ACTIVE") {
          throw new ApiClientError(409, {
            code: "JOIN_DISABLED",
            message: "Mã tham gia lớp này đã bị vô hiệu hóa hoặc lớp đã khóa.",
          });
        }
        const existing = demoEnrollments.find(
          (e) =>
            e.offeringId === offering.id &&
            e.studentId === currentDemoUser.id
        );
        if (existing) {
          if (existing.status === "APPROVED") {
            throw new ApiClientError(409, {
              code: "ENROLLMENT_ALREADY_APPROVED",
              message: "Bạn đã được duyệt vào lớp học phần này từ trước.",
            });
          }
          return existing;
        }

        const newEnrollment: CourseEnrollment = {
          id: `enr_${Date.now()}`,
          offeringId: offering.id,
          offeringCode: offering.code,
          offeringName: offering.name,
          subjectName: offering.subjectName,
          semesterName: offering.semesterName,
          teacherName: offering.teacherName,
          studentId: currentDemoUser.id,
          studentName: currentDemoUser.displayName,
          studentEmail: currentDemoUser.email,
          status: "PENDING",
          requestedAt: new Date().toISOString(),
        };
        demoEnrollments.unshift(newEnrollment);
        offering.pendingCount += 1;
        return newEnrollment;
      }
      throw err;
    }
  },

  async getEnrollments(): Promise<CourseEnrollment[]> {
    try {
      const res = await apiFetch<PaginatedList<CourseEnrollment>>(
        "/student/course-enrollments"
      );
      return res.items;
    } catch (err) {
      if (isDemoMode()) {
        return demoEnrollments.filter((e) => e.studentId === currentDemoUser.id);
      }
      throw err;
    }
  },

  async getOfferings(): Promise<CourseOffering[]> {
    try {
      const res = await apiFetch<PaginatedList<CourseOffering>>(
        "/student/course-offerings"
      );
      return res.items;
    } catch (err) {
      if (isDemoMode()) {
        const approvedOfferingIds = demoEnrollments
          .filter(
            (e) => e.studentId === currentDemoUser.id && e.status === "APPROVED"
          )
          .map((e) => e.offeringId);
        return demoOfferings.filter((o) => approvedOfferingIds.includes(o.id));
      }
      throw err;
    }
  },

  async getOfferingDetail(offeringId: string): Promise<CourseOffering> {
    try {
      return await apiFetch<CourseOffering>(
        `/student/course-offerings/${offeringId}`
      );
    } catch (err) {
      if (isDemoMode()) {
        const found = demoOfferings.find((o) => o.id === offeringId);
        if (!found) {
          throw new ApiClientError(404, {
            code: "COURSE_NOT_FOUND",
            message: "Không tìm thấy Lớp học phần.",
          });
        }
        return found;
      }
      throw err;
    }
  },
};

/**
 * Student Materials, Slide Viewer, Notes, and Tutor API (docs/api-plan.md Section 4.2 & 4.3)
 */
export const materialApi = {
  async getMaterials(offeringId?: string): Promise<TeacherDocument[]> {
    try {
      const endpoint = offeringId
        ? `/student/course-offerings/${offeringId}/materials`
        : "/student/materials";
      const res = await apiFetch<PaginatedList<TeacherDocument>>(endpoint);
      return res.items;
    } catch (err) {
      if (isDemoMode()) {
        let docs = demoTeacherDocs;
        if (offeringId) {
          docs = docs.filter((d) =>
            d.publishedOfferings.some((p) => p.offeringId === offeringId)
          );
        }
        // Per spec: PPTX before PDF
        return [...docs].sort((a, b) => {
          if (a.fileType === "PPTX" && b.fileType === "PDF") return -1;
          if (a.fileType === "PDF" && b.fileType === "PPTX") return 1;
          return 0;
        });
      }
      throw err;
    }
  },

  async getDocument(documentId: string): Promise<TeacherDocument> {
    if (isDemoMode()) {
      const doc = demoTeacherDocs.find((d) => d.id === documentId);
      if (!doc) {
        throw new ApiClientError(404, {
          code: "DOCUMENT_NOT_FOUND",
          message: "Không tìm thấy tài liệu bài giảng.",
        });
      }
      return doc;
    }
    return apiFetch<TeacherDocument>(`/student/materials/${documentId}`);
  },

  async getSlides(documentId: string): Promise<Slide[]> {
    try {
      const res = await apiFetch<Slide[]>(`/student/materials/${documentId}/slides`);
      return res;
    } catch (err) {
      if (isDemoMode()) {
        return DEMO_SLIDES_AI.map((s) => ({
          ...s,
          hasNote: !!demoSlideNotes[`${documentId}:${s.slideNumber}`],
        }));
      }
      throw err;
    }
  },

  async getSlideNote(documentId: string, slideNumber: number): Promise<string> {
    try {
      const res = await apiFetch<{ content: string }>(
        `/student/materials/${documentId}/slides/${slideNumber}/note`
      );
      return res.content;
    } catch (err) {
      if (isDemoMode()) {
        return demoSlideNotes[`${documentId}:${slideNumber}`] || "";
      }
      throw err;
    }
  },

  async saveSlideNote(
    documentId: string,
    slideNumber: number,
    content: string
  ): Promise<void> {
    try {
      await apiFetch<void>(
        `/student/materials/${documentId}/slides/${slideNumber}/note`,
        {
          method: "PUT",
          body: JSON.stringify({ content }),
        }
      );
    } catch (err) {
      if (isDemoMode()) {
        demoSlideNotes[`${documentId}:${slideNumber}`] = content;
        return;
      }
      throw err;
    }
  },

  async askSlideTutor(
    documentId: string,
    slideNumber: number,
    question: string
  ): Promise<SlideTutorResponse> {
    try {
      return await apiFetch<SlideTutorResponse>(
        `/student/materials/${documentId}/slides/${slideNumber}/tutor`,
        {
          method: "POST",
          body: JSON.stringify({ question }),
        }
      );
    } catch (err) {
      if (isDemoMode()) {
        const slide = DEMO_SLIDES_AI.find((s) => s.slideNumber === slideNumber);
        const cleanQ = question.toLowerCase();

        // Off-topic or question lacking evidence in current slide
        if (
          cleanQ.includes("thời tiết") ||
          cleanQ.includes("bóng đá") ||
          cleanQ.includes("chính trị") ||
          cleanQ.includes("tổng thống")
        ) {
          return {
            status: "NO_EVIDENCE",
            answer: null,
            citations: [],
            traceId: `req_demo_${Date.now()}`,
          };
        }

        // Slide-grounded answer based on current slide content
        const excerpt = slide ? slide.bullets[0] : "Nội dung slide bài giảng.";
        return {
          status: "ANSWERED",
          answer: `Dựa trên nội dung của Slide ${slideNumber} (${slide?.title || ""}): ${
            slide?.bullets.join(" ") || "Khái niệm chính được trình bày trên slide."
          }`,
          citations: [
            {
              documentId,
              documentName: "Bài giảng AI - Chương 1",
              slideNumber,
              excerpt,
            },
          ],
          traceId: `req_demo_${Date.now()}`,
        };
      }
      throw err;
    }
  },

  async recordSlideView(
    documentId: string,
    slideNumber: number
  ): Promise<void> {
    try {
      await apiFetch<void>(
        `/student/materials/${documentId}/slides/${slideNumber}/view-events`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": `view:${documentId}:${slideNumber}:${Date.now()}`,
          },
        }
      );
    } catch (err) {
      // Ignore in demo mode
    }
  },
};

/**
 * Student Personal Documents API (docs/api-plan.md Section 4.4)
 */
export const personalDocApi = {
  async getDocuments(): Promise<PersonalDocument[]> {
    try {
      const res = await apiFetch<PaginatedList<PersonalDocument>>(
        "/personal-documents"
      );
      return res.items;
    } catch (err) {
      if (isDemoMode()) return demoPersonalDocs;
      throw err;
    }
  },

  async uploadDocument(file: File): Promise<PersonalDocument> {
    // Policy check: only PDF
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      throw new ApiClientError(415, {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Chỉ chấp nhận tệp định dạng PDF có lớp văn bản (text layer). Không nhận DOCX/PPTX trong MVP.",
      });
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new ApiClientError(413, {
        code: "FILE_TOO_LARGE",
        message: "Kích thước tệp vượt quá giới hạn cho phép (tối đa 20 MB).",
      });
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      return await apiFetch<PersonalDocument>("/personal-documents", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      if (isDemoMode()) {
        const newDoc: PersonalDocument = {
          id: `pdoc_${Date.now()}`,
          title: file.name.replace(/\.pdf$/i, ""),
          fileName: file.name,
          fileSize: file.size,
          pageCount: Math.floor(6 + Math.random() * 15),
          status: "READY",
          sha256: `sha256_${Date.now()}_mock`,
          uploadedAt: new Date().toISOString(),
        };
        demoPersonalDocs.unshift(newDoc);
        return newDoc;
      }
      throw err;
    }
  },

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await apiFetch<void>(`/personal-documents/${documentId}`, {
        method: "DELETE",
      });
    } catch (err) {
      if (isDemoMode()) {
        const idx = demoPersonalDocs.findIndex((d) => d.id === documentId);
        if (idx !== -1) demoPersonalDocs.splice(idx, 1);
        return;
      }
      throw err;
    }
  },
};

/**
 * Teacher Course Offering & Enrollment Management API (docs/api-plan.md Section 5)
 */
export const teacherApi = {
  async getOfferings(): Promise<CourseOffering[]> {
    try {
      const res = await apiFetch<PaginatedList<CourseOffering>>(
        "/teacher/course-offerings"
      );
      return res.items;
    } catch (err) {
      if (isDemoMode()) {
        return demoOfferings.filter((o) => o.teacherId === currentDemoUser.id);
      }
      throw err;
    }
  },

  async createOffering(data: CreateOfferingRequest): Promise<CourseOffering> {
    try {
      return await apiFetch<CourseOffering>("/teacher/course-offerings", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (err) {
      if (isDemoMode()) {
        const subject = DEMO_SUBJECTS.find((s) => s.id === data.subjectId);
        const semester = DEMO_SEMESTERS.find((s) => s.id === data.semesterId);
        if (!subject || !semester) {
          throw new ApiClientError(422, {
            code: "INVALID_SUBJECT_OR_SEMESTER",
            message: "Môn học hoặc Học kỳ không hợp lệ.",
          });
        }
        const randomCode = `${subject.code.slice(0, 3)}-${Math.floor(10 + Math.random() * 90)}`;
        const joinCode = `${subject.code.slice(0, 3)}2026${Math.floor(100 + Math.random() * 900)}`;

        const newOffering: CourseOffering = {
          id: `offering_${Date.now()}`,
          code: data.code || randomCode,
          name: data.name || subject.name,
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          semesterId: semester.id,
          semesterName: semester.name,
          teacherId: currentDemoUser.id,
          teacherName: currentDemoUser.displayName,
          joinCode,
          joinCodeEnabled: true,
          status: "ACTIVE",
          enrolledCount: 0,
          pendingCount: 0,
          materialsCount: 0,
          createdAt: new Date().toISOString(),
        };
        demoOfferings.unshift(newOffering);
        return newOffering;
      }
      throw err;
    }
  },

  async regenerateJoinCode(offeringId: string): Promise<string> {
    try {
      const res = await apiFetch<{ joinCode: string }>(
        `/teacher/course-offerings/${offeringId}/join-code/regenerate`,
        { method: "POST" }
      );
      return res.joinCode;
    } catch (err) {
      if (isDemoMode()) {
        const offering = demoOfferings.find((o) => o.id === offeringId);
        if (offering) {
          offering.joinCode = `REGEN${Math.floor(1000 + Math.random() * 9000)}`;
          return offering.joinCode;
        }
      }
      throw err;
    }
  },

  async toggleJoinCode(offeringId: string, enabled: boolean): Promise<void> {
    try {
      await apiFetch<void>(
        `/teacher/course-offerings/${offeringId}/join-code`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled }),
        }
      );
    } catch (err) {
      if (isDemoMode()) {
        const offering = demoOfferings.find((o) => o.id === offeringId);
        if (offering) offering.joinCodeEnabled = enabled;
        return;
      }
      throw err;
    }
  },

  async archiveOffering(offeringId: string): Promise<void> {
    try {
      await apiFetch<void>(
        `/teacher/course-offerings/${offeringId}/archive`,
        { method: "POST" }
      );
    } catch (err) {
      if (isDemoMode()) {
        const offering = demoOfferings.find((o) => o.id === offeringId);
        if (offering) offering.status = "ARCHIVED";
        return;
      }
      throw err;
    }
  },

  async getEnrollments(offeringId?: string): Promise<CourseEnrollment[]> {
    try {
      const endpoint = offeringId
        ? `/teacher/course-offerings/${offeringId}/enrollments`
        : "/teacher/enrollments";
      const res = await apiFetch<PaginatedList<CourseEnrollment>>(endpoint);
      return res.items;
    } catch (err) {
      if (isDemoMode()) {
        if (offeringId) {
          return demoEnrollments.filter((e) => e.offeringId === offeringId);
        }
        return demoEnrollments;
      }
      throw err;
    }
  },

  async approveEnrollment(enrollmentId: string): Promise<void> {
    try {
      await apiFetch<void>(
        `/teacher/enrollments/${enrollmentId}/approve`,
        { method: "POST" }
      );
    } catch (err) {
      if (isDemoMode()) {
        const enr = demoEnrollments.find((e) => e.id === enrollmentId);
        if (enr) {
          enr.status = "APPROVED";
          enr.approvedAt = new Date().toISOString();
          const offering = demoOfferings.find((o) => o.id === enr.offeringId);
          if (offering) {
            offering.enrolledCount += 1;
            offering.pendingCount = Math.max(0, offering.pendingCount - 1);
          }
        }
        return;
      }
      throw err;
    }
  },

  async rejectEnrollment(enrollmentId: string, reason?: string): Promise<void> {
    try {
      await apiFetch<void>(
        `/teacher/enrollments/${enrollmentId}/reject`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        }
      );
    } catch (err) {
      if (isDemoMode()) {
        const enr = demoEnrollments.find((e) => e.id === enrollmentId);
        if (enr) {
          enr.status = "REJECTED";
          enr.rejectedReason = reason || "Không thuộc danh sách lớp";
          const offering = demoOfferings.find((o) => o.id === enr.offeringId);
          if (offering) {
            offering.pendingCount = Math.max(0, offering.pendingCount - 1);
          }
        }
        return;
      }
      throw err;
    }
  },

  // Teacher Documents & Publications (docs/api-plan.md Section 5.3)
  async getDocuments(): Promise<TeacherDocument[]> {
    try {
      const res = await apiFetch<PaginatedList<TeacherDocument>>("/teacher/documents");
      return res.items;
    } catch (err) {
      if (isDemoMode()) return demoTeacherDocs;
      throw err;
    }
  },

  async uploadDocument(
    file: File,
    title: string
  ): Promise<TeacherDocument> {
    const isPptx = file.name.toLowerCase().endsWith(".pptx");
    const isPdf = file.name.toLowerCase().endsWith(".pdf");

    if (!isPptx && !isPdf) {
      throw new ApiClientError(415, {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Giảng viên chỉ tải lên tệp PDF hoặc PPTX. Không hỗ trợ DOCX trong MVP.",
      });
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      return await apiFetch<TeacherDocument>("/teacher/documents", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      if (isDemoMode()) {
        const newDoc: TeacherDocument = {
          id: `doc_${Date.now()}`,
          title: title || file.name,
          fileName: file.name,
          fileType: isPptx ? "PPTX" : "PDF",
          fileSize: file.size,
          status: "READY",
          totalSlides: isPptx ? 8 : undefined,
          totalPages: isPdf ? 10 : undefined,
          downloadUrl: isPdf ? `/api/v1/student/materials/doc_${Date.now()}/download` : undefined,
          publishedOfferings: [],
          createdAt: new Date().toISOString(),
        };
        demoTeacherDocs.unshift(newDoc);
        return newDoc;
      }
      throw err;
    }
  },

  async publishDocument(
    documentId: string,
    courseOfferingIds: string[]
  ): Promise<void> {
    try {
      await apiFetch<void>(`/teacher/documents/${documentId}/publications`, {
        method: "POST",
        body: JSON.stringify({ courseOfferingIds }),
      });
    } catch (err) {
      if (isDemoMode()) {
        const doc = demoTeacherDocs.find((d) => d.id === documentId);
        if (doc) {
          for (const offId of courseOfferingIds) {
            const offering = demoOfferings.find((o) => o.id === offId);
            if (
              offering &&
              !doc.publishedOfferings.some((p) => p.offeringId === offId)
            ) {
              doc.publishedOfferings.push({
                offeringId: offering.id,
                offeringCode: offering.code,
                offeringName: offering.name,
                publishedAt: new Date().toISOString(),
              });
            }
          }
        }
        return;
      }
      throw err;
    }
  },

  async revokePublication(
    documentId: string,
    offeringId: string
  ): Promise<void> {
    try {
      await apiFetch<void>(
        `/teacher/documents/${documentId}/publications?offeringId=${offeringId}`,
        { method: "DELETE" }
      );
    } catch (err) {
      if (isDemoMode()) {
        const doc = demoTeacherDocs.find((d) => d.id === documentId);
        if (doc) {
          doc.publishedOfferings = doc.publishedOfferings.filter(
            (p) => p.offeringId !== offeringId
          );
        }
        return;
      }
      throw err;
    }
  },
};

/**
 * Admin Course Offering Monitoring API (docs/api-plan.md Section 6)
 */
export const adminApi = {
  async getCourseOfferings(): Promise<CourseOffering[]> {
    try {
      const res = await apiFetch<PaginatedList<CourseOffering>>(
        "/admin/course-offerings"
      );
      return res.items;
    } catch (err) {
      if (isDemoMode()) return demoOfferings;
      throw err;
    }
  },

  async lockOffering(offeringId: string): Promise<void> {
    try {
      await apiFetch<void>(`/admin/course-offerings/${offeringId}/lock`, {
        method: "POST",
      });
    } catch (err) {
      if (isDemoMode()) {
        const offering = demoOfferings.find((o) => o.id === offeringId);
        if (offering) offering.status = "LOCKED";
        return;
      }
      throw err;
    }
  },

  async archiveOffering(offeringId: string): Promise<void> {
    try {
      await apiFetch<void>(`/admin/course-offerings/${offeringId}/archive`, {
        method: "POST",
      });
    } catch (err) {
      if (isDemoMode()) {
        const offering = demoOfferings.find((o) => o.id === offeringId);
        if (offering) offering.status = "ARCHIVED";
        return;
      }
      throw err;
    }
  },
};

export const teacherDocApi = teacherApi;
 
/**
 * Personal RAG Chat API (docs/api-plan.md Section 4.5)
 */
export const chatApi = {
  async getConversations(): Promise<ChatConversation[]> {
    try {
      const res = await apiFetch<PaginatedList<ChatConversation>>("/student/chat/conversations");
      return res.items;
    } catch (err) {
      if (isDemoMode()) return [...demoConversations];
      throw err;
    }
  },

  async getConversation(id: string): Promise<ChatConversation> {
    try {
      return await apiFetch<ChatConversation>(`/student/chat/conversations/${id}`);
    } catch (err) {
      if (isDemoMode()) {
        const conv = demoConversations.find((c) => c.id === id);
        if (!conv) {
          throw new ApiClientError(404, {
            code: "CONVERSATION_NOT_FOUND",
            message: "Không tìm thấy phiên trò chuyện yêu cầu.",
          });
        }
        return conv;
      }
      throw err;
    }
  },

  async createConversation(req: CreateConversationRequest): Promise<ChatConversation> {
    if (!req.selectedDocumentIds || req.selectedDocumentIds.length === 0) {
      throw new ApiClientError(422, {
        code: "INVALID_DOCUMENT_SELECTION",
        message: "Phải chọn ít nhất 1 tài liệu nguồn (tối đa 10 tài liệu).",
      });
    }
    if (req.selectedDocumentIds.length > 10) {
      throw new ApiClientError(422, {
        code: "TOO_MANY_DOCUMENTS",
        message: "Chỉ được chọn tối đa 10 tài liệu làm nguồn đối chiếu.",
      });
    }

    try {
      return await apiFetch<ChatConversation>("/student/chat/conversations", {
        method: "POST",
        body: JSON.stringify(req),
      });
    } catch (err) {
      if (isDemoMode()) {
        const newConv: ChatConversation = {
          id: `conv_${Date.now()}`,
          title: req.title || "Phiên thảo luận mới",
          selectedDocumentIds: [...req.selectedDocumentIds],
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        demoConversations.unshift(newConv);
        return newConv;
      }
      throw err;
    }
  },

  async sendMessage(conversationId: string, req: SendMessageRequest): Promise<ChatMessage> {
    const text = req.message?.trim();
    if (!text || text.length === 0) {
      throw new ApiClientError(422, {
        code: "EMPTY_MESSAGE",
        message: "Nội dung câu hỏi không được để trống.",
      });
    }
    if (text.length > 2000) {
      throw new ApiClientError(422, {
        code: "MESSAGE_TOO_LONG",
        message: "Nội dung câu hỏi vượt quá giới hạn cho phép (tối đa 2000 ký tự).",
      });
    }

    try {
      return await apiFetch<ChatMessage>(`/student/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify(req),
      });
    } catch (err) {
      if (isDemoMode()) {
        const conv = demoConversations.find((c) => c.id === conversationId);
        if (!conv) {
          throw new ApiClientError(404, {
            code: "CONVERSATION_NOT_FOUND",
            message: "Không tìm thấy phiên trò chuyện.",
          });
        }

        const userMsg: ChatMessage = {
          id: `msg_u_${Date.now()}`,
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
        };
        conv.messages.push(userMsg);

        const lowerQuery = text.toLowerCase();
        const isOffTopic =
          lowerQuery.includes("thời tiết") ||
          lowerQuery.includes("chứng khoán") ||
          lowerQuery.includes("nấu ăn") ||
          lowerQuery.includes("bóng đá") ||
          lowerQuery.includes("bitcoin");

        let assistantMsg: ChatMessage;

        if (isOffTopic) {
          assistantMsg = {
            id: `msg_a_${Date.now()}`,
            role: "assistant",
            content:
              "Không tìm thấy bằng chứng phù hợp trong các tài liệu đã chọn để trả lời câu hỏi này (NO_EVIDENCE). Vui lòng đặt câu hỏi liên quan đến nội dung tài liệu.",
            status: "NO_EVIDENCE",
            citations: [],
            createdAt: new Date().toISOString(),
          };
        } else {
          const matchingDoc =
            demoPersonalDocs.find((d) => conv.selectedDocumentIds.includes(d.id)) ||
            demoPersonalDocs[0];

          assistantMsg = {
            id: `msg_a_${Date.now()}`,
            role: "assistant",
            content: `Dựa trên tài liệu '${matchingDoc?.title || "Tài liệu cá nhân"}' (Trang 3):\n\nCâu trả lời chi tiết cho câu hỏi "${text}":\nNội dung đã được đối chiếu chính xác với các định nghĩa và nguyên lý trong tài liệu. Mọi thông tin phản hồi đều được neo chắc chắn (grounding) vào tài liệu nguồn bạn đã cung cấp.`,
            status: "ANSWERED",
            citations: [
              {
                documentId: matchingDoc?.id || "pdoc_01",
                documentName: matchingDoc?.title || "Ghi chú ôn tập Cơ sở dữ liệu.pdf",
                pageNumber: 3,
                excerpt: `Trích đoạn đối chiếu từ ${matchingDoc?.title || "tài liệu"}: "Định nghĩa và các nguyên tắc cốt lõi áp dụng trực tiếp cho vấn đề được nêu trong câu hỏi."`,
                sha256:
                  matchingDoc?.sha256 ||
                  "a3b91c89f4e2d8109867cbaef19034871239abcef19034871239abcef1903487",
              },
            ],
            createdAt: new Date().toISOString(),
          };
        }

        conv.messages.push(assistantMsg);
        conv.updatedAt = new Date().toISOString();
        if (conv.title === "Phiên thảo luận mới" || !conv.title) {
          conv.title = text.length > 30 ? text.substring(0, 30) + "..." : text;
        }

        return assistantMsg;
      }
      throw err;
    }
  },

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await apiFetch<void>(`/student/chat/conversations/${conversationId}`, {
        method: "DELETE",
      });
    } catch (err) {
      if (isDemoMode()) {
        const idx = demoConversations.findIndex((c) => c.id === conversationId);
        if (idx !== -1) {
          demoConversations.splice(idx, 1);
        }
        return;
      }
      throw err;
    }
  },
};

