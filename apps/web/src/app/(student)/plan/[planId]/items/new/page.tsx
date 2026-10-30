"use client";

import { useParams } from "next/navigation";
import { PlanItemEditor } from "../../../plan-item-editor";

/** Args: none. Input: planId route parameter and type/date query. Output: new schedule/task screen. Errors: handled by editor. */
export default function NewPlanItemPage(): React.JSX.Element { const { planId } = useParams<{ planId: string }>(); return <PlanItemEditor planId={planId} />; }
