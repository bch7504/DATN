"use client";

import { useParams } from "next/navigation";
import ReviewWorkspace from "../review-workspace";

/** Args: none. Input: courseId route parameter. Output: review_items screen. Errors: handled by workspace. */
export default function ReviewPage(): React.JSX.Element { const { courseId } = useParams<{ courseId: string }>(); return <ReviewWorkspace courseId={courseId} section="REVIEW_ITEMS" />; }
