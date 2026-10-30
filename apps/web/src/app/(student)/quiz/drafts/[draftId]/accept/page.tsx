"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { quizApi, studentApi } from "@/lib/api-client";
import type { CourseOffering } from "@/types/course-offering";
import type { QuizDraft } from "@/types/quiz";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: none. Input: reviewed owner draft and approved classes. Output: Quiz destination confirmation screen. Errors: displayed inline; Java validates enrollment and lifecycle. */
export default function AcceptQuizDraftPage(): ReactElement {
  const { draftId } = useParams<{ draftId: string }>();
  const router = useRouter();
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [destinationType, setDestinationType] = useState<"PERSONAL" | "COURSE_OFFERING">("PERSONAL");
  const [offeringId, setOfferingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([quizApi.getDraft(draftId), studentApi.getOfferings()])
      .then(([record, classes]) => { if (active) { setDraft(record); setOfferings(classes.filter((item) => item.status === "ACTIVE")); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được thông tin lưu Quiz."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [draftId]);
  /** Args: form submit event. Input: reviewed draft and PERSONAL or approved COURSE_OFFERING destination. Output: Promise<void>; accepts via Java and opens review workspace. Errors: shown inline. */
  async function accept(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (draft?.status !== "REVIEW_REQUIRED") return;
    if (destinationType === "COURSE_OFFERING" && !offeringId) { setError("Hãy chọn lớp học phần đã được duyệt."); return; }
    setBusy(true); setError(null);
    try {
      const quiz = await quizApi.acceptQuiz(draft.id, { destinationType, courseOfferingId: destinationType === "COURSE_OFFERING" ? offeringId : undefined });
      router.replace(`/review/${encodeURIComponent(quiz.courseOfferingId || "PERSONAL")}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được Quiz."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl space-y-5">
    <Link href={`/quiz/drafts/${encodeURIComponent(draftId)}`} className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Quay lại bản nháp</Link>
    <header><h1 className="text-2xl font-extrabold text-slate-900">Chọn nơi lưu Quiz</h1><p className="mt-2 text-sm text-slate-500">Lưu vào kho cá nhân hoặc gắn với lớp học phần bạn đã được duyệt.</p></header>
    {error && <ErrorAlert message={error} />}
    {loading ? <LoadingSpinner text="Đang tải thông tin..." /> : draft?.status === "REVIEW_REQUIRED" ? <form onSubmit={(event) => void accept(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold">Bản nháp có {draft.questions.length} câu hỏi.</p><label className="flex gap-2 text-sm"><input type="radio" checked={destinationType === "PERSONAL"} onChange={() => setDestinationType("PERSONAL")} />Quiz cá nhân</label><label className="flex gap-2 text-sm"><input type="radio" checked={destinationType === "COURSE_OFFERING"} onChange={() => setDestinationType("COURSE_OFFERING")} />Gắn vào lớp học phần</label>{destinationType === "COURSE_OFFERING" && <select aria-label="Lớp học phần được duyệt" required value={offeringId} onChange={(event) => setOfferingId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"><option value="">Chọn lớp học phần</option>{offerings.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select>}<button disabled={busy} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Chấp nhận và lưu Quiz"}</button></form> : draft && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Bản nháp hiện ở trạng thái {draft.status}, không thể chấp nhận lại.</p>}
  </main>;
}
