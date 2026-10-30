import { SemesterPanel } from "@/components/admin/semester-panel";
import { AdminHeader } from "@/components/admin/admin-ui";

/** Args: none. Input: authorized Admin catalog API. Output: semester list screen. Errors: handled by panel. */
export default function AdminSemestersPage(): React.JSX.Element { return <div className="space-y-5"><AdminHeader title="Danh mục học kỳ" description="Quản lý thời gian và quyền mở lớp theo học kỳ." /><SemesterPanel /></div>; }
