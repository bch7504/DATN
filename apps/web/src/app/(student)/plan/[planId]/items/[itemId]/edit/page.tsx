"use client";

import { useParams } from "next/navigation";
import { PlanItemEditor } from "../../../../plan-item-editor";

/** Args: none. Input: planId/itemId route parameters. Output: owned item edit screen. Errors: handled by editor. */
export default function EditPlanItemPage(): React.JSX.Element { const { planId, itemId } = useParams<{ planId: string; itemId: string }>(); return <PlanItemEditor planId={planId} itemId={itemId} />; }
