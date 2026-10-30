"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ClipboardList, Plus } from "lucide-react";
import { assignmentApi, CourseAssignment, teacherApi } from "@/lib/api-client";
import { CourseOffering } from "@/types/course-offering";

/**
 * Args: none. Input: authenticated Teacher's offerings and assignments from Java.
 * Output: list-only page; each assignment opens its own URL. Errors: API failures appear as an alert.
 */
export default function TeacherAssignmentsPage(): ReactElement {
  const router = useRouter();
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [offeringId, setOfferingId] = useState("");
  const [items, setItems] = useState<CourseAssignment[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const legacyAssignmentId = query.get("assignmentId");
    if (legacyAssignmentId) {
      router.replace("/teacher/assignments/" + encodeURIComponent(legacyAssignmentId));
      return;
    }
    setOfferingId(query.get("offeringId") ?? "");
  }, [router]);

  useEffect(() => {
    let mounted = true;
    teacherApi.getOfferings()
      .then((result) => { if (mounted) { setOfferings(result); setReady(true); } })
      .catch((cause) => { if (mounted) { setError(cause instanceof Error ? cause.message : "Không tải được lớp học phần."); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const request = ++requestId.current;
    if (offeringId && !offerings.some((offering) => offering.id === offeringId)) {
      setOfferingId("");
      router.replace("/teacher/assignments", { scroll: false });
      return;
    }
    setLoading(true);
    const ids = offeringId ? [offeringId] : offerings.map((offering) => offering.id);
    Promise.all(ids.map((id) => assignmentApi.listForTeacher(id)))
      .then((groups) => {
        if (request === requestId.current) {
          setItems(groups.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
          setError("");
        }
      })
      .catch((cause) => { if (request === requestId.current) setError(cause instanceof Error ? cause.message : "Không tải được danh sách bài tập."); })
      .finally(() => { if (request === requestId.current) setLoading(false); });
  }, [offeringId, offerings, ready, router]);

  /** Args: next class ID or empty for all. Input: owned class selector. Output: void; updates the list URL and data. Errors: handled by the loading effect. */
  function changeOffering(nextId: string): void {
    setOfferingId(nextId);
    router.replace(nextId ? "/teacher/assignments?offeringId=" + encodeURIComponent(nextId) : "/teacher/assignments", { scroll: false });
  }

  /** Args: assignment DTO from the current list. Input: owned item. Output: void; opens the detail route. Errors: none. */
  function openAssignment(item: CourseAssignment): void {
    const query = offeringId ? "?offeringId=" + encodeURIComponent(offeringId) : "";
    router.push("/teacher/assignments/" + encodeURIComponent(item.id) + query);
  }

  const activeOffering = offerings.find((item) => item.id === offeringId);
  const hasActiveOffering = offerings.some((item) => item.status === "ACTIVE");

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Dành cho giảng viên</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Bài tập về nhà</h1>
          <p className="mt-2 text-sm text-slate-500">Chọn một bài tập để xem hướng dẫn, hạn nộp và tình trạng nộp bài.</p>
        </div>
        <button
          type="button"
          disabled={!hasActiveOffering}
          onClick={() => router.push(offeringId ? "/teacher/assignments/new?offeringId=" + encodeURIComponent(offeringId) : "/teacher/assignments/new")}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Giao bài tập
        </button>
      </header>

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

      <label className="block max-w-xl text-sm font-semibold text-slate-700">
        Lớp học phần
        <select value={offeringId} onChange={(event) => changeOffering(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">
          <option value="">Tất cả</option>
          {offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.code} · {offering.name}</option>)}
        </select>
      </label>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Danh sách bài tập</h2>
            <p className="mt-1 text-sm text-slate-500">{activeOffering ? activeOffering.code + " · " + activeOffering.name : "Tất cả lớp học phần"}</p>
          </div>
          {!loading && <span className="text-xs text-slate-500">{items.length} bài</span>}
        </div>

        {loading ? (
          <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-500">Đang tải bài tập...</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            <ClipboardList className="mx-auto mb-2 h-7 w-7" />
            {offeringId ? "Chưa có bài tập trong lớp này." : "Chưa có bài tập nào."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {items.map((item) => (
              <button key={item.id} type="button" onClick={() => openAssignment(item)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-slate-900">{item.title}</span>
                    {!offeringId && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{offerings.find((offering) => offering.id === item.courseOfferingId)?.code ?? "Lớp học phần"}</span>}
                    <span className={item.status === "DRAFT" ? "rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800" : "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"}>
                      {item.status === "DRAFT" ? "Bản nháp" : "Đã giao"}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">Hạn nộp: {new Date(item.dueAt).toLocaleString("vi-VN")}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-red-700">Xem chi tiết →</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
