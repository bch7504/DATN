"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Download, Eye, Send, X } from "lucide-react";
import { assignmentApi, AssignmentStats, CourseAssignment, teacherApi } from "@/lib/api-client";
import { CourseOffering } from "@/types/course-offering";

interface AssignmentPreview {
  url: string;
  fileName: string;
  contentType: string;
}

/**
 * Args: assignmentId from the route. Input: Teacher-owned assignment and report from Java.
 * Output: dedicated detail/report page with in-page file preview. Errors: API failures appear as alerts.
 */
export default function TeacherAssignmentDetailPage(): ReactElement {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<CourseAssignment | null>(null);
  const [offering, setOffering] = useState<CourseOffering | null>(null);
  const [report, setReport] = useState<AssignmentStats | null>(null);
  const [backHref, setBackHref] = useState("/teacher/assignments");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const previewUrl = useRef<string | null>(null);

  useEffect(() => {
    const filteredOfferingId = new URLSearchParams(window.location.search).get("offeringId");
    if (filteredOfferingId) setBackHref("/teacher/assignments?offeringId=" + encodeURIComponent(filteredOfferingId));
  }, []);

  useEffect(() => {
    let mounted = true;

    /** Args: none. Input: Teacher's classes and assignment ID. Output: void; loads one owned assignment and report. Errors: displays API or missing-assignment errors. */
    async function loadDetail(): Promise<void> {
      setLoading(true);
      setError("");
      try {
        const offerings = await teacherApi.getOfferings();
        const groups = await Promise.all(offerings.map((item) => assignmentApi.listForTeacher(item.id)));
        if (!mounted) return;
        const found = groups.flat().find((item) => item.id === assignmentId);
        if (!found) throw new Error("Không tìm thấy bài tập trong các lớp của bạn.");
        setAssignment(found);
        setOffering(offerings.find((item) => item.id === found.courseOfferingId) ?? null);
        if (found.status === "PUBLISHED") {
          setReportLoading(true);
          const stats = await assignmentApi.stats(found.id);
          if (mounted) setReport(stats);
        }
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "Không tải được chi tiết bài tập.");
      } finally {
        if (mounted) { setLoading(false); setReportLoading(false); }
      }
    }

    void loadDetail();
    return () => { mounted = false; };
  }, [assignmentId]);

  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);

  /** Args: none. Input: current published assignment ID. Output: void; refreshes the authorized submission report. Errors: displayed in the page alert. */
  async function refreshReport(): Promise<void> {
    if (!assignment) return;
    setReportLoading(true);
    setError("");
    try { setReport(await assignmentApi.stats(assignment.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được tình trạng nộp bài."); }
    finally { setReportLoading(false); }
  }

  /** Args: none. Input: owned draft. Output: void; publishes the assignment and loads its report. Errors: displayed in the page alert. */
  async function publish(): Promise<void> {
    if (!assignment) return;
    setBusy(true);
    setError("");
    try {
      const published = await assignmentApi.publish(assignment.id);
      setAssignment(published);
      setReport(await assignmentApi.stats(published.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không công bố được bài tập.");
    } finally { setBusy(false); }
  }

  /** Args: assignment, student and attachment IDs plus file name. Input: authorized Teacher download. Output: void; saves the returned file locally. Errors: displayed in the page alert. */
  async function download(studentId: string, attachmentId: string, fileName: string): Promise<void> {
    if (!assignment) return;
    try {
      const blob = await assignmentApi.downloadForTeacher(assignment.id, studentId, attachmentId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được tệp."); }
  }

  /** Args: student and attachment IDs plus file name. Input: authorized Teacher download. Output: void; opens a PDF/image preview. Errors: displayed in the page alert. */
  async function previewAttachment(studentId: string, attachmentId: string, fileName: string): Promise<void> {
    if (!assignment) return;
    setPreviewLoadingId(attachmentId);
    setError("");
    try {
      const blob = await assignmentApi.downloadForTeacher(assignment.id, studentId, attachmentId);
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(blob);
      setPreview({ url: previewUrl.current, fileName, contentType: blob.type });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xem trước tệp."); }
    finally { setPreviewLoadingId(null); }
  }

  /** Args: none. Input: current preview URL. Output: void; closes the preview and releases the object URL. Errors: none. */
  function closePreview(): void {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
  }

  const previewName = preview?.fileName.toLowerCase() ?? "";
  const isPdfPreview = !!preview && (preview.contentType === "application/pdf" || previewName.endsWith(".pdf"));
  const isImagePreview = !!preview && (preview.contentType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(previewName));

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-700">
        <ArrowLeft className="h-4 w-4" /> Danh sách bài tập
      </Link>
      {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      {loading ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Đang tải chi tiết bài tập...</p>
      ) : assignment ? (
        <>
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-red-600">Bài tập lớp học</p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">{assignment.title}</h1>
                <p className="mt-1 text-sm text-slate-500">{offering ? offering.code + " · " + offering.name : "Lớp học phần"} · Hạn nộp: {new Date(assignment.dueAt).toLocaleString("vi-VN")}</p>
                <span className={assignment.status === "DRAFT" ? "mt-3 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800" : "mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"}>
                  {assignment.status === "DRAFT" ? "Bản nháp" : "Đã công bố"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {assignment.status === "DRAFT" ? (
                  <>
                    <Link href={"/teacher/assignments/" + encodeURIComponent(assignment.id) + "/edit"} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Sửa nháp</Link>
                    <button type="button" disabled={busy} onClick={() => void publish()} className="inline-flex items-center gap-1 rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />Công bố</button>
                  </>
                ) : (
                  <button type="button" disabled={reportLoading} onClick={() => void refreshReport()} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{reportLoading ? "Đang tải..." : "Tải lại tình trạng nộp"}</button>
                )}
              </div>
            </div>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Hướng dẫn</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{assignment.description || "Không có hướng dẫn bổ sung."}</p>
          </section>

          {assignment.status === "PUBLISHED" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Tình trạng nộp bài</h2>
              {reportLoading ? <p role="status" className="mt-3 text-sm text-slate-500">Đang tải tình trạng nộp bài...</p> : report ? (
                <>
                  <p className="mt-2 text-sm text-slate-600">Đã nộp: {report.submittedCount}/{report.approvedStudentCount} · Đúng hạn: {report.onTimeCount} · Nộp muộn: {report.lateCount} · Chưa nộp: {report.notSubmittedCount}</p>
                  <p className="mt-1 text-xs text-slate-500">Thống kê gồm mọi sinh viên hiện đã được duyệt vào lớp, kể cả người được duyệt sau hạn.</p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="border-b text-slate-500"><tr><th className="p-2">Sinh viên</th><th className="p-2">Trạng thái</th><th className="p-2">Thời điểm</th><th className="p-2">Bài làm</th></tr></thead>
                      <tbody>{report.students.map((student) => (
                        <tr key={student.studentId} className="border-b last:border-0">
                          <td className="p-2"><div className="font-semibold">{student.fullName}</div><div className="text-xs text-slate-500">{student.email}</div></td>
                          <td className="p-2">{student.submissionState === "NOT_SUBMITTED" ? <span className="text-amber-700">Chưa nộp</span> : student.status === "LATE" ? <span className="text-orange-700">Nộp muộn</span> : <span className="text-emerald-700">Đã nộp đúng hạn</span>}</td>
                          <td className="p-2">{student.submittedAt ? new Date(student.submittedAt).toLocaleString("vi-VN") : "—"}</td>
                          <td className="p-2">
                            {student.answerText && <p className="mb-1 max-w-sm whitespace-pre-wrap">{student.answerText}</p>}
                            <div className="flex flex-wrap gap-3">{student.attachments?.map((file) => (
                              <span key={file.id} className="inline-flex items-center gap-2">
                                <button type="button" disabled={previewLoadingId === file.id} onClick={() => void previewAttachment(student.studentId, file.id, file.fileName)} className="inline-flex items-center gap-1 text-blue-700 hover:underline disabled:opacity-50"><Eye className="h-4 w-4" />{previewLoadingId === file.id ? "Đang mở..." : "Xem"}</button>
                                <button type="button" onClick={() => void download(student.studentId, file.id, file.fileName)} className="inline-flex items-center gap-1 text-red-700 hover:underline"><Download className="h-4 w-4" />Tải {file.fileName}</button>
                              </span>
                            ))}</div>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              ) : !error ? <p className="mt-3 text-sm text-slate-500">Chưa tải được báo cáo bài nộp.</p> : null}
            </section>
          )}
        </>
      ) : !error ? <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Không tìm thấy bài tập.</p> : null}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" onClick={closePreview}>
          <section role="dialog" aria-modal="true" aria-labelledby="assignment-preview-title" onClick={(event) => event.stopPropagation()} className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <h2 id="assignment-preview-title" className="truncate text-sm font-bold text-slate-900">{preview.fileName}</h2>
              <button type="button" aria-label="Đóng xem trước" onClick={closePreview} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="min-h-0 flex-1 bg-slate-100">
              {isPdfPreview ? <iframe title={"Xem trước " + preview.fileName} src={preview.url} className="h-full w-full border-0" /> : isImagePreview ? (
                <div className="flex h-full items-center justify-center p-4"><Image unoptimized src={preview.url} alt={preview.fileName} width={1200} height={900} className="max-h-full max-w-full object-contain" /></div>
              ) : <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-600">Trình duyệt không hỗ trợ xem trước định dạng tệp này. Chọn “Tải” để lưu tệp.</div>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
