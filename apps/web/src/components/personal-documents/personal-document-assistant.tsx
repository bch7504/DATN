"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  BookOpen,
  Check,
  CheckSquare,
  ChevronRight,
  Copy,
  FileQuestion,
  FileText,
  ListChecks,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { ApiClientError, chatApi, personalDocApi } from "@/lib/api-client";
import type {
  AssistantCapability,
  ChatConversation,
  ChatMessage,
  PersonalCitation,
} from "@/types/chat";
import type { PersonalDocument } from "@/types/material";

const SUGGESTIONS = [
  {
    icon: FileQuestion,
    title: "Hỏi đáp tài liệu",
    prompt: "Giải thích ACID dựa trên các tài liệu đã chọn.",
  },
  {
    icon: FileText,
    title: "Tóm tắt nội dung",
    prompt: "Tóm tắt tài liệu thành 7 ý chính và kèm trích dẫn.",
  },
  {
    icon: ListChecks,
    title: "Tạo Quiz ôn tập",
    prompt: "Tạo 15 câu trắc nghiệm khó từ tài liệu đã chọn.",
  },
] as const;

const CAPABILITY_LABELS: Record<AssistantCapability, string> = {
  ASK_DOCUMENT: "Hỏi đáp tài liệu",
  SUMMARIZE_DOCUMENT: "Tóm tắt tài liệu",
  CREATE_QUIZ: "Tạo Quiz",
  NEEDS_CLARIFICATION: "Cần thêm thông tin",
};

/**
 * args/input: required onBackToLibrary callback; owner-scoped conversations/PDFs from Java.
 * output: nested assistant UI; callback returns void and restores the library.
 * errors: API failures are rendered in the assistant; no access to other owners' PDFs.
 */
