// src/components/NotificationBell.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiBell, FiCheck, FiX } from "react-icons/fi";
import useNotifications from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socketClient";

function TimeAgo({ iso }) {
  const text = useMemo(() => {
    if (!iso) return "";
    const d = new Date(iso);
    const sec = Math.max(1, Math.floor((Date.now() - +d) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
  }, [iso]);
  return <span>{text}</span>;
}

export default function NotificationBell({ me }) {
  const router = useRouter();
  const { items, unread, loading, load, markRead, removeOne, markAllRead } =
    useNotifications(me?._id);

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // --- Realtime: connect & listen if user enabled it ---
  useEffect(() => {
    let cleanup = () => {};
    const enabled =
      typeof window !== "undefined" &&
      localStorage.getItem("rt_enabled") === "true";

    if (!enabled) return;

    let socket;
    let onNew;

    (async () => {
      try {
        const meRes = await fetch("/api/proxy/auth/me", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!meRes.ok) return;
        const meJson = await meRes.json().catch(() => null);
        const userId = meJson?._id || meJson?.id;
        if (!userId) return;

        socket = getSocket();
        if (!socket.connected) socket.connect();

        const join = () => socket.emit("auth:join", { userId });
        socket.on("connect", join);
        join();

        onNew = () => load();
        socket.on("notification:new", onNew);

        cleanup = () => {
          try {
            socket.off("notification:new", onNew);
            socket.off("connect", join);
          } catch {}
        };
      } catch {}
    })();

    return () => cleanup();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  // Close desktop popover on outside click / ESC
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      const mobilePanel = document.getElementById("notif-mobile-panel");
      if (mobilePanel) return; // mobile handles its own close
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 🚫 Body scroll lock on mobile sheet
  useEffect(() => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(max-width: 767px)").matches;
    if (open && isMobile) {
      const html = document.documentElement;
      const body = document.body;
      const prevHtml = html.style.overflow;
      const prevBody = body.style.overflow;
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      return () => {
        html.style.overflow = prevHtml;
        body.style.overflow = prevBody;
      };
    }
  }, [open]);

  const unreadBadge = useMemo(() => {
    if (!unread || unread <= 0) return "0";
    if (unread > 99) return "99+";
    return String(unread);
  }, [unread]);

  const handleItemClick = async (n, isUnread) => {
    if (isUnread) markRead(n._id);
    setOpen(false);
    if (n.expense && n.group) router.push(`/expenses/${n.group}/${n.expense}`);
    else if (n.expense) router.push(`/expenses/${n.expense}`);
    else if (n.group) router.push(`/groups/${n.group}`);
  };

  const ListUI = ({ dense = false }) => {
    if (loading && items.length === 0) {
      return (
        <div
          className={`${
            dense ? "p-3" : "p-4"
          } flex items-center justify-center gap-2 text-sm text-slate-500`}
        >
          <svg
            className="h-5 w-5 animate-spin text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              className="opacity-25"
            />
            <path
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              fill="currentColor"
              className="opacity-75"
            />
          </svg>
          Loading…
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className={`${dense ? "p-3" : "p-4"} text-sm text-slate-500`}>
          No notifications.
        </div>
      );
    }
    return (
      <ul className="divide-y divide-slate-100">
        {items.map((n) => {
          const isUnread = !n.read;
          return (
            <li
              key={n._id}
              className={[
                // larger tap targets on mobile
                "flex items-start gap-3 px-4 py-3 text-[15px] md:text-sm transition",
                isUnread
                  ? "bg-amber-50 hover:bg-amber-100"
                  : "bg-white hover:bg-slate-50",
                isUnread ? "text-slate-900" : "text-slate-600",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1">
                <div
                  className="cursor-pointer truncate hover:underline"
                  onClick={() => handleItemClick(n, isUnread)}
                  title={n.message || "New activity"}
                >
                  {n.message || "New activity"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  <TimeAgo iso={n.createdAt} />
                </div>
              </div>
              <button
                onClick={() => removeOne(n._id)}
                title="Remove"
                className="rounded p-2 text-rose-600 hover:bg-rose-50"
              >
                <FiX className="h-5 w-5 md:h-4 md:w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) load();
        }}
        className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <FiBell className="h-5 w-5 text-slate-600" />
        <span
          className={`absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[10px] ${
            unread > 0 ? "bg-red-500 text-white" : "bg-slate-200 text-slate-600"
          }`}
        >
          {unreadBadge}
        </span>
      </button>

      {/* Desktop dropdown (>= md) */}
      {open && (
        <div className="hidden md:block">
          <div className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-800">
                Notifications
              </div>
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                <FiCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </div>
            <div className="max-h-[40vh] overflow-y-auto">
              <ListUI dense />
            </div>
          </div>
        </div>
      )}

      {/* Mobile fullscreen sheet (< md) */}
      {open && (
        <div id="notif-mobile-panel" className="md:hidden fixed inset-0 z-[70]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div
            className="absolute inset-x-0 top-0 bottom-0 bg-white shadow-2xl flex flex-col"
            style={{
              // Use dynamic viewport to avoid URL bar issues on Android S24, iOS 15+
              height: "100dvh",
              paddingTop: "max(12px, env(safe-area-inset-top))",
              paddingBottom: "max(20px, env(safe-area-inset-bottom))",
            }}
          >
            {/* Grab handle */}
            <div className="mx-auto mt-1 h-1.5 w-12 rounded-full bg-slate-200" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="text-base font-semibold text-slate-800">
                Notifications
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 active:scale-[0.98]"
                >
                  <FiCheck className="h-4 w-4" />
                  Mark all
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-2 text-slate-600 hover:bg-slate-100 active:scale-95"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body (scrollable) */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{
                // keep above any bottom nav (AppNav) if present
                paddingBottom: "88px",
              }}
            >
              <ListUI />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
