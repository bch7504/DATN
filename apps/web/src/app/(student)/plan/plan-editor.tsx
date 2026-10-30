"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { studyPlanApi, type StudyPlanRecord } from "@/lib/api-client";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

/** Args: optional planId, omitted for creation. Input: Student-owned plan, title and inclusive start/end dates. Output: standalone date-range form. Errors: displayed inline; Java validates ownership and existing item containment. */
export function PlanEditor({ planId }: { planId?: string }): ReactElement {
  const router = useRouter();
  const [plan, setPlan] = useState<StudyPlanRecord | null>(null);
  const [title, setTitle] = useState("Kế hoạch học tập cá nhân");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(!!planId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setStartDate(date); setEndDate(date);
    if (!planId) return;
    let active = true;
    studyPlanApi.getPlan(planId).then((item) => { if (active) { setPlan(item); setTitle(item.title); setStartDate(item.startDate); setEndDate(item.endDate); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được kế hoạch."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [planId]);
  /** Args: form event. Input: nonempty title and inclusive date range, owned active plan when editing. Output: Promise<void>; persists both dates through Java and returns to the first week. Errors: reversed range or API rejection retains inputs. */
  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy || !startDate || !endDate || !title.trim() || (planId && (!plan || plan.status !== "ACTIVE"))) return;
    if (endDate < startDate) { setError("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu."); return; }
    setBusy(true); setError(null);
    try {
      const saved = plan ? await studyPlanApi.updatePlan(plan.id, { title: title.trim(), description: plan.description ?? undefined, startDate, endDate, status: "ACTIVE" }) : await studyPlanApi.createPlan({ title: title.trim(), description: "Kế hoạch và lịch học do sinh viên tự quản lý.", startDate, endDate });
      router.replace(`/plan?planId=${encodeURIComponent(saved.id)}&date=${encodeURIComponent(startDate)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được kế hoạch."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl space-y-5">
    <Link href="/plan" className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← Kế hoạch & Lịch</Link>
    <h1 className="text-2xl font-extrabold text-slate-900">{planId ? "Sửa kế hoạch" : "Tạo kế hoạch mới"}</h1>
    {error && <ErrorAlert message={error} />}
    {loading ? <LoadingSpinner text="Đang tải kế hoạch..." /> : (!planId || plan) && <form onSubmit={(event) => void save(event)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <label className="block text-sm font-semibold">Tên kế hoạch<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Ngày bắt đầu<input required type="date" name="startDate" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
        <label className="block text-sm font-semibold">Ngày kết thúc<input required type="date" name="endDate" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
      </div>
      <p className="text-xs leading-5 text-slate-500">Chọn khoảng ngày bao gồm mọi lịch học và hạn nhiệm vụ của kế hoạch. Có thể chọn cùng một ngày nếu chỉ lập kế hoạch trong ngày.</p>
      <div className="flex justify-end gap-2"><Link href="/plan" className="rounded-xl border border-slate-300 px-4 py-2 text-sm">Hủy</Link><button disabled={busy || (planId !== undefined && plan?.status !== "ACTIVE")} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Lưu kế hoạch"}</button></div>
    </form>}
  </main>;
}
