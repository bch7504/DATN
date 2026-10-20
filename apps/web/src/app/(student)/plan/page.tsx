"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { isDemoMode } from "@/lib/env";
import { ApiClientError, studyPlanApi } from "@/lib/api-client";
import {
  SaveStudyPlanItemRequest,
  StudyPlan,
  StudyPlanItem,
  StudyPlanItemType,
} from "@/types/study-plan";

const TIME_SLOTS = [
  { hour: 7, label: "07:00 – 09:00", period: "Sáng" },
  { hour: 9, label: "09:00 – 11:00", period: "Sáng" },
  { hour: 13, label: "13:00 – 15:00", period: "Chiều" },
  { hour: 15, label: "15:00 – 17:00", period: "Chiều" },
  { hour: 19, label: "19:00 – 21:00", period: "Tối" },
] as const;

const DAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

const DEMO_PLAN_ID = "demo-plan";
const DEMO_ITEMS: StudyPlanItem[] = [
  {
    id: "demo-calendar-1",
    planId: DEMO_PLAN_ID,
    title: "Xem Slide ERD",
    description: "CSDL",
    type: "STUDY_SESSION",
    scheduledStart: "2026-09-23T07:30:00+07:00",
    scheduledEnd: "2026-09-23T08:15:00+07:00",
    status: "TODO",
    createdAt: "2026-09-20T00:00:00Z",
    updatedAt: "2026-09-20T00:00:00Z",
  },
  {
    id: "demo-task-1",
    planId: DEMO_PLAN_ID,
    title: "Ôn tập câu hỏi sai về khóa chính",
    description: "DBI-01",
    type: "TASK",
    dueAt: "2026-09-25T18:00:00+07:00",
    status: "TODO",
    createdAt: "2026-09-20T00:00:00Z",
    updatedAt: "2026-09-20T00:00:00Z",
  },
];

