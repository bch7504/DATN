"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
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
  ApiClientError,
  StudyPlanItemRecord,
  StudyPlanRecord,
  CourseAssignment,
  assignmentApi,
  studyPlanApi,
} from "@/lib/api-client";

const WEEKDAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

type PlanConfirmation =
  | { kind: "ARCHIVE_PLAN"; planId: string; planTitle: string }
  | { kind: "DELETE_ITEM"; item: StudyPlanItemRecord };

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

/** Args: one Java calendar item and the selected week's Monday. Input: an item returned for this week.
 * Output: its scheduled day, deadline day, or Monday for a session spanning into this week.
 * Errors: none; Java validates saved timestamps and calendar overlap before returning them.
 */
function displayDateInWeek(item: StudyPlanItemRecord, weekStart: Date): Date {
  const weekEnd = addDays(weekStart, 7);
  const scheduledStart = item.scheduledStart ? new Date(item.scheduledStart) : null;
  if (scheduledStart && scheduledStart >= weekStart && scheduledStart < weekEnd) return scheduledStart;
  const dueAt = item.dueAt ? new Date(item.dueAt) : null;
  if (dueAt && dueAt >= weekStart && dueAt < weekEnd) return dueAt;
  return weekStart;
}

/** Args: published, approved-class assignment and week's local Monday. Input: Java-owned creation/deadline.
 * Output: deadline day when due this week, otherwise creation day or Monday for a spanning assignment.
 * Errors: none; assignments with invalid timestamps are filtered before this function is called.
 */
function assignmentDisplayDate(assignment: CourseAssignment, weekStart: Date): Date {
  const weekEnd = addDays(weekStart, 7);
  const due = new Date(assignment.dueAt);
  if (due >= weekStart && due < weekEnd) return due;
  const created = new Date(assignment.createdAt);
  if (created >= weekStart && created < weekEnd) return created;
  return weekStart;
}

/** Args: one Java-authorized assignment and current epoch milliseconds. Input: server submission/deadline.
 * Output: student-facing submission status; no personal task is marked complete. Errors: none.
 */
function assignmentStateLabel(assignment: CourseAssignment, now: number): string {
  if (assignment.submission) return assignment.submission.status === "LATE" ? "Đã nộp muộn" : "Đã nộp";
  return Date.parse(assignment.dueAt) <= now ? "Quá hạn · Chưa nộp" : "Chưa nộp";
}

