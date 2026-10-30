import { getApiUrl } from "./env";
import { User, LoginRequest, RegisterRequest, RegistrationStatusResponse, VerifyRegistrationRequest, ResendVerificationRequest, } from "@/types/auth";
import { ApiErrorEnvelope, PaginatedList } from "@/types/api";
import { Subject, Semester, CourseOffering, CourseEnrollment, CreateOfferingRequest, } from "@/types/course-offering";
import { TeacherDocument, PersonalDocument, CourseMaterialTutorResponse, } from "@/types/material";
import { ChatConversation, ChatMessage, CreateConversationRequest, SendMessageRequest, } from "@/types/chat";
import { Quiz, QuizDraft, QuizAttempt, CreateQuizDraftRequest, AcceptQuizRequest, SubmitQuizAttemptRequest, StartQuizAttemptResponse, SubmitAttemptResponse, } from "@/types/quiz";
import { ReviewItem, CourseReviewSummary, CourseReviewWorkspace, DailyGoalProgress, DailyGoalConfig, StudyStreak, } from "@/types/review";
import { StudentNotification } from "@/types/notification";
import type { AdminDashboard, AdminUser, AdminUserRole, AdminUserStatus, AdminUserUpdate, AdminSubject, AdminSubjectInput, AdminSemester, AdminSemesterInput, AdminOffering, AdminOfferingStatus, AdminFeedback, AdminFeedbackStatus, AdminFeedbackUpdate, AdminSystemLog, AdminSettings, AdminPage } from "@/types/admin";
export type StudyPlanStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type StudyPlanItemType = "STUDY_SESSION" | "TASK" | "QUIZ";
export type StudyPlanItemStatus = "TODO" | "OVERDUE" | "COMPLETED" | "CANCELLED" | "DELETED";
export interface StudyPlanRecord {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string;
    status: StudyPlanStatus;
    createdAt: string;
    updatedAt: string;
}
export interface StudyPlanItemRecord {
    id: string;
    planId: string;
    title: string;
    description: string | null;
    type: StudyPlanItemType;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    dueAt: string | null;
    reminderAt: string | null;
    status: StudyPlanItemStatus;
    completedAt: string | null;
    lateCompleted: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface SaveStudyPlanItemInput {
    title: string;
    description?: string;
    type: StudyPlanItemType;
    scheduledStart?: string;
    scheduledEnd?: string;
    dueAt?: string;
    reminderMinutesBefore?: number;
}
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
    joinEnabled?: boolean;
    joinCodeActive?: boolean;
    joinCodeEnabled?: boolean;
    enrolledCount?: number;
    pendingCount?: number;
    materialsCount?: number;
    createdAt: string;
};
function mapTeacherCourseOffering(offering: BackendTeacherCourseOffering): CourseOffering {
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
        joinCodeEnabled: offering.joinEnabled ??
            offering.joinCodeActive ??
            offering.joinCodeEnabled ??
            false,
        status: offering.status,
        enrolledCount: offering.enrolledCount ?? 0,
        pendingCount: offering.pendingCount ?? 0,
        materialsCount: offering.materialsCount ?? 0,
        createdAt: offering.createdAt
    };
}
function mapEnrollment(item: any): CourseEnrollment {
    return {
        id: item.id,
        offeringId: item.courseOfferingId || item.offeringId || "",
        offeringCode: item.courseCode || item.courseOfferingCode || item.offeringCode || "",
        offeringName: item.courseName || item.courseOfferingName || item.offeringName || "",
        subjectName: item.subjectName || "",
        semesterName: item.semesterName || "",
        teacherName: item.teacherName || "",
        studentId: item.studentId || "",
        studentName: item.studentName || "",
        studentEmail: item.studentEmail || "",
        status: item.status,
        requestedAt: item.requestedAt,
        approvedAt: item.decidedAt || item.approvedAt,
        rejectedReason: item.decisionNote || item.decisionReason || item.rejectedReason
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
        createdAt: item.createdAt || new Date().toISOString()
    };
}
// In-memory token storage (persists in session memory without using localStorage)
let inMemoryAccessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
if (typeof window !== "undefined") {
    try {
        inMemoryAccessToken = window.sessionStorage?.getItem("sf_access_token") || null;
    }
    catch {
    }
}
function setInMemoryToken(token: string | null): void {
    inMemoryAccessToken = token;
    if (typeof window !== "undefined") {
        try {
            if (token) {
                window.sessionStorage?.setItem("sf_access_token", token);
            }
            else {
                window.sessionStorage?.removeItem("sf_access_token");
            }
        }
        catch {
        }
    }
}
/** Args: none. Input: browser refresh cookie issued by Java; no expired bearer token is sent.
 * Output: true and the new access token/cookie after rotation, false for an invalid refresh session.
 * Errors: network/5xx responses propagate so transient outages do not silently log the user out.
 */
async function refreshAccessSession(): Promise<boolean> {
    const response = await requestJava(`${getApiUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include"
    });
    if (response.status === 401 || response.status === 403) {
        setInMemoryToken(null);
        return false;
    }
    if (!response.ok) {
        throw new ApiClientError(response.status, {
            code: "SESSION_REFRESH_FAILED",
            message: "Không thể làm mới phiên đăng nhập. Vui lòng thử lại."
        });
    }
    if (response.status === 204) {
        setInMemoryToken(null);
        return true;
    }
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") {
        setInMemoryToken(null);
        return true;
    }
    const result = body as {
        accessToken?: unknown;
        token?: unknown;
    };
    const token = typeof result.accessToken === "string" ? result.accessToken
        : typeof result.token === "string" ? result.token : null;
    setInMemoryToken(token);
    return true;
}
/** Args: none. Input: current browser session; calls refresh at most once across concurrent requests.
 * Output: true after rotation or false for an invalid refresh cookie. Errors: network/server errors propagate.
 */
function refreshSessionOnce(): Promise<boolean> {
    if (!refreshInFlight) {
        refreshInFlight = refreshAccessSession().finally(() => { refreshInFlight = null; });
    }
    return refreshInFlight;
}
/** Args: Java URL, request options and refresh permission. Input: one authenticated API request.
 * Output: Java response, retrying exactly once after a 401 and successful refresh.
 * Errors: transport/refresh failures propagate; exhausted sessions notify AuthProvider.
 */
async function requestWithSessionRefresh(url: string, options: RequestInit, allowRefresh: boolean): Promise<Response> {
    let response = await requestJava(url, options);
    if (response.status !== 401 || !allowRefresh)
        return response;
    if (!(await refreshSessionOnce())) {
        if (typeof window !== "undefined")
            window.dispatchEvent(new Event("studyflow:session-expired"));
        return response;
    }
    const headers = new Headers(options.headers);
    if (inMemoryAccessToken)
        headers.set("Authorization", `Bearer ${inMemoryAccessToken}`);
    else
        headers.delete("Authorization");
    response = await requestJava(url, { ...options, headers, credentials: "include" });
    if (response.status === 401) {
        setInMemoryToken(null);
        if (typeof window !== "undefined")
            window.dispatchEvent(new Event("studyflow:session-expired"));
    }
    return response;
}
/**
 * Generic HTTP request helper calling Java backend at /api/v1 with HttpOnly cookie credentials.
 * Args: required relative API endpoint, optional RequestInit. Input: authenticated browser session.
 * Output: parsed T or null for an empty response. Errors: ApiClientError for HTTP/network errors;
 * JSON parse failures propagate. Mutations are never automatically retried.
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getApiUrl();
    const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    if (inMemoryAccessToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${inMemoryAccessToken}`);
    }
    const response = await requestWithSessionRefresh(url, {
        ...options,
        headers,
        credentials: "include"
    }, !endpoint.startsWith("/auth/"));
    if (!response.ok) {
        let errorEnvelope: ApiErrorEnvelope = {
            code: "HTTP_ERROR",
            message: `Yêu cầu thất bại với mã trạng thái ${response.status}`
        };
        try {
            const parsed = await response.json();
            if (parsed && typeof parsed === "object") {
                errorEnvelope = {
                    code: parsed.code || "HTTP_ERROR",
                    message: parsed.message || errorEnvelope.message,
                    details: parsed.details,
                    traceId: parsed.traceId
                };
            }
        }
        catch {
        }
        throw new ApiClientError(response.status, errorEnvelope);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return null as T;
    }
    return response.json();
}
/** Args: Java URL and request options. Output: raw response. Errors: translates network failures without logging data;
 * AbortError propagates unchanged. No retry, no demo fallback, no extra side effects beyond the HTTP call.
 */
