import { z } from "zod";
import type { StartQuizAttemptResponse, SubmitAttemptResponse } from "@/types/quiz";

const sessionSchema = z.object({
  ownerId: z.string(),
  courseId: z.string(),
  attempt: z.object({
    attemptId: z.string(), quizId: z.string(), quizTitle: z.string(), startedAt: z.string(), totalQuestions: z.number(),
    questions: z.array(z.object({ id: z.string(), questionOrder: z.number(), questionText: z.string(), options: z.array(z.object({ index: z.number().int().min(0).max(3), text: z.string() })) })),
  }),
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
});
export type QuizAttemptSession = z.infer<typeof sessionSchema>;
const resultSchema = z.object({ ownerId: z.string(), courseId: z.string(), quizTitle: z.string(), result: z.object({ attemptId: z.string(), quizId: z.string(), score: z.number(), correctAnswersCount: z.number(), totalQuestionsCount: z.number(), completedAt: z.string() }) });
export type QuizResultSession = z.infer<typeof resultSchema>;
const takingMemory = new Map<string, QuizAttemptSession>();
const resultMemory = new Map<string, QuizResultSession>();

/** Args: ownerId, courseId and Java-created attempt, all required. Input: authenticated Student and answer-free taking DTO. Output: void; stores same-tab recovery data. Errors: unavailable storage falls back to in-memory navigation, which cannot survive reload. */
export function saveQuizAttemptSession(ownerId: string, courseId: string, attempt: StartQuizAttemptResponse): void {
  const session = { ownerId, courseId, attempt, answers: {} };
  takingMemory.set(attempt.attemptId, session);
  try { sessionStorage.setItem(`studyflow.attempt.${attempt.attemptId}`, JSON.stringify(session)); } catch { /* Same-tab navigation can use the Java response in memory. */ }
}

/** Args: ownerId/courseId/attemptId, required strings. Input: same-tab recovery data. Output: validated owned session or null; never restores another account's attempt. Errors: corrupt/unavailable storage returns null. */
export function readQuizAttemptSession(ownerId: string, courseId: string, attemptId: string): QuizAttemptSession | null {
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(sessionStorage.getItem(`studyflow.attempt.${attemptId}`) ?? JSON.stringify(takingMemory.get(attemptId) ?? null)));
    return parsed.success && parsed.data.ownerId === ownerId && parsed.data.courseId === courseId && parsed.data.attempt.attemptId === attemptId ? parsed.data : null;
  } catch { const cached = takingMemory.get(attemptId); return cached?.ownerId === ownerId && cached.courseId === courseId ? cached : null; }
}

/** Args: validated owned session and selected option indices. Input: current taking screen. Output: void; saves answer selections for reload recovery. Errors: unavailable storage retains answers in same-tab memory. */
export function updateQuizAttemptSession(session: QuizAttemptSession, answers: Record<string, number>): void {
  const updated = { ...session, answers };
  takingMemory.set(session.attempt.attemptId, updated);
  try { sessionStorage.setItem(`studyflow.attempt.${session.attempt.attemptId}`, JSON.stringify(updated)); } catch { /* Keep current answers in memory if browser storage is unavailable. */ }
}

/** Args: attemptId, required string. Input: successful Java submission. Output: void; clears same-tab recovery data. Errors: storage failure is ignored after persisted submission. */
export function clearQuizAttemptSession(attemptId: string): void {
  takingMemory.delete(attemptId);
  try { sessionStorage.removeItem(`studyflow.attempt.${attemptId}`); } catch { /* Java submission is already persisted. */ }
}

/** Args: ownerId/courseId/title and Java submission result. Input: successful Java scoring response. Output: void; preserves that exact result across navigation/reload. Errors: storage failure uses same-tab memory, never resubmits the attempt. */
export function saveQuizResultSession(ownerId: string, courseId: string, quizTitle: string, result: SubmitAttemptResponse): void {
  const session = { ownerId, courseId, quizTitle, result };
  resultMemory.set(result.attemptId, session);
  try { sessionStorage.setItem(`studyflow.result.${result.attemptId}`, JSON.stringify(session)); } catch { /* Keep Java result available in the current app session. */ }
}

/** Args: ownerId/courseId/attemptId, required strings. Input: cached Java submission result. Output: validated owned result or null. Errors: invalid/unavailable storage returns owned memory fallback or null. */
export function readQuizResultSession(ownerId: string, courseId: string, attemptId: string): QuizResultSession | null {
  try {
    const parsed = resultSchema.safeParse(JSON.parse(sessionStorage.getItem(`studyflow.result.${attemptId}`) ?? JSON.stringify(resultMemory.get(attemptId) ?? null)));
    return parsed.success && parsed.data.ownerId === ownerId && parsed.data.courseId === courseId && parsed.data.result.attemptId === attemptId ? parsed.data : null;
  } catch { const cached = resultMemory.get(attemptId); return cached?.ownerId === ownerId && cached.courseId === courseId ? cached : null; }
}
