import { z } from "zod";

/**
 * Zod schema for client and public runtime environment variables.
 * Only NEXT_PUBLIC_ variables are allowed on the client side per AGENTS.md rules.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url("NEXT_PUBLIC_API_URL phải là một URL hợp lệ")
    .default("http://localhost:8088/api/v1"),
});

export type EnvConfig = {
  NEXT_PUBLIC_API_URL: string;
};

let cachedEnv: EnvConfig | null = null;

/**
 * Validates and returns parsed public environment variables.
 *
 * Contract:
 * - args: none
 * - input: process.env (filtered for public variables)
 * - output: EnvConfig with validated NEXT_PUBLIC_API_URL
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
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088/api/v1",
  };

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.warn(
      "[Env Warning] Biến môi trường không hợp lệ, sử dụng cấu hình mặc định an toàn:",
      parsed.error.format()
    );
    cachedEnv = {
      NEXT_PUBLIC_API_URL: "http://localhost:8088/api/v1",
    };
    return cachedEnv;
  }

  cachedEnv = parsed.data;
  return cachedEnv;
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
    return "http://localhost:8088/api/v1";
  }
}
