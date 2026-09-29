"use client";

import React, { useState, useEffect } from "react";
import { reviewApi, ApiClientError } from "@/lib/api-client";
import { DailyGoalProgress, DailyGoalConfig } from "@/types/review";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { ErrorAlert } from "@/components/ui/error-states";
import {
  CalendarCheck,
  Target,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Save,
  Presentation,
  Check,
} from "lucide-react";

interface StudyTask {
  id: string;
  title: string;
  courseCode: string;
  dueDate: string;
  completed: boolean;
}

export default function StudentPlanPage() {
  const [dailyGoal, setDailyGoal] = useState<DailyGoalProgress | null>(null);
  const [targetSlides, setTargetSlides] = useState<number>(8);
  const [targetQuizQuestions, setTargetQuizQuestions] = useState<number>(10);
  const [targetTasks, setTargetTasks] = useState<number>(2);

  const [isSavingGoal, setIsSavingGoal] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Student active study tasks
  const [tasks, setTasks] = useState<StudyTask[]>([
    {
      id: "task_01",
      title: "Xem lại slide 4-6 về Mô hình PEAS môn Trí tuệ nhân tạo",
      courseCode: "INT1340_01",
      dueDate: "Hôm nay, 21:00",
      completed: true,
    },
    {
      id: "task_02",
      title: "Làm bài Quiz 2 về Chuẩn hóa Cơ sở dữ liệu và Dạng chuẩn 3NF",
      courseCode: "DBI202_K21",
      dueDate: "Hôm nay, 23:59",
      completed: true,
    },
    {
      id: "task_03",
      title: "Ôn tập câu hỏi sai về Khóa chính và Phép kết nối SQL",
      courseCode: "DBI202_K21",
      dueDate: "Ngày mai, 18:00",
      completed: false,
    },
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCourse, setNewTaskCourse] = useState("INT1340_01");

  useEffect(() => {
    let mounted = true;
    async function loadGoal() {
      try {
        const goalData = await reviewApi.getDailyGoalProgress();
        if (mounted) {
          setDailyGoal(goalData);
          setTargetSlides(goalData.targetSlides);
          setTargetQuizQuestions(goalData.targetQuizQuestions);
          setTargetTasks(goalData.targetTasks);
        }
      } catch (err: unknown) {
        if (mounted) setErrorMessage("Không thể tải thông tin Mục tiêu ngày.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadGoal();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveDailyGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGoal(true);
    setSaveSuccessMsg(null);
    setErrorMessage(null);

    try {
      // Per system rule: Client only configures targets, Java calculates actual & streak
      const updated = await reviewApi.updateDailyGoalConfig({
        targetSlides: Number(targetSlides),
        targetQuizQuestions: Number(targetQuizQuestions),
        targetTasks: Number(targetTasks),
      });

      setDailyGoal(updated);
      setSaveSuccessMsg("Đã cập nhật mục tiêu học tập hàng ngày thành công!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Lỗi khi lưu cấu hình mục tiêu hàng ngày.");
      }
    } finally {
      setIsSavingGoal(false);
    }
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-100 text-ptit-red">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              Kế Hoạch & Mục Tiêu Học Tập
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chủ động lập mục tiêu hàng ngày (Daily Goal) và quản lý nhiệm vụ ôn tập.
          </p>
        </div>
      </div>

      {errorMessage && (
        <ErrorAlert message={errorMessage} onRetry={() => setErrorMessage(null)} />
      )}

      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" text="Đang tải kế hoạch học tập..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Daily Goal Progress & Editor */}
          <div className="lg:col-span-6 space-y-6">
            {/* Daily Goal Actual Progress from Java Backend */}
            {dailyGoal && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-ptit-red" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Tiến độ Mục tiêu Hôm nay
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Ngày {new Date().toLocaleDateString("vi-VN")}
                  </span>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Slides Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Xem slide bài giảng</span>
                      <span className="font-bold text-slate-900">
                        {dailyGoal.actualSlides}/{dailyGoal.targetSlides} slide ({dailyGoal.slidesPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ptit-red rounded-full transition-all"
                        style={{ width: `${dailyGoal.slidesPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Quiz Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Câu hỏi Quiz hoàn thành</span>
                      <span className="font-bold text-slate-900">
                        {dailyGoal.actualQuizQuestions}/{dailyGoal.targetQuizQuestions} câu ({dailyGoal.quizPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ptit-red rounded-full transition-all"
                        style={{ width: `${dailyGoal.quizPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Task Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>Nhiệm vụ học tập</span>
                      <span className="font-bold text-slate-900">
                        {dailyGoal.actualTasks}/{dailyGoal.targetTasks} task ({dailyGoal.tasksPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{ width: `${dailyGoal.tasksPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 leading-relaxed">
                  Lưu ý: Điểm thực tế và chuỗi Streak được tính toán tự động bởi hệ thống dựa trên hoạt động xem slide và làm bài quiz. Hoàn thành 100% mục tiêu không phải là điều kiện bắt buộc để duy trì Streak.
                </div>
              </div>
            )}

            {/* Daily Goal Configuration Form */}
            <form
              onSubmit={handleSaveDailyGoal}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Cấu hình mục tiêu hàng ngày (Chỉ gửi target):
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mục tiêu slide xem mỗi ngày:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={targetSlides}
                    onChange={(e) => setTargetSlides(Number(e.target.value))}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mục tiêu câu Quiz mỗi ngày:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={targetQuizQuestions}
                    onChange={(e) => setTargetQuizQuestions(Number(e.target.value))}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mục tiêu nhiệm vụ hoàn thành:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={targetTasks}
                    onChange={(e) => setTargetTasks(Number(e.target.value))}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingGoal}
                className="w-full py-2.5 bg-ptit-red hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSavingGoal ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                <span>Lưu cấu hình mục tiêu</span>
              </button>
            </form>
          </div>

          {/* Right Column: Study Tasks Management */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Nhiệm vụ học tập cá nhân ({tasks.filter((t) => t.completed).length}/{tasks.length})
                </h3>
              </div>

              {/* Add Task Form */}
              <form onSubmit={handleAddTask} className="flex gap-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Thêm nhiệm vụ mới..."
                  className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={newTaskCourse}
                  onChange={(e) => setNewTaskCourse(e.target.value)}
                  className="p-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none"
                >
                  <option value="INT1340_01">AI</option>
                  <option value="DBI202_K21">CSDL</option>
                  <option value="PERSONAL">Cá nhân</option>
                </select>
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="p-2.5 bg-ptit-red hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {/* Tasks List */}
              <div className="space-y-2 pt-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                      task.completed
                        ? "bg-slate-50 border-slate-200 opacity-70"
                        : "bg-white border-slate-200 hover:border-red-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.id)}
                      className="mt-0.5 rounded text-ptit-red focus:ring-red-500 cursor-pointer"
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
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-ptit-red">
                          {task.courseCode}
                        </span>
                        <span>•</span>
                        <span>{task.dueDate}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-300 hover:text-red-600 transition p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
