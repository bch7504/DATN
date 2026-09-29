"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { chatApi, personalDocApi, ApiClientError } from "@/lib/api-client";
import {
  ChatConversation,
  ChatMessage,
  PersonalCitation,
} from "@/types/chat";
import { PersonalDocument } from "@/types/material";
import {
  Bot,
  Send,
  Plus,
  Trash2,
  FileText,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  Sparkles,
  ExternalLink,
  X,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export default function StudentChatPage() {
  // Conversations & Selection
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);

  // Documents
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docSearch, setDocSearch] = useState<string>("");

  // Input & Messaging
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoadingConv, setIsLoadingConv] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Citation Drawer
  const [activeCitation, setActiveCitation] = useState<PersonalCitation | null>(
    null
  );
  const [copiedSha, setCopiedSha] = useState<boolean>(false);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load initial conversations & documents
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      setIsLoadingConv(true);
      setErrorMessage(null);
      try {
        const [convList, docList] = await Promise.all([
          chatApi.getConversations(),
          personalDocApi.getDocuments(),
        ]);

        if (!mounted) return;
        setConversations(convList);
        setDocuments(docList);

        if (convList.length > 0) {
          const first = convList[0];
          setActiveConvId(first.id);
          setActiveConv(first);
          setSelectedDocIds(first.selectedDocumentIds);
        } else {
          // Select ready docs by default
          const readyDocs = docList.filter((d) => d.status === "READY");
          setSelectedDocIds(readyDocs.slice(0, 3).map((d) => d.id));
        }
      } catch (err: unknown) {
        if (!mounted) return;
        if (err instanceof ApiClientError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Không thể tải danh sách phiên trò chuyện hoặc tài liệu.");
        }
      } finally {
        if (mounted) setIsLoadingConv(false);
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  // Switch conversation
  const handleSelectConversation = async (convId: string) => {
    if (convId === activeConvId) return;
    setIsLoadingConv(true);
    setErrorMessage(null);
    setActiveCitation(null);
    try {
      const conv = await chatApi.getConversation(convId);
      setActiveConvId(conv.id);
      setActiveConv(conv);
      setSelectedDocIds(conv.selectedDocumentIds);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Lỗi khi tải phiên trò chuyện.");
      }
    } finally {
      setIsLoadingConv(false);
    }
  };

  // Create new conversation
  const handleCreateNewConversation = async () => {
    const readySelected = selectedDocIds.filter((id) =>
      documents.some((d) => d.id === id && d.status === "READY")
    );

    if (readySelected.length === 0) {
      // Pick first ready document if none selected
      const readyDoc = documents.find((d) => d.status === "READY");
      if (!readyDoc) {
        setErrorMessage(
          "Bạn chưa có tài liệu cá nhân nào ở trạng thái READY để hỏi đáp. Hãy tải lên tài liệu PDF trước."
        );
        return;
      }
      readySelected.push(readyDoc.id);
      setSelectedDocIds([readyDoc.id]);
    }

    try {
      setIsLoadingConv(true);
      setErrorMessage(null);
      const newConv = await chatApi.createConversation({
        selectedDocumentIds: readySelected,
        title: "Phiên thảo luận mới",
      });
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setActiveConv(newConv);
      setActiveCitation(null);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Không thể tạo phiên trò chuyện mới.");
      }
    } finally {
      setIsLoadingConv(false);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa phiên trò chuyện này không?")) return;

    try {
      await chatApi.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0].id);
        } else {
          setActiveConvId(null);
          setActiveConv(null);
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Không thể xóa phiên trò chuyện.");
      }
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isSending) return;

    if (selectedDocIds.length === 0) {
      setErrorMessage(
        "Vui lòng chọn ít nhất 1 tài liệu nguồn (tối đa 10 tài liệu) trước khi gửi câu hỏi."
      );
      return;
    }

    let targetConv = activeConv;
    setIsSending(true);
    setErrorMessage(null);

    try {
      // If no active conversation, create one first
      if (!targetConv) {
        targetConv = await chatApi.createConversation({
          selectedDocumentIds: selectedDocIds,
          title: query.length > 30 ? query.substring(0, 30) + "..." : query,
        });
        setConversations((prev) => [targetConv!, ...prev]);
        setActiveConvId(targetConv.id);
        setActiveConv(targetConv);
      }

      // Optimistically add user message
      const tempUserMsg: ChatMessage = {
        id: `temp_${Date.now()}`,
        role: "user",
        content: query,
        createdAt: new Date().toISOString(),
      };

      setActiveConv((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, tempUserMsg],
            }
          : null
      );
      setInputMessage("");

      // Send to API
      const assistantMsg = await chatApi.sendMessage(targetConv.id, {
        message: query,
      });

      // Update active conversation
      setActiveConv((prev) =>
        prev
          ? {
              ...prev,
              title:
                prev.title === "Phiên thảo luận mới"
                  ? query.length > 30
                    ? query.substring(0, 30) + "..."
                    : query
                  : prev.title,
              messages: [...prev.messages.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, assistantMsg],
            }
          : null
      );

      // Update in conversations list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConv!.id
            ? {
                ...c,
                title:
                  c.title === "Phiên thảo luận mới"
                    ? query.length > 30
                      ? query.substring(0, 30) + "..."
                      : query
                    : c.title,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Lỗi khi gửi câu hỏi đến AI RAG service.");
      }
    } finally {
      setIsSending(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Toggle doc selection
  const handleToggleDoc = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds((prev) => prev.filter((id) => id !== docId));
    } else {
      if (selectedDocIds.length >= 10) {
        setErrorMessage("Chỉ được chọn tối đa 10 tài liệu làm nguồn đối chiếu.");
        return;
      }
      setSelectedDocIds((prev) => [...prev, docId]);
    }
  };

  // Select all / Deselect all
  const readyDocs = documents.filter((d) => d.status === "READY");
  const filteredDocs = readyDocs.filter(
    (d) =>
      d.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      d.fileName.toLowerCase().includes(docSearch.toLowerCase())
  );

  const handleSelectAll = () => {
    const toSelect = readyDocs.slice(0, 10).map((d) => d.id);
    setSelectedDocIds(toSelect);
  };

  const handleDeselectAll = () => {
    setSelectedDocIds([]);
  };

  // Copy SHA256
  const handleCopySha = (sha?: string) => {
    if (!sha) return;
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  // Keydown in composer
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Prompt suggestions
  const SUGGESTED_PROMPTS = [
    "Điều kiện để một lược đồ quan hệ đạt dạng chuẩn 3 (3NF) là gì?",
    "Khi nào nên dùng EXISTS thay cho IN trong câu lệnh SQL con?",
    "Tóm tắt các định nghĩa và nguyên tắc cốt lõi trong tài liệu này.",
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-50 text-ptit-red">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
              Hỏi đáp tài liệu cá nhân (Personal RAG)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Không gian đối chiếu và tra cứu câu trả lời được neo nguồn trực tiếp
            vào PDF cá nhân của bạn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/personal-documents"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ptit-red bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Quản lý kho PDF cá nhân
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs sm:text-sm text-red-800">
          <AlertCircle className="w-4 h-4 text-ptit-red flex-shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-900 text-xs font-medium"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[580px]">
        {/* Left Column: Chatbot Workspace (flex-1 / col-span-8 or 9) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
          {/* Header of Chatbot: Session Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
            {/* Session Tabs Carousel */}
            <div className="flex items-center gap-2 overflow-x-auto flex-1 py-1 no-scrollbar">
              <button
                onClick={handleCreateNewConversation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-ptit-red hover:bg-red-700 rounded-lg shadow-sm flex-shrink-0 transition-colors"
                title="Tạo phiên hội thoại mới"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Phiên mới</span>
              </button>

              {conversations.length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  Chưa có phiên trò chuyện nào
                </span>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg cursor-pointer transition-all flex-shrink-0 max-w-[200px] border ${
                        isActive
                          ? "bg-white text-ptit-red border-red-200 font-semibold shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent"
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{conv.title}</span>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-700 p-0.5 rounded transition-opacity"
                        title="Xóa phiên"
                      >
                        <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-600" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Scope Badge */}
            <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Áp dụng: <strong>{selectedDocIds.length}</strong> nguồn
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-slate-50/50 to-white">
            {isLoadingConv ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-8 h-8 border-3 border-ptit-red border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Đang tải cuộc trò chuyện...</span>
              </div>
            ) : !activeConv || activeConv.messages.length === 0 ? (
              /* Empty state with suggested prompts */
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-ptit-red flex items-center justify-center mb-3 shadow-xs">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Sẵn sàng hỏi đáp với Personal AI Tutor
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
                  Đặt câu hỏi về nội dung tài liệu của bạn. Mọi câu trả lời đều
                  kèm trích đoạn đối chiếu chính xác và số trang grounding.
                </p>

                <div className="w-full space-y-2 text-left">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Câu hỏi gợi ý nhanh:
                  </div>
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left p-3 text-xs bg-white hover:bg-red-50/60 border border-slate-200 hover:border-red-200 rounded-xl text-slate-700 hover:text-ptit-red transition-all flex items-center justify-between group shadow-2xs"
                    >
                      <span>{prompt}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-ptit-red flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message list */
              activeConv.messages.map((msg) => {
                const isUser = msg.role === "user";
                const isNoEvidence = msg.status === "NO_EVIDENCE";

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isUser
                          ? "bg-ptit-red text-white shadow-xs"
                          : isNoEvidence
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-red-50 text-ptit-red border border-red-200"
                      }`}
                    >
                      {isUser ? "SV" : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? "bg-ptit-red text-white rounded-tr-xs shadow-sm"
                          : isNoEvidence
                          ? "bg-amber-50/80 border border-amber-200 text-slate-800 rounded-tl-xs shadow-2xs"
                          : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs"
                      }`}
                    >
                      {/* NO_EVIDENCE Badge */}
                      {!isUser && isNoEvidence && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 rounded bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300">
                          <AlertCircle className="w-3 h-3 text-amber-700" />
                          <span>NO_EVIDENCE: Không tìm thấy căn cứ</span>
                        </div>
                      )}

                      <div className="whitespace-pre-line">{msg.content}</div>

                      {/* Citations Chips */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Căn cứ trích dẫn nguồn (Click để soi chi tiết):</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cite, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => setActiveCitation(cite)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50/70 hover:bg-red-100 border border-red-200 text-ptit-red rounded-lg text-[11px] font-semibold transition-colors group cursor-pointer"
                                title="Bấm để mở Inspector đối chiếu đoạn trích & SHA-256"
                              >
                                <FileText className="w-3 h-3 text-ptit-red" />
                                <span>
                                  Trang {cite.pageNumber} · {cite.documentName}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div
                        className={`text-[10px] mt-1.5 text-right ${
                          isUser ? "text-red-200" : "text-slate-400"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* In-Flight Sending Indicator */}
            {isSending && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 text-ptit-red border border-red-200 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-2xs text-xs text-slate-600 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-ptit-red animate-ping" />
                  <span>Đang truy xuất và đối chiếu nguồn tài liệu...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
            <div className="relative border border-slate-300 focus-within:border-ptit-red focus-within:ring-2 focus-within:ring-red-100 rounded-xl transition-all bg-white">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi cần đối chiếu từ tài liệu... (Enter để gửi, Shift+Enter để xuống dòng)"
                rows={2}
                maxLength={2000}
                className="w-full p-3 pr-24 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-none focus:outline-none"
              />
              <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  {inputMessage.length}/2000
                </span>
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isSending}
                  className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                    !inputMessage.trim() || isSending
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-ptit-red text-white hover:bg-red-700 shadow-xs cursor-pointer"
                  }`}
                  title="Gửi câu hỏi"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Hỏi đáp tuân thủ chính sách RAG đối chiếu grounding tài liệu.</span>
              <span className="text-ptit-red font-semibold">
                {selectedDocIds.length === 0
                  ? "Chưa chọn tài liệu nguồn!"
                  : `Đang kết nối ${selectedDocIds.length} tài liệu`}
              </span>
            </div>
          </div>

          {/* In-Chat Citation Drawer (Slide-over Inspector) */}
          {activeCitation && (
            <div className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-200">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ptit-red">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Drawer Đối Chiếu Trích Dẫn</span>
                </div>
                <button
                  onClick={() => setActiveCitation(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tài liệu nguồn:
                  </div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-ptit-red flex-shrink-0" />
                    <span className="truncate">{activeCitation.documentName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] text-slate-400 uppercase">Trang đối chiếu</div>
                    <div className="text-sm font-bold text-ptit-red">
                      Trang {activeCitation.pageNumber}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10px] text-slate-400 uppercase">Trạng thái</div>
                    <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Khớp chính xác
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Trích đoạn nguyên văn (Excerpt):
                  </div>
                  <blockquote className="p-3 bg-red-50/50 border-l-3 border-ptit-red rounded-r-lg text-slate-700 text-xs italic leading-relaxed">
                    &ldquo;{activeCitation.excerpt}&rdquo;
                  </blockquote>
                </div>

                {activeCitation.sha256 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Mã Grounding SHA-256:</span>
                      <button
                        onClick={() => handleCopySha(activeCitation.sha256)}
                        className="inline-flex items-center gap-1 text-[10px] text-ptit-red hover:underline cursor-pointer"
                      >
                        {copiedSha ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2 bg-slate-100 rounded text-[10px] font-mono text-slate-700 break-all border border-slate-200 select-all">
                      {activeCitation.sha256}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-normal">
                  Hệ thống AI Tutor chỉ suy luận từ các câu chữ thực tế có trong
                  tài liệu. Bằng chứng được xác thực tự động bởi chuỗi hash SHA-256
                  đảm bảo không bị thay đổi.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Evidence Source Selector (~280px / col-span-4 or 3) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-ptit-red" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Nguồn đối chiếu
              </h2>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                selectedDocIds.length > 0
                  ? "bg-red-100 text-ptit-red"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {selectedDocIds.length}/10 nguồn
            </span>
          </div>

          {/* Quick Filter & Select All / Deselect All */}
          <div className="p-3 border-b border-slate-100 space-y-2 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Tìm tài liệu theo tên..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-ptit-red"
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <button
                onClick={handleSelectAll}
                className="text-ptit-red hover:underline font-semibold cursor-pointer"
              >
                Chọn tất cả (tối đa 10)
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Bạn chưa có tài liệu cá nhân nào.</p>
                <Link
                  href="/personal-documents"
                  className="mt-2 inline-block text-ptit-red font-bold hover:underline"
                >
                  Tải lên PDF ngay
                </Link>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Không tìm thấy tài liệu phù hợp.
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleToggleDoc(doc.id)}
                    className={`pt-2 first:pt-0 p-2 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-red-50/60 border border-red-200/80"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="mt-0.5 text-ptit-red flex-shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 fill-red-100" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-900 truncate">
                        {doc.title}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{doc.pageCount} trang</span>
                        <span>•</span>
                        <span>{(doc.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-slate-400 truncate">
                        <span className="text-emerald-600 font-bold">READY</span>
                        {doc.sha256 && (
                          <>
                            <span>•</span>
                            <span>{doc.sha256.substring(0, 12)}...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* List other non-ready docs if any */}
            {documents.filter((d) => d.status !== "READY").length > 0 && (
              <div className="pt-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Đang xử lý / Không sẵn sàng:
                </div>
                {documents
                  .filter((d) => d.status !== "READY")
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 opacity-60 text-xs flex items-center justify-between"
                    >
                      <span className="truncate max-w-[160px] text-slate-600">
                        {doc.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        {doc.status}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Footer of Document Selector */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              href="/personal-documents"
              className="text-xs font-semibold text-ptit-red hover:underline inline-flex items-center gap-1"
            >
              <span>+ Thêm tài liệu PDF mới</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
