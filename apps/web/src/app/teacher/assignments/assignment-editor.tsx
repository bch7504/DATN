"use client";

import { FormEvent, useEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import { assignmentApi, CourseAssignment, teacherApi } from "@/lib/api-client";
import { CourseOffering } from "@/types/course-offering";

interface AssignmentEditorProps {
  assignmentId?: string;
}

/**
 * Args: optional assignmentId identifies an owned draft to edit; absence creates a draft.
 * Input: authenticated Teacher, owned Course Offerings, and public Java assignment APIs.
 * Output: a create/edit form; saving writes one draft and navigates to its detail URL.
 * Errors: missing/published drafts, invalid form values, and API failures are shown in the form.
 */
export function AssignmentEditor({ assignmentId }: AssignmentEditorProps): ReactElement {
  const router = useRouter();
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [offeringId, setOfferingId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listHref, setListHref] = useState("/teacher/assignments");
  const backHref = assignmentId
    ? `/teacher/assignments/${encodeURIComponent(assignmentId)}`
    : listHref;

  useEffect(() => {
    let mounted = true;

    /** Args: none. Input: Teacher's classes and optional draft ID. Output: void; fills the form. Errors: displays API or missing-draft errors. */
    async function loadEditor(): Promise<void> {
      setLoading(true);
      setError("");
      try {
        const ownedOfferings = await teacherApi.getOfferings();
        if (!mounted) return;
        setOfferings(ownedOfferings);

        if (assignmentId) {
          const groups = await Promise.all(ownedOfferings.map((offering) => assignmentApi.listForTeacher(offering.id)));
          if (!mounted) return;
          const draft: CourseAssignment | undefined = groups.flat().find((item) => item.id === assignmentId);
          if (!draft) throw new Error("Không tìm thấy bản nháp trong các lớp của bạn.");
          if (draft.status !== "DRAFT") throw new Error("Bài tập đã công bố nên không thể sửa bản nháp.");
          const date = new Date(draft.dueAt);
          setOfferingId(draft.courseOfferingId);
          setTitle(draft.title);
          setDescription(draft.description);
          setDueAt(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
          setDraftLoaded(true);
        } else {
          const requestedId = new URLSearchParams(window.location.search).get("offeringId");
          if (requestedId) setListHref(`/teacher/assignments?offeringId=${encodeURIComponent(requestedId)}`);
          setOfferingId(ownedOfferings.find((offering) => offering.id === requestedId && offering.status === "ACTIVE")?.id
            ?? ownedOfferings.find((offering) => offering.status === "ACTIVE")?.id ?? "");
        }
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "Không tải được biểu mẫu bài tập.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadEditor();
    return () => { mounted = false; };
  }, [assignmentId]);

  /** Args: form submit event. Input: active class, title, instructions, and local due time. Output: void; saves a draft through Java and opens its detail URL. Errors: displays validation or API failures. */
  async function saveDraft(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!offeringId || !dueAt || (assignmentId && !draftLoaded)) return;
    setBusy(true);
    setError("");
    try {
      const input = { title: title.trim(), description: description.trim(), dueAt: new Date(dueAt).toISOString() };
      const saved = assignmentId
        ? await assignmentApi.update(assignmentId, input)
        : await assignmentApi.create(offeringId, input);
      router.replace(`/teacher/assignments/${encodeURIComponent(saved.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được bản nháp.");
    } finally {
      setBusy(false);
    }
  }

  const selectedOffering = offerings.find((offering) => offering.id === offeringId);
  const hasActiveOffering = offerings.some((offering) => offering.status === "ACTIVE");
  const canShowForm = assignmentId ? draftLoaded : hasActiveOffering;

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700">
        <ArrowLeft className="h-4 w-4" /> Danh sách bài tập
      </Link>
      <header>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Dành cho giảng viên</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{assignmentId ? "Sửa bản nháp" : "Giao bài tập mới"}</h1>
        <p className="mt-2 text-sm text-slate-500">Lưu bản nháp trước, sau đó công bố trong chi tiết bài tập để gửi cho sinh viên.</p>
      </header>

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Đang tải biểu mẫu...</p>
      ) : !canShowForm ? (
        !error && <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Bạn cần có một lớp học phần đang mở để giao bài tập.</p>
      ) : (
        <form onSubmit={(event) => void saveDraft(event)} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
          <label className="text-sm font-semibold md:col-span-2">Lớp học phần
            <select required disabled={!!assignmentId || busy} value={offeringId} onChange={(event) => setOfferingId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal disabled:bg-slate-50">
              <option value="">Chọn lớp để giao bài tập</option>
              {offerings.filter((offering) => offering.status === "ACTIVE" || offering.id === offeringId).map((offering) => <option key={offering.id} value={offering.id}>{offering.code} · {offering.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Tên bài<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" placeholder="Ví dụ: Bài tập chương 1" /></label>
          <label className="text-sm font-semibold">Hạn nộp<input required type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-semibold md:col-span-2">Hướng dẫn<textarea required maxLength={10000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" placeholder="Mô tả yêu cầu bài tập..." /></label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Link href={backHref} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Hủy</Link>
            <button disabled={busy || selectedOffering?.status !== "ACTIVE"} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              <Save className="h-4 w-4" /> {busy ? "Đang lưu..." : "Lưu bản nháp"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