export function PersonalDocumentAssistant({ onBackToLibrary }: { onBackToLibrary: () => void }): JSX.Element {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citation, setCitation] = useState<PersonalCitation | null>(null);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([chatApi.getConversations(), personalDocApi.getDocuments()])
      .then(([conversationItems, documentItems]) => {
        if (!mounted) return;
        setConversations(conversationItems);
        setDocuments(documentItems);
        const first = conversationItems[0] ?? null;
        setActiveConversation(first);
        setSelectedDocumentIds(
          first?.selectedDocumentIds ??
            documentItems.filter((item) => item.status === "READY").slice(0, 2).map((item) => item.id),
        );
      })
      .catch((reason: unknown) => {
        if (!mounted) return;
        setError(reason instanceof Error ? reason.message : "Không thể tải khu vực AI tài liệu cá nhân.");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const readyDocuments = useMemo(
    () => documents.filter((item) => item.status === "READY"),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return documents;
    return documents.filter(
      (item) =>
        item.title.toLowerCase().includes(keyword) ||
        item.fileName.toLowerCase().includes(keyword),
    );
  }, [documents, search]);

  /** Optional title defaults to a new session; creates an owner-scoped session or null. API errors propagate to caller. */
  async function createConversation(initialTitle: string = "Phiên tài liệu mới"): Promise<ChatConversation | null> {
    const scope = selectedDocumentIds.filter((id) =>
      readyDocuments.some((document) => document.id === id),
    );
    if (scope.length === 0) {
      setError("Hãy chọn ít nhất một Personal PDF ở trạng thái READY.");
      return null;
    }
    const created = await chatApi.createConversation({
      selectedDocumentIds: scope,
      title: initialTitle,
    });
    setConversations((current) => [created, ...current]);
    setActiveConversation(created);
    return created;
  }

  /** Required owner conversation id; selects session and scope; void, errors rendered locally. */
  async function switchConversation(id: string): Promise<void> {
    setLoading(true);
    setCitation(null);
    try {
      const selected = await chatApi.getConversation(id);
      setActiveConversation(selected);
      setSelectedDocumentIds(selected.selectedDocumentIds);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Không thể mở phiên tài liệu.");
    } finally {
      setLoading(false);
    }
  }

  /** Optional text defaults to composer; sends under selected READY scope; void, errors rendered locally. */
  async function sendMessage(value?: string): Promise<void> {
    const content = (value ?? message).trim();
    if (!content || sending) return;
    if (selectedDocumentIds.length === 0) {
      setError("Hãy chọn ít nhất một Personal PDF trước khi gửi yêu cầu.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const sameScope = activeConversation &&
        activeConversation.selectedDocumentIds.length === selectedDocumentIds.length &&
        selectedDocumentIds.every((id) => activeConversation.selectedDocumentIds.includes(id));
      const conversation =
        (sameScope ? activeConversation : null) ??
        (await createConversation(content.length > 38 ? `${content.slice(0, 38)}…` : content));
      if (!conversation) return;

      const optimisticMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setActiveConversation((current) =>
        current ? { ...current, messages: [...current.messages, optimisticMessage] } : current,
      );
      setMessage("");

      const response = await chatApi.sendMessage(conversation.id, { message: content });
      setActiveConversation((current) =>
        current ? { ...current, messages: [...current.messages, response] } : current,
      );
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (reason: unknown) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể xử lý yêu cầu trên tài liệu cá nhân.",
      );
    } finally {
      setSending(false);
    }
  }

  /** Required document; toggles READY source within 10-source limit; void, no network or exceptions. */
  function toggleDocument(document: PersonalDocument): void {
    if (document.status !== "READY") return;
    setSelectedDocumentIds((current) =>
      current.includes(document.id)
        ? current.filter((id) => id !== document.id)
        : current.length < 10
          ? [...current, document.id]
          : current,
    );
  }

  /** Optional capability; returns semantic badge classes, defaults to answer; no side effects/errors. */
  function capabilityClass(capability?: AssistantCapability): string {
    if (capability === "CREATE_QUIZ") return "border-violet-200 bg-violet-50 text-violet-700";
    if (capability === "SUMMARIZE_DOCUMENT") return "border-blue-200 bg-blue-50 text-blue-700";
    if (capability === "NEEDS_CLARIFICATION") return "border-amber-200 bg-amber-50 text-amber-800";
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return (
    <div className="space-y-5">
      <header id="personal-ai-assistant" className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between scroll-mt-24">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-ptit-red">
            <Sparkles className="h-3.5 w-3.5" /> AI cho PDF cá nhân
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Hỏi đáp, tóm tắt & tạo Quiz
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Chọn PDF ngay trong kho tài liệu cá nhân, sau đó nhập yêu cầu tự nhiên. Hệ thống tự nhận diện tác vụ và trả kết quả kèm nguồn.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToLibrary}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ptit-red px-4 py-2 text-sm font-bold text-white shadow-sm"
        >
          <BookOpen className="h-4 w-4" /> Quay lại kho tài liệu
        </button>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Đóng thông báo">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid min-h-[680px] grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-[680px] min-w-0 flex-col">
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-3">
            <button
              type="button"
              disabled={sending || loading}
              onClick={() => void createConversation().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Không thể tạo phiên mới."))}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-ptit-red px-3 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" /> Phiên mới
            </button>
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                disabled={sending || loading}
                onClick={() => void switchConversation(conversation.id)}
                className={`max-w-56 shrink-0 truncate rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                  activeConversation?.id === conversation.id
                    ? "border-red-200 bg-white text-ptit-red"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {conversation.title}
              </button>
            ))}
            <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> {selectedDocumentIds.length} nguồn được cấp quyền
            </span>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-6">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Đang tải phiên làm việc…</div>
            ) : !activeConversation || activeConversation.messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-ptit-red">
                  <Bot className="h-8 w-8" />
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900">Bạn muốn làm gì với tài liệu?</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Chỉ cần viết yêu cầu tự nhiên. Trợ lý sẽ chọn đúng chức năng và không truy cập ngoài những PDF bạn đã chọn.
                </p>
                <div className="mt-7 grid w-full gap-3 sm:grid-cols-3">
                  {SUGGESTIONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.title}
                        onClick={() => void sendMessage(item.prompt)}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
                      >
                        <Icon className="h-5 w-5 text-ptit-red" />
                        <strong className="mt-3 block text-sm text-slate-900">{item.title}</strong>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{item.prompt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              activeConversation.messages.map((item) => (
                <div key={item.id} className={`flex gap-3 ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                  {item.role === "assistant" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-ptit-red">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`max-w-3xl ${item.role === "user" ? "rounded-2xl rounded-tr-md bg-ptit-red px-4 py-3 text-white" : "space-y-3"}`}>
                    {item.role === "assistant" && item.capability && (
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${capabilityClass(item.capability)}`}>
                        {CAPABILITY_LABELS[item.capability]}
                      </span>
                    )}
                    <div className={item.role === "assistant" ? "rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm" : "text-sm leading-6"}>
                      <p className="whitespace-pre-line">{item.content}</p>
                      {item.citations && item.citations.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          {item.citations.map((source) => (
                            <button
                              type="button"
                              key={`${item.id}-${source.documentId}-${source.pageNumber}`}
                              onClick={() => setCitation(source)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-ptit-red"
                            >
                              <FileText className="h-3.5 w-3.5" /> Trang {source.pageNumber}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {item.status === "NEEDS_CLARIFICATION" && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="text-xs font-bold text-slate-700">
                            Số câu
                            <input className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2" defaultValue="15" />
                          </label>
                          <label className="text-xs font-bold text-slate-700">
                            Phạm vi
                            <select className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2" defaultValue="all">
                              <option value="all">Toàn bộ tài liệu</option>
                              <option value="range">Chọn khoảng trang</option>
                            </select>
                          </label>
                          <label className="text-xs font-bold text-slate-700">
                            Độ khó
                            <select className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2" defaultValue="mixed">
                              <option value="mixed">Hỗn hợp</option>
                              <option value="easy">Dễ</option>
                              <option value="hard">Khó</option>
                            </select>
                          </label>
                        </div>
                        <button type="button" onClick={() => void sendMessage("Tạo 15 câu trắc nghiệm mức độ hỗn hợp từ toàn bộ tài liệu đã chọn.")} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-ptit-red px-4 text-xs font-bold text-white">
                          Tiếp tục <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {item.quizDraft && (
                      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-700"><ListChecks className="h-5 w-5" /></div>
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-900">Bản nháp Quiz đã sẵn sàng</h3>
                            <p className="mt-1 text-xs text-slate-600">{item.quizDraft.questionCount} câu · {item.quizDraft.difficulty ?? "Hỗn hợp"} · REVIEW_REQUIRED</p>
                          </div>
                        </div>
                        <Link href="/review" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-ptit-red px-4 text-xs font-bold text-white">
                          Xem và duyệt Quiz <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="h-8 w-8 animate-pulse rounded-full bg-red-100" />
                Đang nhận diện yêu cầu và đối chiếu nguồn…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50 p-2 focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-100">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={2}
                className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
                placeholder="Hỏi, yêu cầu tóm tắt hoặc tạo Quiz…"
              />
              <button
                type="button"
                disabled={sending || !message.trim()}
                onClick={() => void sendMessage()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ptit-red text-white disabled:opacity-40"
                aria-label="Gửi yêu cầu"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">AI có thể sai. Hãy kiểm tra citation trước khi sử dụng kết quả.</p>
          </div>
        </section>

        <aside className="border-t border-slate-200 bg-slate-50/70 p-4 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Nguồn đang sử dụng</h2>
              <p className="text-xs text-slate-500">Chỉ Personal PDF của bạn</p>
            </div>
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-ptit-red">{selectedDocumentIds.length}/10</span>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-red-300" placeholder="Tìm Personal PDF…" />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setSelectedDocumentIds(readyDocuments.slice(0, 10).map((item) => item.id))} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-600">Chọn tất cả</button>
            <button type="button" onClick={() => setSelectedDocumentIds([])} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-600">Bỏ chọn</button>
          </div>
          <div className="mt-4 space-y-2">
            {filteredDocuments.map((document) => {
              const selected = selectedDocumentIds.includes(document.id);
              const ready = document.status === "READY";
              return (
                <button
                  type="button"
                  key={document.id}
                  disabled={!ready}
                  onClick={() => toggleDocument(document)}
                  className={`flex w-full items-start gap-2 rounded-xl border p-3 text-left ${selected ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"} disabled:opacity-55`}
                >
                  {selected ? <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-ptit-red" /> : <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-slate-800">{document.title}</strong>
                    <span className="mt-1 block text-[11px] text-slate-500">{ready ? `${document.pageCount} trang · READY` : document.status}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={onBackToLibrary} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-ptit-red">
            <Plus className="h-4 w-4" /> Tải thêm PDF
          </button>
        </aside>
      </div>

      {citation && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" role="dialog" aria-modal="true" aria-label="Chi tiết trích dẫn">
          <button type="button" className="flex-1" onClick={() => setCitation(null)} aria-label="Đóng chi tiết trích dẫn" />
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ptit-red">Nguồn trích dẫn</span>
                <h2 className="mt-1 font-display text-xl font-bold text-slate-900">Trang {citation.pageNumber}</h2>
              </div>
              <button type="button" onClick={() => setCitation(null)} className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="Đóng"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="h-4 w-4 text-ptit-red" /> {citation.documentName}</div>
              <p className="mt-4 border-l-2 border-red-300 pl-3 text-sm leading-6 text-slate-700">{citation.excerpt}</p>
            </div>
            {citation.sha256 && (
              <button type="button" onClick={() => { void navigator.clipboard.writeText(citation.sha256 ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? "Đã sao chép mã đối chiếu" : "Sao chép mã đối chiếu"}
              </button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
