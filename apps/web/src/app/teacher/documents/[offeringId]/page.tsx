"use client";

import { useParams } from "next/navigation";
import TeacherDocumentLibrary from "../document-library";

/** Args: none. Input: offeringId route parameter. Output: class material detail screen. Errors: handled by library component. */
export default function ClassMaterialPage(): React.JSX.Element { const { offeringId } = useParams<{ offeringId: string }>(); return <TeacherDocumentLibrary offeringId={offeringId} />; }