/** Args: none. Input: authenticated Student and Java plan/calendar DTOs. Output: personal planning page. Errors: API errors are shown without local fixture fallback. */
export default function StudentPlanPage() {
  const router = useRouter();

  const [activePlan, setActivePlan] = useState<StudyPlanRecord | null>(null);
  const [plans, setPlans] = useState<StudyPlanRecord[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [items, setItems] = useState<StudyPlanItemRecord[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PlanConfirmation | null>(null);
  const [reloadKey, setReloadKey] = useState(0);


  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const planId = query.get("planId");
    if (planId) setSelectedPlanId(planId);
    const focusDate = query.get("date");
    if (focusDate) {
      const focus = new Date(`${focusDate}T12:00:00`);
      if (Number.isFinite(focus.getTime())) setWeekOffset(Math.round((startOfWeek(focus).getTime() - startOfWeek(new Date()).getTime()) / 604800000));
    }
  }, []);

  const weekStart = useMemo(
    () => addDays(startOfWeek(new Date()), weekOffset * 7),
    [weekOffset]
  );
  const weekDays = useMemo(
    () => WEEKDAY_NAMES.map((name, index) => ({ date: addDays(weekStart, index), name })),
    [weekStart]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pendingConfirmation) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !saving) {
        setPendingConfirmation(null);
        setError(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingConfirmation, saving]);

  useEffect(() => {
    let cancelled = false;
    /** Args: none. Input: active Student session, owned plans/calendar and approved-class assignments.
     * Output: void; loads both personal and teacher-assigned items for the selected week.
     * Errors: personal API failures show an error; assignment failures keep the personal calendar available.
     */
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const from = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        const to = addDays(from, 7);
        const [plansResult, calendarResult, assignmentsResult] = await Promise.allSettled([
          studyPlanApi.listPlans("ACTIVE"),
          studyPlanApi.getCalendar(from.toISOString(), to.toISOString()),
          assignmentApi.listForStudent(),
        ]);
        if (plansResult.status === "rejected") throw plansResult.reason;
        if (calendarResult.status === "rejected") throw calendarResult.reason;
        const plans = plansResult.value;
        const plan = plans.items.find((item) => item.id === selectedPlanId) ?? plans.items[0] ?? null;
        if (cancelled) return;
        setPlans(plans.items);
        setItems(calendarResult.value.items);
        setAssignments(assignmentsResult.status === "fulfilled" ? assignmentsResult.value : []);
        if (assignmentsResult.status === "rejected") setError("Không tải được bài tập giáo viên giao. Vui lòng thử lại.");
        setActivePlan(plan);
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

  const weekItems = items
    .filter((item) => item.status !== "CANCELLED" && (item.scheduledStart || item.dueAt))
    .sort((left, right) => Date.parse(left.scheduledStart ?? left.dueAt ?? "") - Date.parse(right.scheduledStart ?? right.dueAt ?? ""));
  const weekEnd = addDays(weekStart, 7);
  const weekAssignments = assignments.filter((assignment) => {
    if (assignment.status !== "PUBLISHED" || !assignment.publishedAt) return false;
    const created = Date.parse(assignment.createdAt);
    const due = Date.parse(assignment.dueAt);
    return Number.isFinite(created) && Number.isFinite(due) && created < weekEnd.getTime() && due >= weekStart.getTime();
  });

  async function refreshCurrentWeek(): Promise<void> {
    const from = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    const to = addDays(from, 7);
    const calendar = await studyPlanApi.getCalendar(from.toISOString(), to.toISOString());
    setItems(calendar.items);
  }

  /** Args: none. Input: selected owned plan. Output: void; opens the in-app archive confirmation.
   * Errors: no mutation occurs until the user confirms.
   */
  function requestArchivePlan(): void {
    if (!activePlan || saving) return;
    setError(null);
    setPendingConfirmation({ kind: "ARCHIVE_PLAN", planId: activePlan.id, planTitle: activePlan.title });
  }

  /** Args: local calendar date. Input: active owned plan. Output: void; opens dedicated schedule creation route. Errors: ignored when no plan is selected. */
  function openSchedule(date: Date): void {
    if (activePlan) router.push(`/plan/${encodeURIComponent(activePlan.id)}/items/new?type=STUDY_SESSION&date=${dateInputValue(date)}`);
  }

  /** Args: none. Input: active plan and visible week. Output: void; opens dedicated task creation route. Errors: ignored without an active plan. */
  function openTask(): void {
    if (activePlan) router.push(`/plan/${encodeURIComponent(activePlan.id)}/items/new?type=TASK&date=${dateInputValue(weekOffset === 0 ? new Date() : weekStart)}`);
  }

  /** Args: owned visible plan item. Input: current server status and lateCompleted flag.
   * Output: void; updates status through Java, then refreshes calendar and bell.
   * Errors: locked late completions are ignored; API errors are shown without changing local state.
   */
  async function toggleTask(item: StudyPlanItemRecord): Promise<void> {
    if (saving || item.lateCompleted) return;
    setSaving(true);
    setError(null);
    try {
      await studyPlanApi.changeItemStatus(
        item.id,
        item.status === "COMPLETED" ? "TODO" : "COMPLETED",
        item.status === "COMPLETED" ? undefined : `study-plan-${item.id}-${crypto.randomUUID()}`
      );
      window.dispatchEvent(new Event("studyflow:notifications-updated"));
      await refreshCurrentWeek();
    } catch (statusError: unknown) {
      setError(statusError instanceof Error ? statusError.message : "Không cập nhật được trạng thái.");
    } finally { setSaving(false); }
  }

  /** Args: one visible owned plan item. Input: selected item awaiting confirmation.
   * Output: void; opens the in-app permanent-delete confirmation. Errors: no mutation occurs until confirmed.
   */
  function requestDeleteItem(item: StudyPlanItemRecord): void {
    if (saving) return;
    setError(null);
    setPendingConfirmation({ kind: "DELETE_ITEM", item });
  }

  /** Args: none. Input: pending owner-confirmed archive/delete action and Java public API.
   * Output: Promise<void>; archives a plan or permanently deletes an item and its history, then reloads the view.
   * Errors: API/ownership errors stay visible in the confirmation dialog; failed actions remain retryable.
   */
  async function confirmPendingAction(): Promise<void> {
    const confirmation = pendingConfirmation;
    if (!confirmation || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (confirmation.kind === "ARCHIVE_PLAN") {
        await studyPlanApi.archivePlan(confirmation.planId);
        setPendingConfirmation(null);
        setSelectedPlanId(null);
        setReloadKey((value) => value + 1);
      } else {
        await studyPlanApi.permanentlyDeleteItem(confirmation.item.planId, confirmation.item.id);
        setPendingConfirmation(null);
        await refreshCurrentWeek();
      }
    } catch (actionError: unknown) {
      if (confirmation.kind === "DELETE_ITEM" && actionError instanceof ApiClientError && actionError.status === 404) {
        setError("Backend chưa nhận API xóa nhiệm vụ mới. Hãy khởi động lại backend rồi thử lại.");
      } else {
        setError(actionError instanceof Error ? actionError.message : "Không thể hoàn tất thao tác.");
      }
    } finally {
      setSaving(false);
    }
  }

  /** Args: owned plan item. Input: Java late-completion lock. Output: void; opens dedicated item editor. Errors: locked items are ignored. */
  function openEdit(item: StudyPlanItemRecord): void {
    if (!item.lateCompleted) router.push(`/plan/${encodeURIComponent(item.planId)}/items/${encodeURIComponent(item.id)}/edit`);
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
        {activePlan && <button type="button" onClick={() => openSchedule(weekOffset === 0 ? new Date() : weekDays[0].date)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800"><Plus className="h-4 w-4" />Thêm lịch học</button>}
      </header>

      {error && <ErrorAlert message={error} onRetry={() => setReloadKey((value) => value + 1)} />}

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" text="Đang tải kế hoạch..." /></div>
      ) : <>
      {!activePlan && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <CalendarCheck className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">Bạn chưa có kế hoạch học tập</h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">Tạo kế hoạch cá nhân để lưu lịch tự học, lịch ôn Quiz và nhiệm vụ cần hoàn thành.</p>
          <Link href="/plan/new" className="mt-5 inline-flex rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white">Tạo kế hoạch cá nhân</Link>
        </section>
      )}
        {activePlan && (
          <section className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4">
            <label className="text-sm">Chọn kế hoạch<select disabled={saving} value={activePlan.id} onChange={(event) => setSelectedPlanId(event.target.value)} className="ml-2 rounded-xl border p-2">{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label>
            <Link href={`/plan/${encodeURIComponent(activePlan.id)}/edit`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">Sửa kế hoạch</Link>
            <button type="button" disabled={saving} onClick={requestArchivePlan} className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">Lưu trữ</button>
            <Link href="/plan/new" className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-700">Tạo kế hoạch khác</Link>
          </section>
        )}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:p-5">
              <div>
                <h2 className="font-bold text-slate-900">{activePlan?.title ?? "Bài tập được giao"}</h2>
                <p className="mt-1 text-xs text-slate-500">Tuần {weekLabel}</p>
              </div>
              <nav aria-label="Chuyển tuần" className="flex items-center gap-2">
                <button type="button" onClick={() => setWeekOffset((offset) => offset - 1)} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" aria-label="Tuần trước"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => setWeekOffset(0)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Tuần này</button>
                <button type="button" onClick={() => setWeekOffset((offset) => offset + 1)} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" aria-label="Tuần sau"><ChevronRight className="h-4 w-4" /></button>
              </nav>
            </div>

            <p className="px-4 pt-3 text-xs text-slate-500">Chọn ngày và giờ bất kỳ khi thêm lịch. Lịch hiển thị theo múi giờ thiết bị.</p>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              {weekDays.map(({ date, name }) => {
                const dayItems = weekItems.filter((item) => dateInputValue(displayDateInWeek(item, weekStart)) === dateInputValue(date));
                const dayAssignments = weekAssignments.filter((assignment) => dateInputValue(assignmentDisplayDate(assignment, weekStart)) === dateInputValue(date));
                return <section key={name} className="flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                  <h3 className="font-bold text-slate-800">{name} <span className="font-normal text-slate-500">{formatDate(date)}</span></h3>
                  <div className="mt-3 flex flex-1 flex-col gap-2">
                    {dayItems.length === 0 && dayAssignments.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Chưa có lịch</p>}
                    {dayItems.map((item) => <article key={item.id} className={`rounded-xl border p-2.5 text-xs ${item.type === "QUIZ" ? "border-emerald-200 bg-emerald-50" : item.type === "TASK" ? "border-sky-200 bg-sky-50" : "border-amber-200 bg-amber-50"}`}>
                      <p className="font-bold text-slate-800">{item.title}</p>
                      {item.description && <p className="mt-1 text-slate-600">{item.description}</p>}
                      <p className="mt-1 text-slate-600">{item.type === "TASK" ? `Hạn ${localTime(item.dueAt)} · Nhiệm vụ` : `${localTime(item.scheduledStart)}–${localTime(item.scheduledEnd)} · ${item.type === "QUIZ" ? "Ôn Quiz" : "Tự học"}`}</p>
                      <p className="mt-1 text-slate-500">{item.lateCompleted ? "Hoàn thành muộn" : item.status === "COMPLETED" ? "Đã hoàn thành" : item.status === "OVERDUE" ? "Quá hạn · Chưa hoàn thành" : "Chưa hoàn thành"}</p>
                    </article>)}
                    {dayAssignments.map((assignment) => <article key={`assignment-${assignment.id}`} className="rounded-xl border border-violet-200 bg-violet-50 p-2.5 text-xs">
                      <p className="font-bold text-slate-800">{assignment.title}</p>
                      <p className="mt-1 text-violet-700">Bài tập giáo viên giao</p>
                      <p className="mt-1 text-slate-600">Bắt đầu {formatDateTime(assignment.createdAt)}</p>
                      <p className="mt-1 text-slate-600">Hạn nộp {formatDateTime(assignment.dueAt)}</p>
                      <p className="mt-1 font-semibold text-slate-700">{assignmentStateLabel(assignment, now)}</p>
                      <Link href={`/assignments/${encodeURIComponent(assignment.id)}`} className="mt-1 inline-block font-semibold text-violet-700 underline">Xem và nộp bài</Link>
                    </article>)}
                  </div>
                  {activePlan && <button type="button" onClick={() => openSchedule(date)} className="mt-3 rounded-xl border border-dashed border-slate-300 px-2 py-2 text-xs font-semibold text-red-700 hover:border-red-300 hover:bg-red-50">+ Thêm lịch</button>}
                </section>;
              })}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-bold text-slate-900">Danh sách nhiệm vụ ({weekItems.filter((item) => item.status === "COMPLETED").length + weekAssignments.filter((assignment) => !!assignment.submission).length}/{weekItems.length + weekAssignments.length} hoàn thành)</h2><p className="mt-1 text-xs text-slate-500">Tuần {weekLabel} · Gồm lịch cá nhân và bài tập giáo viên giao.</p></div>
              {activePlan && <button type="button" onClick={openTask} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Plus className="h-4 w-4" />Thêm nhiệm vụ</button>}
            </div>
            {weekItems.length === 0 && weekAssignments.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Tuần này chưa có lịch học hoặc nhiệm vụ.</p> : <div className="grid gap-3 md:grid-cols-2">
              {weekItems.map((item) => <article key={item.id} className={`flex items-start gap-3 rounded-2xl border p-3.5 ${item.status === "COMPLETED" ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`}>
                <input type="checkbox" disabled={saving || item.lateCompleted} checked={item.status === "COMPLETED"} onChange={() => void toggleTask(item)} className="mt-1 h-4 w-4 accent-red-700" aria-label={`Đánh dấu ${item.title} ${item.status === "COMPLETED" ? "chưa hoàn thành" : "hoàn thành"}`} />
                <div className="min-w-0 flex-1"><p className={`text-sm font-semibold ${item.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.type === "QUIZ" ? "Ôn Quiz" : item.type === "STUDY_SESSION" ? "Tự học" : "Nhiệm vụ"}{item.description ? ` · ${item.description}` : ""}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" />{item.scheduledStart ? "Bắt đầu" : "Hạn"}: {formatDateTime(item.scheduledStart ?? item.dueAt ?? "")}</p>{item.lateCompleted && <p className="mt-1 text-xs font-semibold text-amber-700">Hoàn thành muộn · chỉ có thể xóa</p>}{item.status === "OVERDUE" && <p className="mt-1 text-xs font-semibold text-red-700">Quá hạn · chưa hoàn thành</p>}</div>
                {!item.lateCompleted && <button type="button" disabled={saving} onClick={() => openEdit(item)} className="rounded p-1 text-slate-400 hover:text-red-700" aria-label={`Sửa nhiệm vụ ${item.title}`}><Pencil className="h-4 w-4" /></button>}
                <button type="button" disabled={saving} onClick={() => requestDeleteItem(item)} className="rounded p-1 text-slate-400 hover:text-red-700" aria-label={`Xóa nhiệm vụ ${item.title}`}><Trash2 className="h-4 w-4" /></button>
              </article>)}
              {weekAssignments.map((assignment) => <article key={`assignment-${assignment.id}`} className="rounded-2xl border border-violet-200 bg-violet-50 p-3.5">
                <p className="text-sm font-semibold text-slate-800">{assignment.title}</p>
                <p className="mt-1 text-xs font-semibold text-violet-700">Bài tập giáo viên giao · Chỉ xem</p>
                {assignment.description && <p className="mt-1 text-xs text-slate-600">{assignment.description}</p>}
                <p className="mt-1 text-xs text-slate-600">Bắt đầu: {formatDateTime(assignment.createdAt)}</p>
                <p className="mt-1 text-xs text-slate-600">Hạn nộp: {formatDateTime(assignment.dueAt)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">{assignmentStateLabel(assignment, now)}</p>
                <Link href={`/assignments/${encodeURIComponent(assignment.id)}`} className="mt-2 inline-block text-xs font-semibold text-violet-700 underline">Xem và nộp bài</Link>
              </article>)}
            </div>}
          </section>
      </>}

      {pendingConfirmation && <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === event.currentTarget && !saving) {
            setPendingConfirmation(null);
            setError(null);
          }
        }}
      >
        <section role="alertdialog" aria-modal="true" aria-labelledby="plan-confirmation-title" aria-describedby="plan-confirmation-description" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <span className="rounded-2xl bg-red-50 p-3 text-red-700"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <h2 id="plan-confirmation-title" className="font-bold text-slate-900">
                {pendingConfirmation.kind === "ARCHIVE_PLAN" ? "Lưu trữ kế hoạch?" : "Xóa nhiệm vụ?"}
              </h2>
              <p id="plan-confirmation-description" className="mt-2 text-sm leading-6 text-slate-600">
                {pendingConfirmation.kind === "ARCHIVE_PLAN"
                  ? `Lưu trữ kế hoạch “${pendingConfirmation.planTitle}”?`
                  : `Nhiệm vụ “${pendingConfirmation.item.title}”, lịch sử hoàn thành và thông báo liên quan sẽ bị xóa. Streak/thống kê học tập có thể thay đổi; thao tác này không thể hoàn tác.`}
              </p>
            </div>
            <button type="button" disabled={saving} onClick={() => { setPendingConfirmation(null); setError(null); }} aria-label="Đóng hộp xác nhận" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-4 w-4" /></button>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" autoFocus disabled={saving} onClick={() => { setPendingConfirmation(null); setError(null); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Hủy</button>
            <button type="button" disabled={saving} onClick={() => void confirmPendingAction()} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Đang xử lý..." : pendingConfirmation.kind === "ARCHIVE_PLAN" ? "Lưu trữ kế hoạch" : "Xóa nhiệm vụ"}
            </button>
          </div>
        </section>
      </div>}
    </main>
  );
}
