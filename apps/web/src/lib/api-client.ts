import type {
  ApiErrorEnvelope,
  AuthenticatedUser,
  LoginRequest,
  RegisterRequest,
} from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export class ApiClientError extends Error {
  readonly status: number;
  readonly error: ApiErrorEnvelope;

  /**
   * @param status HTTP status returned by the Java public API.
   * @param error Structured public error envelope; must not contain internal/provider data.
   */
  constructor(status: number, error: ApiErrorEnvelope) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = status;
    this.error = error;
  }
}

/**
 * Calls the Java system-of-record API only.
 * @param path Public Java path relative to `/api/v1`; it must start with `/`.
 * @param init Standard fetch options. Browser credentials are included by default.
 * @returns Parsed JSON response, or `undefined` for a 204 response.
 * @throws ApiClientError for non-2xx responses and Error for malformed paths/responses.
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!path.startsWith("/")) {
    throw new Error("Java API path must start with '/'");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new ApiClientError(response.status, payload as ApiErrorEnvelope);
  }
  return payload as T;
}

/**
 * Returns whether local development fixtures may be displayed.
 * @returns `true` only for explicit demo mode or a local development runtime.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/**
 * Starts a Java-owned authenticated session.
 * @param credentials User identifier and password entered on the login form.
 * @returns Nothing; Java owns the access/refresh session and its cookies.
 * @throws ApiClientError when credentials are rejected or the public API fails.
 */
export async function login(credentials: LoginRequest): Promise<void> {
  await apiRequest<unknown>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/**
 * Creates a Java-owned Student account and authenticated session.
 * @param registration Display name, email and password; role is never accepted from the client.
 * @returns Nothing after Java creates the account/session.
 * @throws ApiClientError for duplicate/invalid registration or API failure.
 */
export async function register(registration: RegisterRequest): Promise<void> {
  await apiRequest<unknown>("/auth/register", {
    method: "POST",
    body: JSON.stringify(registration),
  });
}

/**
 * Loads the current authenticated profile from Java.
 * @returns The user identity and active role used by route guards.
 * @throws ApiClientError when the session is missing/expired or the API fails.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/me");
}

/**
 * Revokes the current Java-owned session.
 * @returns Nothing after Java clears/revokes session credentials.
 * @throws ApiClientError when the logout request fails.
 */
export async function logout(): Promise<void> {
  await apiRequest<unknown>("/auth/logout", { method: "POST" });
}
