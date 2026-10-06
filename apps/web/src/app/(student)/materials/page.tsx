"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, Filter, Info, Sparkles } from "lucide-react";
import { materialApi, studentApi } from "@/lib/api-client";
import { TeacherDocument } from "@/types/material";
import { CourseOffering } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";

export default function StudentMaterialsPage() {
  const [materials, setMaterials] = useState<TeacherDocument[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const filteredMaterials = materials.filter(
    (material) =>
      selectedOfferingId === "ALL" ||
      material.publishedOfferings.some((publication) => publication.offeringId === selectedOfferingId)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Course Material</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Học liệu PDF</h1>
          <p className="mt-1 text-sm text-slate-500">
            Đọc tài liệu giảng viên công bố, ghi chú theo trang và hỏi AI trong đúng phạm vi tài liệu.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="sr-only">Lọc theo lớp học phần</span>
          <select
            value={selectedOfferingId}
            onChange={(event) => setSelectedOfferingId(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          >
            <option value="ALL">Tất cả lớp học phần</option>
            {offerings.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.code} - {offering.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-slate-700">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <p>
          <strong className="text-slate-900">Chính sách mới:</strong> toàn bộ học liệu lớp được chuẩn hóa thành PDF có lớp văn bản. Student được xem trực tuyến, lưu ghi chú và dùng Course Material AI Tutor với citation theo số trang. Chỉ tài liệu đã công bố và enrollment <code>APPROVED</code> mới được truy cập.
        </p>
      </div>

      {errorMsg && <ErrorAlert message={errorMsg} onRetry={() => void loadData()} />}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" text="Đang tải học liệu PDF..." />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState title="Chưa có học liệu PDF" description="Giảng viên chưa công bố tài liệu cho lớp học phần này." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredMaterials.map((document) => (
            <article key={document.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </span>
                  <StatusBadge status={document.status} size="sm" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{document.title}</h2>
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
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-red-600" />
                  Viewer · Ghi chú theo trang · AI Tutor
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[11px] text-slate-400">
                  {document.publishedOfferings.map((item) => item.offeringCode).join(", ")}
                </span>
                <Link
                  href={`/materials/${document.id}/viewer`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <BookOpen className="h-4 w-4" /> Xem PDF & Hỏi AI
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
