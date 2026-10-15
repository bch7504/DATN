"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { materialApi } from "@/lib/api-client";
import { TeacherDocument } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/**
 * Opens a published Course Material PDF through the authorized Java download route.
 * Args/input: documentId from the route and current authenticated Student session.
 * Output: actual PDF displayed by the browser. Errors: API authorization or missing-document error.
 */
export default function CourseMaterialViewerPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = params.documentId;
  const [document, setDocument] = useState<TeacherDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    materialApi.getMaterials().then((items) => {
      if (active) setDocument(items.find((item) => item.id === documentId) ?? null);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Không thể mở tài liệu.");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [documentId]);

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" text="Đang tải tài liệu..." /></div>;
  if (error) return <ErrorAlert message={error} />;
  if (!document) return <ErrorAlert message="Tài liệu không tồn tại hoặc chưa được công bố cho lớp bạn đã được duyệt." />;

  const previewUrl = materialApi.getDownloadUrl(document.id);
  const downloadUrl = materialApi.getDownloadUrl(document.id, true);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/materials" aria-label="Quay lại học liệu" className="rounded-lg border border-slate-200 p-2 text-slate-600"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600"><FileText className="h-3.5 w-3.5" /> Học liệu PDF</div>
            <h1 className="truncate text-lg font-extrabold text-slate-900">{document.title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white">
            <ExternalLink className="h-4 w-4" /> Mở PDF
          </a>
          <a href={downloadUrl} download className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <Download className="h-4 w-4" /> Tải PDF
          </a>
        </div>
      </div>
      <div className="flex min-h-[48vh] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <FileText className="h-12 w-12 text-red-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tài liệu PDF đã sẵn sàng</h2>
          <p className="mt-2 max-w-lg text-sm text-slate-500">Mở PDF trong tab mới để xem bằng trình đọc tài liệu của trình duyệt, hoặc tải file về thiết bị.</p>
        </div>
        <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white">
          <ExternalLink className="h-4 w-4" /> Mở trong trình duyệt
        </a>
      </div>
    </div>
  );
}
