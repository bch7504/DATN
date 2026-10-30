"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { teacherApi, teacherDocApi } from "@/lib/api-client";
import type { CourseOffering } from "@/types/course-offering";
import type { TeacherDocument } from "@/types/material";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: none. Input: owned documentId and optional target offeringId query. Output: dedicated publication editor. Errors: in-page; Java authorizes each document/class. */
export default function TeacherDocumentPublicationPage(): ReactElement {
  const { documentId } = useParams<{ documentId: string }>();
  const router = useRouter();
  const [document, setDocument] = useState<TeacherDocument | null>(null);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [backHref, setBackHref] = useState("/teacher/documents");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Args: none. Input: owner-scoped Java documents/classes. Output: Promise<void>; loads document and initializes publication choices. Errors: displays missing/denied/API failure. */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [documents, classes] = await Promise.all([teacherDocApi.getDocuments(), teacherApi.getOfferings()]);
      const record = documents.find((item) => item.id === documentId);
      if (!record) throw new Error("Không tìm thấy tài liệu trong kho của bạn.");
      const target = new URLSearchParams(window.location.search).get("offeringId");
      const ids = record.publishedOfferings.map((item) => item.offeringId);
      if (target && classes.some((item) => item.id === target && item.status === "ACTIVE") && !ids.includes(target)) ids.push(target);
      setDocument(record); setOfferings(classes); setSelected(ids); setError(null);
      setBackHref(target ? `/teacher/documents/${encodeURIComponent(target)}` : "/teacher/documents");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được thông tin công bố."); }
    finally { setLoading(false); }
  }, [documentId]);
  useEffect(() => { void load(); }, [load]);
  /** Args: required owned offering ID. Input: current checkbox selection. Output: void; toggles pending publication. Errors: none; Java revalidates on save. */
  function toggle(id: string): void { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  /** Args: none. Input: document and selected owned classes. Output: Promise<void>; saves publication set through Java and returns to class/list. Errors: leaves choices intact and displays API error. */
  async function save(): Promise<void> {
    if (!document) return;
    setBusy(true); setError(null);
    try { await teacherDocApi.publishDocument(document.id, selected); router.replace(backHref); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được công bố."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl space-y-5"><Link href={backHref} className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Quay lại kho học liệu</Link><header><h1 className="text-2xl font-extrabold text-slate-900">Quản lý công bố học liệu</h1><p className="mt-2 text-sm text-slate-500">Chọn lớp được phép xem tài liệu này.</p></header>{error && <ErrorAlert message={error} onRetry={() => void load()} />}{loading && <LoadingSpinner text="Đang tải tài liệu..." />}{!loading && document && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">{document.title}</h2><p className="text-xs text-slate-500">{document.fileName} · {document.status}</p>{document.status !== "READY" && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{document.status === "FAILED" ? "Xử lý PDF thất bại. Hãy kiểm tra tệp và tải lại." : "PDF đang được xử lý. Cập nhật trạng thái trước khi công bố."}<button type="button" onClick={() => void load()} className="ml-2 font-semibold underline">Cập nhật</button></div>}{offerings.map((offering) => <label key={offering.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selected.includes(offering.id)} disabled={busy || (!selected.includes(offering.id) && offering.status !== "ACTIVE")} onChange={() => toggle(offering.id)} className="accent-red-600" /><span><strong>{offering.code}</strong> · {offering.name}{offering.status !== "ACTIVE" && " (chỉ có thể gỡ công bố)"}</span></label>)}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Link href={backHref} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">Hủy</Link><button type="button" disabled={busy || (document.status !== "READY" && selected.length > 0)} onClick={() => void save()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Lưu công bố"}</button></div></section>}</main>;
}
