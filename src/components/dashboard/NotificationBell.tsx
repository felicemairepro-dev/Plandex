"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/dashboard/actions";
import type { Notification } from "@/lib/types";

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

export function NotificationBell({
  notifications,
}: {
  notifications: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
  }

  const unreadCount = items.filter((n) => !n.lu).length;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function handleOpenToggle() {
    setOpen((v) => !v);
  }

  function handleItemClick(notification: Notification) {
    if (notification.lu) return;
    setItems((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, lu: true } : n))
    );
    startTransition(async () => {
      await markNotificationRead(notification.id);
    });
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, lu: true })));
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpenToggle}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-background hover:text-foreground"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-border bg-surface p-2 shadow-md">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold text-foreground">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted">
                  Aucune notification.
                </p>
              ) : (
                items.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleItemClick(notification)}
                    className={`flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-200 hover:bg-background ${
                      notification.lu ? "" : "bg-accent/5"
                    }`}
                  >
                    <span className="text-sm text-foreground">
                      {notification.message}
                    </span>
                    <span className="text-xs text-muted">
                      {formatRelativeTime(notification.cree_le)}
                    </span>
                  </button>
                ))
              )}
            </div>
        </div>
      )}
    </div>
  );
}
