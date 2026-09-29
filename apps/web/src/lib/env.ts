import { z } from "zod";

/**
 * Zod schema for client and public runtime environment variables.
 * Only NEXT_PUBLIC_ variables are allowed on the client side per AGENTS.md rules.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url("NEXT_PUBLIC_API_URL phải là một URL hợp lệ")
    .default("http://localhost:8080/api/v1"),
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(["true", "false", "1", "0"])
    .default("true")
    .transform((val) => val === "true" || val === "1"),
});

export type EnvConfig = {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_DEMO_MODE: boolean;
};

let cachedEnv: EnvConfig | null = null;

/**
 * Validates and returns parsed public environment variables.
 *
 * Contract:
 * - args: none
 * - input: process.env (filtered for public variables)
 * - output: EnvConfig with validated NEXT_PUBLIC_API_URL and NEXT_PUBLIC_DEMO_MODE
 * - errors: throws Error if validation fails and safe defaults cannot be applied
 *
 * @returns {EnvConfig} The validated environment configuration
 */
export function getEnv(): EnvConfig {
  if (cachedEnv) {
    return cachedEnv;
  }

  const rawEnv = {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? "true",
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.warn(
      "[Env Warning] Biến môi trường không hợp lệ, sử dụng cấu hình mặc định an toàn:",
      parsed.error.format()
    );
    cachedEnv = {
      NEXT_PUBLIC_API_URL: "http://localhost:8080/api/v1",
      NEXT_PUBLIC_DEMO_MODE: true,
    };
    return cachedEnv;
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * Check if the application is running in demo mode.
 *
 * Contract:
 * - args: none
 * - input: getEnv() output
 * - output: boolean (true if demo mode is enabled)
 * - errors: none (falls back to true on failure)
 *
 * @returns {boolean} Whether demo mode is enabled
 */
export function isDemoMode(): boolean {
  try {
    return getEnv().NEXT_PUBLIC_DEMO_MODE;
  } catch {
    return true;
  }
}

/**
 * Get the Java backend API base URL.
 *
 * Contract:
 * - args: none
 * - input: getEnv() output
 * - output: string (URL ending without trailing slash)
 * - errors: none (falls back to default URL)
 *
 * @returns {string} Java API URL
 */
export function getApiUrl(): string {
  try {
    const url = getEnv().NEXT_PUBLIC_API_URL;
    return url.endsWith("/") ? url.slice(0, -1) : url;
  } catch {
    return "http://localhost:8080/api/v1";
  }
}
