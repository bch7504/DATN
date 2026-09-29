"use client";

import React, { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus, X } from "lucide-react";

type Tone = "green" | "amber";
interface ScheduleItem { id: string; day: number; slot: string; title: string; time: string; subject: string; tone: Tone }
interface StudyTask { id: string; date: string; title: string; detail: string; completed: boolean }
interface Draft { title: string; day: number; slot: string; subject: string }

const DAYS = [
  ["THỨ 2", "21/09"], ["THỨ 3", "22/09"], ["THỨ 4", "23/09"], ["THỨ 5", "24/09"],
  ["THỨ 6", "25/09"], ["THỨ 7", "26/09"], ["CHỦ NHẬT", "27/09"],
] as const;
const SLOTS = ["07:00–09:00", "09:00–11:00", "13:00–15:00", "15:00–17:00", "19:00–21:00"] as const;
const EMPTY: Draft = { title: "", day: 0, slot: SLOTS[0], subject: "Cơ sở dữ liệu" };
const INITIAL_SCHEDULE: ScheduleItem[] = [
  { id: "s1", day: 2, slot: SLOTS[0], title: "Xem Slide ERD", time: "07:30–08:15", subject: "CSDL", tone: "green" },
  { id: "s2", day: 1, slot: SLOTS[1], title: "Đọc Personal Doc", time: "09:00–10:00", subject: "Tự học", tone: "amber" },
  { id: "s3", day: 3, slot: SLOTS[2], title: "Ôn Transaction", time: "13:30–14:30", subject: "CSDL", tone: "green" },
  { id: "s4", day: 5, slot: SLOTS[4], title: "Làm Quiz ERD", time: "19:00–19:30", subject: "Ôn tập", tone: "amber" },
];
const INITIAL_TASKS: StudyTask[] = [
  { id: "t1", date: "23/09", title: "Xem hết Slide ERD", detail: "45 phút · Môn Cơ sở dữ liệu", completed: false },
  { id: "t2", date: "24/09", title: "Ôn tập Transaction", detail: "60 phút · Deadline 20:00", completed: false },
  { id: "t3", date: "26/09", title: "Làm bài Quiz ôn tập ERD", detail: "30 phút · Mục Ôn tập", completed: false },
];

/**
 * Args: none. Input is synthetic demo state until Java Study Plan APIs are connected.
 * Returns: the Student weekly Plan & Calendar workspace.
 * Errors: invalid empty titles are rejected by HTML validation; no remote side effects.
 */
