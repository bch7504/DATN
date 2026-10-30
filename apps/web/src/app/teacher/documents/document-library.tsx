"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  PlusCircle,
  Share2,
  X,
} from "lucide-react";
import { teacherDocApi, teacherApi } from "@/lib/api-client";
import { TeacherDocument } from "@/types/material";
import { CourseOffering } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Teacher-owned Course Material PDFs, browsed by the Course Offering they are published to. */
export default function TeacherDocumentLibrary({ offeringId }: { offeringId?: string }): React.JSX.Element {
  const router = useRouter();
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const selectedOfferingId = offeringId ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedOffering = offerings.find((offering) => offering.id === selectedOfferingId) ?? null;
  const classDocuments = selectedOffering
    ? documents.filter((document) => document.publishedOfferings.some((publication) => publication.offeringId === selectedOffering.id))
    : [];
  const privateDocuments = documents.filter((document) => document.publishedOfferings.length === 0);

  /** Args: none. Input: legacy offeringId query. Output: void; redirects to the class detail route. Errors: none. */
  useEffect(() => {
    const legacyId = new URLSearchParams(window.location.search).get("offeringId");
    if (legacyId) router.replace(`/teacher/documents/${encodeURIComponent(legacyId)}`);
  }, [router]);

  /** Args: none. Input: authenticated Teacher context; output: void after loading owned documents/classes; errors: shown in the page alert. */
  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [documentData, offeringData] = await Promise.all([
        teacherDocApi.getDocuments(),
        teacherApi.getOfferings(),
      ]);
      setDocuments(documentData);
      setOfferings(offeringData);
      setErrorMsg(null);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Không thể tải kho học liệu PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  /** Args: offeringId, nullable string. Input: selected teacher-owned offering or null for the class list. Output: void; navigates to its dedicated route. Errors: none. */
  const navigateToOffering = (offeringId: string | null): void => {
    if (offeringId === selectedOfferingId) return;
    router.push(offeringId ? `/teacher/documents/${encodeURIComponent(offeringId)}` : "/teacher/documents");
  };

  /** Args: required owned document and optional target class. Input: Teacher library selection. Output: void; opens dedicated publication route. Errors: Java authorizes loaded data on that route. */
  const openPublication = (document: TeacherDocument, targetOfferingId?: string): void => {
    const target = targetOfferingId ?? selectedOfferingId;
    router.push(`/teacher/documents/publications/${encodeURIComponent(document.id)}${target ? `?offeringId=${encodeURIComponent(target)}` : ""}`);
  };

  /** Args: documentId/offeringId, string, required. Input: owned document and its current offering publication; output: Promise<void> after revocation and refresh; errors: API errors are shown on the page. */
  const handleRevoke = async (documentId: string, offeringId: string): Promise<void> => {
    if (!window.confirm("Gỡ tài liệu này khỏi lớp học phần?")) return;
    try {
      await teacherDocApi.revokePublication(documentId, offeringId);
      setSuccessMsg("Đã gỡ tài liệu khỏi lớp học phần.");
      await loadData();
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Không thể gỡ công bố.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Teacher Workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Kho học liệu PDF</h1>
          <p className="mt-1 text-sm text-slate-500">
            {selectedOffering
              ? `Học liệu đã công bố cho lớp ${selectedOffering.code}.`
              : "Chọn lớp học phần để xem và quản lý tài liệu của lớp đó."}
          </p>
        </div>
        {selectedOffering && selectedOffering.status === "ACTIVE" && (
          <Link href={`/teacher/documents/${encodeURIComponent(selectedOffering.id)}/upload`} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm">
            <PlusCircle className="h-4 w-4" /> Tải PDF mới
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {selectedOffering
          ? `PDF tải mới được lưu vào kho riêng; bạn sẽ xác nhận trước khi công bố cho lớp ${selectedOffering.code}. Chỉ nhận PDF có lớp văn bản, tối đa 20 MB.`
          : "Tài liệu chỉ hiển thị cho sinh viên sau khi được công bố vào lớp. Chỉ nhận PDF có lớp văn bản, tối đa 20 MB."}
      </div>

      {errorMsg && <ErrorAlert message={errorMsg} onRetry={() => void loadData()} />}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" text="Đang tải lớp và học liệu..." /></div>
      ) : selectedOffering ? (
        <section className="space-y-6">
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
              <div className="text-2xl font-extrabold text-slate-900">{classDocuments.length}</div>
              <div className="text-xs text-slate-500">tài liệu trong lớp</div>
            </div>
          </div>

          {selectedOffering.status !== "ACTIVE" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Lớp không còn hoạt động; bạn vẫn có thể xem hoặc gỡ học liệu đã công bố.
            </div>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Tài liệu của lớp</h2>
              <span className="text-xs text-slate-500">{classDocuments.length} tài liệu</span>
            </div>
            {classDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-800">Lớp chưa có tài liệu được công bố</p>
                <p className="mt-1 text-sm text-slate-500">Tải PDF mới để công bố vào lớp.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {classDocuments.map((document) => (
                  <article key={document.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"><FileText className="h-3.5 w-3.5" /> PDF · {document.totalPages} trang</span>
                        <StatusBadge status={document.status} size="sm" />
                      </div>
                      <h3 className="mt-3 text-base font-bold text-slate-900">{document.title}</h3>
                      <p className="mt-1 truncate text-xs text-slate-500">{document.fileName}</p>
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                        Đã công bố cho lớp {selectedOffering.code}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                      <a href={teacherDocApi.getDocumentDownloadUrl(document.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                        <ExternalLink className="h-3.5 w-3.5" /> Mở PDF
                      </a>
                      <button type="button" onClick={() => openPublication(document)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700">
                        <Share2 className="h-3.5 w-3.5" /> Quản lý công bố
                      </button>
                      <button type="button" onClick={() => void handleRevoke(document.id, selectedOffering.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                        <X className="h-3.5 w-3.5" /> Gỡ khỏi lớp
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        </section>
      ) : selectedOfferingId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Không tìm thấy lớp học phần này trong danh sách lớp bạn phụ trách. <button type="button" onClick={() => navigateToOffering(null)} className="font-bold underline">Quay lại danh sách lớp</button>
        </div>
      ) : offerings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <BookOpen className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="mt-3 font-bold text-slate-900">Bạn chưa có lớp học phần</h2>
          <p className="mt-1 text-sm text-slate-500">Mở lớp học phần trước để quản lý và công bố tài liệu.</p>
          <Link href="/teacher/course-offerings" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white">
            <BookOpen className="h-4 w-4" /> Đến lớp học phần
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Lớp học phần của tôi</h2>
            <p className="mt-1 text-xs text-slate-500">Chọn một lớp để xem học liệu đã công bố và thêm PDF vào lớp đó.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offerings.map((offering) => {
              const materialCount = documents.filter((document) => document.publishedOfferings.some((publication) => publication.offeringId === offering.id)).length;
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

          {privateDocuments.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-slate-900">PDF chưa công bố vào lớp nào</h2>
                <p className="mt-1 text-xs text-slate-500">Chọn một PDF để công bố cho lớp bạn phụ trách.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {privateDocuments.map((document) => (
                  <div key={document.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{document.title}</p>
                      <p className="truncate text-xs text-slate-500">{document.fileName}</p>
                    </div>
                    <button type="button" onClick={() => openPublication(document)} className="shrink-0 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700">
                      Quản lý công bố
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      )}

    </div>
  );
}
