"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, UploadCloud, X } from "lucide-react";

interface FileDropzoneProps {
  label: string;
  hint: string;
  accept: string;
  extensions: readonly string[];
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

/** Args: labelled picker, allowed extensions, selected files and callback; maxFiles defaults to 1.
 * Input: local browser File objects from drag/drop or file picker; each nonempty and <=20 MiB.
 * Output: accessible drop target and removable selection; calls onChange without uploading anything.
 * Errors: invalid files/count shown inline; retains previous selection. Java validates content on upload. */
export function FileDropzone({ label, hint, accept, extensions, files, onChange, maxFiles = 1, disabled = false }: FileDropzoneProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Args: newly picked/dropped files. Input: browser selection; multi-file selections append uniquely.
   * Output: void; updates the parent only after extension, count and byte limits pass.
   * Errors: displays validation text and preserves the current selection. */
  function receiveFiles(incoming: File[]): void {
    if (disabled || incoming.length === 0) return;
    if (incoming.some((item) => !extensions.some((extension) => item.name.toLowerCase().endsWith(extension)))) {
      setError(`Chỉ nhận tệp ${extensions.join(", ").toUpperCase()}.`); return;
    }
    if (incoming.some((item) => item.size === 0 || item.size > 20 * 1024 * 1024)) {
      setError("Tệp không được rỗng hoặc vượt quá 20 MB."); return;
    }
    const next = maxFiles === 1 ? incoming : [...files, ...incoming].filter((item, index, all) =>
      all.findIndex((other) => other.name === item.name && other.size === item.size && other.lastModified === item.lastModified) === index);
    if (next.length > maxFiles) { setError(`Chọn tối đa ${maxFiles} tệp cho mục này.`); return; }
    setError(null); onChange(next);
  }

  /** Args: browser drop event. Input: local files; output: void after consuming the drop.
   * Errors: selection validation is shown inline; prevents browser navigation to dropped files. */
  function dropFiles(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault(); setDragging(false);
    receiveFiles(Array.from(event.dataTransfer.files));
  }

  return <section className="space-y-3">
    <h2 id={labelId} className="text-sm font-semibold text-slate-900">{label}</h2>
    <input ref={inputRef} type="file" accept={accept} multiple={maxFiles > 1} disabled={disabled} className="hidden"
      onChange={(event) => { receiveFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <button type="button" disabled={disabled} aria-labelledby={labelId} aria-describedby={hintId}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => { event.preventDefault(); if (!disabled) { event.dataTransfer.dropEffect = "copy"; setDragging(true); } }}
      onDragLeave={() => setDragging(false)} onDrop={dropFiles}
      className={`flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-7 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 ${dragging ? "border-red-600 bg-red-100" : "border-red-300 bg-red-50/40"}`}>
      <span className="rounded-2xl bg-red-100 p-3 text-red-600"><UploadCloud aria-hidden="true" className="h-7 w-7" /></span>
      <span className="text-sm font-bold text-slate-900">{dragging ? "Thả tệp vào đây" : maxFiles === 1 ? "Kéo và thả tài liệu vào đây" : "Kéo và thả giáo trình vào đây"}</span>
      <span className="text-xs text-slate-500">hoặc bấm để chọn tệp từ máy tính</span>
      <span className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">{files.length > 0 ? maxFiles === 1 ? "Thay tệp đã chọn" : "Chọn thêm tệp" : "Chọn tệp từ máy"}</span>
    </button>
    <p id={hintId} className="text-xs leading-5 text-slate-500">{hint}</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <ul aria-live="polite" className="space-y-2">{files.map((item, index) => <li key={`${item.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-red-600" />
      <span className="min-w-0 flex-1"><span className="block break-all text-sm font-semibold text-slate-800">{item.name}</span><span className="text-xs text-slate-500">{(item.size / 1024 / 1024).toFixed(2)} MB · Đã chọn</span></span>
      <button type="button" disabled={disabled} aria-label={`Bỏ tệp ${item.name}`} onClick={() => { onChange(files.filter((_, position) => position !== index)); setError(null); }} className="rounded-lg p-2 text-red-700 focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50"><X aria-hidden="true" className="h-4 w-4" /></button>
    </li>)}</ul>
  </section>;
}
