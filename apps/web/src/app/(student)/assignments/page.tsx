"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ClipboardList } from "lucide-react";
import { assignmentApi, CourseAssignment } from "@/lib/api-client";

/** Args: none. Input: Student's published assignments from Java. Output: list-only assignment page. Errors: API failures appear in-page. */
export default function StudentAssignmentsPage(): ReactElement {
  const router = useRouter();
  const [items, setItems] = useState<CourseAssignment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const legacyId = new URLSearchParams(window.location.search).get("assignmentId");
    if (legacyId) router.replace("/assignments/" + encodeURIComponent(legacyId));
  }, [router]);

  /** Args: none. Input: authenticated Student session. Output: void; refreshes the published assignment list. Errors: displays Java API failure. */
  async function load(): Promise<void> {
    setLoading(true);
    setError("");
    try { setItems(await assignmentApi.listForStudent()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được danh sách bài tập."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  /** Args: one Student-visible assignment and current epoch milliseconds. Input: Java deadline/submission state. Output: status label. Errors: none. */
  function assignmentStatus(item: CourseAssignment, now: number): string {
    if (item.submission) return item.submission.status === "LATE" ? "Đã nộp muộn" : "Đã nộp";
    return Date.parse(item.dueAt) <= now ? "Quá hạn · Chưa nộp" : "Chưa nộp";
  }

  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Bài tập lớp học</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Bài tập về nhà</h1><p className="mt-2 text-sm text-slate-500">Chọn bài tập để xem hạn nộp, trả lời và đính kèm tệp.</p></header>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
    <button type="button" disabled={loading} onClick={() => void load()} className="text-sm text-red-700 underline">Tải lại bài tập</button>
    {loading && <p role="status">Đang tải bài tập...</p>}
    {!loading && !items.length && !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500"><ClipboardList className="mx-auto mb-3 h-8 w-8" />Hiện chưa có bài tập được giao.</div>}
    {!loading && items.length > 0 && <section aria-label="Danh sách bài tập" className="space-y-3">
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-800">Bài tập của bạn</h2><span className="text-xs text-slate-500">{items.length} bài tập</span></div>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
        {items.map((item) => {
          const submitted = !!item.submission;
          const overdue = !submitted && Date.parse(item.dueAt) <= Date.now();
          return <button key={item.id} type="button" onClick={() => router.push("/assignments/" + encodeURIComponent(item.id))} className="w-64 shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-red-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-200">
            <span className={submitted ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700" : overdue ? "inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700" : "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700"}>{assignmentStatus(item, Date.now())}</span>
            <span className="mt-3 block truncate font-bold text-slate-900">{item.title}</span>
            <span className="mt-1 block text-xs text-slate-500">Hạn nộp: {new Date(item.dueAt).toLocaleString("vi-VN")}</span>
            <span className="mt-3 block text-xs font-semibold text-red-700">Bấm để xem và nộp bài →</span>
          </button>;
        })}
      </div>
    </section>}
  </main>;
}
