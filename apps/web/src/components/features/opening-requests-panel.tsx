"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { catalogApi, openingRequestApi } from "@/lib/api-client";
import type { OpeningRequest } from "@/types/course-opening";
import type { Subject } from "@/types/course-offering";

/** Args: admin defaults false. Input: role-scoped Java proposals and optional canonical subject catalog.
 * Output: status/history in Course Offerings; Admin can normalize and decide PENDING proposals.
 * Errors: displayed inline; never fabricates approval or a course before Java confirms it. */
export function OpeningRequestsPanel({ admin = false }: { admin?: boolean }): React.JSX.Element {
  const [rows, setRows] = useState<OpeningRequest[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filter, setFilter] = useState(admin ? "PENDING" : "ALL");
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<OpeningRequest | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [credits, setCredits] = useState(3);
  const [reason, setReason] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    const request = admin ? openingRequestApi.adminList(filter === "ALL" ? undefined : filter, page)
      : openingRequestApi.own().then((items) => ({ items, totalPages: 1 }));
    request.then((result) => { if (active) { setRows(result.items); setPages(result.totalPages); setError(""); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được yêu cầu."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, filter, page, reload]);
  useEffect(() => {
    if (!admin) return;
    let active = true;
    catalogApi.getSubjects().then((items) => { if (active) setSubjects(items); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được môn chuẩn."); });
    return () => { active = false; };
  }, [admin]);
  /** Args: pending proposal. Output: void; fills Admin review form. Errors: none. */
  function review(row: OpeningRequest): void {
    setEditing(row); setSubjectId(""); setSubjectCode(row.subjectCode); setSubjectName(row.subjectName); setCredits(row.credits); setReason(""); setError("");
  }
  /** Args: form event. Input: Admin-reviewed canonical fields. Output: approval then refresh.
   * Errors: Java conflicts/permission errors remain inline; form stays available. */
  async function approve(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!editing || busy) return;
    setBusy(true); setError("");
    try { await openingRequestApi.approve(editing.id, subjectId ? { subjectId } : { subjectCode, subjectName, credits }); setEditing(null); setReload((value) => value + 1); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Không duyệt được yêu cầu."); }
    finally { setBusy(false); }
  }
  /** Args: none. Input: selected proposal/reason. Output: rejected proposal and refreshed list.
   * Errors: requires a nonblank reason, Java failures shown inline. */
  async function reject(): Promise<void> {
    if (!editing || busy) return;
    if (!reason.trim()) { setError("Hãy nhập lý do từ chối."); return; }
    setBusy(true); setError("");
    try { await openingRequestApi.reject(editing.id, reason.trim()); setEditing(null); setReload((value) => value + 1); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "Không từ chối được yêu cầu."); }
    finally { setBusy(false); }
  }
  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{admin ? "Yêu cầu mở lớp" : "Yêu cầu mở lớp của tôi"}</h2><div className="flex gap-2">{admin && <select aria-label="Lọc yêu cầu mở lớp" className={input} value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}>{[ ["PENDING", "Chờ duyệt"], ["APPROVED", "Đã duyệt"], ["REJECTED", "Từ chối"], ["ALL", "Tất cả"] ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}<button type="button" onClick={() => setReload((value) => value + 1)} className="whitespace-nowrap rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700">Làm mới</button></div></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="text-sm text-slate-500">Đang tải yêu cầu...</p> : rows.length === 0 ? <p className="text-sm text-slate-500">Chưa có yêu cầu phù hợp.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{["Môn / Lớp đề xuất", ...(admin ? ["Giảng viên"] : []), "Học kỳ", "Trạng thái", ""].map((heading, index) => <th key={index} className="p-3">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="p-3"><span className="font-semibold">{row.subjectCode} · {row.subjectName}</span><span className="block text-xs text-slate-500">{row.code} · {row.credits} tín chỉ</span></td>{admin && <td className="p-3">{row.teacherName}</td>}<td className="p-3">{row.semesterName}</td><td className="p-3"><span className={row.status === "PENDING" ? "text-amber-700" : row.status === "APPROVED" ? "text-emerald-700" : "text-red-700"}>{row.status === "PENDING" ? "Chờ Admin duyệt" : row.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}</span>{row.decisionReason && <p className="mt-1 max-w-sm text-xs text-slate-500">{row.decisionReason}</p>}</td><td className="p-3">{admin && row.status === "PENDING" ? <button type="button" onClick={() => review(row)} className="whitespace-nowrap rounded-xl bg-red-600 px-3 py-2 font-semibold text-white">Xem và duyệt</button> : row.courseOfferingId && <Link className="font-semibold text-red-700" href={`${admin ? "/admin" : "/teacher"}/course-offerings/${encodeURIComponent(row.courseOfferingId)}`}>Mở lớp →</Link>}</td></tr>)}</tbody></table></div>}
    {admin && pages > 1 && <div className="flex items-center justify-end gap-3 text-sm"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Trang trước</button><span>{page + 1}/{pages}</span><button type="button" disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Trang sau</button></div>}
    {admin && editing && <form onSubmit={(event) => void approve(event)} className="space-y-4 rounded-xl border border-red-200 bg-red-50/40 p-4"><h3 className="font-bold">Chuẩn hóa môn học và duyệt lớp {editing.code}</h3><p className="text-sm text-slate-600">Giảng viên: {editing.teacherName}. Khi duyệt, lớp được mở cho chính giảng viên này.</p>
      <label className="block space-y-2 text-sm font-semibold"><span>Môn chuẩn có sẵn (tùy chọn)</span><select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className={input}><option value="">Dùng thông tin đã chuẩn hóa bên dưới</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
      {!subjectId && <div className="grid gap-3 sm:grid-cols-3"><label className="space-y-2 text-sm font-semibold"><span>Mã môn chuẩn</span><input required maxLength={50} pattern="[A-Za-z0-9][A-Za-z0-9._-]*" value={subjectCode} onChange={(event) => setSubjectCode(event.target.value.toUpperCase())} className={input} /></label><label className="space-y-2 text-sm font-semibold"><span>Tên môn chuẩn</span><input required maxLength={255} value={subjectName} onChange={(event) => setSubjectName(event.target.value)} className={input} /></label><label className="space-y-2 text-sm font-semibold"><span>Tín chỉ</span><input required type="number" min={1} max={30} value={credits} onChange={(event) => setCredits(Number(event.target.value))} className={input} /></label><p className="text-xs text-slate-500 sm:col-span-3">Mã môn chưa có sẽ được thêm vào danh mục khi duyệt. Môn đã có được dùng lại; thay đổi danh mục hiện có cần thực hiện trong Quản lý môn học.</p></div>}
      <label className="block space-y-2 text-sm font-semibold"><span>Lý do từ chối (chỉ bắt buộc nếu từ chối)</span><textarea maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className={input} /></label>
      <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm">Hủy</button><button type="button" disabled={busy} onClick={() => void reject()} className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">Từ chối</button><button disabled={busy} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">{busy ? "Đang xử lý..." : "Duyệt mở lớp"}</button></div>
    </form>}
  </section>;
}
