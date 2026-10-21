"use client";

import { FormEvent, useEffect, useRef, useState, type ReactElement } from "react";
import { AlertCircle, ClipboardList, Download, Eye, Plus, Send, X } from "lucide-react";
import { assignmentApi, AssignmentStats, CourseAssignment, teacherApi } from "@/lib/api-client";
import { CourseOffering } from "@/types/course-offering";

interface AssignmentPreview {
  url: string;
  fileName: string;
  contentType: string;
}

/** Args: none. Input: authenticated Teacher actions and Java assignment/report DTOs. Output: management page ReactElement. Errors: Java API failures are rendered as an alert. */
export default function TeacherAssignmentsPage(): ReactElement {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [offeringId, setOfferingId] = useState("");
  const [items, setItems] = useState<CourseAssignment[]>([]);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<AssignmentPreview | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const listRequest = useRef(0);
  const reportRequest = useRef(0);
  const previewUrl = useRef<string | null>(null);

  async function loadOfferings(): Promise<void> {
    try { const data = await teacherApi.getOfferings(); setOfferings(data); if (!offeringId && data[0]) setOfferingId(data[0].id); }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được lớp học phần."); }
  }
  /** Args: Course Offering ID. Input: authenticated Teacher and an owned offering. Output: void; refreshes its assignment list. Errors: displays Java API errors and ignores stale responses. */
  async function loadAssignments(id: string): Promise<void> {
    const request = ++listRequest.current;
    ++reportRequest.current;
    setItems([]); setStats(null); setSelectedAssignmentId(null); setReportLoading(false); setLoading(true);
    try { if (id) { const data = await assignmentApi.listForTeacher(id); if (request === listRequest.current) { setItems(data); setError(""); } } }
    catch (e) { if (request === listRequest.current) setError(e instanceof Error ? e.message : "Không tải được danh sách bài tập."); }
    finally { if (request === listRequest.current) setLoading(false); }
  }
  // Fetch once on entry; class changes are handled by the separate assignments effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadOfferings(); }, []);
  useEffect(() => { void loadAssignments(offeringId); }, [offeringId]);
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);

  /** Args: optional owned draft. Output: void; fills the composer and opens it; no API writes. */
  function editDraft(item?: CourseAssignment): void {
    ++reportRequest.current; setSelectedAssignmentId(null); setStats(null); setReportLoading(false);
    setEditingId(item?.id ?? null); setTitle(item?.title ?? ""); setDescription(item?.description ?? "");
    if (item) {
      const date = new Date(item.dueAt);
      setDueAt(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    } else setDueAt("");
    setSuccess(""); setIsComposerOpen(true);
  }
  /** Args: none. Input: current composer state. Output: void; closes and clears the form without an API write. */
  function closeComposer(): void {
    setEditingId(null); setTitle(""); setDescription(""); setDueAt(""); setIsComposerOpen(false);
  }
  /** Args: one assignment from the current list. Output: void; opens its details and fetches report for published work. Errors: shown in the page alert. */
  function openAssignment(item: CourseAssignment): void {
    setSelectedAssignmentId(item.id);
    setStats(null);
    setError("");
    if (item.status === "PUBLISHED") void showReport(item.id);
    else { ++reportRequest.current; setReportLoading(false); }
  }

  /** Args: form submit event. Input: valid class, title, instructions and due time. Output: saves/updates draft, closes composer and refreshes list. Errors: shown in the page alert. */
  async function createDraft(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!offeringId || !dueAt) return;
    setBusy(true); setError("");
    try {
      const input = { title: title.trim(), description: description.trim(), dueAt: new Date(dueAt).toISOString() };
      const saved = editingId
        ? await assignmentApi.update(editingId, input)
        : await assignmentApi.create(offeringId, input);
      closeComposer(); setSuccess("Đã lưu bản nháp."); await loadAssignments(offeringId); setSelectedAssignmentId(saved.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tạo được bài tập."); }
    finally { setBusy(false); }
  }
  /** Args: draft assignment ID. Input: Teacher owns the draft. Output: publishes and refreshes list/report. Errors: shown in the page alert. */
  async function publish(id: string): Promise<void> {
    setBusy(true); setError(""); try { await assignmentApi.publish(id); await loadAssignments(offeringId); setSelectedAssignmentId(id); void showReport(id); }
    catch (e) { setError(e instanceof Error ? e.message : "Không công bố được bài tập."); }
    finally { setBusy(false); }
  }
  /** Args: published assignment ID. Input: Teacher owns the assignment. Output: report DTO displayed in selected details. Errors: shown in the page alert. */
  async function showReport(id: string): Promise<void> {
    const request = ++reportRequest.current;
    setStats(null); setReportLoading(true);
    try { const data = await assignmentApi.stats(id); if (request === reportRequest.current) { setStats(data); setError(""); } }
    catch (e) { if (request === reportRequest.current) setError(e instanceof Error ? e.message : "Không tải được tình trạng nộp bài."); }
    finally { if (request === reportRequest.current) setReportLoading(false); }
  }
  async function download(assignmentId: string, studentId: string, attachmentId: string, name: string): Promise<void> {
    try {
      const blob = await assignmentApi.downloadForTeacher(assignmentId, studentId, attachmentId);
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được tệp."); }
  }
  /** Args: assignment/student/attachment IDs and file name. Input: Teacher owns this submission attachment. Output: void; loads an authorized file into an in-page PDF/image preview. Errors: shown in the page alert; the object URL is revoked when replaced or closed. */
  async function previewAttachment(assignmentId: string, studentId: string, attachmentId: string, name: string): Promise<void> {
    setPreviewLoadingId(attachmentId); setError("");
    try {
      const blob = await assignmentApi.downloadForTeacher(assignmentId, studentId, attachmentId);
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      const url = URL.createObjectURL(blob);
      previewUrl.current = url;
      setPreviewFile({ url, fileName: name, contentType: blob.type });
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể xem trước tệp."); }
    finally { setPreviewLoadingId(null); }
  }
  /** Args: none. Input: current preview object URL, if present. Output: void; closes preview and releases its browser resource. */
  function closePreview(): void {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreviewFile(null);
  }

  const selectedAssignment = items.find((item) => item.id === selectedAssignmentId) ?? null;
  const selectedReport = selectedAssignment && stats?.assignmentId === selectedAssignment.id ? stats : null;
  const activeOffering = offerings.find((item) => item.id === offeringId);
  const previewName = previewFile?.fileName.toLowerCase() ?? "";
  const isPdfPreview = !!previewFile && (previewFile.contentType === "application/pdf" || previewName.endsWith(".pdf"));
  const isImagePreview = !!previewFile && (previewFile.contentType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(previewName));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Dành cho giảng viên</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Bài tập về nhà</h1>
          <p className="mt-2 text-sm text-slate-500">Chọn một bài tập để xem hướng dẫn, hạn nộp và tình trạng nộp bài.</p>
        </div>
        <button
          type="button"
          disabled={!offeringId || busy || activeOffering?.status !== "ACTIVE"}
          onClick={() => editDraft()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Giao bài tập
        </button>
      </header>

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}

      <label className="block max-w-xl text-sm font-semibold text-slate-700">
        Lớp học phần
        <select
          disabled={busy}
          value={offeringId}
          onChange={(event) => { closeComposer(); setSuccess(""); setOfferingId(event.target.value); }}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
        >
          <option value="">Chọn lớp</option>
          {offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.code} · {offering.name}</option>)}
        </select>
      </label>

      {isComposerOpen && (
        <form onSubmit={(event) => void createDraft(event)} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
          <div className="md:col-span-2 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold">{editingId ? "Sửa bản nháp" : "Giao bài tập mới"}</h2>
              <p className="mt-1 text-xs text-slate-500">Bài tập được lưu thành bản nháp; bấm “Công bố” trong chi tiết để gửi tới sinh viên.</p>
            </div>
            <button type="button" aria-label="Đóng biểu mẫu" onClick={closeComposer} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <label className="text-sm font-semibold">Tên bài<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" placeholder="Ví dụ: Bài tập chương 1" /></label>
          <label className="text-sm font-semibold">Hạn nộp<input required type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="text-sm font-semibold md:col-span-2">Hướng dẫn<textarea required maxLength={10000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" placeholder="Mô tả yêu cầu bài tập..." /></label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={closeComposer} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Hủy</button>
            <button disabled={!offeringId || busy || activeOffering?.status !== "ACTIVE"} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              <Plus className="h-4 w-4" /> {busy ? "Đang lưu..." : "Lưu bản nháp"}
            </button>
          </div>
        </form>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Danh sách bài tập</h2>
            {activeOffering && <p className="mt-1 text-sm text-slate-500">{activeOffering.code} · {activeOffering.name}</p>}
          </div>
          {!loading && <span className="text-xs text-slate-500">{items.length} bài</span>}
        </div>

        {loading ? (
          <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-500">Đang tải bài tập...</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            <ClipboardList className="mx-auto mb-2 h-7 w-7" />
            {offeringId ? "Chưa có bài tập trong lớp này." : "Chọn lớp học phần để xem bài tập."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {items.map((item) => {
              const isSelected = selectedAssignmentId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-expanded={isSelected}
                  onClick={() => openAssignment(item)}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50 ${isSelected ? "bg-red-50/60" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-slate-900">{item.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.status === "DRAFT" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                        {item.status === "DRAFT" ? "Bản nháp" : "Đã giao"}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">Hạn nộp: {new Date(item.dueAt).toLocaleString("vi-VN")}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-red-700">{isSelected ? "Đang xem" : "Xem chi tiết →"}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedAssignment && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="assignment-detail-title">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="assignment-detail-title" className="text-lg font-bold text-slate-900">{selectedAssignment.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${selectedAssignment.status === "DRAFT" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                  {selectedAssignment.status === "DRAFT" ? "Bản nháp" : "Đã công bố"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Hạn nộp: {new Date(selectedAssignment.dueAt).toLocaleString("vi-VN")}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {selectedAssignment.status === "DRAFT" ? (
                <>
                  <button type="button" disabled={busy} onClick={() => editDraft(selectedAssignment)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Sửa nháp</button>
                  <button type="button" disabled={busy} onClick={() => void publish(selectedAssignment.id)} className="inline-flex items-center gap-1 rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />Công bố</button>
                </>
              ) : (
                <button type="button" disabled={reportLoading} onClick={() => void showReport(selectedAssignment.id)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{reportLoading ? "Đang tải..." : "Tải lại tình trạng nộp"}</button>
              )}
              <button type="button" aria-label="Đóng chi tiết" onClick={() => { ++reportRequest.current; setSelectedAssignmentId(null); setStats(null); setReportLoading(false); }} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800">Hướng dẫn</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{selectedAssignment.description || "Không có hướng dẫn bổ sung."}</p>
          </div>

          {selectedAssignment.status === "PUBLISHED" && (
            reportLoading ? (
              <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Đang tải tình trạng nộp bài...</p>
            ) : selectedReport ? (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tình trạng nộp bài</h3>
                  <p className="mt-1 text-sm text-slate-600">Đã nộp: {selectedReport.submittedCount}/{selectedReport.approvedStudentCount} · Đúng hạn: {selectedReport.onTimeCount} · Nộp muộn: {selectedReport.lateCount} · Chưa nộp: {selectedReport.notSubmittedCount}</p>
                  <p className="mt-1 text-xs text-slate-500">Thống kê gồm mọi sinh viên hiện đã được duyệt vào lớp, kể cả người được duyệt sau hạn.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="border-b text-slate-500"><tr><th className="p-2">Sinh viên</th><th className="p-2">Trạng thái</th><th className="p-2">Thời điểm</th><th className="p-2">Bài làm</th></tr></thead>
                    <tbody>{selectedReport.students.map((student) => (
                      <tr key={student.studentId} className="border-b last:border-0">
                        <td className="p-2"><div className="font-semibold">{student.fullName}</div><div className="text-xs text-slate-500">{student.email}</div></td>
                        <td className="p-2">{student.submissionState === "NOT_SUBMITTED" ? <span className="text-amber-700">Chưa nộp</span> : student.status === "LATE" ? <span className="text-orange-700">Nộp muộn</span> : <span className="text-emerald-700">Đã nộp đúng hạn</span>}</td>
                        <td className="p-2">{student.submittedAt ? new Date(student.submittedAt).toLocaleString("vi-VN") : "—"}</td>
                        <td className="p-2">
                          {student.answerText && <p className="mb-1 max-w-sm whitespace-pre-wrap">{student.answerText}</p>}
                          <div className="flex flex-wrap gap-3">
                            {student.attachments?.map((file) => (
                              <span key={file.id} className="inline-flex items-center gap-2">
                                <button type="button" disabled={previewLoadingId === file.id} onClick={() => void previewAttachment(selectedReport.assignmentId, student.studentId, file.id, file.fileName)} className="inline-flex items-center gap-1 text-blue-700 hover:underline disabled:opacity-50">
                                  <Eye className="h-4 w-4" /> {previewLoadingId === file.id ? "Đang mở..." : "Xem"}
                                </button>
                                <button type="button" onClick={() => void download(selectedReport.assignmentId, student.studentId, file.id, file.fileName)} className="inline-flex items-center gap-1 text-red-700 hover:underline">
                                  <Download className="h-4 w-4" /> Tải {file.fileName}
                                </button>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            ) : null
          )}
        </section>
      )}

      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" onClick={closePreview}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-preview-title"
            onClick={(event) => event.stopPropagation()}
            className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <h2 id="assignment-preview-title" className="truncate text-sm font-bold text-slate-900">{previewFile.fileName}</h2>
              <button type="button" aria-label="Đóng xem trước" onClick={closePreview} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 bg-slate-100">
              {isPdfPreview ? (
                <iframe title={`Xem trước ${previewFile.fileName}`} src={previewFile.url} className="h-full w-full border-0" />
              ) : isImagePreview ? (
                <div className="flex h-full items-center justify-center p-4">
                  <img src={previewFile.url} alt={previewFile.fileName} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-600">
                  Trình duyệt không hỗ trợ xem trước định dạng tệp này. Đóng cửa sổ và chọn “Tải” để lưu tệp.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