function startOfWeek(value: Date): Date {
  const date = new Date(value);
  const day = date.getDay();
  const distance = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + distance);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateLabel(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

function timeLabel(value?: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Không thể tải dữ liệu kế hoạch. Vui lòng thử lại.";
}

export default function StudentPlanPage(): React.JSX.Element {
  const demo = isDemoMode();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [items, setItems] = useState<StudyPlanItem[]>(() => (demo ? DEMO_ITEMS : []));
  const [calendarItems, setCalendarItems] = useState<StudyPlanItem[]>(() =>
    demo ? DEMO_ITEMS.filter((item) => item.scheduledStart) : []
  );
  const [loading, setLoading] = useState(!demo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [modalDayIndex, setModalDayIndex] = useState(0);
  const [modalHour, setModalHour] = useState(7);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalType, setModalType] = useState<StudyPlanItemType>("STUDY_SESSION");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCourse, setNewTaskCourse] = useState("Tự học");

  const days = useMemo(
    () => DAY_NAMES.map((name, index) => ({ name, date: addDays(weekStart, index) })),
    [weekStart]
  );
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const loadProductionData = useCallback(async (): Promise<void> => {
    if (demo) return;
    setLoading(true);
    setError(null);
    try {
      const activePlans = await studyPlanApi.listPlans("ACTIVE");
      const activePlan = activePlans[0] ?? null;
      setPlan(activePlan);
      if (!activePlan) {
        setItems([]);
        setCalendarItems([]);
        return;
      }
      const [allItems, projection] = await Promise.all([
        studyPlanApi.listItems(activePlan.id),
        studyPlanApi.getCalendar(weekStart, weekEnd),
      ]);
      setItems(allItems.filter((item) => item.status !== "CANCELLED"));
      setCalendarItems(projection.items.filter((item) => item.status !== "CANCELLED"));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [demo, weekEnd, weekStart]);

  useEffect(() => {
    void loadProductionData();
  }, [loadProductionData]);

  const ensurePlan = useCallback(async (): Promise<StudyPlan> => {
    if (plan) return plan;
    const year = weekStart.getFullYear();
    const created = await studyPlanApi.createPlan({
      title: `Kế hoạch học tập ${year}`,
      description: "Kế hoạch cá nhân được quản lý từ lịch tuần StudyFlow",
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    });
    setPlan(created);
    return created;
  }, [plan, weekStart]);

  const openSchedule = (dayIndex = 0, hour = 7): void => {
    setModalDayIndex(dayIndex);
    setModalHour(hour);
    setModalTitle("");
    setModalDescription("");
    setModalType("STUDY_SESSION");
    setScheduleOpen(true);
  };

  const saveSchedule = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!modalTitle.trim()) return;
    const start = addDays(weekStart, modalDayIndex);
    start.setHours(modalHour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);
    const request: SaveStudyPlanItemRequest = {
      title: modalTitle.trim(),
      description: modalDescription.trim() || undefined,
      type: modalType,
      scheduledStart: start.toISOString(),
      scheduledEnd: end.toISOString(),
    };
    setSaving(true);
    setError(null);
    try {
      if (demo) {
        const created: StudyPlanItem = {
          id: `demo-${Date.now()}`,
          planId: DEMO_PLAN_ID,
          ...request,
          status: "TODO",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setItems((current) => [...current, created]);
        setCalendarItems((current) => [...current, created]);
      } else {
        const activePlan = await ensurePlan();
        await studyPlanApi.createItem(activePlan.id, request);
        await loadProductionData();
      }
      setScheduleOpen(false);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const addTask = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!newTaskTitle.trim()) return;
    const dueAt = new Date();
    dueAt.setHours(23, 59, 0, 0);
    const request: SaveStudyPlanItemRequest = {
      title: newTaskTitle.trim(),
      description: newTaskCourse,
      type: "TASK",
      dueAt: dueAt.toISOString(),
      reminderMinutesBefore: 60,
    };
    setSaving(true);
    setError(null);
    try {
      if (demo) {
        setItems((current) => [
          {
            id: `demo-task-${Date.now()}`,
            planId: DEMO_PLAN_ID,
            ...request,
            status: "TODO",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...current,
        ]);
      } else {
        const activePlan = await ensurePlan();
        await studyPlanApi.createItem(activePlan.id, request);
        await loadProductionData();
      }
      setNewTaskTitle("");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (item: StudyPlanItem): Promise<void> => {
    const target = item.status === "COMPLETED" ? "TODO" : "COMPLETED";
    setSaving(true);
    setError(null);
    try {
      if (demo) {
        setItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id ? { ...candidate, status: target } : candidate
          )
        );
      } else {
        await studyPlanApi.updateItemStatus(
          item.id,
          target,
          target === "COMPLETED" ? `complete-${crypto.randomUUID()}` : undefined
        );
        await loadProductionData();
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: StudyPlanItem): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      if (demo) {
        setItems((current) => current.filter((candidate) => candidate.id !== item.id));
        setCalendarItems((current) =>
          current.filter((candidate) => candidate.id !== item.id)
        );
      } else {
        await studyPlanApi.deleteItem(item.planId, item.id);
        await loadProductionData();
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const tasks = items.filter(
    (item) => item.status !== "CANCELLED" && (item.type === "TASK" || !item.scheduledStart)
  );

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-red-50 p-2 text-ptit-red">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <h1 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
              Kế hoạch &amp; Lịch ôn tập
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Lịch tuần từ Thứ 2 đến Chủ nhật, được lưu bởi hệ thống khi dùng chế độ thật.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openSchedule()}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ptit-red px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Thêm lịch học
        </button>
      </header>

      {demo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          Dữ liệu demo — các thay đổi không được lưu vào Java Backend.
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => void loadProductionData()} className="font-bold underline">
            Thử lại
          </button>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-ptit-red" />
        <p>
          <strong className="text-slate-800">Sinh viên chủ động quản lý kế hoạch cá nhân.</strong>{" "}
          Daily Goal và Study Streak vẫn được hiển thị trên Dashboard.
        </p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900 sm:text-base">
              Tuần học: {dateLabel(weekStart)} – {dateLabel(addDays(weekStart, 6))}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Bấm vào ô trống trên bảng để thêm lịch học nhanh. Dữ liệu được tải lại khi chuyển tuần.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              <ChevronLeft className="h-3.5 w-3.5" /> Tuần trước
            </button>
            <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-ptit-red">
              Tuần này
            </button>
            <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              Tuần sau <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Đang tải lịch học…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="w-28 border-r border-slate-200 p-3 text-center text-[11px] font-bold uppercase text-slate-400">Khung giờ</th>
                  {days.map((day) => (
                    <th key={day.name} className="border-r border-slate-200 p-3 text-center last:border-r-0">
                      <div className="font-display font-bold text-slate-900">{day.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-400">{dateLabel(day.date)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot) => (
                  <tr key={slot.hour} className="border-b border-slate-100">
                    <td className="border-r border-slate-200 bg-slate-50/40 p-3 text-center font-mono text-[11px] text-slate-600">
                      <div>{slot.label}</div>
                      <span className="rounded bg-slate-200 px-1.5 text-[9px] font-bold uppercase">{slot.period}</span>
                    </td>
                    {days.map((day, dayIndex) => {
                      const block = calendarItems.find((item) => {
                        if (!item.scheduledStart) return false;
                        const start = new Date(item.scheduledStart);
                        return localDate(start) === localDate(day.date) && start.getHours() === slot.hour;
                      });
                      return (
                        <td key={day.name} className="h-24 border-r border-slate-100 p-2 align-top last:border-r-0">
                          {block ? (
                            <div className="relative rounded-xl border border-red-200 bg-red-50 p-2.5 pr-7">
                              <button type="button" onClick={() => void removeItem(block)} disabled={saving} aria-label={`Hủy ${block.title}`} className="absolute right-1.5 top-1.5 p-1 text-red-600 disabled:opacity-50">
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <div className="line-clamp-2 text-[11px] font-bold text-slate-900">{block.title}</div>
                              <div className="mt-1 text-[10px] text-slate-500">{timeLabel(block.scheduledStart)}–{timeLabel(block.scheduledEnd)}{block.description ? ` · ${block.description}` : ""}</div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => openSchedule(dayIndex, slot.hour)} className="h-full w-full rounded-lg text-[11px] font-semibold text-slate-400" aria-label={`Thêm lịch ${day.name} lúc ${slot.hour}:00`}>
                              + Thêm
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-display text-base font-bold text-slate-900">
            Nhiệm vụ học tập ({tasks.filter((task) => task.status === "COMPLETED").length}/{tasks.length})
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Java ghi nhận sự kiện học tập khi nhiệm vụ được hoàn thành.</p>
        </div>
        <form onSubmit={(event) => void addTask(event)} className="flex flex-col gap-2 sm:flex-row">
          <input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} maxLength={200} placeholder="Nhập nhiệm vụ học tập mới…" className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500" />
          <input value={newTaskCourse} onChange={(event) => setNewTaskCourse(event.target.value)} maxLength={100} aria-label="Môn học hoặc ghi chú" className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs focus:border-red-500 focus:outline-none" />
          <button type="submit" disabled={saving || !newTaskTitle.trim()} className="inline-flex items-center justify-center gap-1 rounded-xl bg-ptit-red px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
            <Plus className="h-4 w-4" /> Thêm task ôn tập
          </button>
        </form>
        {tasks.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Chưa có nhiệm vụ. Thêm task đầu tiên để hệ thống tạo kế hoạch cá nhân.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {tasks.map((task) => (
              <div key={task.id} className={`flex items-start gap-3 rounded-2xl border p-3.5 ${task.status === "COMPLETED" ? "border-slate-200 bg-slate-50 opacity-70" : "border-slate-200 bg-white"}`}>
                <input type="checkbox" checked={task.status === "COMPLETED"} onChange={() => void toggleTask(task)} disabled={saving} className="mt-0.5 h-4 w-4 cursor-pointer rounded text-ptit-red focus:ring-red-500" />
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-semibold ${task.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</div>
                  <div className="mt-1 flex gap-2 text-[10px] text-slate-400">
                    {task.description && <span className="rounded bg-red-50 px-1.5 py-0.5 font-bold text-ptit-red">{task.description}</span>}
                    {task.dueAt && <span>Hạn: {new Date(task.dueAt).toLocaleString("vi-VN")}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => void removeItem(task)} disabled={saving} aria-label={`Hủy ${task.title}`} className="p-1 text-red-600 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="schedule-title" className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="schedule-title" className="font-display text-base font-bold text-slate-900">Thêm lịch học</h3>
              <button type="button" onClick={() => setScheduleOpen(false)} aria-label="Đóng"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <form onSubmit={(event) => void saveSchedule(event)} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <label className="font-semibold text-slate-700">Ngày
                  <select value={modalDayIndex} onChange={(event) => setModalDayIndex(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5">
                    {days.map((day, index) => <option key={day.name} value={index}>{day.name} ({dateLabel(day.date)})</option>)}
                  </select>
                </label>
                <label className="font-semibold text-slate-700">Khung giờ
                  <select value={modalHour} onChange={(event) => setModalHour(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5">
                    {TIME_SLOTS.map((slot) => <option key={slot.hour} value={slot.hour}>{slot.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="block font-semibold text-slate-700">Loại hoạt động
                <select value={modalType} onChange={(event) => setModalType(event.target.value as StudyPlanItemType)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5">
                  <option value="STUDY_SESSION">Buổi học / đọc PDF</option>
                  <option value="QUIZ">Luyện Quiz</option>
                </select>
              </label>
              <label className="block font-semibold text-slate-700">Nội dung
                <input value={modalTitle} onChange={(event) => setModalTitle(event.target.value)} maxLength={200} required className="mt-1 w-full rounded-xl border border-slate-300 p-2.5" placeholder="Ví dụ: Ôn tập Transaction" />
              </label>
              <label className="block font-semibold text-slate-700">Môn học hoặc ghi chú
                <input value={modalDescription} onChange={(event) => setModalDescription(event.target.value)} maxLength={1000} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5" placeholder="Ví dụ: CSDL" />
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => setScheduleOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">Hủy</button>
                <button type="submit" disabled={saving || !modalTitle.trim()} className="rounded-xl bg-ptit-red px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? "Đang lưu…" : "Lưu vào lịch"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
