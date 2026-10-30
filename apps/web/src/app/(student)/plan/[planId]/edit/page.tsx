"use client";

import { useParams } from "next/navigation";
import { PlanEditor } from "../../plan-editor";

/** Args: none. Input: owned planId route parameter. Output: plan edit screen. Errors: handled by editor. */
export default function EditPlanPage(): React.JSX.Element { const { planId } = useParams<{ planId: string }>(); return <PlanEditor planId={planId} />; }
