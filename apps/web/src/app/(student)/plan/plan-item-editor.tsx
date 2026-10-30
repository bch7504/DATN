"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { studyPlanApi, studentApi, type StudyPlanItemRecord, type StudyPlanRecord } from "@/lib/api-client";
import type { CourseOffering } from "@/types/course-offering";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: ISO instant or Date. Input: valid date. Output: local datetime input value. Errors: invalid date returns empty string. */
function localInput(value: string | Date): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
}

/** Args: required planId and optional itemId. Input: Student-owned active plan, item metadata and form fields. Output: dedicated schedule/task editor. Errors: displayed inline; Java remains business-rule authority. */
export function PlanItemEditor({ planId, itemId }: { planId: string; itemId?: string }): ReactElement {
  const router = useRouter();
  const [plan, setPlan] = useState<StudyPlanRecord | null>(null);
  const [item, setItem] = useState<StudyPlanItemRecord | null>(null);
  const [type, setType] = useState<"TASK" | "STUDY_SESSION" | "QUIZ">("TASK");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [due, setDue] = useState("");
  const [reminder, setReminder] = useState(1440);
  const [classes, setClasses] = useState<CourseOffering[]>([]);
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backHref, setBackHref] = useState(`/plan?planId=${encodeURIComponent(planId)}`);
  useEffect(() => {
    let active = true;
    /** Args: none. Input: plan/item route and optional creation date/type query. Output: Promise<void>; loads authorized metadata and form defaults. Errors: unavailable item/plan shown inline. */
    async function load(): Promise<void> {
      try {
        const query = new URLSearchParams(window.location.search);
        const day = query.get("date") || localInput(new Date()).slice(0, 10);
        const requestedType = query.get("type");
        const kind = requestedType === "STUDY_SESSION" || requestedType === "QUIZ" ? requestedType : "TASK";
        const ownedPlan = await studyPlanApi.getPlan(planId);
        let record: StudyPlanItemRecord | undefined;
        if (itemId) {
          const first = await studyPlanApi.listItems(planId);
          record = first.items.find((entry) => entry.id === itemId);
          for (let page = 1; !record && page < first.totalPages; page += 1) record = (await studyPlanApi.listItems(planId, page)).items.find((entry) => entry.id === itemId);
          if (!record) throw new Error("Không tìm thấy lịch hoặc nhiệm vụ.");
        }
        if (!active) return;
        setPlan(ownedPlan); setItem(record ?? null);
        setTitle(record?.title ?? ""); setType(record?.type ?? kind);
        setStart(record?.scheduledStart ? localInput(record.scheduledStart) : `${day}T09:00`);
        setEnd(record?.scheduledEnd ? localInput(record.scheduledEnd) : `${day}T10:00`);
        setDue(record ? record.dueAt ? localInput(record.dueAt) : "" : `${day}T${kind === "TASK" ? "21" : "10"}:00`);
        setReminder(record?.dueAt && record.reminderAt ? Math.round((Date.parse(record.dueAt) - Date.parse(record.reminderAt)) / 60000) : kind === "TASK" ? 1440 : 60);
        const focusDate = record?.scheduledStart || record?.dueAt;
        setBackHref(`/plan?planId=${encodeURIComponent(planId)}&date=${encodeURIComponent(focusDate ? localInput(focusDate).slice(0, 10) : day)}`);
        if (ownedPlan.status !== "ACTIVE") setError("Kế hoạch đã lưu trữ, không thể chỉnh sửa.");
        else if (record?.lateCompleted) setError("Nhiệm vụ đã hoàn thành muộn, chỉ có thể xóa.");
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Không tải được thông tin lịch."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    studentApi.getOfferings().then((records) => { if (active) setClasses(records); }).catch(() => { /* Optional class labels do not block personal planning. */ });
    return () => { active = false; };
  }, [planId, itemId]);

  /** Args: form event. Input: nonempty title, valid local time range/deadline and optional class label. Output: Promise<void>; persists via Java, refreshes notification bell and returns to the saved week. Errors: keeps inputs and shows API/validation error. */
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!plan || plan.status !== "ACTIVE" || item?.lateCompleted) return;
    const scheduled = type !== "TASK" || !!item?.scheduledStart || !!item?.scheduledEnd;
    if (scheduled && (!start || !end || new Date(end) <= new Date(start))) { setError("Giờ kết thúc phải sau giờ bắt đầu."); return; }
    if (!due && (!itemId || type === "TASK")) { setError("Hãy chọn hạn hoàn thành."); return; }
    setBusy(true); setError(null);
    try {
      const label = classes.find((entry) => entry.id === classId);
      const input = { title: title.trim(), description: item?.description ?? (label ? `Nhãn lớp: ${label.code} · ${label.name}` : undefined), type, scheduledStart: scheduled ? new Date(start).toISOString() : undefined, scheduledEnd: scheduled ? new Date(end).toISOString() : undefined, dueAt: due ? new Date(due).toISOString() : undefined, reminderMinutesBefore: due ? reminder : undefined };
      const saved = itemId ? await studyPlanApi.updateItem(planId, itemId, input) : await studyPlanApi.createItem(planId, input);
      window.dispatchEvent(new Event("studyflow:notifications-updated"));
      router.replace(`/plan?planId=${encodeURIComponent(planId)}&date=${encodeURIComponent(localInput(saved.scheduledStart || saved.dueAt || new Date()).slice(0, 10))}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được lịch hoặc nhiệm vụ."); }
    finally { setBusy(false); }
  }
  const locked = busy || plan?.status !== "ACTIVE" || !!item?.lateCompleted;
  return <main className="mx-auto max-w-2xl space-y-5"><Link href={backHref} className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Kế hoạch & Lịch</Link><header><h1 className="text-2xl font-extrabold text-slate-900">{itemId ? "Sửa lịch / nhiệm vụ" : type === "TASK" ? "Thêm nhiệm vụ" : "Thêm lịch cá nhân"}</h1><p className="mt-2 text-sm text-slate-500">{plan?.title}</p></header>{error && <ErrorAlert message={error} />}{loading ? <LoadingSpinner text="Đang tải kế hoạch..." /> : plan && (!itemId || item) && <form onSubmit={(event) => void save(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><fieldset disabled={locked} className="space-y-4"><label className="block text-sm font-semibold">Nội dung<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>{!itemId && type !== "TASK" && <label className="block text-sm font-semibold">Loại lịch<select value={type} onChange={(event) => setType(event.target.value as "STUDY_SESSION" | "QUIZ")} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="STUDY_SESSION">Tự học</option><option value="QUIZ">Ôn Quiz</option></select></label>}{(type !== "TASK" || !!item?.scheduledStart || !!item?.scheduledEnd) && <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Bắt đầu<input type="datetime-local" required value={start} onChange={(event) => setStart(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label><label className="block text-sm font-semibold">Kết thúc<input type="datetime-local" required min={start} value={end} onChange={(event) => { setEnd(event.target.value); if (!itemId) setDue(event.target.value); }} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label></div>}<label className="block text-sm font-semibold">Hạn hoàn thành<input type="datetime-local" required={!itemId || type === "TASK"} value={due} onChange={(event) => setDue(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label><label className="block text-sm font-semibold">Nhắc trước hạn (phút)<input type="number" required min={0} max={10080} value={reminder} onChange={(event) => setReminder(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>{!itemId && type !== "TASK" && classes.length > 0 && <label className="block text-sm font-semibold">Nhãn lớp học (tùy chọn)<select value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="">Lịch cá nhân</option>{classes.map((entry) => <option key={entry.id} value={entry.id}>{entry.code} · {entry.name}</option>)}</select></label>}</fieldset><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Link href={backHref} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">Hủy</Link><button disabled={locked || !title.trim()} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Lưu thay đổi"}</button></div></form>}</main>;
}
