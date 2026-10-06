"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, FileText, ListChecks, PlusCircle, Share2, Upload, X } from "lucide-react";
import { teacherDocApi, teacherApi } from "@/lib/api-client";
import { TeacherDocument } from "@/types/material";
import { CourseOffering } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";

/** Teacher-owned Course Material PDF management and publication workspace. */
export default function TeacherDocumentsPage() {
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [publishDoc, setPublishDoc] = useState<TeacherDocument | null>(null);
  const [selectedOfferingIds, setSelectedOfferingIds] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Loads Teacher-owned documents and Course Offerings from the Java public API. */
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

  /** Validates PDF-only input and uploads it through Java. */
  const handleUpload = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Vui lòng chọn một tệp PDF.");
      return;
    }
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Course Material chỉ nhận PDF có lớp văn bản; không nhận PPTX hoặc DOCX.");
      return;
    }
    setIsUploading(true);
    setErrorMsg(null);
    try {
      await teacherDocApi.uploadDocument(selectedFile, uploadTitle.trim());
      setIsUploadModalOpen(false);
      setUploadTitle("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMsg(`Đã tải lên ${selectedFile.name}. Tài liệu cần READY trước khi công bố hoặc sinh Quiz.`);
      await loadData();
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Tải lên tài liệu thất bại.");
    } finally {
      setIsUploading(false);
    }
  };

  /** Opens the publication selector with the document's current offering scope. */
  const openPublishModal = (document: TeacherDocument): void => {
    setPublishDoc(document);
    setSelectedOfferingIds(document.publishedOfferings.map((item) => item.offeringId));
  };

  /** Adds or removes one Course Offering from the pending publication selection. */
  const handleToggleOffering = (offeringId: string): void => {
    setSelectedOfferingIds((current) =>
      current.includes(offeringId)
        ? current.filter((id) => id !== offeringId)
        : [...current, offeringId]
    );
  };

  /** Persists the publication selection through Java ownership checks. */
  const handleConfirmPublish = async (): Promise<void> => {
    if (!publishDoc) return;
    setIsPublishing(true);
    try {
      await teacherDocApi.publishDocument(publishDoc.id, selectedOfferingIds);
      setPublishDoc(null);
      setSuccessMsg("Đã cập nhật phạm vi công bố học liệu.");
      await loadData();
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Không thể công bố tài liệu.");
    } finally {
      setIsPublishing(false);
    }
  };

  /** Revokes one publication after user confirmation. */
  const handleRevoke = async (documentId: string, offeringId: string): Promise<void> => {
    if (!window.confirm("Gỡ tài liệu này khỏi lớp học phần?")) return;
    try {
      await teacherDocApi.revokePublication(documentId, offeringId);
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
            Tải Course Material PDF, công bố vào lớp sở hữu hoặc dùng làm nguồn tạo Quiz.
          </p>
        </div>
        <button type="button" onClick={() => setIsUploadModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm">
          <PlusCircle className="h-4 w-4" /> Tải PDF mới
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Teacher không có chatbot cá nhân hoặc AI Tutor. AI của Teacher chỉ sinh bộ câu hỏi <code>MCQ_SINGLE</code> từ Course Material PDF do chính Teacher sở hữu; Teacher duyệt trước khi công bố.
      </div>

      {errorMsg && <ErrorAlert message={errorMsg} onRetry={() => void loadData()} />}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" text="Đang tải kho PDF..." /></div>
      ) : documents.length === 0 ? (
        <EmptyState title="Chưa có Course Material PDF" description="Tải PDF có lớp văn bản để công bố cho lớp hoặc tạo Quiz." actionLabel="Tải PDF" onAction={() => setIsUploadModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <article key={document.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"><FileText className="h-3.5 w-3.5" /> PDF · {document.totalPages} trang</span>
                  <StatusBadge status={document.status} size="sm" />
                </div>
                <h2 className="mt-3 text-base font-bold text-slate-900">{document.title}</h2>
                <p className="mt-1 truncate text-xs text-slate-500">{document.fileName}</p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đã công bố ({document.publishedOfferings.length})</div>
                  {document.publishedOfferings.length === 0 ? (
                    <p className="mt-2 text-xs italic text-amber-700">Chưa công bố vào lớp học phần.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {document.publishedOfferings.map((publication) => (
                        <span key={publication.offeringId} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                          {publication.offeringCode}
                          <button type="button" onClick={() => void handleRevoke(document.id, publication.offeringId)} aria-label={`Gỡ ${publication.offeringCode}`} className="text-slate-400"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => openPublishModal(document)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700">
                  <Share2 className="h-3.5 w-3.5" /> Công bố
                </button>
                <Link href={`/teacher/quizzes/create?documentId=${document.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">
                  <ListChecks className="h-3.5 w-3.5" /> Tạo Quiz bằng AI
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Tải Course Material PDF</h2>
              <button type="button" onClick={() => setIsUploadModalOpen(false)} aria-label="Đóng" className="text-slate-500"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <label className="block text-xs font-bold uppercase text-slate-700">
                Tiêu đề
                <input required value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-normal outline-none focus:border-red-400" placeholder="Bài giảng Chương 2" />
              </label>
              <label className="block text-xs font-bold uppercase text-slate-700">
                Tệp PDF có lớp văn bản
                <input ref={fileInputRef} required type="file" accept="application/pdf,.pdf" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="mt-1 w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-red-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-red-700" />
              </label>
              <p className="text-xs leading-5 text-slate-500">Không nhận PPTX/DOCX hoặc PDF scan không có text layer. Tài liệu được xử lý bất đồng bộ trước khi chuyển sang READY.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Hủy</button>
                <button type="submit" disabled={isUploading} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                  <Upload className="h-4 w-4" /> {isUploading ? "Đang tải..." : "Tải lên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {publishDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div><h2 className="font-bold text-slate-900">Công bố học liệu</h2><p className="mt-1 text-xs text-slate-500">{publishDoc.title}</p></div>
              <button type="button" onClick={() => setPublishDoc(null)} aria-label="Đóng" className="text-slate-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {offerings.map((offering) => {
                const selected = selectedOfferingIds.includes(offering.id);
                return (
                  <button key={offering.id} type="button" onClick={() => handleToggleOffering(offering.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs ${selected ? "border-red-300 bg-red-50 text-red-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    <span><strong>{offering.code}</strong> · {offering.name}</span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? "border-red-600 bg-red-600 text-white" : "border-slate-300 bg-white"}`}>{selected && <Check className="h-3.5 w-3.5" />}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setPublishDoc(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Hủy</button>
              <button type="button" disabled={isPublishing} onClick={() => void handleConfirmPublish()} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><Check className="h-4 w-4" /> Lưu công bố</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
