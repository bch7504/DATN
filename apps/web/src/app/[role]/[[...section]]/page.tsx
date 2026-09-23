import { notFound } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { StudyFlowApp } from "@/components/study-flow-app";

interface WorkspacePageProps {
  params: Promise<{ role: string; section?: string[] }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { role, section = [] } = await params;
  if (!(["student", "teacher", "admin"] as const).includes(role as "student" | "teacher" | "admin")) {
    notFound();
  }
  const routeRole = role as "student" | "teacher" | "admin";
  return (
    <AuthGuard routeRole={routeRole}>
      <StudyFlowApp role={routeRole} section={section[0] ?? "dashboard"} />
    </AuthGuard>
  );
}
