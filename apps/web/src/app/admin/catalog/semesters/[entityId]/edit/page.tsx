"use client";

import { useParams } from "next/navigation";
import { SemesterEditor } from "@/components/admin/semester-editor";

/** Args: none. Input: entityId route segment. Output: existing semester editor. Errors: handled by editor. */
export default function EditSemesterPage(): React.JSX.Element { const { entityId } = useParams<{ entityId: string }>(); return <SemesterEditor entityId={entityId} />; }
