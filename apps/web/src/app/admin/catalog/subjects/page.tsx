import { SubjectPanel } from "@/components/admin/subject-panel";
import { AdminHeader } from "@/components/admin/admin-ui";

/** Args: none. Input: authorized Admin catalog API. Output: subject list screen. Errors: handled by panel. */
export default function AdminSubjectsPage(): React.JSX.Element { return <div className="space-y-5"><AdminHeader title="Danh mục môn học" description="Quản lý môn học dùng khi giảng viên mở lớp." /><SubjectPanel /></div>; }
