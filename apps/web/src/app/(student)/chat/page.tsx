import { redirect } from "next/navigation";

/**
 * Compatibility route for bookmarks created before the assistant was merged into Personal Documents.
 * Args/input: none.
 * Output: never; redirects to the assistant section in `/personal-documents`.
 * Errors: none.
 */
export default function LegacyPersonalAssistantPage(): never {
  redirect("/personal-documents#personal-ai-assistant");
}
