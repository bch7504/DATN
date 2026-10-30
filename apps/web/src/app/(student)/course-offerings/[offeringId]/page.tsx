"use client";

import { useParams } from "next/navigation";
import StudentCourseOfferingsWorkspace from "../course-workspace";

/** Args: none. Input: offeringId route parameter. Output: course detail screen. Errors: handled by workspace. */
export default function StudentCourseOfferingPage(): React.JSX.Element { const { offeringId } = useParams<{ offeringId: string }>(); return <StudentCourseOfferingsWorkspace offeringId={offeringId} />; }
