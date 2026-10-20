"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";
import {
  StudyPlanItemRecord,
  StudyPlanRecord,
  SaveStudyPlanItemInput,
  studyPlanApi,
} from "@/lib/api-client";

const TIME_SLOTS = [
  { value: "07:00", label: "07:00 – 09:00", period: "Sáng" },
  { value: "09:00", label: "09:00 – 11:00", period: "Sáng" },
  { value: "13:00", label: "13:00 – 15:00", period: "Chiều" },
  { value: "15:00", label: "15:00 – 17:00", period: "Chiều" },
  { value: "19:00", label: "19:00 – 21:00", period: "Tối" },
] as const;

const WEEKDAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateTimeToInstant(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function localTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function sameLocalDate(left: string, right: Date): boolean {
  return dateInputValue(new Date(left)) === dateInputValue(right);
}

function planDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  return {
    startDate: `${today.getFullYear() - 1}-01-01`,
    endDate: `${today.getFullYear() + 1}-12-31`,
  };
}

/** Args: none. Input: authenticated Student and Java plan/calendar DTOs. Output: personal planning page. Errors: API errors are shown without local fixture fallback. */
export default function StudentPlanPage() {
  const [activePlan, setActivePlan] = useState<StudyPlanRecord | null>(null);
  const [plans, setPlans] = useState<StudyPlanRecord[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [newPlanTitle, setNewPlanTitle] = useState("Kế hoạch học tập cá nhân");
  const [newPlanStart, setNewPlanStart] = useState(() => planDateRange().startDate);
  const [newPlanEnd, setNewPlanEnd] = useState(() => planDateRange().endDate);
  const [planTitle, setPlanTitle] = useState("");
  const [planStart, setPlanStart] = useState("");
  const [planEnd, setPlanEnd] = useState("");
  const [items, setItems] = useState<StudyPlanItemRecord[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(dateInputValue(new Date()));
  const [scheduleStart, setScheduleStart] = useState("07:00");
  const [scheduleType, setScheduleType] = useState<"STUDY_SESSION" | "QUIZ">("STUDY_SESSION");
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDuration, setScheduleDuration] = useState(60);
  const [editingItem, setEditingItem] = useState<StudyPlanItemRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editReminder, setEditReminder] = useState(1440);
  const [reloadKey, setReloadKey] = useState(0);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState(() => {
    const tomorrow = addDays(new Date(), 1);
    return `${dateInputValue(tomorrow)}T21:00`;
  });

  const weekStart = useMemo(
    () => addDays(startOfWeek(new Date()), weekOffset * 7),
    [weekOffset]
  );
  const weekDays = useMemo(
    () => WEEKDAY_NAMES.map((name, index) => ({ date: addDays(weekStart, index), name })),
    [weekStart]
  );

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const plans = await studyPlanApi.listPlans("ACTIVE");
        const plan = plans.items.find((item) => item.id === selectedPlanId) ?? plans.items[0] ?? null;
        if (cancelled) return;
        setPlans(plans.items);
        setActivePlan(plan);
        setPlanTitle(plan?.title ?? "");
        setPlanStart(plan?.startDate ?? ""); setPlanEnd(plan?.endDate ?? "");
        const from = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        const to = addDays(from, 7);
        const calendar = await studyPlanApi.getCalendar(from.toISOString(), to.toISOString());
        if (!cancelled) setItems(calendar.items);
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Không tải được kế hoạch học tập.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [weekStart, reloadKey, selectedPlanId]);

  const scheduledItems = items.filter(
    (item) => item.status !== "CANCELLED" && item.scheduledStart && item.scheduledEnd
  );
  const taskItems = items.filter(
    (item) => item.status !== "CANCELLED" && item.dueAt && item.type === "TASK"
  );

  async function refreshCurrentWeek(): Promise<void> {
    const from = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    const to = addDays(from, 7);
    const calendar = await studyPlanApi.getCalendar(from.toISOString(), to.toISOString());
    setItems(calendar.items);
  }

  async function createPlan(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const plan = await studyPlanApi.createPlan({
        title: newPlanTitle.trim(),
        description: "Kế hoạch và lịch học do sinh viên tự quản lý.",
        startDate: newPlanStart,
        endDate: newPlanEnd,
      });
      setActivePlan(plan);
      setSelectedPlanId(plan.id);
      setReloadKey((value) => value + 1);
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : "Không tạo được kế hoạch.");
    } finally {
      setSaving(false);
    }
  }

  /** Args: form submit event. Input: selected active plan, title and inclusive date range.
   * Output: void, persists fields via Java and refreshes list. Errors: shown in-page without losing input.
   */
  async function renamePlan(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!activePlan || saving || !planTitle.trim()) return;
    setSaving(true); setError(null);
    try {
      await studyPlanApi.updatePlan(activePlan.id, { title: planTitle.trim(), description: activePlan.description ?? undefined,
        startDate: planStart, endDate: planEnd, status: "ACTIVE" });
      setReloadKey((value) => value + 1);
    } catch (saveError: unknown) { setError(saveError instanceof Error ? saveError.message : "Không đổi được tên kế hoạch."); }
    finally { setSaving(false); }
  }

  /** Args: none. Input: selected owned plan and user's confirmation. Output: void, soft archives and reloads.
   * Errors: Java auth/ownership/conflict errors shown in-page; no local deletion on failure.
   */
  async function archivePlan(): Promise<void> {
    if (!activePlan || saving || !window.confirm(`Lưu trữ kế hoạch "${activePlan.title}"?`)) return;
    setSaving(true); setError(null);
    try {
      await studyPlanApi.archivePlan(activePlan.id);
      setSelectedPlanId(null); setReloadKey((value) => value + 1);
    } catch (archiveError: unknown) { setError(archiveError instanceof Error ? archiveError.message : "Không lưu trữ được kế hoạch."); }
    finally { setSaving(false); }
  }

  function openSchedule(date: Date, time = "07:00"): void {
    setScheduleDate(dateInputValue(date));
    setScheduleStart(time);
    setScheduleTitle("");
    setScheduleModalOpen(true);
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!activePlan || !scheduleTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const start = dateTimeToInstant(scheduleDate, scheduleStart);
      const endDate = new Date(new Date(start).getTime() + scheduleDuration * 60 * 1000).toISOString();
      await studyPlanApi.createItem(activePlan.id, {
        title: scheduleTitle.trim(),
        type: scheduleType,
        scheduledStart: start,
        scheduledEnd: endDate,
        dueAt: endDate,
        reminderMinutesBefore: 60,
      });
      setScheduleModalOpen(false);
      await refreshCurrentWeek();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được lịch học.");
    } finally {
      setSaving(false);
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!activePlan || !taskTitle.trim() || !taskDueAt) return;
    setSaving(true);
    setError(null);
    try {
      await studyPlanApi.createItem(activePlan.id, {
        title: taskTitle.trim(),
        type: "TASK",
        dueAt: new Date(taskDueAt).toISOString(),
      });
      setTaskTitle("");
      await refreshCurrentWeek();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Không thêm được nhiệm vụ.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(item: StudyPlanItemRecord): Promise<void> {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await studyPlanApi.changeItemStatus(
        item.id,
        item.status === "COMPLETED" ? "TODO" : "COMPLETED",
        item.status === "COMPLETED" ? undefined : `study-plan-${item.id}-${crypto.randomUUID()}`
      );
      await refreshCurrentWeek();
    } catch (statusError: unknown) {
      setError(statusError instanceof Error ? statusError.message : "Không cập nhật được trạng thái.");
    } finally { setSaving(false); }
  }

  async function cancelItem(item: StudyPlanItemRecord): Promise<void> {
    if (saving || !window.confirm(`Xóa "${item.title}" khỏi kế hoạch?`)) return;
    setSaving(true);
    setError(null);
    try {
      await studyPlanApi.cancelItem(item.planId, item.id);
      await refreshCurrentWeek();
    } catch (cancelError: unknown) {
      setError(cancelError instanceof Error ? cancelError.message : "Không xóa được lịch hoặc nhiệm vụ.");
    } finally { setSaving(false); }
  }

  /** Args: ISO instant or null. Output: local datetime input string. Errors: invalid server date throws RangeError. */
  function toLocalInput(value: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  /** Args: owned item. Output: void; prefill edit dialog without writes, preserving schedule/deadline/reminder. */
  function openEdit(item: StudyPlanItemRecord): void {
    setEditingItem(item); setEditTitle(item.title);
    setEditStart(toLocalInput(item.scheduledStart)); setEditEnd(toLocalInput(item.scheduledEnd)); setEditDue(toLocalInput(item.dueAt));
    setEditReminder(item.dueAt && item.reminderAt ? Math.round((Date.parse(item.dueAt) - Date.parse(item.reminderAt)) / 60000) : 1440);
  }

  /** Args: form submit event. Input: edited item and complete fields; Java enforces ownership and overlap rules.
   * Output: void; persists changes and reloads calendar. Errors stay visible and keep the dialog open.
   */
  async function saveEdit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!editingItem || saving) return;
    setSaving(true); setError(null);
    try {
      const input: SaveStudyPlanItemInput = {
        title: editTitle.trim(), description: editingItem.description ?? undefined, type: editingItem.type,
        scheduledStart: editStart ? new Date(editStart).toISOString() : undefined,
        scheduledEnd: editEnd ? new Date(editEnd).toISOString() : undefined,
        dueAt: editDue ? new Date(editDue).toISOString() : undefined,
        reminderMinutesBefore: editDue ? editReminder : undefined,
      };
      await studyPlanApi.updateItem(editingItem.planId, editingItem.id, input);
      setEditingItem(null); await refreshCurrentWeek();
    } catch (editError: unknown) {
      setError(editError instanceof Error ? editError.message : "Không cập nhật được kế hoạch.");
    } finally { setSaving(false); }
  }

  const weekLabel = `${formatDate(weekStart)} – ${formatDate(addDays(weekStart, 6))}/${addDays(weekStart, 6).getFullYear()}`;

  return (
    <main className="space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-red-50 p-2 text-red-700"><CalendarCheck className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Kế hoạch &amp; Lịch học cá nhân</h1>
            <p className="mt-1 text-sm text-slate-500">Lịch và nhiệm vụ được lưu trong tài khoản của bạn.</p>
          </div>
        </div>
        {activePlan && <button type="button" onClick={() => openSchedule(new Date())} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800"><Plus className="h-4 w-4" />Thêm lịch học</button>}
      </header>

      {error && <ErrorAlert message={error} onRetry={() => setReloadKey((value) => value + 1)} />}

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" text="Đang tải kế hoạch..." /></div>
      ) : !activePlan ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <CalendarCheck className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">Bạn chưa có kế hoạch học tập</h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">Tạo kế hoạch cá nhân để lưu lịch tự học, lịch ôn Quiz và nhiệm vụ cần hoàn thành.</p>
          <label className="mx-auto mt-4 block max-w-sm text-left text-sm">Tên kế hoạch<input required maxLength={200} value={newPlanTitle} onChange={(event) => setNewPlanTitle(event.target.value)} className="mt-1 w-full rounded-xl border p-2" /></label>
          <div className="mx-auto mt-3 flex max-w-sm gap-2"><label className="w-1/2 text-left text-sm">Từ ngày<input required type="date" value={newPlanStart} onChange={(event) => setNewPlanStart(event.target.value)} className="mt-1 w-full rounded-xl border p-2" /></label><label className="w-1/2 text-left text-sm">Đến ngày<input required type="date" min={newPlanStart} value={newPlanEnd} onChange={(event) => setNewPlanEnd(event.target.value)} className="mt-1 w-full rounded-xl border p-2" /></label></div>
          <button type="button" disabled={saving || !newPlanTitle.trim() || !newPlanStart || newPlanEnd < newPlanStart} onClick={() => void createPlan()} className="mt-5 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Đang tạo..." : "Tạo kế hoạch cá nhân"}</button>
        </section>
      ) : (
        <>
          <section className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4">
            <label className="text-sm">Chọn kế hoạch<select disabled={saving} value={activePlan.id} onChange={(event) => setSelectedPlanId(event.target.value)} className="ml-2 rounded-xl border p-2">{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label>
            <form onSubmit={(event) => void renamePlan(event)} className="flex flex-wrap items-end gap-2"><label className="text-sm">Tên kế hoạch<input required maxLength={200} value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} className="ml-2 rounded-xl border p-2" /></label><label className="text-sm">Từ ngày<input required type="date" value={planStart} onChange={(event) => setPlanStart(event.target.value)} className="ml-2 rounded-xl border p-2" /></label><label className="text-sm">Đến ngày<input required type="date" min={planStart} value={planEnd} onChange={(event) => setPlanEnd(event.target.value)} className="ml-2 rounded-xl border p-2" /></label><button disabled={saving || !planTitle.trim() || !planStart || planEnd < planStart} className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50">Lưu kế hoạch</button></form>
            <button type="button" disabled={saving} onClick={() => void archivePlan()} className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">Lưu trữ</button>
            <details className="text-sm"><summary className="cursor-pointer text-red-700">Tạo kế hoạch khác</summary><label className="mt-2 block">Tên kế hoạch<input required maxLength={200} value={newPlanTitle} onChange={(event) => setNewPlanTitle(event.target.value)} className="ml-2 rounded-xl border p-2" /></label><label className="mt-2 block">Từ ngày<input required type="date" value={newPlanStart} onChange={(event) => setNewPlanStart(event.target.value)} className="ml-2 rounded-xl border p-2" /></label><label className="mt-2 block">Đến ngày<input required type="date" min={newPlanStart} value={newPlanEnd} onChange={(event) => setNewPlanEnd(event.target.value)} className="ml-2 rounded-xl border p-2" /></label><button type="button" disabled={saving || !newPlanTitle.trim() || !newPlanStart || newPlanEnd < newPlanStart} onClick={() => void createPlan()} className="mt-2 rounded-xl bg-red-700 px-3 py-2 text-white disabled:opacity-50">Tạo</button></details>
          </section>
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:p-5">
              <div>
                <h2 className="font-bold text-slate-900">{activePlan.title}</h2>
                <p className="mt-1 text-xs text-slate-500">Tuần {weekLabel}</p>
              </div>
              <nav aria-label="Chuyển tuần" className="flex items-center gap-2">
                <button type="button" onClick={() => setWeekOffset((offset) => offset - 1)} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" aria-label="Tuần trước"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => setWeekOffset(0)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Tuần này</button>
                <button type="button" onClick={() => setWeekOffset((offset) => offset + 1)} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" aria-label="Tuần sau"><ChevronRight className="h-4 w-4" /></button>
              </nav>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="w-32 border-r border-slate-200 p-3 text-center">Khung giờ</th>
                  {weekDays.map(({ date, name }) => <th key={name} className="border-r border-slate-200 p-3 text-center last:border-0"><span className="block font-bold">{name}</span><span className="mt-1 block text-slate-400">{formatDate(date)}</span></th>)}
                </tr></thead>
                <tbody>{TIME_SLOTS.map((slot) => <tr key={slot.value} className="border-b border-slate-100 last:border-0">
                  <th className="border-r border-slate-200 bg-slate-50/60 p-3 text-center font-medium text-slate-600"><span className="block">{slot.label}</span><span className="mt-1 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10px]">{slot.period}</span></th>
                  {weekDays.map(({ date, name }) => {
                    const item = scheduledItems.find((candidate) => candidate.scheduledStart && sameLocalDate(candidate.scheduledStart, date) && localTime(candidate.scheduledStart) === slot.value);
                    return <td key={name} className="h-24 border-r border-slate-100 p-2 align-top last:border-0">
                      {item ? <article className={`group relative h-full rounded-xl border p-2.5 ${item.type === "QUIZ" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                        <button type="button" onClick={() => void cancelItem(item)} className="absolute right-1 top-1 rounded p-1 text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100" aria-label={`Xóa lịch ${item.title}`}><X className="h-3 w-3" /></button>
                        <p className="pr-4 font-bold leading-snug text-slate-800">{item.title}</p><p className="mt-1 text-[10px] text-slate-500">{localTime(item.scheduledStart)}–{localTime(item.scheduledEnd)} · {item.type === "QUIZ" ? "Ôn Quiz" : "Tự học"}</p>
                      </article> : <button type="button" onClick={() => openSchedule(date, slot.value)} className="flex h-full min-h-16 w-full items-center justify-center rounded-xl text-slate-300 hover:bg-red-50 hover:text-red-700">+ Thêm lịch</button>}
                    </td>;
                  })}
                </tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Tất cả lịch học trong tuần</h2>
            <p className="text-xs text-slate-500">Hiển thị cả lịch ngoài khung giờ trong bảng. Giờ hiển thị theo múi giờ thiết bị. Lịch mới được nhắc trước giờ kết thúc 60 phút.</p>
            {scheduledItems.length === 0 && <p className="text-sm text-slate-500">Chưa có lịch học trong tuần.</p>}
            {scheduledItems.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><p className="font-semibold">{item.title} · {item.status === "COMPLETED" ? "Đã hoàn thành" : "Chưa hoàn thành"}</p><p className="text-xs text-slate-500">{item.scheduledStart && formatDateTime(item.scheduledStart)} – {item.scheduledEnd && formatDateTime(item.scheduledEnd)}</p></div><div className="flex gap-3 text-sm"><button disabled={saving} onClick={() => openEdit(item)} className="text-red-700">Sửa lịch</button><button disabled={saving} onClick={() => void toggleTask(item)}>{item.status === "COMPLETED" ? "Bỏ hoàn thành" : "Hoàn thành"}</button><button disabled={saving} onClick={() => void cancelItem(item)} className="text-red-700">Xóa</button></div></article>)}
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div><h2 className="font-bold text-slate-900">Nhiệm vụ trong tuần ({taskItems.filter((item) => item.status === "COMPLETED").length}/{taskItems.length} hoàn thành)</h2><p className="mt-1 text-xs text-slate-500">Đánh dấu hoàn thành để lưu tiến độ vào hệ thống.</p></div>
            <form onSubmit={(event) => void addTask(event)} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required maxLength={200} placeholder="Tên nhiệm vụ cần làm..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} required className="rounded-xl border border-slate-300 px-3 py-2 text-sm" aria-label="Hạn hoàn thành" />
              <button type="submit" disabled={saving || !taskTitle.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Thêm nhiệm vụ</button>
            </form>
            {taskItems.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Tuần này chưa có nhiệm vụ. Thêm nhiệm vụ ở trên để lưu vào kế hoạch.</p> : <div className="grid gap-3 md:grid-cols-2">
              {taskItems.map((item) => <article key={item.id} className={`flex items-start gap-3 rounded-2xl border p-3.5 ${item.status === "COMPLETED" ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`}>
                <input type="checkbox" disabled={saving} checked={item.status === "COMPLETED"} onChange={() => void toggleTask(item)} className="mt-1 h-4 w-4 accent-red-700" aria-label={`Đánh dấu ${item.title} ${item.status === "COMPLETED" ? "chưa hoàn thành" : "hoàn thành"}`} />
                <div className="min-w-0 flex-1"><p className={`text-sm font-semibold ${item.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>{item.title}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" />Hạn: {item.dueAt ? formatDateTime(item.dueAt) : "Chưa đặt"}</p></div>
                <button type="button" disabled={saving} onClick={() => openEdit(item)} className="rounded p-1 text-slate-400 hover:text-red-700" aria-label={`Sửa nhiệm vụ ${item.title}`}><Pencil className="h-4 w-4" /></button>
                <button type="button" disabled={saving} onClick={() => void cancelItem(item)} className="rounded p-1 text-slate-400 hover:text-red-700" aria-label={`Xóa nhiệm vụ ${item.title}`}><Trash2 className="h-4 w-4" /></button>
              </article>)}
            </div>}
          </section>
        </>
      )}

      {isScheduleModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title" className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <header className="flex items-center justify-between"><h2 id="schedule-modal-title" className="font-bold text-slate-900">Thêm lịch cá nhân</h2><button type="button" onClick={() => setScheduleModalOpen(false)} aria-label="Đóng" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></header>
          <form onSubmit={(event) => void saveSchedule(event)} className="space-y-3">
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <label className="block text-sm font-semibold text-slate-700">Thời lượng (phút)<input type="number" min={15} max={720} step={15} required value={scheduleDuration} onChange={(event) => setScheduleDuration(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <label className="block text-sm font-semibold text-slate-700">Ngày<input type="date" required value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <label className="block text-sm font-semibold text-slate-700">Khung giờ bắt đầu<select value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2">{TIME_SLOTS.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}</select></label>
            <fieldset><legend className="mb-1 text-sm font-semibold text-slate-700">Loại lịch</legend><div className="grid grid-cols-2 gap-2">{([{ id: "STUDY_SESSION", label: "Tự học" }, { id: "QUIZ", label: "Ôn Quiz" }] as const).map((option) => <button key={option.id} type="button" onClick={() => setScheduleType(option.id)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${scheduleType === option.id ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-600"}`}>{option.label}</button>)}</div></fieldset>
            <label className="block text-sm font-semibold text-slate-700">Nội dung<input value={scheduleTitle} onChange={(event) => setScheduleTitle(event.target.value)} required maxLength={200} placeholder="Ví dụ: Ôn chương 2" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setScheduleModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Hủy</button><button type="submit" disabled={saving} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu lịch"}</button></div>
          </form>
        </section>
      </div>}
      {editingItem && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="edit-item-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><h2 id="edit-item-title" className="mb-4 font-bold">Sửa lịch / nhiệm vụ</h2><form onSubmit={(event) => void saveEdit(event)} className="space-y-3">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <label className="block text-sm">Tên<input required maxLength={200} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">Bắt đầu (nếu có lịch)<input type="datetime-local" required={!!editEnd} value={editStart} onChange={(event) => setEditStart(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">Kết thúc<input type="datetime-local" required={!!editStart} value={editEnd} onChange={(event) => setEditEnd(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">Hạn hoàn thành<input type="datetime-local" required={!editStart} value={editDue} onChange={(event) => setEditDue(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        {editDue && <label className="block text-sm">Nhắc trước hạn (phút)<input type="number" min={0} max={10080} required value={editReminder} onChange={(event) => setEditReminder(Number(event.target.value))} className="mt-1 w-full rounded border p-2" /></label>}
        <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setEditingItem(null)}>Hủy</button><button disabled={saving} className="rounded-lg bg-red-700 px-4 py-2 text-white">Lưu thay đổi</button></div>
      </form></section></div>}
    </main>
  );
}
