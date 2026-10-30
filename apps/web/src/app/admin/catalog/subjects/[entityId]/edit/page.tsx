"use client";

import { useParams } from "next/navigation";
import { SubjectEditor } from "@/components/admin/subject-editor";

/** Args: none. Input: entityId route segment. Output: existing subject editor. Errors: handled by editor. */
export default function EditSubjectPage(): React.JSX.Element { const { entityId } = useParams<{ entityId: string }>(); return <SubjectEditor entityId={entityId} />; }
