"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, Clock, Users } from "lucide-react";
import { assignmentApi, teacherApi, teacherDocApi, type CourseAssignment } from "@/lib/api-client";
import type { CourseEnrollment, CourseOffering } from "@/types/course-offering";
import type { TeacherDocument } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { StatusBadge } from "@/components/ui/status-badge";

/** Teacher workspace for one class: roster, pending requests, assignments/results and published resources. */
export default function TeacherCourseOfferingWorkspace(): React.JSX.Element {
  const { offeringId } = useParams<{ offeringId: string }>();
  const [offering, setOffering] = useState<CourseOffering | null>(null);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [materials, setMaterials] = useState<TeacherDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Args: none. Input: authenticated Teacher and route offeringId. Output: refreshed class workspace. Errors: shown inline. */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const owned = await teacherApi.getOfferings();
      const selected = owned.find((item) => item.id === offeringId) ?? null;
      if (!selected) throw new Error("Không tìm thấy lớp học phần hoặc bạn không có quyền quản lý lớp này.");
      const [enrollmentItems, assignmentItems, materialItems] = await Promise.all([
        teacherApi.getEnrollments(offeringId),
        assignmentApi.listForTeacher(offeringId),
        teacherDocApi.getDocuments().then((items) => items.filter((document) =>
          document.publishedOfferings.some((publication) => publication.offeringId === offeringId))),
      ]);
      setOffering(selected);
      setEnrollments(enrollmentItems);
      setAssignments(assignmentItems);
      setMaterials(materialItems);
      setError(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Không thể tải không gian lớp học phần.");
    } finally {
      setLoading(false);
    }
  }, [offeringId]);

  useEffect(() => { void load(); }, [load]);
  const pending = useMemo(() => enrollments.filter((item) => item.status === "PENDING"), [enrollments]);
  const approved = useMemo(() => enrollments.filter((item) => item.status === "APPROVED"), [enrollments]);

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><LoadingSpinner size="lg" text="Đang mở lớp học phần..." /></div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link href="/teacher/course-offerings" className="text-xs font-bold text-red-700">← Danh sách lớp học phần</Link>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-700">{offering?.code}</span>{offering && <StatusBadge status={offering.status} size="sm" />}</div>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{offering?.name ?? "Lớp học phần"}</h1>
        <p className="mt-1 text-sm text-slate-500">{offering?.subjectName} · {offering?.semesterName}</p>
      </div>
      <Link href={`/teacher/assignments/new?offeringId=${encodeURIComponent(offeringId)}`} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white">+ Giao bài tập</Link>
    </div>
    {error && <ErrorAlert message={error} onRetry={() => void load()} />}

    <section>
      <div className="mb-4">
        <h2 className="text-lg font-extrabold text-slate-900">Chức năng của lớp học phần</h2>
        <p className="mt-1 text-sm text-slate-500">Chọn một chức năng để mở trang quản lý riêng.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FeatureLink icon={Clock} title="Yêu cầu chờ duyệt" description="Duyệt hoặc từ chối yêu cầu tham gia lớp." count={`${pending.length} yêu cầu`} href={`/teacher/enrollments?offeringId=${encodeURIComponent(offeringId)}&tab=PENDING`} />
        <FeatureLink icon={Users} title="Danh sách sinh viên" description="Xem các sinh viên đã được duyệt vào lớp." count={`${approved.length} sinh viên`} href={`/teacher/enrollments?offeringId=${encodeURIComponent(offeringId)}&tab=APPROVED`} />
        <FeatureLink icon={ClipboardList} title="Bài tập và kết quả" description="Tạo bài, công bố và xem thống kê bài nộp." count={`${assignments.length} bài tập`} href={`/teacher/assignments?offeringId=${encodeURIComponent(offeringId)}`} />
        <FeatureLink icon={BookOpen} title="Kho tài liệu lớp" description="Quản lý học liệu được công bố cho lớp này." count={`${materials.length} tài liệu`} href={`/teacher/documents/${encodeURIComponent(offeringId)}`} />
      </div>
    </section>
  </div>;
}

/** Args: icon, title, description, count and route. Input: aggregate of an owned class. Output: navigation card. Errors: none. */
function FeatureLink({ icon: Icon, title, description, count, href }: { icon: typeof Users; title: string; description: string; count: string; href: string }): React.JSX.Element {
  return <Link href={href} className="group flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
    <div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-red-50 p-3 text-red-700"><Icon className="h-6 w-6" /></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{count}</span></div>
    <div className="mt-5"><h3 className="font-extrabold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-red-700">Mở chức năng <ArrowRight className="h-4 w-4" /></span></div>
  </Link>;
}
