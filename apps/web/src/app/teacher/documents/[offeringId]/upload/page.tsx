import { redirect } from "next/navigation";

interface LegacyClassUploadPageProps {
  params: Promise<{ offeringId: string }>;
}

/**
 * Redirects the retired class-scoped upload route to the Teacher's private library upload.
 *
 * Args:
 * - params: required route parameters containing the legacy Course Offering identifier.
 *
 * Input: a legacy `/teacher/documents/{offeringId}/upload` request.
 * Output: never; Next.js responds with a redirect to `/teacher/documents/upload`.
 * Errors: Next.js handles malformed route parameters before this page is invoked.
 */
export default async function LegacyClassUploadPage({ params }: LegacyClassUploadPageProps): Promise<never> {
  await params;
  redirect("/teacher/documents/upload");
}
