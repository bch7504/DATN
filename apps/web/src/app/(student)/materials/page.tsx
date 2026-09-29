"use client";

import React, { useState, useEffect } from "react";
import { materialApi, studentApi } from "@/lib/api-client";
import { TeacherDocument } from "@/types/material";
import { CourseOffering } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BookOpen,
  Download,
  Presentation,
  FileText,
  Filter,
  Info,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function StudentMaterialsPage() {
  const [materials, setMaterials] = useState<TeacherDocument[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [offeringsData, materialsData] = await Promise.all([
        studentApi.getOfferings(),
        materialApi.getMaterials(),
      ]);
      setOfferings(offeringsData);
      setMaterials(materialsData);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Không thể tải danh sách học liệu."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMaterials = materials.filter((m) => {
    if (selectedOfferingId === "ALL") return true;
    return m.publishedOfferings.some((p) => p.offeringId === selectedOfferingId);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kho Học liệu & Bài giảng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Học liệu chính thức do Giảng viên công bố cho các lớp học phần bạn đã được duyệt
          </p>
        </div>

        {/* Filter by offering */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedOfferingId}
            onChange={(e) => setSelectedOfferingId(e.target.value)}
            className="p-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Tất cả lớp học phần đã duyệt</option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} - {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Policy Notice Box */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Quy định truy cập học liệu (StudyFlow Policy):</span>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>
              <b>Slide bài giảng (PPTX):</b> Xem trực tiếp trên trình đọc web (Slide Viewer), hỗ trợ ghi chú cá nhân và trợ lý AI Slide Tutor. Không cho phép tải tệp gốc để bảo vệ bản quyền giảng dạy.
            </li>
            <li>
              <b>Tài liệu tham khảo (PDF):</b> Cho phép tải về (Download) để học tập ngoại tuyến. Không hỗ trợ Viewer, Note hoặc Slide Tutor.
            </li>
          </ul>
        </div>
      </div>

      {errorMsg && (
        <ErrorAlert message={errorMsg} onRetry={() => setErrorMsg(null)} />
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải học liệu..." />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          title="Chưa có học liệu nào"
          description="Giảng viên chưa công bố bài giảng hoặc tài liệu cho lớp học phần này."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((doc) => {
            const isPptx = doc.fileType === "PPTX";

            return (
              <div
                key={doc.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm  transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs flex items-center gap-1 ${
                          isPptx
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {isPptx ? (
                          <>
                            <Presentation className="w-3.5 h-3.5" /> PPTX Bài giảng
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5" /> PDF Tài liệu
                          </>
                        )}
                      </span>
                      <StatusBadge status={doc.status} size="sm" />
                    </div>

                    <span className="text-xs text-slate-400">
                      {(doc.fileSize / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-1">
                    {doc.title}
                  </h3>

                  <div className="text-xs text-slate-500 mb-3 space-y-0.5">
                    <div>
                      {isPptx
                        ? `Số trang slide: ${doc.totalSlides || 8} slide`
                        : `Số trang: ${doc.totalPages || 12} trang`}
                    </div>
                    <div>
                      Lớp áp dụng:{" "}
                      {doc.publishedOfferings.map((p) => p.offeringCode).join(", ")}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Công bố: {new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                  </span>

                  {isPptx ? (
                    <Link
                      href={`/materials/${doc.id}/viewer`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600  text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      <BookOpen className="w-4 h-4" /> Xem slide & Hỏi Tutor
                    </Link>
                  ) : (
                    <a
                      href={doc.downloadUrl || "#"}
                      download={doc.fileName}
                      onClick={() => alert(`Bắt đầu tải tệp: ${doc.fileName}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600  text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      <Download className="w-4 h-4" /> Tải tệp PDF
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
