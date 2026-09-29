"use client";

import React, { useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Trash2,
  Calendar as CalendarIcon,
  X,
  Info,
} from "lucide-react";

interface ScheduleBlock {
  id: string;
  day: string; // "Thứ 2" | ... | "Chủ nhật"
  timeSlot: string; // "07:00" | "09:00" | "13:00" | "15:00" | "19:00"
  title: string;
  subtitle: string;
  type: "CLASS" | "SELF_STUDY" | "QUIZ";
}

interface StudyTask {
  id: string;
  title: string;
  courseCode: string;
  dueDate: string;
  completed: boolean;
}

const TIME_SLOTS = [
  { id: "07:00", label: "07:00 – 09:00", period: "Sáng" },
  { id: "09:00", label: "09:00 – 11:00", period: "Sáng" },
  { id: "13:00", label: "13:00 – 15:00", period: "Chiều" },
  { id: "15:00", label: "15:00 – 17:00", period: "Chiều" },
  { id: "19:00", label: "19:00 – 21:00", period: "Tối" },
];

const DAYS_OF_WEEK = [
  { day: "Thứ 2", date: "21/09" },
  { day: "Thứ 3", date: "22/09" },
  { day: "Thứ 4", date: "23/09" },
  { day: "Thứ 5", date: "24/09" },
  { day: "Thứ 6", date: "25/09" },
  { day: "Thứ 7", date: "26/09" },
  { day: "Chủ nhật", date: "27/09" },
];

