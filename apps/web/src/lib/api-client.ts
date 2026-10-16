import { getApiUrl, isDemoMode } from "./env";
import {
  DEMO_USERS,
  findDemoUser,
  DEMO_SUBJECTS,
  DEMO_SEMESTERS,
  demoOfferings,
  demoEnrollments,
  demoTeacherDocs,
  DEMO_MATERIAL_PAGES,
  demoPageNotes,
  demoPersonalDocs,
  demoConversations,
  demoQuizzes,
  demoQuizAttempts,
  demoReviewItems,
  demoDailyGoalConfig,
  demoDailyGoalProgress,
  demoStudyStreak,
  demoNotifications,
} from "./demo-data";
import {
  User,
  LoginRequest,
  RegisterRequest,
  RegistrationStatusResponse,
  VerifyRegistrationRequest,
  ResendVerificationRequest,
} from "@/types/auth";
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
  MaterialPage,
  CourseMaterialTutorResponse,
  PersonalDocument,
} from "@/types/material";
import {
  ChatConversation,
  ChatMessage,
  CreateConversationRequest,
  SendMessageRequest,
} from "@/types/chat";
import {
  Quiz,
  QuizDraft,
  QuizAttempt,
  CreateQuizDraftRequest,
  AcceptQuizRequest,
  SubmitQuizAttemptRequest,
} from "@/types/quiz";
import {
  CourseReviewSummary,
  CourseReviewWorkspace,
  DailyGoalProgress,
  DailyGoalConfig,
  StudyStreak,
} from "@/types/review";
import { StudentNotification } from "@/types/notification";

/**
 * Standard typed API client error encapsulating the Java backend error envelope.
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly traceId?: string;

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.message || `Lá»—i API mÃ£ ${status}`);
    this.name = "ApiClientError";
    this.code = envelope.code || "UNKNOWN_ERROR";
    this.status = status;
    this.details = envelope.details;
    this.traceId = envelope.traceId;
  }
}

type BackendTeacherCourseOffering = {
  id: string;
  code: string;
  name: string;
  subjectId: string;
  subjectCode?: string;
  subjectName?: string;
  semesterId: string;
  semesterName?: string;
  teacherId: string;
  teacherName?: string;
  status: CourseOffering["status"];
  rawJoinCode?: string | null;
  joinCode?: string;
  joinCodeHint?: string;
  joinCodeActive?: boolean;
  joinCodeEnabled?: boolean;
  enrolledCount?: number;
  pendingCount?: number;
  materialsCount?: number;
  createdAt: string;
};

function mapTeacherCourseOffering(
  offering: BackendTeacherCourseOffering
): CourseOffering {
  return {
    id: offering.id,
    code: offering.code,
    name: offering.name,
    subjectId: offering.subjectId,
    subjectCode: offering.subjectCode || "",
    subjectName: offering.subjectName || "",
    semesterId: offering.semesterId,
    semesterName: offering.semesterName || "",
    teacherId: offering.teacherId,
    teacherName: offering.teacherName || "",
    joinCode: offering.rawJoinCode || offering.joinCode || "",
    joinCodeHint: offering.joinCodeHint,
    joinCodeEnabled:
      offering.joinCodeActive ?? offering.joinCodeEnabled ?? false,
    status: offering.status,
    enrolledCount: offering.enrolledCount ?? 0,
    pendingCount: offering.pendingCount ?? 0,
    materialsCount: offering.materialsCount ?? 0,
    createdAt: offering.createdAt,
  };
}

function mapEnrollment(item: any): CourseEnrollment {
  return {
    id: item.id,
    offeringId: item.courseOfferingId || item.offeringId || "",
    offeringCode: item.courseOfferingCode || item.offeringCode || "",
    offeringName: item.courseOfferingName || item.offeringName || "",
    subjectName: item.subjectName || "",
    semesterName: item.semesterName || "",
    teacherName: item.teacherName || "",
    studentId: item.studentId || "",
    studentName: item.studentName || "",
    studentEmail: item.studentEmail || "",
    status: item.status,
    requestedAt: item.requestedAt,
    approvedAt: item.approvedAt,
    rejectedReason: item.decisionReason || item.rejectedReason,
  };
}

function mapStudentCourseOffering(item: any): CourseOffering {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    subjectId: item.subjectId,
    subjectCode: item.subjectCode || "",
    subjectName: item.subjectName || "",
    semesterId: item.semesterId,
    semesterName: item.semesterName || "",
    teacherId: item.teacherId || "",
    teacherName: item.teacherName || "",
    joinCode: "",
    joinCodeEnabled: false,
    status: item.status,
    enrolledCount: item.enrolledCount ?? 0,
    pendingCount: 0,
    materialsCount: item.materialsCount ?? 0,
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

// In-memory token storage (persists in session memory without using localStorage)
let inMemoryAccessToken: string | null = null;
if (typeof window !== "undefined") {
  try {
    inMemoryAccessToken = window.sessionStorage?.getItem("sf_access_token") || null;
  } catch {
    // sessionStorage not available
  }
}

function setInMemoryToken(token: string | null): void {
  inMemoryAccessToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        window.sessionStorage?.setItem("sf_access_token", token);
      } else {
        window.sessionStorage?.removeItem("sf_access_token");
      }
    } catch {
      // sessionStorage not available
    }
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
  if (inMemoryAccessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${inMemoryAccessToken}`);
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
 * Args: untrusted JSON from register/resend endpoint. Input: Java OTP timing response.
 * Output: validated pending status with ISO timestamps. Errors: ApiClientError 502 when
 * the server response cannot drive a safe verification/cooldown UI; no side effects.
 */
function parseRegistrationStatus(value: unknown): RegistrationStatusResponse {
  if (value && typeof value === "object") {
    const response = value as Record<string, unknown>;
    if (
      response.status === "VERIFICATION_REQUIRED" &&
      typeof response.expiresAt === "string" &&
      !Number.isNaN(Date.parse(response.expiresAt)) &&
      typeof response.resendAvailableAt === "string" &&
      !Number.isNaN(Date.parse(response.resendAvailableAt))
    ) {
      return {
        status: "VERIFICATION_REQUIRED",
        expiresAt: response.expiresAt,
        resendAvailableAt: response.resendAvailableAt,
      };
    }
  }
  throw new ApiClientError(502, {
    code: "INVALID_REGISTRATION_RESPONSE",
    message: "Máy chủ trả dữ liệu xác minh không hợp lệ. Vui lòng thử lại sau.",
  });
}

