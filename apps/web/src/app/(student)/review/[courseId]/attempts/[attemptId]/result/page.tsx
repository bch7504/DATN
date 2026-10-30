"use client";

import { useEffect, useState, type ReactElement } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { reviewApi } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { readQuizResultSession } from "@/lib/quiz-attempt-session";
import type { QuizAttempt } from "@/types/quiz";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: none. Input: courseId/attemptId route segments and authorized Java history. Output: persisted result screen. Errors: unavailable/unknown results shown inline. */
export default function QuizAttemptResultPage(): ReactElement {
  const { courseId, attemptId } = useParams<{ courseId: string; attemptId: string }>();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    const cached = readQuizResultSession(user.id, courseId, attemptId);
    if (cached) {
      const result = cached.result;
      setAttempt({ id: result.attemptId, quizId: result.quizId, quizTitle: cached.quizTitle, score: result.correctAnswersCount, maxScore: result.totalQuestionsCount, percentage: result.totalQuestionsCount ? Math.round(result.correctAnswersCount / result.totalQuestionsCount * 100) : 0, completedAt: result.completedAt, attemptNumber: 0, answers: [] });
      setLoading(false);
      return;
    }
    let active = true;
    reviewApi.getCourseWorkspace(courseId).then((workspace) => { if (active) { const found = workspace.attempts.find((item) => item.id === attemptId); setAttempt(found ?? null); if (!found) setError("Không tìm thấy kết quả lượt làm."); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được kết quả."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, attemptId, user]);
  return <main className="mx-auto max-w-3xl space-y-5">
    <Link href={`/review/${encodeURIComponent(courseId)}`} className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Kho ôn tập và lịch sử</Link>
    <h1 className="text-2xl font-extrabold text-slate-900">Kết quả làm Quiz</h1>
    {error && <ErrorAlert message={error} />}{loading && <LoadingSpinner text="Đang tải kết quả..." />}
    {attempt && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"><h2 className="text-xl font-bold text-slate-900">{attempt.quizTitle}</h2><p className="text-4xl font-extrabold text-red-700">{attempt.score}/{attempt.maxScore}</p><p className="text-lg font-semibold text-slate-700">{attempt.percentage}%</p><p className="text-sm text-slate-500">{attempt.attemptNumber > 0 ? `Lần ${attempt.attemptNumber} · ` : ""}{new Date(attempt.completedAt).toLocaleString("vi-VN")}</p><p className="text-sm text-slate-600">Kết quả do máy chủ chấm và ghi nhận. Nội dung cần ôn lại được tổng hợp từ các câu trả lời sai.</p><Link href={`/review/${encodeURIComponent(courseId)}/items`} className="inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">Xem nội dung cần ôn lại</Link></section>}
  </main>;
}
