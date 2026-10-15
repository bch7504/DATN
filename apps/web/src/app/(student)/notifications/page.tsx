"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Bell, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { notificationApi } from "@/lib/api-client";
import { StudentNotification } from "@/types/notification";

/**
 * Renders the Student's owner-scoped in-app deadline notifications.
 *
 * @returns interactive notification list backed only by the public Java API
 * @throws no render-time errors; request failures are shown as retryable UI state
 */
export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await notificationApi.list(unreadOnly, page, 50);
      setNotifications(result.items);
      setTotalPages(result.totalPages);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải danh sách thông báo"
      );
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, page]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  /** Marks an unread notification and keeps the active filter consistent. */
  const markRead = async (notificationId: string): Promise<void> => {
    setMarkingId(notificationId);
    setError(null);
    try {
      const updated = await notificationApi.markRead(notificationId);
      setNotifications((current) =>
        unreadOnly
          ? current.filter((item) => item.id !== notificationId)
          : current.map((item) => (item.id === notificationId ? updated : item))
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể đánh dấu thông báo đã đọc"
      );
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-red-50 p-2 text-ptit-red">
              <Bell className="h-5 w-5" />
            </span>
            <h1 className="font-display text-2xl font-extrabold text-slate-900">
              Thông báo học tập
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Thông báo bài tập mới và nhắc hạn bài tập, nhiệm vụ cá nhân.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={unreadOnly}
              disabled={loading || markingId !== null}
              onChange={(event) => { setUnreadOnly(event.target.checked); setPage(0); }}
              className="h-4 w-4 accent-[#d71920]"
            />
            Chỉ hiện chưa đọc
          </label>
          <button
            type="button"
            onClick={() => void loadNotifications()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Đang tải thông báo...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 font-display text-base font-bold text-slate-800">
            Không có thông báo phù hợp
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Những nhiệm vụ sắp đến hạn sẽ xuất hiện tại đây.
          </p>
          <Link href="/plan" className="mt-4 inline-flex text-sm font-bold text-ptit-red">
            Mở Kế hoạch &amp; Lịch
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const unread = notification.readAt === null;
            return (
              <article
                key={notification.id}
                className={`rounded-2xl border p-4 shadow-xs transition ${
                  unread
                    ? "border-red-200 bg-red-50/50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 rounded-xl p-2 ${unread ? "bg-red-100 text-ptit-red" : "bg-slate-100 text-slate-500"}`}>
                    <Clock3 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-sm font-bold text-slate-900">
                        {notification.title}
                      </h2>
                      {unread && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                          Chưa đọc
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {notification.dueAt && (
                        <span>Hạn: {formatDateTime(notification.dueAt)}</span>
                      )}
                      <Link href={notification.type === "STUDY_PLAN_DEADLINE" ? "/plan" : "/assignments"} className="font-bold text-ptit-red">
                        {notification.type === "STUDY_PLAN_DEADLINE" ? "Xem kế hoạch" : "Xem bài tập"}
                      </Link>
                    </div>
                  </div>
                  {unread && (
                    <button
                      type="button"
                      onClick={() => void markRead(notification.id)}
                      disabled={markingId !== null || loading}
                      className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Đã đọc
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <nav aria-label="Trang thông báo" className="flex items-center justify-end gap-3 text-sm"><button disabled={loading || markingId !== null || page === 0} onClick={() => setPage((value) => value - 1)} className="disabled:opacity-50">Trang trước</button><span>Trang {page + 1}/{Math.max(totalPages, 1)}</span><button disabled={loading || markingId !== null || page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="disabled:opacity-50">Trang sau</button></nav>
    </div>
  );
}

/** Formats an ISO instant for Vietnamese display without changing persisted time. */
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
