"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { teacherApi, teacherDocApi } from "@/lib/api-client";
import type { CourseOffering } from "@/types/course-offering";
import type { CourseMaterialType } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";

/** Args: none. Input: owned offeringId and PDF upload form. Output: standalone upload screen, followed by publication review. Errors: shown inline; Java validates PDF text layer and ownership. */
export default function TeacherDocumentUploadPage(): ReactElement {
  const { offeringId } = useParams<{ offeringId: string }>();
  const router = useRouter();
  const [offering, setOffering] = useState<CourseOffering | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [materialType, setMaterialType] = useState<CourseMaterialType>("SLIDE_PDF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    teacherApi.getOfferings().then((items) => { if (active) { const found = items.find((item) => item.id === offeringId); setOffering(found ?? null); if (!found || found.status !== "ACTIVE") setError("Chỉ có thể tải học liệu vào lớp đang hoạt động do bạn phụ trách."); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được lớp học phần."); });
    return () => { active = false; };
  }, [offeringId]);
  /** Args: form submit event. Input: title, material type, and one nonempty PDF/PPTX ≤20 MiB for an owned active class. Output: Promise<void>; Java normalizes it to PDF then opens publication review. Errors: inline validation/API failure. */
  async function upload(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!offering || offering.status !== "ACTIVE") return;
    const lowerName = file?.name.toLowerCase() ?? "";
    if (!file || (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".pptx")) || !file.size || file.size > 20 * 1024 * 1024) { setError("Hãy chọn một tệp PDF hoặc PPTX không rỗng, tối đa 20 MB."); return; }
    setBusy(true); setError(null);
    try {
      const document = await teacherDocApi.uploadDocument(file, title.trim(), materialType);
      router.replace(`/teacher/documents/publications/${encodeURIComponent(document.id)}?offeringId=${encodeURIComponent(offeringId)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tải tài liệu thất bại."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl space-y-5">
    <Link href={`/teacher/documents/${encodeURIComponent(offeringId)}`} className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Học liệu của lớp</Link>
    <header><h1 className="text-2xl font-extrabold text-slate-900">Tải học liệu cho lớp</h1><p className="mt-2 text-sm text-slate-500">{offering ? `${offering.code} · ${offering.name}` : "Đang tải lớp học phần..."}</p></header>
    {error && <ErrorAlert message={error} />}
    <form onSubmit={(event) => void upload(event)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><label className="block text-sm font-semibold">Tiêu đề<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" placeholder="Bài giảng chương 2" /></label><label className="block text-sm font-semibold">Loại học liệu<select value={materialType} onChange={(event) => setMaterialType(event.target.value as CourseMaterialType)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="SLIDE_PDF">Slide PDF — xem từng trang và dùng AI Tutor</option><option value="REFERENCE_PDF">Tài liệu tham khảo — chỉ tải xuống</option></select></label><label className="block text-sm font-semibold">Tệp PDF có lớp văn bản hoặc PPTX<input required type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 w-full text-sm" /></label><p className="text-xs leading-5 text-slate-500">Tối đa 20 MB. PPTX được Java chuyển thành PDF và kiểm tra lớp văn bản trước khi lưu; không giữ tệp PPTX gốc. Sau khi xử lý, bạn xác nhận công bố cho lớp.</p><div className="flex justify-end gap-2"><Link href={`/teacher/documents/${encodeURIComponent(offeringId)}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">Hủy</Link><button disabled={busy || offering?.status !== "ACTIVE"} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang tải..." : "Tải lên và tiếp tục"}</button></div></form>
  </main>;
}
