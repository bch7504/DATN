"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { teacherDocApi, teacherLibraryApi } from "@/lib/api-client";
import type { CourseMaterialType, TeacherResourceLibrary } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";

/** Uploads a private Teacher PDF/PPTX and optionally files it in one owned library. */
export default function TeacherPrivateDocumentUploadPage(): React.JSX.Element {
  const router = useRouter();
  const [libraries, setLibraries] = useState<TeacherResourceLibrary[]>([]);
  const [libraryId, setLibraryId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [materialType, setMaterialType] = useState<CourseMaterialType>("SLIDE_PDF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    teacherLibraryApi.list().then((items) => {
      setLibraries(items);
      const requested = new URLSearchParams(window.location.search).get("libraryId");
      const fallback = items.find((item) => item.libraryType === "DEFAULT") ?? items[0];
      setLibraryId(items.some((item) => item.id === requested) ? requested ?? "" : fallback?.id ?? "");
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không tải được danh sách kho."));
  }, []);

  /** Args: form event. Input: title, PDF/PPTX, material type and optional owned library. Output: uploaded document filed in the selected library. Errors: shown inline. */
  async function upload(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!libraryId) {
      setError("Hãy tạo và chọn một kho giảng viên trước khi tải tài liệu.");
      return;
    }
    const lowerName = file?.name.toLowerCase() ?? "";
    if (!file || (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".pptx")) || file.size === 0 || file.size > 20 * 1024 * 1024) {
      setError("Hãy chọn một tệp PDF hoặc PPTX không rỗng, tối đa 20 MB.");
      return;
    }
    setBusy(true); setError(null);
    try {
      await teacherDocApi.uploadDocument(file, title.trim(), materialType, libraryId || undefined);
      router.replace(libraryId ? `/teacher/documents/libraries/${encodeURIComponent(libraryId)}` : "/teacher/documents");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Tải tài liệu thất bại.");
    } finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-2xl space-y-5">
    <Link href="/teacher/documents" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Kho tài liệu</Link>
    <header><h1 className="text-2xl font-extrabold text-slate-900">Tải tài liệu từ máy</h1><p className="mt-2 text-sm text-slate-500">Chọn kho giảng viên để lưu tài liệu. Tệp PPTX được Java tự động chuyển thành PDF, kiểm tra lớp văn bản rồi mới lưu.</p></header>
    {error && <ErrorAlert message={error} />}
    <form onSubmit={(event) => void upload(event)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-semibold">Kho giảng viên<select value={libraryId} onChange={(event) => setLibraryId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="">Tài liệu tải lên (mặc định)</option>{libraries.map((item) => <option key={item.id} value={item.id}>{item.name}{item.libraryType === "DEFAULT" ? " · Mặc định" : item.subjectName ? ` · ${item.subjectName}` : ""}</option>)}</select></label>
      <label className="block text-sm font-semibold">Tiêu đề<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
      <label className="block text-sm font-semibold">Loại tài liệu<select value={materialType} onChange={(event) => setMaterialType(event.target.value as CourseMaterialType)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="SLIDE_PDF">Slide PDF — có thể công bố, xem và dùng AI</option><option value="REFERENCE_PDF">Tài liệu tham khảo — chỉ tải xuống</option></select></label>
      <label className="block text-sm font-semibold">Tệp PDF có lớp văn bản hoặc PPTX<input required type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 w-full text-sm" /></label>
      <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">Nếu chọn PPTX: tải lên → chuyển PDF tự động → kiểm tra lớp văn bản → lưu vào kho đã chọn. Hệ thống không giữ tệp PPTX gốc.</p>
      <div className="flex justify-end gap-2"><Link href="/teacher/documents" className="rounded-xl border border-slate-300 px-4 py-2 text-sm">Hủy</Link><button disabled={busy} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang tải và xử lý..." : "Tải lên và thêm vào kho"}</button></div>
    </form>
  </main>;
}
