// src/components/NotificationBell.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiBell, FiCheck, FiX } from "react-icons/fi";
import useNotifications from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socketClient"; // <-- NEW

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
        // ensure we know who we are (server will trust room join)
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

        // (re)join room on connect
        const join = () => socket.emit("auth:join", { userId });
        socket.on("connect", join);
        join();

        // when a new notification arrives, refresh the list/badge
        onNew = () => {
          // lightweight: just refetch; your hook will update items + unread
          load();
        };
        socket.on("notification:new", onNew);

        cleanup = () => {
          try {
            socket.off("notification:new", onNew);
            socket.off("connect", join);
            // don't disconnect globally; other listeners may exist
          } catch {}
        };
      } catch {
        /* noop */
      }
    })();

    return () => cleanup();
  }, [load]);

  // Silent initial load; periodic refresh handled in the hook
  useEffect(() => {
    load();
  }, [load]);

  // Close on outside click or ESC
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unreadBadge = useMemo(() => {
    if (!unread || unread <= 0) return "0";
    if (unread > 99) return "99+";
    return String(unread);
  }, [unread]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) load(); // ensure latest when opening
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

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Top bar with just "Mark all read" */}
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

          {/* List */}
          {loading && items.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No notifications.</div>
          ) : (
            <ul className="max-h-[40vh] divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => {
                const isUnread = !n.read;
                return (
                  <li
                    key={n._id}
                    className={[
                      "flex items-start gap-2 p-3 text-sm transition",
                      isUnread
                        ? "bg-amber-50 hover:bg-amber-100"
                        : "bg-white hover:bg-slate-50",
                      isUnread ? "text-slate-900" : "text-slate-600",
                    ].join(" ")}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="cursor-pointer truncate hover:underline"
                        onClick={async () => {
                          if (isUnread) markRead(n._id); // auto-read on click
                          setOpen(false); // close popover

                          // Safer routing:
                          // - if both expense + group: go to /expenses/:groupId/:expenseId
                          // - else try expense-only fallback, else group
                          if (n.expense && n.group) {
                            router.push(`/expenses/${n.group}/${n.expense}`);
                          } else if (n.expense) {
                            router.push(`/expenses/${n.expense}`);
                          } else if (n.group) {
                            router.push(`/groups/${n.group}`);
                          }
                        }}
                        title={n.message || "New activity"}
                      >
                        {n.message || "New activity"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        <TimeAgo iso={n.createdAt} />
                      </div>
                    </div>

                    {/* Remove (X) */}
                    <button
                      onClick={() => removeOne(n._id)}
                      title="Remove"
                      className="rounded p-1 text-rose-600 hover:bg-rose-50"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