export default function StudentPlanPage() {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Initial schedule blocks conforming to mvp.html
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([
    {
      id: "sb_01",
      day: "Thứ 4",
      timeSlot: "07:00",
      title: "Xem Slide ERD & CSDL",
      subtitle: "07:30–08:15 · DBI-01",
      type: "CLASS",
    },
    {
      id: "sb_02",
      day: "Thứ 3",
      timeSlot: "09:00",
      title: "Đọc Personal Doc SQL",
      subtitle: "09:00–10:00 · Tự học",
      type: "SELF_STUDY",
    },
    {
      id: "sb_03",
      day: "Thứ 5",
      timeSlot: "13:00",
      title: "Bài giảng Tác tử AI",
      subtitle: "13:30–15:00 · AI-02",
      type: "CLASS",
    },
    {
      id: "sb_04",
      day: "Thứ 6",
      timeSlot: "19:00",
      title: "Ôn tập Quiz Chương 1",
      subtitle: "19:30–20:15 · AI-02",
      type: "QUIZ",
    },
    {
      id: "sb_05",
      day: "Thứ 7",
      timeSlot: "15:00",
      title: "Thực hành Truy vấn lồng",
      subtitle: "15:00–16:30 · CSDL",
      type: "SELF_STUDY",
    },
  ]);

  // Tasks list
  const [tasks, setTasks] = useState<StudyTask[]>([
    {
      id: "task_01",
      title: "Xem lại slide 4-6 về Mô hình PEAS môn Trí tuệ nhân tạo",
      courseCode: "AI-02",
      dueDate: "Hôm nay, 21:00",
      completed: true,
    },
    {
      id: "task_02",
      title: "Làm bài Quiz 2 về Chuẩn hóa Cơ sở dữ liệu và Dạng chuẩn 3NF",
      courseCode: "DBI-01",
      dueDate: "Hôm nay, 23:59",
      completed: true,
    },
    {
      id: "task_03",
      title: "Ôn tập câu hỏi sai về Khóa chính và Phép kết nối SQL",
      courseCode: "DBI-01",
      dueDate: "Ngày mai, 18:00",
      completed: false,
    },
    {
      id: "task_04",
      title: "Đọc tài liệu PDF thực hành Truy vấn SQL nâng cao",
      courseCode: "Tự học",
      dueDate: "Thứ 6, 20:00",
      completed: false,
    },
  ]);

  // Add Schedule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState("Thứ 2");
  const [modalTime, setModalTime] = useState("07:00");
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");
  const [modalType, setModalType] = useState<"CLASS" | "SELF_STUDY" | "QUIZ">("CLASS");

  // Add Task inline form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCourse, setNewTaskCourse] = useState("AI-02");

  const handleOpenAddSchedule = (day?: string, timeSlot?: string) => {
    if (day) setModalDay(day);
    if (timeSlot) setModalTime(timeSlot);
    setModalTitle("");
    setModalSubtitle("");
    setIsModalOpen(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    const newBlock: ScheduleBlock = {
      id: `sb_${Date.now()}`,
      day: modalDay,
      timeSlot: modalTime,
      title: modalTitle.trim(),
      subtitle: modalSubtitle.trim() || `${modalDay} · ${modalTime}`,
      type: modalType,
    };

    setScheduleBlocks((prev) => [...prev, newBlock]);
    setIsModalOpen(false);
  };

  const handleDeleteSchedule = (blockId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScheduleBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: StudyTask = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      courseCode: newTaskCourse,
      dueDate: "Hôm nay, 23:59",
      completed: false,
    };
    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle("");
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-50 text-ptit-red">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              Kế hoạch &amp; Lịch ôn tập
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lịch biểu tuần trực quan từ Thứ 2 đến Chủ nhật theo các khung giờ học tập cá nhân.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAddSchedule()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ptit-red hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm lịch học</span>
          </button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-ptit-red flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">
            Sinh viên chủ động quản lý kế hoạch học tập:
          </span>{" "}
          Bấm vào bất kỳ ô trống nào trên bảng lịch để lên lịch tự học nhanh hoặc thêm ca ôn thi. Thống kê chuỗi Streak và Mục tiêu ngày (Daily Goal) được cập nhật trên trang Tổng quan.
        </div>
      </div>

      {/* Weekly Schedule Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 font-display">
              Tuần học: {currentWeekOffset === 0 ? "21 – 27/09/2026 (Tuần này)" : `Tuần ${currentWeekOffset > 0 ? `+${currentWeekOffset}` : currentWeekOffset}`}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Bấm vào ô trống trên bảng để lên lịch học nhanh theo khung giờ
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Tuần trước
            </button>
            <button
              onClick={() => setCurrentWeekOffset(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentWeekOffset === 0
                  ? "bg-red-50 text-ptit-red border border-red-200"
                  : "border border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              Tuần này
            </button>
            <button
              onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition cursor-pointer flex items-center gap-1"
            >
              Tuần sau <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Schedule Table (Horizontal Scrollable on Mobile) */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700">
                <th className="p-3 w-28 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200 text-center">
                  Khung giờ
                </th>
                {DAYS_OF_WEEK.map((d, idx) => (
                  <th
                    key={idx}
                    className="p-3 font-semibold text-center border-r border-slate-200 last:border-r-0"
                  >
                    <div className="font-bold text-slate-900 text-xs font-display">
                      {d.day}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {d.date}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIME_SLOTS.map((slot) => (
                <tr key={slot.id} className="hover:bg-slate-50/40 transition">
                  {/* Time Slot Header */}
                  <td className="p-3 border-r border-slate-200 text-center bg-slate-50/40 font-mono text-[11px] text-slate-600 font-medium">
                    <div>{slot.label}</div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 uppercase font-sans font-bold">
                      {slot.period}
                    </span>
                  </td>

                  {/* 7 Days Cells */}
                  {DAYS_OF_WEEK.map((d, dIdx) => {
                    const block = scheduleBlocks.find(
                      (b) => b.day === d.day && b.timeSlot === slot.id
                    );

                    return (
                      <td
                        key={dIdx}
                        onClick={() => !block && handleOpenAddSchedule(d.day, slot.id)}
                        className={`p-2 border-r border-slate-100 last:border-r-0 align-top h-20 transition ${
                          !block
                            ? "cursor-pointer hover:bg-red-50/30 group"
                            : ""
                        }`}
                      >
                        {block ? (
                          <div
                            className={`p-2.5 rounded-xl border relative group shadow-2xs text-left ${
                              block.type === "CLASS"
                                ? "bg-red-50/80 border-red-200 text-slate-900"
                                : block.type === "SELF_STUDY"
                                ? "bg-amber-50/80 border-amber-200 text-slate-900"
                                : "bg-emerald-50/80 border-emerald-200 text-slate-900"
                            }`}
                          >
                            <button
                              onClick={(e) => handleDeleteSchedule(block.id, e)}
                              className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-0.5 rounded transition cursor-pointer"
                              title="Xóa lịch này"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="font-bold text-[11px] leading-tight line-clamp-2 pr-3">
                              {block.title}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 truncate">
                              {block.subtitle}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-300 group-hover:text-ptit-red transition text-[11px] font-semibold">
                            + Thêm
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Study Tasks Management Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Nhiệm vụ học tập cá nhân ({tasks.filter((t) => t.completed).length}/{tasks.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tích chọn hoàn thành để theo dõi tiến độ hoàn thành các đầu việc ôn thi
            </p>
          </div>
        </div>

        {/* Inline Add Task Form */}
        <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Nhập tên nhiệm vụ học tập mới..."
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          />
          <select
            value={newTaskCourse}
            onChange={(e) => setNewTaskCourse(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none"
          >
            <option value="AI-02">Trí tuệ nhân tạo (AI-02)</option>
            <option value="DBI-01">Cơ sở dữ liệu (DBI-01)</option>
            <option value="Tự học">Tự học cá nhân</option>
          </select>
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="px-4 py-2 bg-ptit-red hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm task ôn tập
          </button>
        </form>

        {/* Tasks List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                task.completed
                  ? "bg-slate-50 border-slate-200 opacity-60"
                  : "bg-white border-slate-200 hover:border-red-200 shadow-2xs"
              }`}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task.id)}
                className="mt-0.5 w-4 h-4 rounded text-ptit-red focus:ring-red-500 cursor-pointer"
              />

              <div className="flex-1 min-w-0">
                <div
                  className={`text-xs font-semibold ${
                    task.completed
                      ? "line-through text-slate-400"
                      : "text-slate-800"
                  }`}
                >
                  {task.title}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1 font-mono">
                  <span className="font-bold text-ptit-red bg-red-50 px-1.5 py-0.5 rounded">
                    {task.courseCode}
                  </span>
                  <span>Hạn: {task.dueDate}</span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteTask(task.id)}
                className="text-slate-300 hover:text-red-600 transition p-1 cursor-pointer"
                title="Xóa nhiệm vụ"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ADD SCHEDULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-50 text-ptit-red">
                  <CalendarIcon className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-base font-display">
                  Thêm lịch học vào tuần
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày trong tuần:
                  </label>
                  <select
                    value={modalDay}
                    onChange={(e) => setModalDay(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.day} value={d.day}>
                        {d.day} ({d.date})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Khung giờ:
                  </label>
                  <select
                    value={modalTime}
                    onChange={(e) => setModalTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {TIME_SLOTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Loại hoạt động:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "CLASS", label: "Bài giảng lớp" },
                    { id: "SELF_STUDY", label: "Tự học PDF" },
                    { id: "QUIZ", label: "Luyện Quiz" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setModalType(t.id as any)}
                      className={`p-2 rounded-xl text-center font-bold text-[11px] border transition cursor-pointer ${
                        modalType === t.id
                          ? "bg-red-50 text-ptit-red border-red-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung buổi học:
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="Ví dụ: Ôn tập Slide Mô hình PEAS..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi chú phụ (Thời gian cụ thể / Môn):
                </label>
                <input
                  type="text"
                  value={modalSubtitle}
                  onChange={(e) => setModalSubtitle(e.target.value)}
                  placeholder="Ví dụ: 09:30–10:30 · AI-02"
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-ptit-red hover:bg-red-700 text-white rounded-xl font-bold shadow-sm transition cursor-pointer"
                >
                  Lưu vào lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
