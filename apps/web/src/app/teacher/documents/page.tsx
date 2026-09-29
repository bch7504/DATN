"use client";

import React, { useState, useEffect, useRef } from "react";
import { teacherDocApi, teacherApi } from "@/lib/api-client";
import { TeacherDocument } from "@/types/material";
import { CourseOffering } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FolderKanban,
  Upload,
  Presentation,
  FileText,
  Share2,
  Trash2,
  CheckCircle2,
  PlusCircle,
  X,
  Check,
} from "lucide-react";

export default function TeacherDocumentsPage() {
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Publish modal state
  const [publishDoc, setPublishDoc] = useState<TeacherDocument | null>(null);
  const [selectedOfferingIds, setSelectedOfferingIds] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [docsData, offeringsData] = await Promise.all([
        teacherDocApi.getDocuments(),
        teacherApi.getOfferings(),
      ]);
      setDocuments(docsData);
      setOfferings(offeringsData);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Không thể tải kho học liệu."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Vui lòng chọn một tệp PDF hoặc PPTX.");
      return;
    }

    const isPptx = selectedFile.name.toLowerCase().endsWith(".pptx");
    const isPdf = selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPptx && !isPdf) {
      setErrorMsg(
        "Chỉ chấp nhận tệp định dạng PDF hoặc PPTX (không hỗ trợ DOCX trong MVP)."
      );
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await teacherDocApi.uploadDocument(selectedFile, uploadTitle.trim());
      setIsUploadModalOpen(false);
      setUploadTitle("");
      setSelectedFile(null);
      setSuccessMsg(`Tải lên tài liệu thành công: ${selectedFile.name}`);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Tải lên tài liệu thất bại."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const openPublishModal = (doc: TeacherDocument) => {
    setPublishDoc(doc);
    setSelectedOfferingIds(doc.publishedOfferings.map((p) => p.offeringId));
  };

  const handleToggleOffering = (offId: string) => {
    setSelectedOfferingIds((prev) =>
      prev.includes(offId) ? prev.filter((id) => id !== offId) : [...prev, offId]
    );
  };

  const handleConfirmPublish = async () => {
    if (!publishDoc) return;
    setIsPublishing(true);
    try {
      await teacherDocApi.publishDocument(publishDoc.id, selectedOfferingIds);
      setPublishDoc(null);
      setSuccessMsg("Cập nhật phạm vi công bố bài giảng thành công.");
      await loadData();
    } catch (err: unknown) {
      alert("Lỗi khi công bố: " + (err instanceof Error ? err.message : ""));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRevoke = async (docId: string, offId: string) => {
    if (!confirm("Gỡ tài liệu này khỏi lớp học phần?")) return;
    try {
      await teacherDocApi.revokePublication(docId, offId);
      await loadData();
    } catch (err: unknown) {
      alert("Lỗi khi gỡ: " + (err instanceof Error ? err.message : ""));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kho Tài liệu & Học liệu Giảng dạy
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tải lên bài giảng (PPTX) và tài liệu tham khảo (PDF), công bố vào các lớp học phần bạn sở hữu
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600  text-white rounded-xl text-xs font-bold shadow-md transition flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" /> Tải lên tài liệu mới
        </button>
      </div>

      {errorMsg && (
        <ErrorAlert message={errorMsg} onRetry={() => setErrorMsg(null)} />
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải kho học liệu..." />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          title="Kho học liệu chưa có tệp nào"
          description="Bấm vào 'Tải lên tài liệu mới' để đưa tệp PPTX bài giảng hoặc PDF lên hệ thống."
          actionLabel="Tải lên ngay"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const isPptx = doc.fileType === "PPTX";

            return (
              <div
                key={doc.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm  transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs flex items-center gap-1 ${
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
                  <p className="text-xs text-slate-500 font-mono mb-3 truncate">
                    {doc.fileName}
                  </p>

                  {/* Publications Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 mb-4">
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      Lớp học phần đã công bố ({doc.publishedOfferings.length}):
                    </div>
                    {doc.publishedOfferings.length === 0 ? (
                      <div className="text-xs text-amber-700 italic">
                        Chưa công bố vào lớp nào. Sinh viên chưa thể nhìn thấy.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {doc.publishedOfferings.map((p) => (
                          <span
                            key={p.offeringId}
                            className="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono text-slate-700"
                          >
                            <span>{p.offeringCode}</span>
                            <button
                              type="button"
                              onClick={() => handleRevoke(doc.id, p.offeringId)}
                              className="text-slate-400  ml-1"
                              title="Gỡ khỏi lớp này"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                  </span>

                  <button
                    type="button"
                    onClick={() => openPublishModal(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100   text-slate-700 font-bold transition"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Công bố vào Lớp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">
                Tải lên học liệu giảng dạy
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 "
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Tiêu đề tài liệu
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="VD: Bài giảng Chương 2 - Tìm kiếm thông minh"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Chọn tệp bài giảng (.pptx) hoặc tài liệu (.pdf)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept=".pptx,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 "
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  * PPTX sẽ được hiển thị trên Slide Viewer; PDF sẽ mở cho sinh viên tải xuống.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 "
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600  text-white shadow-md disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Bắt đầu tải lên
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {publishDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Công bố học liệu vào Lớp học phần
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">
                  {publishDoc.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublishDoc(null)}
                className="p-1 rounded-lg text-slate-400 "
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700">
                Chọn các lớp bạn sở hữu để chia sẻ tài liệu:
              </span>
              {offerings.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                  Bạn chưa có lớp học phần nào.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {offerings.map((off) => {
                    const isSelected = selectedOfferingIds.includes(off.id);
                    return (
                      <div
                        key={off.id}
                        onClick={() => handleToggleOffering(off.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? "bg-red-50 border-red-300 text-red-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700 "
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-mono">{off.code}</span> -{" "}
                          <span>{off.name}</span>
                          <div className="text-[10px] text-slate-500 font-normal">
                            {off.semesterName}
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isSelected
                              ? "bg-red-600 border-red-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPublishDoc(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 "
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={handleConfirmPublish}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600  text-white shadow-md disabled:opacity-60 flex items-center gap-1.5"
              >
                {isPublishing ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Lưu cấu hình công bố
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
