"use client";

import { useParams } from "next/navigation";
import StudentMaterialLibrary from "../../material-library";

/** Args: none. Input: offeringId route parameter. Output: class material detail screen. Errors: handled by library component. */
export default function ClassMaterialPage(): React.JSX.Element { const { offeringId } = useParams<{ offeringId: string }>(); return <StudentMaterialLibrary offeringId={offeringId} />; }
