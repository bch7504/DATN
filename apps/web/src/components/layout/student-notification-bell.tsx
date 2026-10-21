"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, RefreshCw, X } from "lucide-react";
import { notificationApi, teacherNotificationApi } from "@/lib/api-client";
import type { StudentNotification } from "@/types/notification";
import { notificationDestination } from "@/lib/notification-navigation";

interface NotificationBellProps {
  userId: string;
  role: "STUDENT" | "TEACHER";
}

/**
 * Shows the authenticated Student's or Teacher's notifications beside the logout button.
 * Args: userId (required current account ID), role (required STUDENT or TEACHER).
 * Input: owner-scoped public Java notification API; no local fixture or secret data.
 * Output: bell with unread count and an interactive notification popover; marks read on request.
 * Errors: list/read failures remain visible in the popover and can be retried.
 */
export function NotificationBell({ userId, role }: NotificationBellProps): React.JSX.Element {
  const client = role === "TEACHER" ? teacherNotificationApi : notificationApi;
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Args: none. Input: current owner's unread notification page from Java.
   * Output: Promise<void>; updates only the unread badge. Errors: hides an unknown count.
   */
  const refreshUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const result = await client.list(true, 0, 1);
      setUnreadCount(result.totalItems);
    } catch {
      setUnreadCount(null);
    }
  }, [client]);

  /**
   * Args: nextPage (zero-based), append (true for subsequent pages).
   * Input: current account session and selected unread filter.
   * Output: Promise<void>; updates visible notifications and page metadata.
   * Errors: shows a retryable message without fabricating notifications.
   */
  const loadPage = useCallback(async (nextPage: number, append: boolean): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.list(unreadOnly, nextPage, 20);
      setNotifications((current) => append ? [...current, ...result.items] : result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }, [client, unreadOnly]);

  useEffect((): (() => void) => {
    void refreshUnreadCount();
    const timer = window.setInterval((): void => {
      void refreshUnreadCount();
    }, 60_000);
    /** Args: none. Input: a successful local action that may create a Java notification.
     * Output: void; refreshes the owner's unread count. Errors: refresh handles API failures.
     */
    const onNotificationsUpdated = (): void => { void refreshUnreadCount(); };
    window.addEventListener("studyflow:notifications-updated", onNotificationsUpdated);
    return (): void => {
      window.clearInterval(timer);
      window.removeEventListener("studyflow:notifications-updated", onNotificationsUpdated);
    };
  }, [userId, refreshUnreadCount]);

  useEffect((): void => {
    if (!open) return;
    setNotifications([]);
    setPage(0);
    setTotalPages(0);
    void loadPage(0, false);
  }, [open, loadPage]);

  useEffect((): (() => void) | void => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return (): void => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /**
   * Args: notificationId (required ID from the current owner's list).
   * Input: owner click and Java's owner-scoped read endpoint.
   * Output: Promise<void>; updates visible read state and unread badge.
   * Errors: preserves the item and shows an error so the owner can retry.
   */
  const markRead = async (notificationId: string): Promise<void> => {
    setMarkingId(notificationId);
    setError(null);
    try {
      const updated = await client.markRead(notificationId);
      if (unreadOnly) {
        await loadPage(0, false);
      } else {
        setNotifications((current) => current.map((item) => item.id === notificationId ? updated : item));
      }
      void refreshUnreadCount();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đánh dấu đã đọc.");
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(): void => setOpen((current) => !current)}
        aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-popover"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
      >
        <Bell className="h-4 w-4" />
        {unreadCount !== null && unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-popover"
          role="dialog"
          aria-label="Thông báo học tập"
          className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Thông báo</h2>
              <p className="text-xs text-slate-500">
                {unreadCount === null ? "Tin nhắn của bạn" : `${unreadCount} chưa đọc`}
              </p>
            </div>
            <button
              type="button"
              onClick={(): void => setOpen(false)}
              aria-label="Đóng thông báo"
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setUnreadOnly(event.target.checked)}
                className="accent-red-600"
              />
              Chỉ chưa đọc
            </label>
            <button
              type="button"
              onClick={(): void => { void loadPage(0, false); void refreshUnreadCount(); }}
              disabled={loading}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới
            </button>
          </div>

          <div className="max-h-[min(60vh,28rem)] overflow-y-auto">
            {error && (
              <p role="alert" className="m-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {error}
              </p>
            )}
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Đang tải thông báo...</p>
            ) : notifications.length === 0 && !error ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Chưa có thông báo nào.</p>
            ) : (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`border-b border-slate-100 px-4 py-3 last:border-0 ${notification.readAt ? "bg-white" : "bg-red-50/50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900">{notification.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                        <Link
                          href={notificationDestination(notification.type, role).href}
                          onClick={(): void => setOpen(false)}
                          className="font-semibold text-red-700 hover:underline"
                        >
                          {notificationDestination(notification.type, role).label}
                        </Link>
                        <span className="text-slate-400">
                          {new Date(notification.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>
                    {!notification.readAt && (
                      <button
                        type="button"
                        onClick={(): void => { void markRead(notification.id); }}
                        disabled={markingId !== null}
                        aria-label={`Đánh dấu đã đọc: ${notification.title}`}
                        title="Đánh dấu đã đọc"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          {page + 1 < totalPages && (
            <button
              type="button"
              onClick={(): void => { void loadPage(page + 1, true); }}
              disabled={loading}
              className="w-full border-t border-slate-100 px-4 py-3 text-xs font-semibold text-red-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Đang tải..." : "Xem thêm thông báo"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
