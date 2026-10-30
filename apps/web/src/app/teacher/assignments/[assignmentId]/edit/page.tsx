"use client";

import { type ReactElement } from "react";
import { useParams } from "next/navigation";
import { AssignmentEditor } from "../../assignment-editor";

/** Args: none. Input: assignmentId from the route and authenticated Teacher. Output: dedicated owned-draft edit page. Errors: shown by AssignmentEditor. */
export default function EditTeacherAssignmentPage(): ReactElement {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  return <AssignmentEditor assignmentId={assignmentId} />;
}