/** Auth API client implementations. */
export const authApi = {
  async login(credentials: LoginRequest): Promise<User> {
    try {
      const res = await apiFetch<{
        accessToken?: string;
        token?: string;
        user?: User;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (res?.accessToken) {
        setInMemoryToken(res.accessToken);
      } else if (res?.token) {
        setInMemoryToken(res.token);
      }

      if (res?.user) {
        return res.user;
      }
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

  /**
   * Args: validated Student name, PTIT email and password.
   * Input: public registration form; Java sends an OTP but does not create an account yet.
   * Output: pending registration status and OTP/cooldown timestamps.
   * Errors: API validation, duplicate account, throttling or network errors propagate.
   */
  async register(data: RegisterRequest): Promise<RegistrationStatusResponse> {
    const response = await apiFetch<unknown>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return parseRegistrationStatus(response);
  },

  /**
   * Args: pending email and six-digit verification code.
   * Input: code received by the Student via email; Java validates the challenge.
   * Output: void on HTTP 204; the Student account is created by Java.
   * Errors: invalid, expired, exhausted or reused codes propagate as ApiClientError.
   */
  async verifyRegistration(data: VerifyRegistrationRequest): Promise<void> {
    await apiFetch<void>("/auth/verify-registration", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Args: email of an unverified registration.
   * Input: Student explicitly requests a new code after the server cooldown.
   * Output: replacement OTP expiry and cooldown timestamps.
   * Errors: missing registration, cooldown, duplicate account or network errors propagate.
   */
  async resendVerification(data: ResendVerificationRequest): Promise<RegistrationStatusResponse> {
    const response = await apiFetch<unknown>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return parseRegistrationStatus(response);
  },

  async logout(): Promise<void> {
    setInMemoryToken(null);
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
      const res = await apiFetch<PaginatedList<Subject> | Subject[]>(
        "/catalog/subjects?status=ACTIVE"
      );
      return Array.isArray(res) ? res : res.items;
    } catch (err) {
      if (isDemoMode()) return DEMO_SUBJECTS;
      throw err;
    }
  },

  async getSemesters(): Promise<Semester[]> {
    try {
      const res = await apiFetch<PaginatedList<Semester> | Semester[]>(
        "/catalog/semesters"
      );
      return Array.isArray(res) ? res : res.items;
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
      const res = await apiFetch<any>("/student/course-enrollments/join", {
        method: "POST",
        body: JSON.stringify({ joinCode: cleanCode }),
      });
      return mapEnrollment(res);
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
      const res = await apiFetch<PaginatedList<any> | any[]>(
        "/student/course-enrollments"
      );
      const items = Array.isArray(res) ? res : (res?.items || []);
      return items.map(mapEnrollment);
    } catch (err) {
      if (isDemoMode()) {
        return demoEnrollments.filter((e) => e.studentId === currentDemoUser.id);
      }
      throw err;
    }
  },

  async getOfferings(): Promise<CourseOffering[]> {
    try {
      const res = await apiFetch<PaginatedList<any> | any[]>(
        "/student/course-offerings"
      );
      const items = Array.isArray(res) ? res : (res?.items || []);
      return items.map(mapStudentCourseOffering);
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
      const res = await apiFetch<any>(
        `/student/course-offerings/${offeringId}`
      );
      return mapStudentCourseOffering(res);
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
 * Student Course Material PDF Viewer, Page Notes, and Tutor API.
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
        return [...docs];
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
          message: "KhÃ´ng tÃ¬m tháº¥y tÃ i liá»‡u bÃ i giáº£ng.",
        });
      }
      return doc;
    }
    return apiFetch<TeacherDocument>(`/student/materials/${documentId}`);
  },

  async getPages(documentId: string): Promise<MaterialPage[]> {
    try {
      const res = await apiFetch<MaterialPage[]>(`/student/materials/${documentId}/pages`);
      return res;
    } catch (err) {
      if (isDemoMode()) {
        return DEMO_MATERIAL_PAGES.map((page) => ({
          ...page,
          hasNote: !!demoPageNotes[`${documentId}:${page.pageNumber}`],
        }));
      }
      throw err;
    }
  },

  async getPageNote(documentId: string, pageNumber: number): Promise<string> {
    try {
      const res = await apiFetch<{ content: string }>(
        `/student/materials/${documentId}/pages/${pageNumber}/note`
      );
      return res.content;
    } catch (err) {
      if (isDemoMode()) {
        return demoPageNotes[`${documentId}:${pageNumber}`] || "";
      }
      throw err;
    }
  },

  async savePageNote(
    documentId: string,
    pageNumber: number,
    content: string
  ): Promise<void> {
    try {
      await apiFetch<void>(
        `/student/materials/${documentId}/pages/${pageNumber}/note`,
        {
          method: "PUT",
          body: JSON.stringify({ content }),
        }
      );
    } catch (err) {
      if (isDemoMode()) {
        demoPageNotes[`${documentId}:${pageNumber}`] = content;
        return;
      }
      throw err;
    }
  },

  async askCourseMaterialTutor(
    documentId: string,
    pageNumber: number,
    question: string
  ): Promise<CourseMaterialTutorResponse> {
    try {
      return await apiFetch<CourseMaterialTutorResponse>(
        `/student/materials/${documentId}/pages/${pageNumber}/tutor`,
        {
          method: "POST",
          body: JSON.stringify({ question }),
        }
      );
    } catch (err) {
      if (isDemoMode()) {
        const page = DEMO_MATERIAL_PAGES.find((item) => item.pageNumber === pageNumber);
        const cleanQ = question.toLowerCase();

        // Off-topic or question lacking evidence in the authorized PDF scope
        if (
          cleanQ.includes("thá»i tiáº¿t") ||
          cleanQ.includes("bÃ³ng Ä‘Ã¡") ||
          cleanQ.includes("chÃ­nh trá»‹") ||
          cleanQ.includes("tá»•ng thá»‘ng")
        ) {
          return {
            status: "NO_EVIDENCE",
            answer: null,
            citations: [],
            traceId: `req_demo_${Date.now()}`,
          };
        }

        const excerpt = page ? page.bullets[0] : "Ná»™i dung trang tÃ i liá»‡u.";
        return {
          status: "ANSWERED",
          answer: `Dá»±a trÃªn ná»™i dung cá»§a trang ${pageNumber} (${page?.title || ""}): ${page?.bullets.join(" ") || "KhÃ¡i niá»‡m chÃ­nh Ä‘Æ°á»£c trÃ¬nh bÃ y trong tÃ i liá»‡u."
            }`,
          citations: [
            {
              documentId,
              documentName: "BÃ i giáº£ng AI - ChÆ°Æ¡ng 1",
              pageNumber,
              excerpt,
            },
          ],
          traceId: `req_demo_${Date.now()}`,
        };
      }
      throw err;
    }
  },

  async recordPageView(
    documentId: string,
    pageNumber: number
  ): Promise<void> {
    try {
      await apiFetch<void>(
        `/student/materials/${documentId}/pages/${pageNumber}/view-events`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": `view:${documentId}:${pageNumber}:${Date.now()}`,
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
        message: "Chá»‰ cháº¥p nháº­n tá»‡p Ä‘á»‹nh dáº¡ng PDF cÃ³ lá»›p vÄƒn báº£n (text layer). KhÃ´ng nháº­n DOCX/PPTX trong MVP.",
      });
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new ApiClientError(413, {
        code: "FILE_TOO_LARGE",
        message: "KÃ­ch thÆ°á»›c tá»‡p vÆ°á»£t quÃ¡ giá»›i háº¡n cho phÃ©p (tá»‘i Ä‘a 20 MB).",
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
      const res = await apiFetch<
        PaginatedList<BackendTeacherCourseOffering> | BackendTeacherCourseOffering[]
      >(
        "/teacher/course-offerings"
      );
      const items = Array.isArray(res) ? res : res.items;
      return items.map(mapTeacherCourseOffering);
    } catch (err) {
      if (isDemoMode()) {
        return demoOfferings.filter((o) => o.teacherId === currentDemoUser.id);
      }
      throw err;
    }
  },

  async createOffering(data: CreateOfferingRequest): Promise<CourseOffering> {
    try {
      const response = await apiFetch<BackendTeacherCourseOffering>(
        "/teacher/course-offerings",
        {
        method: "POST",
        body: JSON.stringify(data),
        }
      );
      return mapTeacherCourseOffering(response);
    } catch (err) {
      if (isDemoMode()) {
        const subject = DEMO_SUBJECTS.find((s) => s.id === data.subjectId);
        const semester = DEMO_SEMESTERS.find((s) => s.id === data.semesterId);
        if (!subject || !semester) {
          throw new ApiClientError(422, {
            code: "INVALID_SUBJECT_OR_SEMESTER",
            message: "MÃ´n há»c hoáº·c Há»c ká»³ khÃ´ng há»£p lá»‡.",
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
      const res = await apiFetch<BackendTeacherCourseOffering>(
        `/teacher/course-offerings/${offeringId}/join-code/regenerate`,
        { method: "POST" }
      );
      return res.rawJoinCode || res.joinCode || "";
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
      const offerings = await this.getOfferings();
      const offeringMap = new Map(offerings.map((o) => [o.id, o]));

      if (offeringId && offeringId !== "ALL") {
        const res = await apiFetch<PaginatedList<any> | any[]>(
          `/teacher/course-offerings/${offeringId}/enrollments`
        );
        const items = Array.isArray(res) ? res : (res?.items || []);
        const off = offeringMap.get(offeringId);
        return items.map((item) => {
          const mapped = mapEnrollment(item);
          if (off) {
            mapped.offeringCode = off.code;
            mapped.offeringName = off.name;
            mapped.subjectName = off.subjectName;
            mapped.semesterName = off.semesterName;
          }
          return mapped;
        });
      }

      const enrollmentPromises = offerings.map(async (off) => {
        try {
          const res = await apiFetch<PaginatedList<any> | any[]>(
            `/teacher/course-offerings/${off.id}/enrollments`
          );
          const items = Array.isArray(res) ? res : (res?.items || []);
          return items.map((item) => {
            const mapped = mapEnrollment(item);
            mapped.offeringCode = off.code;
            mapped.offeringName = off.name;
            mapped.subjectName = off.subjectName;
            mapped.semesterName = off.semesterName;
            return mapped;
          });
        } catch {
          return [];
        }
      });
      const results = await Promise.all(enrollmentPromises);
      return results.flat();
    } catch (err) {
      if (isDemoMode()) {
        if (offeringId && offeringId !== "ALL") {
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
          enr.rejectedReason = reason || "KhÃ´ng thuá»™c danh sÃ¡ch lá»›p";
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
    const isPdf = file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      throw new ApiClientError(415, {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Giáº£ng viÃªn chá»‰ táº£i lÃªn Course Material dáº¡ng PDF cÃ³ lá»›p vÄƒn báº£n.",
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
          fileType: "PDF",
          fileSize: file.size,
          status: "READY",
          totalPages: 10,
          downloadUrl: `/api/v1/student/materials/doc_${Date.now()}/download`,
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
            message: "KhÃ´ng tÃ¬m tháº¥y phiÃªn trÃ² chuyá»‡n yÃªu cáº§u.",
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
        message: "Pháº£i chá»n Ã­t nháº¥t 1 tÃ i liá»‡u nguá»“n (tá»‘i Ä‘a 10 tÃ i liá»‡u).",
      });
    }
    if (req.selectedDocumentIds.length > 10) {
      throw new ApiClientError(422, {
        code: "TOO_MANY_DOCUMENTS",
        message: "Chá»‰ Ä‘Æ°á»£c chá»n tá»‘i Ä‘a 10 tÃ i liá»‡u lÃ m nguá»“n Ä‘á»‘i chiáº¿u.",
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
          title: req.title || "PhiÃªn tháº£o luáº­n má»›i",
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
        message: "Ná»™i dung cÃ¢u há»i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.",
      });
    }
    if (text.length > 2000) {
      throw new ApiClientError(422, {
        code: "MESSAGE_TOO_LONG",
        message: "Ná»™i dung cÃ¢u há»i vÆ°á»£t quÃ¡ giá»›i háº¡n cho phÃ©p (tá»‘i Ä‘a 2000 kÃ½ tá»±).",
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
            message: "KhÃ´ng tÃ¬m tháº¥y phiÃªn trÃ² chuyá»‡n.",
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
          lowerQuery.includes("thá»i tiáº¿t") ||
          lowerQuery.includes("chá»©ng khoÃ¡n") ||
          lowerQuery.includes("náº¥u Äƒn") ||
          lowerQuery.includes("bÃ³ng Ä‘Ã¡") ||
          lowerQuery.includes("bitcoin");
        const wantsSummary = /tÃ³m táº¯t|Ã½ chÃ­nh|dÃ n Ã½/.test(lowerQuery);
        const wantsQuiz = /táº¡o.*(quiz|cÃ¢u há»i|tráº¯c nghiá»‡m)|sinh.*(quiz|cÃ¢u há»i)/.test(lowerQuery);
        const questionCountMatch = lowerQuery.match(/\b(\d{1,2})\s*cÃ¢u\b/);

        let assistantMsg: ChatMessage;

        if (isOffTopic) {
          assistantMsg = {
            id: `msg_a_${Date.now()}`,
            role: "assistant",
            content:
              "KhÃ´ng tÃ¬m tháº¥y báº±ng chá»©ng phÃ¹ há»£p trong cÃ¡c tÃ i liá»‡u Ä‘Ã£ chá»n Ä‘á»ƒ tráº£ lá»i cÃ¢u há»i nÃ y (NO_EVIDENCE). Vui lÃ²ng Ä‘áº·t cÃ¢u há»i liÃªn quan Ä‘áº¿n ná»™i dung tÃ i liá»‡u.",
            status: "NO_EVIDENCE",
            capability: "ASK_DOCUMENT",
            citations: [],
            createdAt: new Date().toISOString(),
          };
        } else if (wantsQuiz && !questionCountMatch) {
          assistantMsg = {
            id: `msg_a_${Date.now()}`,
            role: "assistant",
            content: "TÃ´i Ä‘Ã£ nháº­n diá»‡n yÃªu cáº§u táº¡o Quiz. Báº¡n muá»‘n táº¡o bao nhiÃªu cÃ¢u há»i?",
            status: "NEEDS_CLARIFICATION",
            capability: "NEEDS_CLARIFICATION",
            missingFields: ["questionCount"],
            createdAt: new Date().toISOString(),
          };
        } else {
          const matchingDoc =
            demoPersonalDocs.find((d) => conv.selectedDocumentIds.includes(d.id)) ||
            demoPersonalDocs[0];

          const citation = {
            documentId: matchingDoc?.id || "pdoc_01",
            documentName: matchingDoc?.title || "Ghi chÃº Ã´n táº­p CÆ¡ sá»Ÿ dá»¯ liá»‡u.pdf",
            pageNumber: 3,
            excerpt: `TrÃ­ch Ä‘oáº¡n Ä‘á»‘i chiáº¿u tá»« ${matchingDoc?.title || "tÃ i liá»‡u"}: "Äá»‹nh nghÄ©a vÃ  cÃ¡c nguyÃªn táº¯c cá»‘t lÃµi Ã¡p dá»¥ng trá»±c tiáº¿p cho yÃªu cáº§u cá»§a ngÆ°á»i dÃ¹ng."`,
            sha256:
              matchingDoc?.sha256 ||
              "a3b91c89f4e2d8109867cbaef19034871239abcef19034871239abcef1903487",
          };

          if (wantsQuiz) {
            const questionCount = Number(questionCountMatch?.[1]);
            assistantMsg = {
              id: `msg_a_${Date.now()}`,
              role: "assistant",
              content: `ÄÃ£ táº¡o báº£n nhÃ¡p Quiz gá»“m ${questionCount} cÃ¢u tá»« tÃ i liá»‡u Ä‘Ã£ chá»n. HÃ£y má»Ÿ báº£n nhÃ¡p Ä‘á»ƒ kiá»ƒm tra trÆ°á»›c khi cháº¥p nháº­n.`,
              status: "QUIZ_CREATED",
              capability: "CREATE_QUIZ",
              citations: [citation],
              quizDraft: {
                quizId: `quiz_draft_${Date.now()}`,
                questionCount,
                difficulty: lowerQuery.includes("khÃ³") ? "HARD" : "MIXED",
                status: "REVIEW_REQUIRED",
              },
              createdAt: new Date().toISOString(),
            };
          } else if (wantsSummary) {
            assistantMsg = {
              id: `msg_a_${Date.now()}`,
              role: "assistant",
              content: `TÃ³m táº¯t tá»« '${matchingDoc?.title || "TÃ i liá»‡u cÃ¡ nhÃ¢n"}':\n\nâ€¢ KhÃ¡i niá»‡m vÃ  Ä‘á»‹nh nghÄ©a trá»ng tÃ¢m Ä‘Æ°á»£c há»‡ thá»‘ng hÃ³a theo tá»«ng pháº§n.\nâ€¢ CÃ¡c nguyÃªn táº¯c chÃ­nh Ä‘Æ°á»£c liÃªn káº¿t vá»›i vÃ­ dá»¥ trong tÃ i liá»‡u.\nâ€¢ Nhá»¯ng ná»™i dung cáº§n Ã´n táº­p Ä‘Æ°á»£c giá»¯ nguyÃªn pháº¡m vi nguá»“n Ä‘Ã£ chá»n.`,
              status: "SUMMARIZED",
              capability: "SUMMARIZE_DOCUMENT",
              citations: [citation],
              createdAt: new Date().toISOString(),
            };
          } else {
            assistantMsg = {
              id: `msg_a_${Date.now()}`,
              role: "assistant",
              content: `Dá»±a trÃªn tÃ i liá»‡u '${matchingDoc?.title || "TÃ i liá»‡u cÃ¡ nhÃ¢n"}' (Trang 3):\n\nCÃ¢u tráº£ lá»i cho "${text}" Ä‘Ã£ Ä‘Æ°á»£c Ä‘á»‘i chiáº¿u vá»›i ná»™i dung PDF trong pháº¡m vi báº¡n chá»n.`,
              status: "ANSWERED",
              capability: "ASK_DOCUMENT",
              citations: [citation],
              createdAt: new Date().toISOString(),
            };
          }
        }

        conv.messages.push(assistantMsg);
        conv.updatedAt = new Date().toISOString();
        if (conv.title === "PhiÃªn tháº£o luáº­n má»›i" || !conv.title) {
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

/**
 * Quiz & Assessment API (docs/api-plan.md Section 4.6)
 * Java backend owns quiz lifecycle, attempts, and scoring.
 */
export const quizApi = {
  /** Required owner draft id; returns status/draft from Java; rejects ApiClientError for denied/missing/unavailable data. */
  async getDraft(draftId: string): Promise<QuizDraft> {
    return apiFetch<QuizDraft>(`/review/quizzes/${encodeURIComponent(draftId)}`);
  },

  /** Required 1â€“10 unique document IDs and 1â€“500-char prompt; creates a draft/job, never a chat. Validation/API errors reject. */
  async createDraft(req: CreateQuizDraftRequest): Promise<QuizDraft> {
    if (!req.sourceDocumentIds || req.sourceDocumentIds.length === 0 || req.sourceDocumentIds.length > 10 || new Set(req.sourceDocumentIds).size !== req.sourceDocumentIds.length) {
      throw new ApiClientError(422, {
        code: "INVALID_DOCUMENT_SELECTION",
        message: "Pháº£i chá»n Ã­t nháº¥t 1 tÃ i liá»‡u nguá»“n (tá»‘i Ä‘a 10 tÃ i liá»‡u).",
      });
    }
    if (!req.prompt.trim() || req.prompt.trim().length > 500) {
      throw new ApiClientError(422, { code: "INVALID_QUIZ_PROMPT", message: "YÃªu cáº§u sinh Ä‘á» pháº£i cÃ³ tá»« 1 Ä‘áº¿n 500 kÃ½ tá»±." });
    }

    try {
      const response = await apiFetch<QuizDraft | { quizId: string; status: "GENERATING" }>("/quizzes", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          selectedDocumentIds: req.sourceDocumentIds,
          prompt: req.prompt.trim(),
        }),
      });
      return "quizId" in response ? { id: response.quizId, status: response.status, prompt: req.prompt.trim(), sourceDocumentIds: req.sourceDocumentIds, questions: [], createdAt: "" } : response;
    } catch (err) {
      if (isDemoMode()) {
        const newDraft: QuizDraft = {
          id: `draft_${Date.now()}`,
          prompt: req.prompt || "Táº¡o cÃ¢u há»i tráº¯c nghiá»‡m Ã´n táº­p",
          sourceDocumentIds: [...req.sourceDocumentIds],
          status: "REVIEW_REQUIRED",
          questions: [
            {
              id: `q_draft_${Date.now()}_1`,
              type: "MCQ_SINGLE",
              questionText: "KhÃ¡i niá»‡m 'KhÃ³a chÃ­nh' (Primary Key) trong mÃ´ hÃ¬nh cÆ¡ sá»Ÿ dá»¯ liá»‡u quan há»‡ cÃ³ Ä‘áº·c Ä‘iá»ƒm nÃ o?",
              options: [
                { id: "A", text: "CÃ³ thá»ƒ nháº­n giÃ¡ trá»‹ NULL Ä‘á»‘i vá»›i má»™t sá»‘ báº£n ghi Ä‘áº·c biá»‡t" },
                { id: "B", text: "GiÃ¡ trá»‹ lÃ  duy nháº¥t vÃ  khÃ´ng Ä‘Æ°á»£c phÃ©p mang giÃ¡ trá»‹ NULL (Entity Integrity)" },
                { id: "C", text: "Pháº£i bao gá»“m táº¥t cáº£ cÃ¡c thuá»™c tÃ­nh cá»§a báº£ng quan há»‡" },
                { id: "D", text: "Chá»‰ Ä‘Æ°á»£c phÃ©p Ä‘áº·t trÃªn trÆ°á»ng cÃ³ kiá»ƒu dá»¯ liá»‡u lÃ  sá»‘ nguyÃªn" },
              ],
              correctOptionId: "B",
              explanation: "RÃ ng buá»™c toÃ n váº¹n thá»±c thá»ƒ (Entity Integrity) quy Ä‘á»‹nh khÃ³a chÃ­nh khÃ´ng bao giá» Ä‘Æ°á»£c phÃ©p mang giÃ¡ trá»‹ NULL vÃ  pháº£i duy nháº¥t xÃ¡c Ä‘á»‹nh má»—i bá»™ dá»¯ liá»‡u.",
              citation: {
                documentId: req.sourceDocumentIds[0],
                documentName: "Ghi chÃº Ã´n táº­p CÆ¡ sá»Ÿ dá»¯ liá»‡u.pdf",
                pageNumber: 3,
                excerpt: "KhÃ³a chÃ­nh: Táº­p thuá»™c tÃ­nh tá»‘i thiá»ƒu xÃ¡c Ä‘á»‹nh duy nháº¥t má»—i bá»™, khÃ´ng cháº¥p nháº­n giÃ¡ trá»‹ NULL.",
              },
            },
            {
              id: `q_draft_${Date.now()}_2`,
              type: "MCQ_SINGLE",
              questionText: "Phá»¥ thuá»™c hÃ m X -> Y Ä‘Æ°á»£c gá»i lÃ  'phá»¥ thuá»™c hÃ m Ä‘áº§y Ä‘á»§' khi nÃ o?",
              options: [
                { id: "A", text: "Khi loáº¡i bá» báº¥t ká»³ thuá»™c tÃ­nh nÃ o khá»i X thÃ¬ phá»¥ thuá»™c hÃ m khÃ´ng cÃ²n Ä‘Ãºng" },
                { id: "B", text: "Khi X chá»‰ chá»©a duy nháº¥t má»™t thuá»™c tÃ­nh nguyÃªn tá»‘" },
                { id: "C", text: "Khi Y lÃ  má»™t táº­p con cá»§a X (táº§m thÆ°á»ng)" },
                { id: "D", text: "Khi X phá»¥ thuá»™c báº¯c cáº§u vÃ o Y qua má»™t táº­p trung gian Z" },
              ],
              correctOptionId: "A",
              explanation: "X -> Y lÃ  phá»¥ thuá»™c hÃ m Ä‘áº§y Ä‘á»§ náº¿u khÃ´ng tá»“n táº¡i báº¥t ká»³ táº­p con thá»±c sá»± nÃ o cá»§a X cÃ³ thá»ƒ xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c Y.",
              citation: {
                documentId: req.sourceDocumentIds[0],
                documentName: "Ghi chÃº Ã´n táº­p CÆ¡ sá»Ÿ dá»¯ liá»‡u.pdf",
                pageNumber: 6,
                excerpt: "Phá»¥ thuá»™c hÃ m Ä‘áº§y Ä‘á»§: Loáº¡i bá» báº¥t ká»³ thuá»™c tÃ­nh nÃ o cá»§a váº¿ trÃ¡i sáº½ lÃ m máº¥t phá»¥ thuá»™c.",
              },
            },
          ],
          createdAt: new Date().toISOString(),
        };
        return newDraft;
      }
      throw err;
    }
  },

  /** Required owner draft id and prompt; creates a NEW generation, old draft remains. API errors reject. */
  async regenerateDraft(draftId: string, prompt: string): Promise<QuizDraft> {
    try {
      const response = await apiFetch<QuizDraft | { quizId: string; status: "GENERATING" }>(`/review/quizzes/${encodeURIComponent(draftId)}/regenerate`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ prompt }),
      });
      return "quizId" in response ? { id: response.quizId, status: response.status, prompt, sourceDocumentIds: [], questions: [], createdAt: "" } : response;
    } catch (err) {
      if (isDemoMode()) {
        const regenerated: QuizDraft = {
          id: `draft_${crypto.randomUUID()}`,
          prompt: "Táº¡o láº¡i bá»™ cÃ¢u há»i vá»›i Ä‘á»™ khÃ³ tÆ°Æ¡ng Ä‘Æ°Æ¡ng",
          sourceDocumentIds: ["pdoc_01"],
          status: "REVIEW_REQUIRED",
          questions: [
            {
              id: `q_regen_${Date.now()}_1`,
              type: "MCQ_SINGLE",
              questionText: "Chuáº©n BCNF (Boyce-Codd) nghiÃªm ngáº·t hÆ¡n chuáº©n 3NF á»Ÿ Ä‘iá»u kiá»‡n nÃ o?",
              options: [
                { id: "A", text: "KhÃ´ng cho phÃ©p thuá»™c tÃ­nh khÃ³a phá»¥ thuá»™c vÃ o thuá»™c tÃ­nh khÃ´ng khÃ³a" },
                { id: "B", text: "Má»i phá»¥ thuá»™c hÃ m X -> A khÃ´ng táº§m thÆ°á»ng thÃ¬ X Ä‘á»u pháº£i lÃ  má»™t siÃªu khÃ³a (Superkey)" },
                { id: "C", text: "Chá»‰ Ã¡p dá»¥ng cho cÃ¡c báº£ng cÃ³ tá»« 5 cá»™t trá»Ÿ lÃªn" },
                { id: "D", text: "YÃªu cáº§u táº¥t cáº£ cÃ¡c khÃ³a ngoáº¡i pháº£i tham chiáº¿u Ä‘áº¿n cÃ¹ng má»™t báº£ng" },
              ],
              correctOptionId: "B",
              explanation: "BCNF loáº¡i bá» trÆ°á»ng há»£p ngoáº¡i lá»‡ cá»§a 3NF: Trong BCNF, váº¿ trÃ¡i X báº¯t buá»™c pháº£i lÃ  siÃªu khÃ³a mÃ  khÃ´ng cáº§n quan tÃ¢m A cÃ³ pháº£i thuá»™c tÃ­nh nguyÃªn tá»‘ hay khÃ´ng.",
              citation: {
                documentId: "pdoc_01",
                documentName: "Ghi chÃº Ã´n táº­p CÆ¡ sá»Ÿ dá»¯ liá»‡u.pdf",
                pageNumber: 10,
                excerpt: "BCNF: Má»i phá»¥ thuá»™c hÃ m khÃ´ng táº§m thÆ°á»ng X -> A thÃ¬ X pháº£i lÃ  siÃªu khÃ³a.",
              },
            },
          ],
          createdAt: new Date().toISOString(),
        };
        return regenerated;
      }
      throw err;
    }
  },

  async acceptQuiz(quizId: string, req: AcceptQuizRequest): Promise<Quiz> {
    try {
      return await apiFetch<Quiz>(`/review/quizzes/${quizId}/accept`, {
        method: "POST",
        body: JSON.stringify(req),
      });
    } catch (err) {
      if (isDemoMode()) {
        const isPersonal = req.destinationType === "PERSONAL" || !req.courseOfferingId;
        const targetOffering = !isPersonal
          ? demoOfferings.find((o) => o.id === req.courseOfferingId)
          : undefined;

        const newQuiz: Quiz = {
          id: `quiz_${Date.now()}`,
          title: "Bá»™ cÃ¢u há»i Ã´n táº­p má»›i",
          courseOfferingId: isPersonal ? undefined : req.courseOfferingId,
          courseOfferingCode: targetOffering?.code,
          isPersonal,
          questionCount: 2,
          questions: [
            {
              id: `q_acc_${Date.now()}_1`,
              type: "MCQ_SINGLE",
              questionText: "KhÃ¡i niá»‡m 'KhÃ³a chÃ­nh' (Primary Key) trong mÃ´ hÃ¬nh cÆ¡ sá»Ÿ dá»¯ liá»‡u quan há»‡ cÃ³ Ä‘áº·c Ä‘iá»ƒm nÃ o?",
              options: [
                { id: "A", text: "CÃ³ thá»ƒ nháº­n giÃ¡ trá»‹ NULL Ä‘á»‘i vá»›i má»™t sá»‘ báº£n ghi Ä‘áº·c biá»‡t" },
                { id: "B", text: "GiÃ¡ trá»‹ lÃ  duy nháº¥t vÃ  khÃ´ng Ä‘Æ°á»£c phÃ©p mang giÃ¡ trá»‹ NULL (Entity Integrity)" },
                { id: "C", text: "Pháº£i bao gá»“m táº¥t cáº£ cÃ¡c thuá»™c tÃ­nh cá»§a báº£ng quan há»‡" },
                { id: "D", text: "Chá»‰ Ä‘Æ°á»£c phÃ©p Ä‘áº·t trÃªn trÆ°á»ng cÃ³ kiá»ƒu dá»¯ liá»‡u lÃ  sá»‘ nguyÃªn" },
              ],
              correctOptionId: "B",
              explanation: "RÃ ng buá»™c toÃ n váº¹n thá»±c thá»ƒ (Entity Integrity) quy Ä‘á»‹nh khÃ³a chÃ­nh khÃ´ng bao giá» Ä‘Æ°á»£c phÃ©p mang giÃ¡ trá»‹ NULL.",
              citation: {
                documentId: "pdoc_01",
                documentName: "Ghi chÃº Ã´n táº­p CÆ¡ sá»Ÿ dá»¯ liá»‡u.pdf",
                pageNumber: 3,
                excerpt: "KhÃ³a chÃ­nh: KhÃ´ng cháº¥p nháº­n giÃ¡ trá»‹ NULL.",
              },
            },
            {
              id: `q_acc_${Date.now()}_2`,
              type: "MCQ_SINGLE",
              questionText: "Phá»¥ thuá»™c hÃ m X -> Y Ä‘Æ°á»£c gá»i lÃ  'phá»¥ thuá»™c hÃ m Ä‘áº§y Ä‘á»§' khi nÃ o?",
              options: [
                { id: "A", text: "Khi loáº¡i bá» báº¥t ká»³ thuá»™c tÃ­nh nÃ o khá»i X thÃ¬ phá»¥ thuá»™c hÃ m khÃ´ng cÃ²n Ä‘Ãºng" },
                { id: "B", text: "Khi X chá»‰ chá»©a duy nháº¥t má»™t thuá»™c tÃ­nh nguyÃªn tá»‘" },
                { id: "C", text: "Khi Y lÃ  má»™t táº­p con cá»§a X (táº§m thÆ°á»ng)" },
                { id: "D", text: "Khi X phá»¥ thuá»™c báº¯c cáº§u vÃ o Y qua má»™t táº­p trung gian Z" },
              ],
              correctOptionId: "A",
              explanation: "X -> Y lÃ  phá»¥ thuá»™c hÃ m Ä‘áº§y Ä‘á»§ náº¿u khÃ´ng tá»“n táº¡i báº¥t ká»³ táº­p con thá»±c sá»± nÃ o cá»§a X cÃ³ thá»ƒ xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c Y.",
              citation: {
                documentId: "pdoc_01",
                documentName: "Ghi chÃº Ã´n táº­p CÆ¡ sá»Ÿ dá»¯ liá»‡u.pdf",
                pageNumber: 6,
                excerpt: "Phá»¥ thuá»™c hÃ m Ä‘áº§y Ä‘á»§: Loáº¡i bá» báº¥t ká»³ thuá»™c tÃ­nh nÃ o cá»§a váº¿ trÃ¡i sáº½ lÃ m máº¥t phá»¥ thuá»™c.",
              },
            },
          ],
          createdAt: new Date().toISOString(),
          acceptedAt: new Date().toISOString(),
        };

        demoQuizzes.unshift(newQuiz);
        return newQuiz;
      }
      throw err;
    }
  },

  async submitAttempt(req: SubmitQuizAttemptRequest): Promise<QuizAttempt> {
    try {
      return await apiFetch<QuizAttempt>(`/review/quizzes/${req.quizId}/attempts`, {
        method: "POST",
        body: JSON.stringify(req),
      });
    } catch (err) {
      if (isDemoMode()) {
        const quiz = demoQuizzes.find((q) => q.id === req.quizId);
        if (!quiz) {
          throw new ApiClientError(404, {
            code: "QUIZ_NOT_FOUND",
            message: "KhÃ´ng tÃ¬m tháº¥y bÃ i Quiz Ä‘á»ƒ ná»™p bÃ i.",
          });
        }

        // Java backend calculates score and checks correctness
        let correctCount = 0;
        const answerResults = req.answers.map((ans) => {
          const question = quiz.questions.find((q) => q.id === ans.questionId);
          const isCorrect = question ? question.correctOptionId === ans.selectedOptionId : false;
          if (isCorrect) correctCount++;
          return {
            questionId: ans.questionId,
            selectedOptionId: ans.selectedOptionId,
            isCorrect,
          };
        });

        const totalQuestions = quiz.questions.length;
        const percentage = Math.round((correctCount / totalQuestions) * 100);

        // Previous attempts for this quiz to calculate attemptNumber
        const prevAttempts = demoQuizAttempts.filter((a) => a.quizId === req.quizId);
        const attemptNumber = prevAttempts.length + 1;

        const newAttempt: QuizAttempt = {
          id: `att_${Date.now()}`,
          quizId: quiz.id,
          quizTitle: quiz.title,
          attemptNumber,
          score: correctCount,
          maxScore: totalQuestions,
          percentage,
          completedAt: new Date().toISOString(),
          answers: answerResults,
        };

        demoQuizAttempts.unshift(newAttempt);

        // Aggregate wrong answers to demoReviewItems without AI guessing
        for (const ans of answerResults) {
          if (!ans.isCorrect) {
            const question = quiz.questions.find((q) => q.id === ans.questionId);
            if (question) {
              const wrongOpt = question.options.find((o) => o.id === ans.selectedOptionId);
              const correctOpt = question.options.find((o) => o.id === question.correctOptionId);

              demoReviewItems.unshift({
                id: `rev_${Date.now()}_${question.id}`,
                quizId: quiz.id,
                quizTitle: quiz.title,
                questionId: question.id,
                questionText: question.questionText,
                wrongOptionText: `${ans.selectedOptionId}: ${wrongOpt?.text || "ChÆ°a chá»n"}`,
                correctOptionText: `${question.correctOptionId}: ${correctOpt?.text || ""}`,
                explanation: question.explanation,
                citation: question.citation,
                lastAttemptAt: new Date().toISOString(),
                timesWrong: 1,
              });
            }
          }
        }

        return newAttempt;
      }
      throw err;
    }
  },

};

/**
 * Review Hub & Learning Progress API (docs/frontend-implementation-plan.md Section 2 & 4)
 * Client never infers review items or computes Streak/Topic Mastery.
 */
export const reviewApi = {
  async getCourseSummaries(): Promise<CourseReviewSummary[]> {
    try {
      const res = await apiFetch<PaginatedList<CourseReviewSummary>>("/review/course-offerings");
      return res.items;
    } catch (err) {
      if (isDemoMode()) {
        const summaries: CourseReviewSummary[] = [
          {
            courseOfferingId: "offering_01",
            courseCode: "INT1340_01",
            courseName: "TrÃ­ tuá»‡ nhÃ¢n táº¡o",
            teacherName: "TS. Tráº§n Thá»‹ Giáº£ng ViÃªn",
            isPersonal: false,
            totalQuizzes: 1,
            totalAttempts: 2,
            reviewItemsCount: demoReviewItems.filter((r) => r.quizId === "quiz_01").length,
            averageScore: 10,
            latestAttemptAt: "2026-09-25T16:30:00Z",
          },
          {
            courseOfferingId: "offering_02",
            courseCode: "DBI202_K21",
            courseName: "CÆ¡ sá»Ÿ dá»¯ liá»‡u",
            teacherName: "TS. Nguyá»…n VÄƒn B",
            isPersonal: false,
            totalQuizzes: 1,
            totalAttempts: 1,
            reviewItemsCount: demoReviewItems.filter((r) => r.quizId === "quiz_02").length,
            averageScore: 5,
            latestAttemptAt: "2026-09-26T14:00:00Z",
          },
          {
            courseOfferingId: "PERSONAL",
            courseCode: "PERSONAL",
            courseName: "Kho Quiz & Ã”n táº­p cÃ¡ nhÃ¢n",
            isPersonal: true,
            totalQuizzes: demoQuizzes.filter((q) => q.isPersonal).length,
            totalAttempts: 0,
            reviewItemsCount: 0,
            averageScore: null,
          },
        ];
        return summaries;
      }
      throw err;
    }
  },

  async getCourseWorkspace(courseOfferingId: string): Promise<CourseReviewWorkspace> {
    try {
      if (courseOfferingId === "PERSONAL") {
        const quizzes = await apiFetch<PaginatedList<Quiz>>("/review/personal-quizzes");
        return {
          courseOfferingId,
          quizzes: quizzes.items,
          attempts: [],
          reviewItems: [],
        };
      }
      return await apiFetch<CourseReviewWorkspace>(`/review/course-offerings/${courseOfferingId}`);
    } catch (err) {
      if (isDemoMode()) {
        const quizzes = courseOfferingId === "PERSONAL"
          ? demoQuizzes.filter((quiz) => quiz.isPersonal)
          : demoQuizzes.filter((quiz) => quiz.courseOfferingId === courseOfferingId);
        const quizIds = new Set(quizzes.map((quiz) => quiz.id));
        return {
          courseOfferingId,
          quizzes,
          attempts: demoQuizAttempts.filter((attempt) => quizIds.has(attempt.quizId)),
          reviewItems: demoReviewItems.filter((item) => quizIds.has(item.quizId)),
        };
      }
      throw err;
    }
  },

  async getDailyGoalProgress(): Promise<DailyGoalProgress> {
    try {
      return await apiFetch<DailyGoalProgress>("/student/daily-goal");
    } catch (err) {
      if (isDemoMode()) return demoDailyGoalProgress;
      throw err;
    }
  },

  async updateDailyGoalConfig(config: DailyGoalConfig): Promise<DailyGoalProgress> {
    try {
      return await apiFetch<DailyGoalProgress>("/student/daily-goal", {
        method: "PUT",
        body: JSON.stringify(config),
      });
    } catch (err) {
      if (isDemoMode()) {
        Object.assign(demoDailyGoalConfig, config);
        Object.assign(demoDailyGoalProgress, {
          targetPages: config.targetPages,
          targetQuizQuestions: config.targetQuizQuestions,
          targetTasks: config.targetTasks,
          pagesPercentage: Math.min(100, Math.round((demoDailyGoalProgress.actualPages / config.targetPages) * 100)),
          quizPercentage: Math.min(100, Math.round((demoDailyGoalProgress.actualQuizQuestions / config.targetQuizQuestions) * 100)),
          tasksPercentage: Math.min(100, Math.round((demoDailyGoalProgress.actualTasks / config.targetTasks) * 100)),
        });
        return demoDailyGoalProgress;
      }
      throw err;
    }
  },

  async getStudyStreak(): Promise<StudyStreak> {
    try {
      return await apiFetch<StudyStreak>("/student/streak");
    } catch (err) {
      if (isDemoMode()) return demoStudyStreak;
      throw err;
    }
  },
};

export const notificationApi = {
  /**
   * Lists the signed-in Student's in-app notifications.
   *
   * @param unreadOnly when true, requests only unread notifications
   * @param page zero-based page index, default 0
   * @param size page size from 1 to 100, default 20
   * @returns standard paginated notification contract from Java
   * @throws ApiClientError when Java rejects the session or request outside explicit demo mode
   */
  async list(
    unreadOnly = false,
    page = 0,
    size = 20
  ): Promise<PaginatedList<StudentNotification>> {
    try {
      const query = new URLSearchParams({
        unreadOnly: String(unreadOnly),
        page: String(page),
        size: String(size),
      });
      return await apiFetch<PaginatedList<StudentNotification>>(
        `/student/notifications?${query.toString()}`
      );
    } catch (err) {
      if (isDemoMode()) {
        const filtered = unreadOnly
          ? demoNotifications.filter((item) => item.readAt === null)
          : demoNotifications;
        const start = page * size;
        return {
          items: filtered.slice(start, start + size),
          page,
          size,
          totalItems: filtered.length,
          totalPages: Math.ceil(filtered.length / size),
        };
      }
      throw err;
    }
  },

  /**
   * Marks one owner-scoped notification as read.
   *
   * @param notificationId required opaque notification identifier
   * @returns updated notification with readAt
   * @throws ApiClientError for invalid session, forbidden access or owner-safe 404
   */
  async markRead(notificationId: string): Promise<StudentNotification> {
    try {
      return await apiFetch<StudentNotification>(
        `/student/notifications/${encodeURIComponent(notificationId)}/read`,
        { method: "PATCH" }
      );
    } catch (err) {
      if (isDemoMode()) {
        const notification = demoNotifications.find((item) => item.id === notificationId);
        if (!notification) throw err;
        notification.readAt ??= new Date().toISOString();
        return { ...notification };
      }
      throw err;
    }
  },
};
