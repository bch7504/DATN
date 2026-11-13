"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderPlus,
  PlusCircle,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { catalogApi, teacherDocApi, teacherApi, teacherLibraryApi } from "@/lib/api-client";
import { TeacherDocument, TeacherResourceLibrary } from "@/types/material";
import { CourseOffering, Subject } from "@/types/course-offering";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorAlert } from "@/components/ui/error-states";
import { LoadingSpinner } from "@/components/ui/loading-states";

interface TeacherDocumentLibraryProps {
  offeringId?: string;
  libraryId?: string;
}

/** Teacher-owned resource libraries and Course Material PDFs, opened through dedicated detail routes. */
export default function TeacherDocumentLibrary({ offeringId, libraryId }: TeacherDocumentLibraryProps): React.JSX.Element {
  const router = useRouter();
  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [libraries, setLibraries] = useState<TeacherResourceLibrary[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibrarySubjectId, setNewLibrarySubjectId] = useState("");
  const [showCreateLibrary, setShowCreateLibrary] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [bulkTargetOfferingId, setBulkTargetOfferingId] = useState("");
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [targetLibraryId, setTargetLibraryId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [documentBusy, setDocumentBusy] = useState(false);
  const selectedOfferingId = offeringId ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedOffering = offerings.find((offering) => offering.id === selectedOfferingId) ?? null;
  const classDocuments = selectedOffering
    ? documents.filter((document) => document.publishedOfferings.some((publication) => publication.offeringId === selectedOffering.id))
    : [];
  /** Args: none. Input: legacy offeringId query. Output: void; redirects to the class detail route. Errors: none. */
  useEffect(() => {
    const legacyId = new URLSearchParams(window.location.search).get("offeringId");
    if (legacyId) router.replace(`/teacher/documents/${encodeURIComponent(legacyId)}`);
  }, [router]);

  /** Args: none. Input: authenticated Teacher context; output: void after loading owned documents/classes; errors: shown in the page alert. */
  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [documentData, offeringData, libraryData, subjectData] = await Promise.all([
        teacherDocApi.getDocuments(),
        teacherApi.getOfferings(),
        teacherLibraryApi.list(),
        catalogApi.getSubjects(),
      ]);
      setDocuments(documentData);
      setOfferings(offeringData);
      setLibraries(libraryData);
      setSubjects(subjectData);
      setErrorMsg(null);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Không thể tải kho học liệu PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  /** Args: current Java document metadata. Input: owner-scoped pending jobs only.
   * Output: polls status every 10 seconds without replacing the page or selection.
   * Errors: retains last confirmed metadata and retries on the next tick; cleanup cancels updates. */
  useEffect(() => {
    if (!documents.some((document) => ["PENDING_PROCESSING", "PROCESSING"].includes(document.status))) return;
    let active = true;
    let busy = false;
    const interval = window.setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        const [documentData, libraryData] = await Promise.all([
          teacherDocApi.getDocuments(), teacherLibraryApi.list(),
        ]);
        if (active) { setDocuments(documentData); setLibraries(libraryData); }
      } catch {
        // Keep Java's last confirmed status while a transient polling error is retried.
      } finally { busy = false; }
    }, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [documents]);

  /** Args: offeringId, nullable string. Input: selected teacher-owned offering or null for the class list. Output: void; navigates to its dedicated route. Errors: none. */
  const navigateToOffering = (offeringId: string | null): void => {
    if (offeringId === selectedOfferingId) return;
    router.push(offeringId ? `/teacher/documents/${encodeURIComponent(offeringId)}` : "/teacher/documents");
  };

  /** Args: required owned document and optional target class. Input: Teacher library selection. Output: void; opens dedicated publication route. Errors: Java authorizes loaded data on that route. */
  const openPublication = (document: TeacherDocument, targetOfferingId?: string): void => {
    const target = targetOfferingId ?? selectedOfferingId;
    router.push(`/teacher/documents/publications/${encodeURIComponent(document.id)}${target ? `?offeringId=${encodeURIComponent(target)}` : ""}`);
  };

  /** Args: documentId/offeringId, string, required. Input: owned document and its current offering publication; output: Promise<void> after revocation and refresh; errors: API errors are shown on the page. */
  const handleRevoke = async (documentId: string, offeringId: string): Promise<void> => {
    if (!window.confirm("Gỡ tài liệu này khỏi lớp học phần?")) return;
    try {
      await teacherDocApi.revokePublication(documentId, offeringId);
      setSuccessMsg("Đã gỡ tài liệu khỏi lớp học phần.");
      await loadData();
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Không thể gỡ công bố.");
    }
  };

  /** Args: none. Input: new name and optional subject. Output: created Teacher-owned library. Errors: shown inline. */
  const createLibrary = async (): Promise<void> => {
    if (!newLibraryName.trim()) { setErrorMsg("Hãy nhập tên kho tài liệu."); return; }
    try {
      const created = await teacherLibraryApi.create(newLibraryName.trim(), newLibrarySubjectId || undefined);
      setNewLibraryName(""); setNewLibrarySubjectId(""); setShowCreateLibrary(false);
      router.push(`/teacher/documents/libraries/${encodeURIComponent(created.id)}`);
    } catch (error: unknown) { setErrorMsg(error instanceof Error ? error.message : "Không thể tạo kho tài liệu."); }
  };

  /** Args: owned library ID. Input: explicit confirmation. Output: removes the folder only; source resources remain. Errors: shown inline. */
  const deleteLibrary = async (ownedLibraryId: string): Promise<void> => {
    if (!window.confirm("Xóa kho này? Tài liệu, Quiz và bài tập gốc vẫn được giữ lại.")) return;
    try { await teacherLibraryApi.delete(ownedLibraryId); router.replace("/teacher/documents"); }
    catch (error: unknown) { setErrorMsg(error instanceof Error ? error.message : "Không thể xóa kho tài liệu."); }
  };

  /** Args: item reference ID. Input: selected owned library. Output: removes only the reference. Errors: shown inline. */
  const removeLibraryItem = async (itemReferenceId: string): Promise<void> => {
    if (!libraryId) return;
    try { await teacherLibraryApi.removeItem(libraryId, itemReferenceId); setSuccessMsg("Đã bỏ mục khỏi kho."); await loadData(); }
    catch (error: unknown) { setErrorMsg(error instanceof Error ? error.message : "Không thể bỏ mục khỏi kho."); }
  };

  /** Args: owned failed PDF UUID. Input: existing stored file; Output: Promise<void>, queues retry and reloads metadata.
   * Errors: authorization/state failures displayed inline; no local READY status is fabricated. */
  const retryDocumentIndex = async (documentId: string): Promise<void> => {
    try {
      await teacherDocApi.retryIndex(documentId);
      await loadData();
      setSuccessMsg("Đã yêu cầu xử lý lại tài liệu.");
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Không thể xử lý lại tài liệu.");
    }
  };

  /**
   * Args: no positional parameters; reads selectedDocumentIds and bulkTargetOfferingId from state.
   * Input: current publication list returned by Java; the selected class must belong to the signed-in Teacher.
   * Output: Promise<void>; preserves existing class links and adds the selected class idempotently.
   * Errors: Java authorization/readiness errors are shown inline and no local publication state is fabricated.
   */
  const addSelectedDocumentsToClass = async (): Promise<void> => {
    if (!bulkTargetOfferingId) { setErrorMsg("Hãy chọn lớp học phần."); return; }
    const selected = documents.filter((document) => selectedDocumentIds.includes(document.id));
    if (selected.length === 0) { setErrorMsg("Hãy chọn ít nhất một tài liệu trong bảng."); return; }
    const notReady = selected.find((document) => document.status !== "READY");
    if (notReady) { setErrorMsg(`Tài liệu “${notReady.title}” chưa sẵn sàng.`); return; }
    setIsBulkBusy(true); setErrorMsg(null); setSuccessMsg(null);
    let publishedCount = 0;
    try {
      for (const document of selected) {
        const publicationIds = new Set(document.publishedOfferings.map((item) => item.offeringId));
        publicationIds.add(bulkTargetOfferingId);
        await teacherDocApi.publishDocument(document.id, Array.from(publicationIds));
        publishedCount += 1;
      }
      setSuccessMsg(`Đã thêm ${selected.length} tài liệu vào lớp học phần.`);
      setSelectedDocumentIds([]);
      await loadData();
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : "Không thể hoàn tất thao tác hàng loạt.";
      await loadData();
      setErrorMsg(`Đã công bố ${publishedCount}/${selected.length} tài liệu. ${detail} Có thể chọn lại và thử tiếp.`);
    } finally { setIsBulkBusy(false); }
  };

  const selectedLibrary = libraryId ? libraries.find((item) => item.id === libraryId) ?? null : null;
  const visibleItems = selectedLibrary?.items.filter((item) => {
    const document = documents.find((entry) => entry.id === item.itemId);
    return normalizeQuery(`${item.title} ${document?.fileName ?? ""}`).includes(normalizeQuery(search));
  }) ?? [];

  /** Args: search text. Output: lowercase unaccented text for Vietnamese name/filename matching. Errors: none. */
  function normalizeQuery(value: string): string {
    return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase().trim();
  }

  /** Args: none. Input: currently edited owned PDF/title. Output: metadata rename and refresh.
   * Errors: Java validation/ownership errors displayed inline, edit retained on failure. */
  async function renameDocument(): Promise<void> {
    if (!editingId || documentBusy) return;
    if (!editingTitle.trim()) { setErrorMsg("Hãy nhập tên tài liệu."); return; }
    setDocumentBusy(true); setErrorMsg(null);
    try { await teacherDocApi.renameDocument(editingId, editingTitle.trim()); setEditingId(null); await loadData(); setSuccessMsg("Đã đổi tên tài liệu."); }
    catch (cause: unknown) { setErrorMsg(cause instanceof Error ? cause.message : "Không đổi được tên tài liệu."); }
    finally { setDocumentBusy(false); }
  }

  /** Args: owned PDF. Input: explicit confirmation of global deletion.
   * Output: revokes/deletes through Java and refreshes metadata. Errors: shown inline; source stays until Java confirms. */
  async function deleteDocument(document: TeacherDocument): Promise<void> {
    if (documentBusy || !window.confirm(`Xóa tài liệu “${document.title}”? Tài liệu sẽ bị gỡ khỏi mọi kho và lớp đã công bố. Hành động này không thể hoàn tác.`)) return;
    setDocumentBusy(true); setErrorMsg(null);
    try { await teacherDocApi.deleteDocument(document.id); setSelectedDocumentIds((current) => current.filter((id) => id !== document.id)); await loadData(); setSuccessMsg("Đã xóa tài liệu và gỡ công bố."); }
    catch (cause: unknown) { setErrorMsg(cause instanceof Error ? cause.message : "Không xóa được tài liệu."); }
    finally { setDocumentBusy(false); }
  }

  /** Args: none. Input: source/target owned libraries and selected PDFs.
   * Output: atomic Java move, clear selection and refresh. Errors: displayed without fabricating a successful move. */
  async function moveDocuments(): Promise<void> {
    if (!libraryId || !targetLibraryId || selectedDocumentIds.length === 0 || isBulkBusy) return;
    setIsBulkBusy(true); setErrorMsg(null);
    try { await teacherLibraryApi.moveDocuments(libraryId, targetLibraryId, selectedDocumentIds); setSelectedDocumentIds([]); await loadData(); setSuccessMsg("Đã chuyển tài liệu sang kho được chọn."); }
    catch (cause: unknown) { setErrorMsg(cause instanceof Error ? cause.message : "Không chuyển được tài liệu."); }
    finally { setIsBulkBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Teacher Workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Kho tài liệu</h1>
          <p className="mt-1 text-sm text-slate-500">
            {selectedOffering
              ? `Học liệu đã công bố cho lớp ${selectedOffering.code}.`
              : selectedLibrary
                ? `Các tài liệu, Quiz và bài tập trong ${selectedLibrary.name}.`
                : "Tạo kho theo môn hoặc kho riêng; lưu PDF, Quiz và bài tập của bạn."}
          </p>
        </div>
        {selectedOffering && (
          <Link href="/teacher/documents" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm">
            <BookOpen className="h-4 w-4" /> Mở kho giảng viên
          </Link>
        )}
        {selectedLibrary && (
          <Link href={`/teacher/documents/upload?libraryId=${encodeURIComponent(selectedLibrary.id)}`} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm">
            <PlusCircle className="h-4 w-4" /> Thêm tài liệu
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {selectedOffering
          ? `Kho lớp ${selectedOffering.code} chỉ nhận tài liệu được công bố từ kho riêng của giảng viên. Hãy tải tệp vào kho giảng viên trước, sau đó chọn tài liệu để thêm vào lớp.`
          : "Tài liệu chỉ hiển thị cho sinh viên sau khi được công bố vào lớp. Nhận PDF có lớp văn bản hoặc PPTX, tối đa 20 MB."}
      </div>

      {errorMsg && <ErrorAlert message={errorMsg} onRetry={() => void loadData()} />}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" text="Đang tải lớp và học liệu..." /></div>
      ) : selectedOffering ? (
        <section className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button type="button" onClick={() => navigateToOffering(null)} className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-700">
                <ArrowLeft className="h-3.5 w-3.5" /> Danh sách lớp
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-700">{selectedOffering.code}</span>
                <StatusBadge status={selectedOffering.status} size="sm" />
              </div>
              <h2 className="mt-2 text-lg font-extrabold text-slate-900">{selectedOffering.name}</h2>
              <p className="mt-1 text-xs text-slate-500">{selectedOffering.subjectName} · {selectedOffering.semesterName}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
              <div className="text-2xl font-extrabold text-slate-900">{classDocuments.length}</div>
              <div className="text-xs text-slate-500">tài liệu trong lớp</div>
            </div>
          </div>

          {selectedOffering.status !== "ACTIVE" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Lớp không còn hoạt động; bạn vẫn có thể xem hoặc gỡ học liệu đã công bố.
            </div>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Tài liệu của lớp</h2>
              <span className="text-xs text-slate-500">{classDocuments.length} tài liệu</span>
            </div>
            {classDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 font-semibold text-slate-800">Lớp chưa có tài liệu được công bố</p>
                <p className="mt-1 text-sm text-slate-500">Mở kho giảng viên và chọn tài liệu để công bố vào lớp.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {classDocuments.map((document) => (
                  <article key={document.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"><FileText className="h-3.5 w-3.5" /> {document.materialType === "SLIDE_PDF" ? "Slide PDF" : document.materialType === "SUPPORTING_PDF" ? "PDF hỗ trợ" : "Tài liệu tham khảo"} · {document.totalPages} trang</span>
                        <StatusBadge status={document.status} size="sm" />
                      </div>
                      <h3 className="mt-3 text-base font-bold text-slate-900">{document.title}</h3>
                      <p className="mt-1 truncate text-xs text-slate-500">{document.fileName}</p>
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                        Đã công bố cho lớp {selectedOffering.code}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                      <a href={teacherDocApi.getDocumentDownloadUrl(document.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                        <ExternalLink className="h-3.5 w-3.5" /> {document.materialType === "SLIDE_PDF" ? "Mở slide" : "Tải PDF"}
                      </a>
                      <button type="button" onClick={() => openPublication(document)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700">
                        <Share2 className="h-3.5 w-3.5" /> Quản lý công bố
                      </button>
                      <button type="button" onClick={() => void handleRevoke(document.id, selectedOffering.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                        <X className="h-3.5 w-3.5" /> Gỡ khỏi lớp
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        </section>
      ) : selectedOfferingId ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Không tìm thấy lớp học phần này trong danh sách lớp bạn phụ trách. <button type="button" onClick={() => navigateToOffering(null)} className="font-bold underline">Quay lại danh sách lớp</button>
        </div>
      ) : libraryId ? (
        selectedLibrary ? (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href="/teacher/documents" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <ArrowLeft className="h-3.5 w-3.5" /> Danh sách kho
                </Link>
                <h2 className="text-lg font-extrabold text-slate-900">{selectedLibrary.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedLibrary.subjectName ?? "Kho riêng tư"}</p>
              </div>
              {!selectedLibrary.libraryType.startsWith("DEFAULT") && <button type="button" onClick={() => void deleteLibrary(selectedLibrary.id)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700">
                <Trash2 className="h-4 w-4" /> Xóa kho
              </button>}
            </div>
            {selectedLibrary.items.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Kho chưa có tài liệu, Quiz hoặc bài tập. Nhấn “Thêm tài liệu” để tải PDF/PPTX từ máy vào đúng kho này.</p>
            ) : (
              <div className="space-y-4">
                <input type="search" aria-label="Tìm kiếm tài liệu" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedDocumentIds([]); }} placeholder="Tìm theo tên tài liệu hoặc tên tệp..." className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" />
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <select aria-label="Chọn kho để chuyển tài liệu" value={targetLibraryId} onChange={(event) => setTargetLibraryId(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Chọn kho đích</option>{libraries.filter((item) => item.id !== libraryId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                  <button type="button" disabled={isBulkBusy || !targetLibraryId || selectedDocumentIds.length === 0} onClick={() => void moveDocuments()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Chuyển sang kho</button>
                </div>
                <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm font-semibold text-slate-700">Đã chọn {selectedDocumentIds.length} tài liệu</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select aria-label="Chọn lớp học phần" value={bulkTargetOfferingId} onChange={(event) => setBulkTargetOfferingId(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Chọn lớp học phần</option>{offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.code} · {offering.name}</option>)}</select>
                    <button type="button" disabled={isBulkBusy || selectedDocumentIds.length === 0 || !bulkTargetOfferingId} onClick={() => void addSelectedDocumentsToClass()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{isBulkBusy ? "Đang thêm..." : "Thêm vào lớp"}</button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3"><input type="checkbox" aria-label="Chọn tất cả tài liệu" checked={visibleItems.filter((item) => item.itemType === "DOCUMENT").length > 0 && visibleItems.filter((item) => item.itemType === "DOCUMENT").every((item) => selectedDocumentIds.includes(item.itemId))} onChange={(event) => setSelectedDocumentIds(event.target.checked ? visibleItems.filter((item) => item.itemType === "DOCUMENT").map((item) => item.itemId) : [])} /></th><th className="px-3 py-3">STT</th><th className="px-3 py-3">Tên tài liệu</th><th className="px-3 py-3">Loại tài liệu</th><th className="px-3 py-3">Số trang</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {visibleItems.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Không tìm thấy tài liệu phù hợp.</td></tr>}
                      {visibleItems.map((item, index) => {
                        const sourceDocument = item.itemType === "DOCUMENT" ? documents.find((document) => document.id === item.itemId) : null;
                        const typeLabel = !sourceDocument ? (item.itemType === "QUIZ" ? "Quiz" : "Bài tập") : sourceDocument.materialType === "SLIDE_PDF" ? "Slide PDF" : sourceDocument.materialType === "SUPPORTING_PDF" ? "PDF hỗ trợ" : "PDF tải xuống";
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-3"><input type="checkbox" aria-label={`Chọn ${item.title}`} disabled={!sourceDocument} checked={selectedDocumentIds.includes(item.itemId)} onChange={(event) => setSelectedDocumentIds((current) => event.target.checked ? Array.from(new Set([...current, item.itemId])) : current.filter((id) => id !== item.itemId))} /></td>
                            <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                            <td className="px-3 py-3 font-semibold text-slate-800">{editingId === item.itemId ? <div className="min-w-48 space-y-2"><input autoFocus aria-label="Tên tài liệu mới" maxLength={200} value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-sm" /><div className="flex gap-3 text-xs"><button type="button" disabled={documentBusy} onClick={() => void renameDocument()} className="font-bold text-red-700">Lưu</button><button type="button" disabled={documentBusy} onClick={() => setEditingId(null)}>Hủy</button></div></div> : item.title}</td>
                            <td className="px-3 py-3 text-slate-600">{typeLabel}</td>
                            <td className="px-3 py-3 text-slate-600">{sourceDocument?.totalPages ?? "—"}</td>
                            <td className="px-3 py-3"><StatusBadge status={item.status} size="sm" /></td>
                            <td className="px-3 py-3 text-right">
                              {sourceDocument && <div className="mb-2 flex justify-end gap-3 whitespace-nowrap text-xs font-bold text-red-700"><button type="button" disabled={documentBusy} onClick={() => { setEditingId(sourceDocument.id); setEditingTitle(sourceDocument.title); }}>Sửa tên</button><button type="button" disabled={documentBusy} onClick={() => void deleteDocument(sourceDocument)}>Xóa tài liệu</button></div>}
                              {sourceDocument?.status === "FAILED" && <button type="button" onClick={() => void retryDocumentIndex(sourceDocument.id)} className="mr-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Thử xử lý lại</button>}
                              {selectedLibrary.libraryType !== "DEFAULT" && <button type="button" onClick={() => void removeLibraryItem(item.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Bỏ khỏi kho</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500">Giáo trình được đính kèm ngay khi tải slide lên. Công bố slide sẽ tự công bố các tài liệu đính kèm đã xử lý xong vào cùng lớp.</p>
              </div>
            )}
          </section>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Không tìm thấy kho tài liệu hoặc bạn không có quyền truy cập. <Link href="/teacher/documents" className="font-bold underline">Quay lại danh sách kho</Link>
          </div>
        )
      ) : (
        <section className="space-y-4">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-base font-extrabold text-slate-900">Kho chung của giảng viên</h2><p className="mt-1 text-xs text-slate-500">Tài liệu chưa chọn kho sẽ vào “Tài liệu tải lên”; nhấn một kho để xem chi tiết.</p></div>
              <div className="flex gap-2"><Link href="/teacher/documents/upload" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white"><PlusCircle className="h-4 w-4" />Thêm tài liệu</Link><button type="button" onClick={() => setShowCreateLibrary((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700"><FolderPlus className="h-4 w-4" />Tạo kho</button></div>
            </div>
            {showCreateLibrary && <div className="grid gap-3 rounded-xl border border-red-100 bg-red-50 p-4 sm:grid-cols-[1fr_1fr_auto]"><input maxLength={120} value={newLibraryName} onChange={(event) => setNewLibraryName(event.target.value)} placeholder="Tên kho" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" /><select value={newLibrarySubjectId} onChange={(event) => setNewLibrarySubjectId(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Kho riêng, không gắn môn</option>{subjects.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><button type="button" onClick={() => void createLibrary()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">Tạo kho</button></div>}
            {libraries.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Đang tạo kho Tài liệu tải lên mặc định.</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{libraries.map((library) => <button key={library.id} type="button" onClick={() => router.push(`/teacher/documents/libraries/${encodeURIComponent(library.id)}`)} className="rounded-xl border border-slate-200 bg-white p-4 text-left"><div className="flex items-start justify-between gap-2"><p className="font-bold text-slate-900">{library.name}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{library.libraryType === "DEFAULT" ? "MẶC ĐỊNH" : library.libraryType === "SUBJECT" ? "THEO MÔN" : "RIÊNG"}</span></div><p className="mt-1 text-xs text-slate-500">{library.libraryType === "DEFAULT" ? "Tài liệu chưa được sắp xếp" : library.subjectName ?? "Không gắn môn học"}</p><p className="mt-3 text-xs font-semibold text-red-700">{library.items.length} mục · Mở kho →</p></button>)}</div>}
          </section>

          <div>
            <h2 className="text-base font-bold text-slate-900">Lớp học phần của tôi</h2>
            <p className="mt-1 text-xs text-slate-500">Chọn một lớp để xem học liệu đã công bố và thêm PDF vào lớp đó.</p>
          </div>
          {offerings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">Bạn chưa có lớp học phần. Kho riêng vẫn có thể được sử dụng độc lập.</div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offerings.map((offering) => {
              const materialCount = documents.filter((document) => document.publishedOfferings.some((publication) => publication.offeringId === offering.id)).length;
              return (
                <button key={offering.id} type="button" onClick={() => navigateToOffering(offering.id)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-700">{offering.code}</span>
                    <StatusBadge status={offering.status} size="sm" />
                  </div>
                  <h3 className="mt-4 line-clamp-2 text-base font-bold text-slate-900">{offering.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{offering.subjectName} · {offering.semesterName}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <FileText className="h-4 w-4 text-red-600" /> {materialCount} tài liệu
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">Mở lớp <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                  </div>
                </button>
              );
            })}
          </div>}
        </section>
      )}

    </div>
  );
}
