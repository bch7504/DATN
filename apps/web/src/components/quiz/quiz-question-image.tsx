"use client";

import React, { useEffect, useState } from "react";
import { ImageIcon, RefreshCw } from "lucide-react";
import { apiDownload } from "@/lib/api-client";
import type { QuizQuestionImage as QuizQuestionImageData } from "@/types/quiz";

/**
 * Args: one opaque Java-authorized Quiz image descriptor.
 * Input: authenticated browser session; bytes are fetched through Java, never object storage directly.
 * Output: accessible private PNG preview. Errors: inline retry state without exposing storage details.
 */
export function QuizQuestionImage({ image }: { image: QuizQuestionImageData }): React.JSX.Element {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    setObjectUrl(null);
    setError(false);
    void apiDownload(image.url)
      .then((blob) => {
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [image.url, retry]);

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
        <span>Không thể tải ảnh minh họa của câu hỏi.</span>
        <button type="button" onClick={() => setRetry((value) => value + 1)} className="inline-flex items-center gap-1 font-bold">
          <RefreshCw className="h-3.5 w-3.5" /> Thử lại
        </button>
      </div>
    );
  }
  if (!objectUrl) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
        <ImageIcon className="mr-2 h-4 w-4" /> Đang tải ảnh câu hỏi…
      </div>
    );
  }
  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-2">
      {/* Blob URL is created from an authenticated Java response, not an arbitrary remote origin. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={objectUrl} alt={image.altText} className="mx-auto max-h-96 w-auto max-w-full object-contain" />
      <figcaption className="px-2 pt-2 text-center text-[11px] text-slate-500">{image.altText}</figcaption>
    </figure>
  );
}
