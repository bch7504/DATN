import { type ReactElement } from "react";
import { AssignmentEditor } from "../assignment-editor";

/** Args: none. Input: authenticated Teacher and optional offeringId URL query. Output: dedicated draft creation page. Errors: shown by AssignmentEditor. */
export default function NewTeacherAssignmentPage(): ReactElement {
  return <AssignmentEditor />;
}
