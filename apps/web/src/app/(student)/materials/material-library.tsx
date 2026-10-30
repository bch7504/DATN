"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronRight, FileText, Info } from "lucide-react";
import { materialApi, studentApi } from "@/lib/api-client";
import { TeacherDocument } from "@/types/material";
import { CourseOffering } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";

/** Student Course Material library grouped by approved Course Offering. */
export default function StudentMaterialLibrary({ offeringId }: { offeringId?: string }): React.JSX.Element {
  const router = useRouter();
  const [materials, setMaterials] = useState<TeacherDocument[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const selectedOfferingId = offeringId ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedOffering = offerings.find((offering) => offering.id === selectedOfferingId) ?? null;
  const selectedOfferingMaterials = selectedOffering
    ? materials.filter((material) => material.publishedOfferings.some((publication) => publication.offeringId === selectedOffering.id))
    : [];

  /** Args: none. Input: legacy offeringId query. Output: void; redirects to the class detail route. Errors: none. */
  useEffect(() => {
    const legacyId = new URLSearchParams(window.location.search).get("offeringId");
    if (legacyId) router.replace(`/materials/class/${encodeURIComponent(legacyId)}`);
  }, [router]);

  /** Args: none. Input: authenticated Student context; output: Promise<void> after loading approved classes and permitted materials; errors: displayed in the page alert. */
  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [offeringsData, materialsData] = await Promise.all([
        studentApi.getOfferings(),
        materialApi.getMaterials(),
      ]);
      setOfferings(offeringsData);
      setMaterials(materialsData);
      setErrorMsg(null);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Không thể tải danh sách học liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  /** Args: offeringId, nullable string. Input: approved offering or null for the class list. Output: void; navigates to its dedicated route. Errors: none. */
  const navigateToOffering = (offeringId: string | null): void => {
    if (offeringId === selectedOfferingId) return;
    router.push(offeringId ? `/materials/class/${encodeURIComponent(offeringId)}` : "/materials");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Course Material</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Học liệu PDF</h1>
        <p className="mt-1 text-sm text-slate-500">
          {selectedOffering
            ? `Tài liệu giảng viên đã công bố cho lớp ${selectedOffering.code}.`
            : "Chọn lớp học phần để xem tài liệu giảng viên đã công bố cho lớp đó."}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-slate-700">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <p>
          <strong className="text-slate-900">Quyền truy cập:</strong> chỉ tài liệu PDF được công bố cho lớp có enrollment <code>APPROVED</code> mới hiển thị và mở được.
        </p>
      </div>

      {errorMsg && <ErrorAlert message={errorMsg} onRetry={() => void loadData()} />}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" text="Đang tải lớp và học liệu PDF..." />
        </div>
      ) : selectedOffering ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button type="button" onClick={() => navigateToOffering(null)} className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-700">
                <ArrowLeft className="h-3.5 w-3.5" /> Danh sách lớp
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-700">{selectedOffering.code}</span>
                <StatusBadge status={selectedOffering.status} size="sm" />
              </div>
              <h2 className="mt-2 text-lg font-extrabold text-slate-900">{selectedOffering.name}</h2>
              <p className="mt-1 text-xs text-slate-500">{selectedOffering.subjectName} · {selectedOffering.semesterName}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
              <div className="text-2xl font-extrabold text-slate-900">{selectedOfferingMaterials.length}</div>
              <div className="text-xs text-slate-500">tài liệu của lớp</div>
            </div>
          </div>

          {selectedOfferingMaterials.length === 0 ? (
            <EmptyState title="Lớp chưa có học liệu PDF" description="Giảng viên chưa công bố tài liệu cho lớp học phần này." />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {selectedOfferingMaterials.map((document) => (
                <article key={document.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                        <FileText className="h-3.5 w-3.5" /> PDF
                      </span>
                      <StatusBadge status={document.status} size="sm" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{document.title}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">{document.fileName}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-slate-500">Số trang</div>
                        <div className="mt-1 font-bold text-slate-900">{document.totalPages} trang</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-slate-500">Dung lượng</div>
                        <div className="mt-1 font-bold text-slate-900">{(document.fileSize / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-[11px] text-slate-400">{selectedOffering.code}</span>
                    <Link
                      href={`/materials/${document.id}/viewer?offeringId=${encodeURIComponent(selectedOffering.id)}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                      <BookOpen className="h-4 w-4" /> Mở tài liệu
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : selectedOfferingId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Không tìm thấy lớp học phần này trong danh sách lớp đã được duyệt. <button type="button" onClick={() => navigateToOffering(null)} className="font-bold underline">Quay lại danh sách lớp</button>
        </div>
      ) : offerings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <BookOpen className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="mt-3 font-bold text-slate-900">Bạn chưa có lớp học phần được duyệt</h2>
          <p className="mt-1 text-sm text-slate-500">Gửi yêu cầu tham gia lớp hoặc chờ giảng viên duyệt để xem học liệu.</p>
          <Link href="/course-offerings" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white">
            <BookOpen className="h-4 w-4" /> Tìm lớp học phần
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Lớp học phần của tôi</h2>
            <p className="mt-1 text-xs text-slate-500">Chọn lớp để xem học liệu được giảng viên công bố.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offerings.map((offering) => {
              const materialCount = materials.filter((material) => material.publishedOfferings.some((publication) => publication.offeringId === offering.id)).length;
              return (
                <button key={offering.id} type="button" onClick={() => navigateToOffering(offering.id)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-700">{offering.code}</span>
                    <StatusBadge status={offering.status} size="sm" />
                  </div>
                  <h3 className="mt-4 line-clamp-2 text-base font-bold text-slate-900">{offering.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{offering.subjectName} · {offering.semesterName}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <FileText className="h-4 w-4 text-red-600" /> {materialCount} tài liệu
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">Mở lớp <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