export default function StudentPlanPage(): React.JSX.Element {
  const [week, setWeek] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(INITIAL_SCHEDULE);
  const [tasks, setTasks] = useState<StudyTask[]>(INITIAL_TASKS);
  const [mode, setMode] = useState<"schedule" | "task" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const weekLabel = useMemo(() => week === 0 ? "21 – 27/09/2026" : week < 0 ? "14 – 20/09/2026" : "28/09 – 04/10/2026", [week]);

  /** Opens a typed local form, optionally scoped to a selected calendar cell. */
  const openForm = (nextMode: "schedule" | "task", day: number = 0, slot: string = SLOTS[0]): void => {
    setDraft({ ...EMPTY, day, slot });
    setMode(nextMode);
  };

  /** Validates and appends one local demo schedule/task item; production will call Java only. */
  const saveItem = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    if (mode === "schedule") {
      setSchedule((items) => [...items, { id: `s-${Date.now()}`, day: draft.day, slot: draft.slot, title, time: draft.slot, subject: draft.subject, tone: "green" }]);
    } else {
      setTasks((items) => [...items, { id: `t-${Date.now()}`, date: DAYS[draft.day][1], title, detail: `45 phút · ${draft.subject}`, completed: false }]);
    }
    setMode(null);
  };

  /** Toggles one demo task without calculating progress or Daily Goal on the client. */
  const toggleTask = (taskId: string): void => setTasks((items) => items.map((item) => item.id === taskId ? { ...item, completed: !item.completed } : item));

  return <div className="mx-auto max-w-[1500px] space-y-7 pb-12">
    <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div><h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Kế hoạch &amp; Lịch ôn tập</h1><p className="mt-2 text-sm text-slate-500 sm:text-base">Lịch biểu tuần trực quan từ Thứ 2 đến Chủ nhật theo các khung giờ học tập.</p></div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => openForm("task")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm hover:border-red-200"><Plus className="h-4 w-4" /> Thêm task ôn tập</button>
        <button type="button" onClick={() => openForm("schedule")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-[#a80f18]"><Plus className="h-4 w-4" /> Thêm lịch học</button>
      </div>
    </header>

    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/80 px-5 py-5 sm:px-7"><h2 className="font-bold text-emerald-900">Sinh viên chủ động quản lý kế hoạch học tập cá nhân</h2><p className="mt-1 text-sm text-slate-600">Tính năng gợi ý tự động (AI Recommendation) được định vị là hướng mở rộng tiếp theo.</p></section>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 border-b border-slate-100 px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div><h2 className="text-xl font-extrabold text-slate-900">Tuần học: {weekLabel}</h2><p className="mt-1 text-sm text-slate-500">Bấm vào ô trống trên bảng để lên lịch học nhanh</p></div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <button type="button" onClick={() => setWeek(-1)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold sm:px-5 sm:text-sm"><ChevronLeft className="h-4 w-4" /> Tuần trước</button>
          <button type="button" onClick={() => setWeek(0)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 sm:px-5 sm:text-sm">Tuần này</button>
          <button type="button" onClick={() => setWeek(1)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold sm:px-5 sm:text-sm">Tuần sau <ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="overflow-x-auto"><div className="min-w-[1080px]">
        <div className="grid grid-cols-[135px_repeat(7,minmax(135px,1fr))] bg-slate-50"><div className="flex items-center justify-center border-r border-slate-200 p-4 text-xs font-extrabold uppercase text-slate-500">Khung giờ</div>{DAYS.map(([name, date]) => <div key={name} className="border-r border-slate-200 p-4 text-center last:border-r-0"><b className="text-sm text-slate-900">{name}</b><span className="mt-1 block text-sm font-bold text-slate-500">{date}</span></div>)}</div>
        {SLOTS.map((slot) => <div key={slot} className="grid min-h-36 grid-cols-[135px_repeat(7,minmax(135px,1fr))] border-t border-slate-200"><div className="flex items-center justify-center border-r border-slate-200 p-4 text-sm font-bold text-slate-500">{slot}</div>{DAYS.map(([name], day) => { const item = schedule.find((entry) => entry.day === day && entry.slot === slot); return <button key={`${name}-${slot}`} type="button" onClick={() => !item && openForm("schedule", day, slot)} className="border-r border-slate-200 p-3 text-left transition last:border-r-0 hover:bg-slate-50" aria-label={item ? item.title : `Thêm lịch ${name}, ${slot}`}>{item && <span className={`block rounded-2xl border-l-4 p-4 shadow-sm ${item.tone === "amber" ? "border-amber-500 bg-amber-50 text-amber-900" : "border-[#d71920] bg-emerald-50 text-emerald-900"}`}><strong className="block text-sm leading-5">{item.title}</strong><span className="mt-2 block text-xs leading-5 text-slate-500">{item.time} · {item.subject}</span></span>}</button>; })}</div>)}
      </div></div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold text-slate-900">Kế hoạch: “Ôn thi Cơ sở dữ liệu”</h2><p className="mt-1 text-sm text-slate-500">Khoảng thời gian: 21 – 29/09/2026</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">ACTIVE</span></div>
      <div className="mt-5 divide-y divide-slate-100">{tasks.map((task) => <div key={task.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><span className="text-sm font-bold text-slate-500 sm:w-20">{task.date}</span><div className="flex-1"><strong className={`block text-sm ${task.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</strong><span className="mt-1 block text-xs text-slate-500">{task.detail}</span></div><button type="button" onClick={() => toggleTask(task.id)} className={`inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${task.completed ? "bg-emerald-50 text-emerald-700" : "border border-slate-200 text-slate-700"}`}>{task.completed ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{task.completed ? "COMPLETED" : "Đánh dấu xong"}</button></div>)}</div>
    </section>

    {mode && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={() => setMode(null)}><form onSubmit={saveItem} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-red-600" /><h2 className="text-lg font-extrabold">{mode === "schedule" ? "Thêm lịch học" : "Thêm task ôn tập"}</h2></div><button type="button" onClick={() => setMode(null)} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="mt-5 space-y-4"><label className="block text-sm font-bold text-slate-700">Nội dung<input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} required maxLength={120} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-red-400" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Ngày<select value={draft.day} onChange={(event) => setDraft((value) => ({ ...value, day: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">{DAYS.map(([name, date], index) => <option key={name} value={index}>{name} · {date}</option>)}</select></label><label className="text-sm font-bold text-slate-700">Khung giờ<select value={draft.slot} onChange={(event) => setDraft((value) => ({ ...value, slot: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal">{SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select></label></div><label className="block text-sm font-bold text-slate-700">Môn học<input value={draft.subject} onChange={(event) => setDraft((value) => ({ ...value, subject: event.target.value }))} required maxLength={80} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-red-400" /></label></div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setMode(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Hủy</button><button type="submit" className="rounded-xl bg-[#d71920] px-5 py-2.5 text-sm font-bold text-white">Lưu</button></div>
    </form></div>}
  </div>;
}
