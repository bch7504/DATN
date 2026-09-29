"use client";

import React, { useState, useEffect, useRef } from "react";
import { personalDocApi } from "@/lib/api-client";
import { PersonalDocument } from "@/types/material";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FileText,
  Upload,
  Trash2,
  ShieldCheck,
  Info,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

export default function StudentPersonalDocumentsPage() {
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    try {
      const data = await personalDocApi.getDocuments();
      setDocuments(data);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách tài liệu cá nhân."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Policy check: Only PDF
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg(
        "Chỉ chấp nhận tệp PDF có text layer (không hỗ trợ DOCX/PPTX cho tài liệu cá nhân theo quy định MVP)."
      );
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("Kích thước tệp quá lớn. Tối đa 20 MB.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await personalDocApi.uploadDocument(file);
      setSuccessMsg(`Tải lên thành công: ${file.name}`);
      await loadDocs();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Tải lên tệp không thành công."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`Xóa tài liệu "${title}" khỏi kho cá nhân của bạn?`)) return;

    try {
      await personalDocApi.deleteDocument(docId);
      await loadDocs();
    } catch (err: unknown) {
      alert("Không thể xóa: " + (err instanceof Error ? err.message : ""));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kho Tài liệu Cá nhân
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tải lên tài liệu PDF cá nhân để hỏi đáp AI (Personal RAG) và tự sinh câu hỏi ôn thi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ptit-red  text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <MessageSquare className="w-4 h-4" /> Hỏi đáp AI RAG
          </Link>
        </div>
      </div>

      {/* Policy Box */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900">Chính sách bảo mật tài liệu cá nhân:</span>
          <p className="mt-0.5">
            Tài liệu cá nhân hoàn toàn thuộc quyền sở hữu của riêng bạn. Giảng viên và Quản trị viên không có quyền truy cập hoặc xem nội dung tài liệu cá nhân. Hệ thống chỉ chấp nhận định dạng <b>PDF có text-layer</b> (tối đa 20 MB).
          </p>
        </div>
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

      {/* Upload Zone */}
      <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-red-200  bg-red-50/20 transition flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">
          Tải lên tài liệu PDF cá nhân
        </h3>
        <p className="text-xs text-slate-500 mb-4 max-w-sm">
          Kéo thả tệp hoặc bấm nút bên dưới để chọn tệp từ máy tính (chỉ nhận .pdf, tối đa 20 MB)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
          id="personal-pdf-upload"
        />

        <label
          htmlFor="personal-pdf-upload"
          className="cursor-pointer px-4 py-2 bg-red-600  text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          {isUploading ? (
            <LoadingSpinner size="sm" text="Đang xử lý tệp..." />
          ) : (
            <>
              <FileCheck className="w-4 h-4" /> Chọn tệp PDF từ máy
            </>
          )}
        </label>
      </div>

      {/* Documents List */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3">
          Danh sách tài liệu đã tải lên ({documents.length})
        </h2>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner size="lg" text="Đang tải danh sách tài liệu..." />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            title="Chưa có tài liệu cá nhân nào"
            description="Hãy tải lên tệp PDF đầu tiên của bạn để sử dụng tính năng Chatbot RAG và sinh đề ôn thi."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm  transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-lg bg-red-50 text-red-600">
                        <FileText className="w-4 h-4" />
                      </span>
                      <StatusBadge status={doc.status} size="sm" />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-1.5 text-slate-400  rounded-lg  transition"
                      title="Xóa tài liệu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1 truncate" title={doc.title}>
                    {doc.title}
                  </h3>

                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                      <span>Số trang: <b>{doc.pageCount} trang</b></span>
                      <span>{(doc.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>

                    {doc.sha256 && (
                      <div className="text-[10px] font-mono text-slate-400 truncate bg-slate-50 p-1 rounded" title={doc.sha256}>
                        SHA-256: {doc.sha256.slice(0, 24)}...
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Tải lên: {new Date(doc.uploadedAt).toLocaleDateString("vi-VN")}</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" /> Sẵn sàng làm nguồn RAG
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
