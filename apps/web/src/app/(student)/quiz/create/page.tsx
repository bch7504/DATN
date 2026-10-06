import { redirect } from "next/navigation";

/**
 * Preserves the legacy route while moving Personal PDF Quiz generation into the unified assistant.
 * Input: none. Output: a server-side redirect to /chat. Errors: none.
 */
export default function LegacyStudentQuizCreatePage(): never {
  redirect("/chat");
}
