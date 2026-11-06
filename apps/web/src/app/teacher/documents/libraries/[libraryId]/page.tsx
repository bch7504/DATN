"use client";

import { useParams } from "next/navigation";
import TeacherDocumentLibrary from "../../document-library";

/**
 * Args: libraryId from the route. Input: authenticated Teacher-owned library.
 * Output: dedicated library detail screen. Errors: ownership/not-found states are rendered by the shared view.
 */
export default function TeacherResourceLibraryDetailPage(): React.JSX.Element {
  const { libraryId } = useParams<{ libraryId: string }>();
  return <TeacherDocumentLibrary libraryId={libraryId} />;
}