async function requestJava(url: string, options: RequestInit): Promise<Response> {
    try {
        return await fetch(url, options);
    }
    catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError")
            throw error;
        throw new ApiClientError(0, { code: "NETWORK_UNAVAILABLE", message: "Không kết nối được máy chủ. Kiểm tra backend đang chạy, địa chỉ API và kết nối mạng rồi thử lại." });
    }
}
/** Fetches an owner-authorized file through Java and returns it as a browser Blob.
 * @param endpoint Java API download path
 * @returns downloaded file contents
 * @throws ApiClientError when the API rejects the request
 */
export async function apiDownload(endpoint: string): Promise<Blob> {
    const response = await requestWithSessionRefresh(`${getApiUrl()}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, {
        credentials: "include",
        headers: inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : undefined
    }, true);
    if (!response.ok) {
        throw new ApiClientError(response.status, {
            code: "DOWNLOAD_FAILED",
            message: "Không thể tải tệp đính kèm."
        });
    }
    return response.blob();
}
/** Args: list endpoint without pagination. Input: authenticated session; Java page or legacy array.
 * Output: every page in order. Errors: API failures propagate; malformed/repeated page metadata is rejected.
 */
async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
    const items: T[] = [];
    for (let page = 0;; page++) {
        const separator = endpoint.includes("?") ? "&" : "?";
        const result = await apiFetch<PaginatedList<T> | T[]>(`${endpoint}${separator}page=${page}&size=100`);
        if (Array.isArray(result))
            return result;
        if (!Array.isArray(result.items) || result.page !== page || !Number.isInteger(result.totalPages) || result.totalPages < 0) {
            throw new ApiClientError(502, { code: "INVALID_API_RESPONSE", message: "Dữ liệu phân trang không hợp lệ. Vui lòng tải lại." });
        }
        items.push(...result.items);
        if (page + 1 >= result.totalPages)
            return items;
        if (result.items.length === 0)
            throw new ApiClientError(502, { code: "INVALID_API_RESPONSE", message: "Danh sách bị gián đoạn. Vui lòng tải lại." });
    }
}
export type AssignmentAttachment = {
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
};
export type AssignmentSubmission = {
    id: string;
    answerText: string | null;
    submittedAt: string;
    status: "ON_TIME" | "LATE";
    attachments: AssignmentAttachment[];
};
export type CourseAssignment = {
    id: string;
    courseOfferingId: string;
    title: string;
    description: string;
    dueAt: string;
    status: "DRAFT" | "PUBLISHED";
    publishedAt: string | null;
    createdAt: string;
    submission?: AssignmentSubmission | null;
};
export type AssignmentStudentResult = {
    studentId: string;
    fullName: string;
    email: string;
    submissionState: "SUBMITTED" | "NOT_SUBMITTED";
    submittedAt: string | null;
    status: "ON_TIME" | "LATE" | null;
    answerText: string | null;
    attachments: AssignmentAttachment[];
};
export type AssignmentStats = {
    assignmentId: string;
    title: string;
    dueAt: string;
    approvedStudentCount: number;
    submittedCount: number;
    onTimeCount: number;
    lateCount: number;
    notSubmittedCount: number;
    students: AssignmentStudentResult[];
};
/** Assignment API client: all file transfers are proxied by the permission-checking Java API. */
export const assignmentApi = {
    /** Lists assignments for an owned class. @param offeringId class ID @returns assignments @throws ApiClientError */
    listForTeacher: (offeringId: string): Promise<CourseAssignment[]> => apiFetch(`/teacher/course-offerings/${encodeURIComponent(offeringId)}/assignments`),
    /** Creates a draft. @param offeringId class ID @param input title, description, dueAt @returns draft @throws ApiClientError */
    create: (offeringId: string, input: {
        title: string;
        description: string;
        dueAt: string;
    }): Promise<CourseAssignment> => apiFetch(`/teacher/course-offerings/${encodeURIComponent(offeringId)}/assignments`, { method: "POST", body: JSON.stringify(input) }),
    /** Args: owned draft ID, complete title/description/future dueAt. Output: saved draft. Errors: API validation/ownership/state failures. */
    update: (assignmentId: string, input: {
        title: string;
        description: string;
        dueAt: string;
    }): Promise<CourseAssignment> => apiFetch(`/teacher/assignments/${encodeURIComponent(assignmentId)}`, { method: "PUT", body: JSON.stringify(input) }),
    /** Publishes a draft. @param assignmentId assignment ID @returns published assignment @throws ApiClientError */
    publish: (assignmentId: string): Promise<CourseAssignment> => apiFetch(`/teacher/assignments/${encodeURIComponent(assignmentId)}/publish`, { method: "POST" }),
    /** Reads class submission status. @param assignmentId assignment ID @returns per-student report @throws ApiClientError */
    stats: (assignmentId: string): Promise<AssignmentStats> => apiFetch(`/teacher/assignments/${encodeURIComponent(assignmentId)}/submissions`),
    /** Lists published assignments in approved classes. @returns assignments and own submission @throws ApiClientError */
    listForStudent: (): Promise<CourseAssignment[]> => apiFetch("/student/assignments"),
    /** Uploads a text response and 1-5 attachments. @param assignmentId assignment ID @param answerText optional response @param files selected files @returns saved submission @throws ApiClientError */
    submit: (assignmentId: string, answerText: string, files: File[]): Promise<AssignmentSubmission> => {
        if (files.length === 0) {
            return apiFetch(`/student/assignments/${encodeURIComponent(assignmentId)}/submissions`, {
                method: "POST", body: JSON.stringify({ answerText: answerText.trim() })
            });
        }
        const body = new FormData();
        if (answerText.trim())
            body.append("answerText", answerText.trim());
        files.forEach((file) => body.append("files", file));
        return apiFetch(`/student/assignments/${encodeURIComponent(assignmentId)}/submissions/attachments`, { method: "POST", body });
    },
    /** Downloads a student-owned attachment through Java. @param assignmentId assignment ID @param attachmentId attachment ID @returns Blob @throws ApiClientError */
    downloadForStudent: (assignmentId: string, attachmentId: string): Promise<Blob> => apiDownload(`/student/assignments/${encodeURIComponent(assignmentId)}/submissions/attachments/${encodeURIComponent(attachmentId)}/download`),
    /** Downloads a student attachment as owning teacher. @param assignmentId assignment ID @param studentId student ID @param attachmentId attachment ID @returns Blob @throws ApiClientError */
    downloadForTeacher: (assignmentId: string, studentId: string, attachmentId: string): Promise<Blob> => apiDownload(`/teacher/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(studentId)}/attachments/${encodeURIComponent(attachmentId)}/download`)
};
/**
 * Args: untrusted JSON from register/resend endpoint. Input: Java OTP timing response.
 * Output: validated pending status with ISO timestamps. Errors: ApiClientError 502 when
 * the server response cannot drive a safe verification/cooldown UI; no side effects.
 */
function parseRegistrationStatus(value: unknown): RegistrationStatusResponse {
    if (value && typeof value === "object") {
        const response = value as Record<string, unknown>;
        if (response.status === "VERIFICATION_REQUIRED" &&
            typeof response.expiresAt === "string" &&
            !Number.isNaN(Date.parse(response.expiresAt)) &&
            typeof response.resendAvailableAt === "string" &&
            !Number.isNaN(Date.parse(response.resendAvailableAt))) {
            return {
                status: "VERIFICATION_REQUIRED",
                expiresAt: response.expiresAt,
                resendAvailableAt: response.resendAvailableAt
            };
        }
    }
    throw new ApiClientError(502, {
        code: "INVALID_REGISTRATION_RESPONSE",
        message: "Máy chủ trả dữ liệu xác minh không hợp lệ. Vui lòng thử lại sau."
    });
}
/** Auth API client implementations. */
export const authApi = {
    async login(credentials: LoginRequest): Promise<User> {
        const res = await apiFetch<{
            accessToken?: string;
            token?: string;
            user?: User;
        }>("/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials)
        });
        if (res?.accessToken) {
            setInMemoryToken(res.accessToken);
        }
        else if (res?.token) {
            setInMemoryToken(res.token);
        }
        if (res?.user) {
            return res.user;
        }
        return await this.getMe();
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
            body: JSON.stringify(data)
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
            body: JSON.stringify(data)
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
            body: JSON.stringify(data)
        });
        return parseRegistrationStatus(response);
    },
    async logout(): Promise<void> {
        setInMemoryToken(null);
        try {
            await apiFetch<void>("/auth/logout", {
                method: "POST"
            });
        }
        catch (err) {
            console.warn("Logout error:", err);
        }
    },
    async getMe(): Promise<User> {
        return apiFetch<User>("/me", { method: "GET" });
    }
};
/**
 * Shared Catalog API (docs/api-plan.md Section 3)
 */
export const catalogApi = {
    async getSubjects(): Promise<Subject[]> {
        const res = await apiFetch<PaginatedList<Subject> | Subject[]>("/catalog/subjects?status=ACTIVE");
        return Array.isArray(res) ? res : res.items;
    },
    async getSemesters(): Promise<Semester[]> {
        const res = await apiFetch<PaginatedList<Semester> | Semester[]>("/catalog/semesters");
        return Array.isArray(res) ? res : res.items;
    }
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
                message: "Mã tham gia lớp không được để trống."
            });
        }
        const res = await apiFetch<any>("/student/course-enrollments/join", {
            method: "POST",
            body: JSON.stringify({ joinCode: cleanCode })
        });
        return mapEnrollment(res);
    },
    async getEnrollments(): Promise<CourseEnrollment[]> {
        const res = await apiFetch<PaginatedList<any> | any[]>("/student/course-enrollments");
        const items = Array.isArray(res) ? res : (res?.items || []);
        return items.map(mapEnrollment);
    },
    async getOfferings(): Promise<CourseOffering[]> {
        const items = await fetchAllPages<CourseOffering>("/student/course-offerings");
        return items.map(mapStudentCourseOffering);
    },
    async getOfferingDetail(offeringId: string): Promise<CourseOffering> {
        const res = await apiFetch<any>(`/student/course-offerings/${offeringId}`);
        return mapStudentCourseOffering(res);
    }
};
/** Student Course Material PDF library, accessed only through the Java API. */
export const materialApi = {
    async getMaterials(offeringId?: string): Promise<TeacherDocument[]> {
        const endpoint = offeringId
            ? `/student/course-offerings/${offeringId}/materials`
            : "/student/materials";
        return fetchAllPages<TeacherDocument>(endpoint);
    },
    /** Returns the Java route that checks class enrollment before streaming the PDF. */
    getDownloadUrl(documentId: string, asAttachment = false): string {
        const query = asAttachment ? "?download=true" : "";
        return `${getApiUrl()}/student/materials/${encodeURIComponent(documentId)}/download${query}`;
    },
    /**
     * Sends one page-aware question to Java. Java validates enrollment/publication
     * before forwarding the authorized scope to the Python AI service.
     *
     * @param documentId required Course Material PDF identifier
     * @param pageNumber required 1-based page currently viewed by the Student
     * @param question required non-blank question, at most 2,000 characters
     * @returns a grounded answer or NO_EVIDENCE with page citations
     * @throws ApiClientError for validation, access or service failures
     */
    askTutor(documentId: string, pageNumber: number, question: string): Promise<CourseMaterialTutorResponse> {
        if (!Number.isInteger(pageNumber) || pageNumber < 1) {
            throw new ApiClientError(422, {
                code: "INVALID_PAGE_NUMBER",
                message: "Trang tài liệu phải là số nguyên lớn hơn hoặc bằng 1."
            });
        }
        const normalizedQuestion = question.trim();
        if (!normalizedQuestion || normalizedQuestion.length > 2000) {
            throw new ApiClientError(422, {
                code: "INVALID_QUESTION",
                message: "Câu hỏi phải có từ 1 đến 2000 ký tự."
            });
        }
        return apiFetch<CourseMaterialTutorResponse>(`/student/materials/${encodeURIComponent(documentId)}/pages/${pageNumber}/tutor`, { method: "POST", body: JSON.stringify({ question: normalizedQuestion }) });
    }
};
/**
 * Student Personal Documents API (docs/api-plan.md Section 4.4)
 */
export const personalDocApi = {
    async getDocuments(): Promise<PersonalDocument[]> {
        const res = await apiFetch<PaginatedList<PersonalDocument>>("/personal-documents");
        return res.items;
    },
    async uploadDocument(file: File): Promise<PersonalDocument> {
        // Policy check: only PDF
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            throw new ApiClientError(415, {
                code: "UNSUPPORTED_MEDIA_TYPE",
                message: "Chá»‰ cháº¥p nháº­n tá»‡p Ä‘á»‹nh dáº¡ng PDF cÃ³ lá»›p vÄƒn báº£n (text layer). KhÃ´ng nháº­n DOCX/PPTX trong MVP."
            });
        }
        if (file.size > 20 * 1024 * 1024) {
            throw new ApiClientError(413, {
                code: "FILE_TOO_LARGE",
                message: "KÃ­ch thÆ°á»›c tá»‡p vÆ°á»£t quÃ¡ giá»›i háº¡n cho phÃ©p (tá»‘i Ä‘a 20 MB)."
            });
        }
        const formData = new FormData();
        formData.append("file", file);
        return await apiFetch<PersonalDocument>("/personal-documents", {
            method: "POST",
            body: formData
        });
    },
    async deleteDocument(documentId: string): Promise<void> {
        await apiFetch<void>(`/personal-documents/${documentId}`, {
            method: "DELETE"
        });
    }
};
/**
 * Teacher Course Offering & Enrollment Management API (docs/api-plan.md Section 5)
 */
export const teacherApi = {
    async getOfferings(): Promise<CourseOffering[]> {
        const items = await fetchAllPages<BackendTeacherCourseOffering>("/teacher/course-offerings");
        return items.map(mapTeacherCourseOffering);
    },
    async createOffering(data: CreateOfferingRequest): Promise<CourseOffering> {
        const response = await apiFetch<BackendTeacherCourseOffering>("/teacher/course-offerings", {
            method: "POST",
            body: JSON.stringify(data)
        });
        return mapTeacherCourseOffering(response);
    },
    async regenerateJoinCode(offeringId: string): Promise<string> {
        const res = await apiFetch<BackendTeacherCourseOffering>(`/teacher/course-offerings/${offeringId}/join-code/regenerate`, { method: "POST" });
        return res.rawJoinCode || res.joinCode || "";
    },
    async toggleJoinCode(offeringId: string, enabled: boolean): Promise<void> {
        await apiFetch<void>(`/teacher/course-offerings/${offeringId}/join-code`, {
            method: "PATCH",
            body: JSON.stringify({ enabled })
        });
    },
    async archiveOffering(offeringId: string): Promise<void> {
        await apiFetch<void>(`/teacher/course-offerings/${offeringId}/archive`, { method: "POST" });
    },
    async getEnrollments(offeringId?: string): Promise<CourseEnrollment[]> {
        const offerings = await this.getOfferings();
        const offeringMap = new Map(offerings.map((o) => [o.id, o]));
        if (offeringId && offeringId !== "ALL") {
            const res = await apiFetch<PaginatedList<any> | any[]>(`/teacher/course-offerings/${offeringId}/enrollments`);
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
                const res = await apiFetch<PaginatedList<any> | any[]>(`/teacher/course-offerings/${off.id}/enrollments`);
                const items = Array.isArray(res) ? res : (res?.items || []);
                return items.map((item) => {
                    const mapped = mapEnrollment(item);
                    mapped.offeringCode = off.code;
                    mapped.offeringName = off.name;
                    mapped.subjectName = off.subjectName;
                    mapped.semesterName = off.semesterName;
                    return mapped;
                });
            }
            catch {
                return [];
            }
        });
        const results = await Promise.all(enrollmentPromises);
        return results.flat();
    },
    async approveEnrollment(enrollmentId: string): Promise<void> {
        await apiFetch<void>(`/teacher/enrollments/${enrollmentId}/approve`, { method: "POST" });
    },
    async rejectEnrollment(enrollmentId: string, reason?: string): Promise<void> {
        await apiFetch<void>(`/teacher/enrollments/${enrollmentId}/reject`, {
            method: "POST",
            body: JSON.stringify({ reason })
        });
    },
    // Teacher Documents & Publications (docs/api-plan.md Section 5.3)
    async getDocuments(): Promise<TeacherDocument[]> {
        return fetchAllPages<TeacherDocument>("/teacher/documents");
    },
    /** Returns the Java route that checks Teacher ownership before streaming the PDF. */
    getDocumentDownloadUrl(documentId: string): string {
        return `${getApiUrl()}/teacher/documents/${encodeURIComponent(documentId)}/download`;
    },
    async uploadDocument(file: File, title: string): Promise<TeacherDocument> {
        const isPdf = file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            throw new ApiClientError(415, {
                code: "UNSUPPORTED_MEDIA_TYPE",
                message: "Giáº£ng viÃªn chá»‰ táº£i lÃªn Course Material dáº¡ng PDF cÃ³ lá»›p vÄƒn báº£n."
            });
        }
        if (file.size === 0 || file.size > 20 * 1024 * 1024) {
            throw new ApiClientError(422, { code: "INVALID_FILE_SIZE", message: "Chọn tệp PDF không rỗng, tối đa 20 MB." });
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        return apiFetch<TeacherDocument>("/teacher/documents", {
            method: "POST",
            body: formData
        });
    },
    async publishDocument(documentId: string, courseOfferingIds: string[]): Promise<void> {
        await apiFetch<void>(`/teacher/documents/${documentId}/publications`, {
            method: "POST",
            body: JSON.stringify({ courseOfferingIds })
        });
    },
    async revokePublication(documentId: string, offeringId: string): Promise<void> {
        await apiFetch<void>(`/teacher/documents/${documentId}/publications?offeringId=${offeringId}`, { method: "DELETE" });
    }
};
/** Args: zero-based page and size 1..100. Input: Admin list query. Output: encoded query; Errors: INVALID_PAGE. */
function adminPagination(page: number, size: number): URLSearchParams {
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) {
        throw new ApiClientError(422, { code: "INVALID_PAGE", message: "Trang hoặc số bản ghi không hợp lệ." });
    }
    return new URLSearchParams({ page: String(page), size: String(size) });
}
/** Args: relative Admin endpoint and validated query. Input: authenticated Admin session. Output: typed page. Errors: Java API error or INVALID_API_RESPONSE. */
async function adminPaged<T>(endpoint: string, query: URLSearchParams): Promise<AdminPage<T>> {
    const result = await apiFetch<AdminPage<T>>(`${endpoint}?${query.toString()}`);
    if (!result || !Array.isArray(result.items) || !Number.isInteger(result.page) || !Number.isInteger(result.size) || !Number.isInteger(result.totalItems) || !Number.isInteger(result.totalPages)) {
        throw new ApiClientError(502, { code: "INVALID_API_RESPONSE", message: "Dữ liệu quản trị trả về không hợp lệ." });
    }
    return result;
}
/** Args: required resource ID. Input: ID from Java response. Output: URL-safe ID. Errors: INVALID_ID. */
function adminId(id: string): string {
    if (!id?.trim()) throw new ApiClientError(422, { code: "INVALID_ID", message: "Thiếu mã đối tượng cần xử lý." });
    return encodeURIComponent(id);
}

/** Public Admin API. All requests use the Java backend and the current Admin session. */
export const adminApi = {
    /** Args: none. Output: operational totals. Errors: HTTP/auth/invalid JSON from Java. */
    getDashboard(): Promise<AdminDashboard> {
        return apiFetch<AdminDashboard>("/admin/dashboard");
    },
    /** Args: page, size, optional role/status filters. Output: matching User page. Errors: INVALID_PAGE/INVALID_FILTER or HTTP. */
    getUsers(page = 0, size = 20, role?: AdminUserRole, status?: AdminUserStatus): Promise<AdminPage<AdminUser>> {
        const query = adminPagination(page, size);
        if (role) query.set("role", role);
        if (status) query.set("status", status);
        return adminPaged<AdminUser>("/admin/users", query);
    },
    /** Args: User ID and nonempty role/status patch. Output: updated User. Errors: validation, self-change, active classes or HTTP. */
    updateUser(id: string, patch: AdminUserUpdate): Promise<AdminUser> {
        if (!patch.role && !patch.status) throw new ApiClientError(422, { code: "INVALID_USER_UPDATE", message: "Chọn ít nhất một thay đổi." });
        return apiFetch<AdminUser>(`/admin/users/${adminId(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    /** Args: page and size. Output: Subject page. Errors: INVALID_PAGE or HTTP. */
    getSubjects(page = 0, size = 20): Promise<AdminPage<AdminSubject>> {
        return adminPaged<AdminSubject>("/admin/subjects", adminPagination(page, size));
    },
    /** Args: complete Subject input. Output: created Subject. Errors: validation, duplicate code or HTTP. */
    createSubject(input: AdminSubjectInput): Promise<AdminSubject> {
        return apiFetch<AdminSubject>("/admin/subjects", { method: "POST", body: JSON.stringify(input) });
    },
    /** Args: Subject ID and allowed patch. Output: updated Subject. Errors: validation, duplicate code, missing ID or HTTP. */
    updateSubject(id: string, patch: Partial<AdminSubjectInput>): Promise<AdminSubject> {
        return apiFetch<AdminSubject>(`/admin/subjects/${adminId(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    /** Args: Subject ID. Output: void after deletion. Errors: missing/in-use Subject or HTTP. */
    async deleteSubject(id: string): Promise<void> {
        await apiFetch<void>(`/admin/subjects/${adminId(id)}`, { method: "DELETE" });
    },
    /** Args: page and size. Output: Semester page. Errors: INVALID_PAGE or HTTP. */
    getSemesters(page = 0, size = 20): Promise<AdminPage<AdminSemester>> {
        return adminPaged<AdminSemester>("/admin/semesters", adminPagination(page, size));
    },
    /** Args: complete Semester input. Output: created Semester. Errors: validation, duplicate code or HTTP. */
    createSemester(input: AdminSemesterInput): Promise<AdminSemester> {
        return apiFetch<AdminSemester>("/admin/semesters", { method: "POST", body: JSON.stringify(input) });
    },
    /** Args: Semester ID and allowed patch. Output: updated Semester. Errors: validation, active classes, missing ID or HTTP. */
    updateSemester(id: string, patch: Partial<AdminSemesterInput>): Promise<AdminSemester> {
        return apiFetch<AdminSemester>(`/admin/semesters/${adminId(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    /** Args: Semester ID. Output: void after deletion. Errors: missing/in-use Semester or HTTP. */
    async deleteSemester(id: string): Promise<void> {
        await apiFetch<void>(`/admin/semesters/${adminId(id)}`, { method: "DELETE" });
    },
    /** Args: page, size, optional status. Output: Offering page without join codes. Errors: invalid filter/page or HTTP. */
    getCourseOfferings(page = 0, size = 20, status?: AdminOfferingStatus): Promise<AdminPage<AdminOffering>> {
        const query = adminPagination(page, size);
        if (status) query.set("status", status);
        return adminPaged<AdminOffering>("/admin/course-offerings", query);
    },
    /** Args: Offering ID. Output: one Offering metadata record. Errors: missing Offering or HTTP. */
    getCourseOffering(id: string): Promise<AdminOffering> {
        return apiFetch<AdminOffering>(`/admin/course-offerings/${adminId(id)}`);
    },
    /** Args: active Offering ID. Output: locked Offering. Errors: missing/non-active Offering or HTTP. */
    lockOffering(id: string): Promise<AdminOffering> {
        return apiFetch<AdminOffering>(`/admin/course-offerings/${adminId(id)}/lock`, { method: "POST" });
    },
    /** Args: active Offering ID. Output: archived Offering. Errors: missing/non-active Offering or HTTP. */
    archiveOffering(id: string): Promise<AdminOffering> {
        return apiFetch<AdminOffering>(`/admin/course-offerings/${adminId(id)}/archive`, { method: "POST" });
    },
    /** Args: page, size, optional status. Output: Feedback page. Errors: invalid filter/page or HTTP. */
    getFeedbackReports(page = 0, size = 20, status?: AdminFeedbackStatus): Promise<AdminPage<AdminFeedback>> {
        const query = adminPagination(page, size);
        if (status) query.set("status", status);
        return adminPaged<AdminFeedback>("/admin/feedback-reports", query);
    },
    /** Args: report ID and status/resolution patch. Output: updated report. Errors: missing report/invalid update or HTTP. */
    updateFeedbackReport(id: string, patch: AdminFeedbackUpdate): Promise<AdminFeedback> {
        return apiFetch<AdminFeedback>(`/admin/feedback-reports/${adminId(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
    },
    /** Args: page and size. Output: safe audit metadata page. Errors: invalid page or HTTP. */
    getSystemLogs(page = 0, size = 20): Promise<AdminPage<AdminSystemLog>> {
        return adminPaged<AdminSystemLog>("/admin/system-logs", adminPagination(page, size));
    },
    /** Args: none. Output: changeable nonsecret settings. Errors: HTTP/auth. */
    getSettings(): Promise<AdminSettings> {
        return apiFetch<AdminSettings>("/admin/system-settings");
    },
    /** Args: registrationEnabled boolean. Output: updated settings. Errors: INVALID_SETTING or HTTP. */
    updateSettings(registrationEnabled: boolean): Promise<AdminSettings> {
        return apiFetch<AdminSettings>("/admin/system-settings", { method: "PATCH", body: JSON.stringify({ registrationEnabled }) });
    }
};
export const teacherDocApi = teacherApi;
export interface TeacherQuizGenerationRequest {
    documentIds: string[];
    courseOfferingId: string;
    instruction: string;
    questionCount: number;
    difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
    topic?: string;
    pageFrom: number;
    pageTo: number;
}
/** Teacher AI Quiz API. Browser calls Java only; Java authorizes scope before Python. */
export const teacherQuizApi = {
    /** Required owned READY PDFs, active offering and explicit controls; returns REVIEW_REQUIRED draft. */
    generate(request: TeacherQuizGenerationRequest): Promise<QuizDraft> {
        return apiFetch<QuizDraft>("/teacher/quizzes/generations", {
            method: "POST",
            headers: { "Idempotency-Key": crypto.randomUUID() },
            body: JSON.stringify(request)
        });
    },
    /** Required owner draft ID; Java revalidates class ownership/status before publication. */
    publish(quizId: string): Promise<QuizDraft> {
        return apiFetch<QuizDraft>(`/teacher/quizzes/${encodeURIComponent(quizId)}/publish`, {
            method: "POST"
        });
    }
};
/**
 * Personal RAG Chat API (docs/api-plan.md Section 4.5)
 */
export const chatApi = {
    async getConversations(): Promise<ChatConversation[]> {
        const res = await apiFetch<PaginatedList<ChatConversation>>("/student/chat/conversations");
        return res.items;
    },
    async getConversation(id: string): Promise<ChatConversation> {
        return await apiFetch<ChatConversation>(`/student/chat/conversations/${id}`);
    },
    async createConversation(req: CreateConversationRequest): Promise<ChatConversation> {
        if (!req.selectedDocumentIds || req.selectedDocumentIds.length === 0) {
            throw new ApiClientError(422, {
                code: "INVALID_DOCUMENT_SELECTION",
                message: "Pháº£i chá»n Ã­t nháº¥t 1 tÃ i liá»‡u nguá»“n (tá»‘i Ä‘a 10 tÃ i liá»‡u)."
            });
        }
        if (req.selectedDocumentIds.length > 10) {
            throw new ApiClientError(422, {
                code: "TOO_MANY_DOCUMENTS",
                message: "Chá»‰ Ä‘Æ°á»£c chá»n tá»‘i Ä‘a 10 tÃ i liá»‡u lÃ m nguá»“n Ä‘á»‘i chiáº¿u."
            });
        }
        return await apiFetch<ChatConversation>("/student/chat/conversations", {
            method: "POST",
            body: JSON.stringify(req)
        });
    },
    async sendMessage(conversationId: string, req: SendMessageRequest): Promise<ChatMessage> {
        const text = req.message?.trim();
        if (!text || text.length === 0) {
            throw new ApiClientError(422, {
                code: "EMPTY_MESSAGE",
                message: "Ná»™i dung cÃ¢u há»i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng."
            });
        }
        if (text.length > 2000) {
            throw new ApiClientError(422, {
                code: "MESSAGE_TOO_LONG",
                message: "Ná»™i dung cÃ¢u há»i vÆ°á»£t quÃ¡ giá»›i háº¡n cho phÃ©p (tá»‘i Ä‘a 2000 kÃ½ tá»±)."
            });
        }
        return await apiFetch<ChatMessage>(`/student/chat/conversations/${conversationId}/messages`, {
            method: "POST",
            body: JSON.stringify(req)
        });
    },
    async deleteConversation(conversationId: string): Promise<void> {
        await apiFetch<void>(`/student/chat/conversations/${conversationId}`, {
            method: "DELETE"
        });
    }
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
                message: "Pháº£i chá»n Ã­t nháº¥t 1 tÃ i liá»‡u nguá»“n (tá»‘i Ä‘a 10 tÃ i liá»‡u)."
            });
        }
        if (!req.prompt.trim() || req.prompt.trim().length > 500) {
            throw new ApiClientError(422, { code: "INVALID_QUIZ_PROMPT", message: "YÃªu cáº§u sinh Ä‘á» pháº£i cÃ³ tá»« 1 Ä‘áº¿n 500 kÃ½ tá»±." });
        }
        const response = await apiFetch<QuizDraft | {
            quizId: string;
            status: "GENERATING";
        }>("/quizzes", {
            method: "POST",
            headers: { "Idempotency-Key": crypto.randomUUID() },
            body: JSON.stringify({
                selectedDocumentIds: req.sourceDocumentIds,
                prompt: req.prompt.trim()
            })
        });
        return "quizId" in response ? { id: response.quizId, status: response.status, prompt: req.prompt.trim(), sourceDocumentIds: req.sourceDocumentIds, questions: [], createdAt: "" } : response;
    },
    /** Required owner draft id and prompt; creates a NEW generation, old draft remains. API errors reject. */
    async regenerateDraft(draftId: string, prompt: string): Promise<QuizDraft> {
        const response = await apiFetch<QuizDraft | {
            quizId: string;
            status: "GENERATING";
        }>(`/review/quizzes/${encodeURIComponent(draftId)}/regenerate`, {
            method: "POST",
            headers: { "Idempotency-Key": crypto.randomUUID() },
            body: JSON.stringify({ prompt })
        });
        return "quizId" in response ? { id: response.quizId, status: response.status, prompt, sourceDocumentIds: [], questions: [], createdAt: "" } : response;
    },
    async acceptQuiz(quizId: string, req: AcceptQuizRequest): Promise<Quiz> {
        return await apiFetch<Quiz>(`/review/quizzes/${quizId}/accept`, {
            method: "POST",
            body: JSON.stringify(req)
        });
    },
    /** Starts a new Java-owned attempt and never exposes answer keys. */
    async startAttempt(quizId: string): Promise<StartQuizAttemptResponse> {
        return apiFetch<StartQuizAttemptResponse>(`/review/quizzes/${encodeURIComponent(quizId)}/attempts`, {
            method: "POST"
        });
    },
    /** Submits indexed choices for Java scoring and returns the persisted result. */
    async submitAttemptToBackend(attemptId: string, answers: Record<string, number>): Promise<SubmitAttemptResponse> {
        return apiFetch<SubmitAttemptResponse>(`/review/attempts/${encodeURIComponent(attemptId)}/submit`, {
            method: "POST",
            body: JSON.stringify({ answers })
        });
    },
    async submitAttempt(req: SubmitQuizAttemptRequest): Promise<QuizAttempt> {
        return await apiFetch<QuizAttempt>(`/review/quizzes/${req.quizId}/attempts`, {
            method: "POST",
            body: JSON.stringify(req)
        });
    }
};
/**
 * Review Hub & Learning Progress API (docs/frontend-implementation-plan.md Section 2 & 4)
 * Client never infers review items or computes Streak/Topic Mastery.
 */
export const reviewApi = {
    /** Args: none. Input: authenticated Student session.
     * Output: approved offerings plus persisted Java Quiz summaries and personal Quiz group.
     * Errors: ApiClientError for auth, permission or server failures; no local fallback.
     */
    async getCourseSummaries(): Promise<CourseReviewSummary[]> {
        const [offerings, backendSummaries, personalQuizzes] = await Promise.all([
            studentApi.getOfferings(),
            apiFetch<Array<{ courseOfferingId: string; quizCount: number; averageScore: number | null; latestAttemptAt: string | null }>>("/review/course-offerings"),
            apiFetch<Array<{ id: string }>>("/review/personal-quizzes")
        ]);
        const summaryMap = new Map(backendSummaries.map((summary) => [summary.courseOfferingId, summary]));
        const summaries = offerings.map((offering): CourseReviewSummary => {
            const summary = summaryMap.get(offering.id);
            return {
                courseOfferingId: offering.id,
                courseCode: offering.code,
                courseName: offering.name,
                teacherName: offering.teacherName,
                isPersonal: false,
                totalQuizzes: summary?.quizCount ?? 0,
                totalAttempts: summary?.latestAttemptAt ? 1 : 0,
                reviewItemsCount: 0,
                averageScore: summary?.averageScore ?? null,
                latestAttemptAt: summary?.latestAttemptAt || undefined,
                quizDataAvailable: true
            };
        });
        summaries.unshift({
            courseOfferingId: "PERSONAL",
            courseCode: "PERSONAL",
            courseName: "Kho Quiz & Ôn tập cá nhân",
            isPersonal: true,
            totalQuizzes: personalQuizzes.length,
            totalAttempts: 0,
            reviewItemsCount: 0,
            averageScore: null,
            quizDataAvailable: true
        });
        return summaries;
    },
    /** Args: courseOfferingId is a Course Offering UUID or "PERSONAL". Input: authenticated Student session.
     * Output: authorized persisted Quiz workspace and wrong-answer review items from Java.
     * Errors: ApiClientError for a missing/unapproved Course Offering or backend failure; no local fallback.
     */
    async getCourseWorkspace(courseOfferingId: string): Promise<CourseReviewWorkspace> {
        if (courseOfferingId === "PERSONAL") {
            const quizzesRaw = await apiFetch<Array<{
                id: string;
                title: string;
                questionCount: number;
                createdAt: string;
                attemptCount: number;
                highestScore: number | null;
            }>>("/review/personal-quizzes");
            return {
                courseOfferingId,
                quizzes: quizzesRaw.map((quiz) => ({
                    id: quiz.id,
                    title: quiz.title,
                    isPersonal: true,
                    questionCount: quiz.questionCount,
                    questions: [],
                    createdAt: quiz.createdAt,
                    attemptCount: quiz.attemptCount,
                    highestScore: quiz.highestScore
                })),
                attempts: [],
                reviewItems: [],
                quizDataAvailable: true
            };
        }
        const data = await apiFetch<{
            courseOfferingId: string;
            quizzes: Array<{
                id: string;
                title: string;
                courseOfferingId: string;
                questionCount: number;
                createdAt: string;
                attemptCount: number;
                highestScore: number | null;
            }>;
            reviewItems: Array<{
                questionId: string;
                questionText: string;
                studentSelectedOptionText: string | null;
                correctOptionText: string;
                explanation: string;
                citations: Array<{ documentId: string; documentTitle?: string; pageNumber: number; excerpt: string }>;
                lastAttemptedAt: string;
            }>;
        }>(`/review/course-offerings/${encodeURIComponent(courseOfferingId)}`);
        const reviewItems: ReviewItem[] = data.reviewItems.map((item) => ({
            id: `rev_${item.questionId}`,
            quizId: "",
            quizTitle: "Lớp học phần",
            questionId: item.questionId,
            questionText: item.questionText,
            wrongOptionText: item.studentSelectedOptionText || "Chưa chọn",
            correctOptionText: item.correctOptionText,
            explanation: item.explanation,
            citation: item.citations.length > 0 ? {
                documentId: item.citations[0].documentId,
                documentName: item.citations[0].documentTitle || "Tài liệu học tập",
                pageNumber: item.citations[0].pageNumber,
                excerpt: item.citations[0].excerpt
            } : undefined,
            lastAttemptAt: item.lastAttemptedAt,
            timesWrong: 1
        }));
        return {
            courseOfferingId,
            quizzes: data.quizzes.map((quiz) => ({
                id: quiz.id,
                title: quiz.title,
                courseOfferingId: quiz.courseOfferingId,
                isPersonal: false,
                questionCount: quiz.questionCount,
                questions: [],
                createdAt: quiz.createdAt,
                attemptCount: quiz.attemptCount,
                highestScore: quiz.highestScore
            })),
            attempts: [],
            reviewItems,
            quizDataAvailable: true
        };
    },
    async getDailyGoalProgress(): Promise<DailyGoalProgress> {
        return await apiFetch<DailyGoalProgress>("/student/daily-goal");
    },
    async updateDailyGoalConfig(config: DailyGoalConfig): Promise<DailyGoalProgress> {
        return await apiFetch<DailyGoalProgress>("/student/daily-goal", {
            method: "PUT",
            body: JSON.stringify(config)
        });
    },
    async getStudyStreak(): Promise<StudyStreak> {
        return await apiFetch<StudyStreak>("/student/streak");
    }
};
export const notificationApi = {
    /**
     * Lists the signed-in Student's in-app notifications.
     *
     * @param unreadOnly when true, requests only unread notifications
     * @param page zero-based page index, default 0
     * @param size page size from 1 to 100, default 20
     * @returns standard paginated notification contract from Java
     * @throws ApiClientError when Java rejects the session or request; no fixture fallback
     */
    async list(unreadOnly = false, page = 0, size = 20): Promise<PaginatedList<StudentNotification>> {
        const query = new URLSearchParams({ unreadOnly: String(unreadOnly), page: String(page), size: String(size) });
        return apiFetch<PaginatedList<StudentNotification>>(`/student/notifications?${query.toString()}`);
    },
    /**
     * Marks one owner-scoped notification as read.
     *
     * @param notificationId required opaque notification identifier
     * @returns updated notification with readAt
     * @throws ApiClientError for invalid session, forbidden access or owner-safe 404
     */
    async markRead(notificationId: string): Promise<StudentNotification> {
        return apiFetch<StudentNotification>(`/student/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" });
    }
};
/** Teacher-only in-app notifications; all calls use the public Java API and current session. */
export const teacherNotificationApi = {
    /** Args: unreadOnly (default false), page (default 0), size (default 20, 1..100). Input: Teacher session. Output: owner-scoped page. Errors: ApiClientError. */
    async list(unreadOnly = false, page = 0, size = 20): Promise<PaginatedList<StudentNotification>> {
        const query = new URLSearchParams({ unreadOnly: String(unreadOnly), page: String(page), size: String(size) });
        return apiFetch<PaginatedList<StudentNotification>>(`/teacher/notifications?${query.toString()}`);
    },
    /** Args: required notification ID. Input: Teacher session. Output: updated owner-scoped notification. Errors: ApiClientError including owner-safe 404. */
    async markRead(notificationId: string): Promise<StudentNotification> {
        return apiFetch<StudentNotification>(`/teacher/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" });
    }
};
/**
 * Personal plan and calendar API. All data is owned and validated by Java; this
 * client deliberately has no fixture fallback so failures cannot look persisted.
 */
export const studyPlanApi = {
    /** Args: required nonempty owned plan ID. Input: authenticated Student. Output: persisted StudyPlanRecord. Errors: INVALID_PLAN_ID, 404/ownership or HTTP API errors. */
    getPlan(planId: string): Promise<StudyPlanRecord> {
        if (!planId.trim()) throw new ApiClientError(422, { code: "INVALID_PLAN_ID", message: "Thiếu mã kế hoạch." });
        return apiFetch<StudyPlanRecord>(`/study-plans/${encodeURIComponent(planId)}`);
    },
    /** Args: required owned plan ID; page defaults 0; size defaults 100, both integers with page>=0 and size 1..100. Input: Student session. Output: owner item page. Errors: INVALID_PLAN_ID/INVALID_PAGE or Java auth/ownership/HTTP errors. */
    listItems(planId: string, page = 0, size = 100): Promise<PaginatedList<StudyPlanItemRecord>> {
        if (!planId.trim()) throw new ApiClientError(422, { code: "INVALID_PLAN_ID", message: "Thiếu mã kế hoạch." });
        if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) throw new ApiClientError(422, { code: "INVALID_PAGE", message: "Phân trang không hợp lệ." });
        return apiFetch<PaginatedList<StudyPlanItemRecord>>(`/study-plans/${encodeURIComponent(planId)}/items?page=${page}&size=${size}`);
    },
    /**
     * Args: optional StudyPlanStatus and page size 1..100. Input: current Student session.
     * Output: page of plans owned by that Student. Errors: ApiClientError for auth/validation failures.
     */
    listPlans(status?: StudyPlanStatus, size = 100): Promise<PaginatedList<StudyPlanRecord>> {
        const query = new URLSearchParams({ page: "0", size: String(size) });
        if (status)
            query.set("status", status);
        return apiFetch<PaginatedList<StudyPlanRecord>>(`/study-plans?${query.toString()}`);
    },
    /**
     * Args: title, optional description, inclusive startDate/endDate. Input: current Student session.
     * Output: newly persisted ACTIVE plan. Errors: ApiClientError for invalid range/content or auth.
     */
    createPlan(input: {
        title: string;
        description?: string;
        startDate: string;
        endDate: string;
    }): Promise<StudyPlanRecord> {
        return apiFetch<StudyPlanRecord>("/study-plans", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    /** Args: owned plan ID and full editable fields including status. Input: authenticated Student.
     * Output: saved plan. Errors: Java validation, ownership, archived state or item outside changed dates.
     */
    updatePlan(planId: string, input: {
        title: string;
        description?: string;
        startDate: string;
        endDate: string;
        status: StudyPlanStatus;
    }): Promise<StudyPlanRecord> {
        return apiFetch<StudyPlanRecord>(`/study-plans/${encodeURIComponent(planId)}`, {
            method: "PUT", body: JSON.stringify(input)
        });
    },
    /** Args: owned plan ID. Input: authenticated Student. Output: void, soft archived.
     * Errors: Java auth/owner/state failures. Safe to call again for the same plan.
     */
    archivePlan(planId: string): Promise<void> {
        return apiFetch<void>(`/study-plans/${encodeURIComponent(planId)}`, { method: "DELETE" });
    },
    /**
     * Args: UTC instants `from` inclusive and `to` exclusive, maximum 31 days.
     * Input: current Student session and bounded calendar range. Output: owner-scoped calendar items.
     * Errors: ApiClientError for auth or an invalid/oversized range.
     */
    getCalendar(from: string, to: string): Promise<{
        from: string;
        to: string;
        items: StudyPlanItemRecord[];
    }> {
        const query = new URLSearchParams({ from, to });
        return apiFetch<{
            from: string;
            to: string;
            items: StudyPlanItemRecord[];
        }>(`/calendar?${query.toString()}`);
    },
    /**
     * Args: planId and complete new item fields. Input: current Student session and an owned active plan.
     * Output: persisted TODO plan item. Errors: ApiClientError for ownership, validation or schedule conflicts.
     */
    createItem(planId: string, input: SaveStudyPlanItemInput): Promise<StudyPlanItemRecord> {
        return apiFetch<StudyPlanItemRecord>(`/study-plans/${encodeURIComponent(planId)}/items`, {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    /** Args: owned plan/item IDs and complete replacement fields. Input: Student session.
     * Output: persisted item. Errors: validation, ownership, archive, schedule conflict or locked late completion.
     */
    updateItem(planId: string, itemId: string, input: SaveStudyPlanItemInput): Promise<StudyPlanItemRecord> {
        return apiFetch<StudyPlanItemRecord>(`/study-plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`, {
            method: "PUT", body: JSON.stringify(input)
        });
    },
    /**
     * Args: planId and itemId. Input: current Student session and an owned plan item.
     * Output: void; side effect marks the item CANCELLED. Errors: ApiClientError for missing/foreign items.
     */
    cancelItem(planId: string, itemId: string): Promise<void> {
        return apiFetch<void>(`/study-plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
    },
    /**
     * Args: owned plan/item IDs. Input: authenticated Student and an existing item.
     * Output: void; hides the item while preserving completion history. Errors: Java auth/owner/archived-plan errors.
     */
    removeItem(planId: string, itemId: string): Promise<void> {
        return apiFetch<void>(`/study-plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}/remove`, { method: "DELETE" });
    },
    /** Args: owned plan/item IDs. Input: authenticated Student and an existing item in an active plan.
     * Output: void; permanently deletes the item, completion event and related in-app notifications.
     * Errors: ApiClientError for auth, ownership, missing plan or archived plan. Repeated deletion is safe.
     */
    permanentlyDeleteItem(planId: string, itemId: string): Promise<void> {
        return apiFetch<void>(`/study-plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}/permanently`, { method: "DELETE" });
    },
    /**
     * Args: itemId, target TODO|COMPLETED status and an idempotency key for a new completion.
     * Input: current Student session and owner-scoped non-cancelled item. Output: updated item.
     * Errors: ApiClientError for auth, invalid state, missing key or locked late completion.
     * A new COMPLETED transition emits one learning event and may create a late-completion notice.
     */
    changeItemStatus(itemId: string, status: "TODO" | "COMPLETED", idempotencyKey?: string): Promise<StudyPlanItemRecord> {
        const headers = new Headers();
        if (idempotencyKey)
            headers.set("Idempotency-Key", idempotencyKey);
        return apiFetch<StudyPlanItemRecord>(`/study-plan-items/${encodeURIComponent(itemId)}/status`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ status })
        });
    }
};
