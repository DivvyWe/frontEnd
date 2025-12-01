// src/components/groups/GroupsClient.js
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiBell,
  FiBellOff,
  FiChevronDown,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import NewGroupButton from "@/components/NewGroupButton";
import UserDebtOverview from "@/components/groups/UserDebtOverview";

/* ------------------------------ small utils ------------------------------ */

const fmtMoneyPlain = (n) => {
  const x = Number(n) || 0;
  return Number.isInteger(x) ? String(x) : x.toFixed(2);
};

const toTitleCase = (str = "") =>
  str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// safe merge to avoid duplicate keys across pages
function mergeUniqueById(prev = [], next = []) {
  const seen = new Set(prev.map((it) => String(it?._id)));
  const appended = [];
  for (const it of next) {
    const id = String(it?._id);
    if (!seen.has(id)) {
      seen.add(id);
      appended.push(it);
    }
  }
  return [...prev, ...appended];
}

/* -------------------------------- badges -------------------------------- */

function NetBadge({ net = 0 }) {
  const n = Number(net) || 0;
  const cls =
    n > 0
      ? "bg-green-100 text-green-700"
      : n < 0
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-500";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
      title="Net = Owed to you − You owe"
    >
      {n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2)}
    </span>
  );
}

function SettledBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
      All settled
    </span>
  );
}

function DebtRow({ left, right, variant }) {
  const cls =
    variant === "owe" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700";
  return (
    <div
      className={`flex items-center justify-between rounded-md px-2 py-1 text-sm ${cls}`}
    >
      <span className="font-medium">{left}</span>
      <span>{right}</span>
    </div>
  );
}

/* ------------------------------- loaders --------------------------------- */

function Spinner({ size = 18, className = "" }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border border-slate-300 border-t-[#84CC16] ${className}`}
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 9) }}
      aria-label="Loading"
      role="status"
    />
  );
}

function SkeletonCard() {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 flex items-center gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            <span className="h-3 w-3 rounded-full bg-slate-100" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="grid gap-1">
        <div className="h-6 animate-pulse rounded bg-slate-100" />
        <div className="h-6 animate-pulse rounded bg-slate-100" />
        <div className="h-6 animate-pulse rounded bg-slate-100" />
      </div>
    </li>
  );
}

function SkeletonGrid({ count = 6 }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={`sk-${i}`} />
      ))}
    </ul>
  );
}

/* ------------------------------- card item ------------------------------- */

function GroupCard({ g }) {
  const youOwe = g?.youOwe || [];
  const owedToYou = g?.owedToYou || [];
  const hasAnyDebt = youOwe.length > 0 || owedToYou.length > 0;
  const members = Array.isArray(g?.members) ? g.members : [];

  return (
    <li>
      <Link
        href={`/groups/${g._id}`}
        className="block h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-slate-50 focus:outline-none"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
              {g.name || "Untitled group"}
            </h3>
            {members.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                <FiUsers className="h-3.5 w-3.5" />
                <span>{g.memberCount ?? members.length} members</span>
                <span className="text-slate-300">•</span>
                <span className="line-clamp-1">
                  {members
                    .slice(0, 4)
                    .map((m) => m?.username || m?.email?.split("@")[0] || "—")
                    .join(", ")}
                  {members.length > 4 ? "…" : ""}
                </span>
              </div>
            )}
          </div>
          <NetBadge net={g?.totals?.net ?? 0} />
        </div>

        {hasAnyDebt ? (
          <div className="grid gap-1">
            {youOwe.map((row, i) => (
              <DebtRow
                key={`yo-${i}`}
                variant="owe"
                left={`You → ${row.toName}`}
                right={fmtMoneyPlain(row.amount)}
              />
            ))}
            {owedToYou.map((row, i) => (
              <DebtRow
                key={`oy-${i}`}
                variant="owed"
                left={`${row.fromName} → You`}
                right={fmtMoneyPlain(row.amount)}
              />
            ))}
          </div>
        ) : (
          <SettledBadge />
        )}
      </Link>
    </li>
  );
}

/* --------------------------- notifications UI --------------------------- */

function NotificationsEnable() {
  const [supported, setSupported] = useState(false);
  const [perm, setPerm] = useState("default");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const has =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator;
    setSupported(has);
    setPerm(has ? Notification.permission : "denied");
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!supported || perm !== "default") return;
    (async () => {
      try {
        const p = await Notification.requestPermission();
        setPerm(p);
        if (p === "granted") {
          const reg = await navigator.serviceWorker.ready;
          reg
            .showNotification("Divsez", {
              body: "Notifications enabled 🎉",
              tag: "enable-ok",
              icon: "/icons/notification-192.png",
              badge: "/icons/badge-72.png",
            })
            .catch(() => {});
        }
      } catch {}
    })();
  }, [supported, perm]);

  const onClick = async () => {
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p === "granted") {
        const reg = await navigator.serviceWorker.ready;
        reg
          .showNotification("Divsez", {
            body: "Notifications enabled 🎉",
            tag: "enable-ok",
            icon: "/icons/notification-192.png",
            badge: "/icons/badge-72.png",
          })
          .catch(() => {});
      }
    } catch {}
  };

  if (!supported || busy || perm === "granted") return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">
            {perm === "denied"
              ? "Notifications are blocked"
              : "Enable notifications?"}
          </p>
          <p className="text-sm text-slate-600">
            Get alerts for invites, expenses, and settlements.
          </p>
        </div>
        <button
          onClick={onClick}
          className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
            perm === "denied"
              ? "bg-slate-400"
              : "bg-[#84CC16] hover:brightness-95"
          }`}
          title={
            perm === "denied"
              ? "Open your browser site settings to allow"
              : "Enable notifications"
          }
        >
          {perm === "denied" ? (
            <span className="inline-flex items-center gap-2">
              <FiBellOff /> Fix in settings
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <FiBell /> Turn on
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

/* -------------------------- server search + sort ------------------------- */

const SORT_OPTIONS = [
  { id: "updatedAt:desc", label: "Recently updated" }, // default
  { id: "net:desc", label: "Net (you’re owed → high)" },
  { id: "net:asc", label: "Net (you owe → high)" },
  { id: "name:asc", label: "Name A–Z" },
  { id: "name:desc", label: "Name Z–A" },
  { id: "createdAt:desc", label: "Newest first" },
  { id: "createdAt:asc", label: "Oldest first" },
];

/* --------------------------------- main ---------------------------------- */

export default function GroupsClient({
  me,
  initialGroups = [],
  initialNextCursor = null,
  initialCursor = null,
}) {
  const hour = new Date().getHours();
  const greet =
    hour < 5
      ? "Late Night, "
      : hour < 12
      ? "Good Morning, "
      : hour < 18
      ? "Good Afternoon, "
      : "Good Evening, ";

  const [q, setQ] = useState("");
  const qDebounced = useDebounced(q, 350);

  const [sort, setSort] = useState("updatedAt:desc");
  const [sortBy, order] = useMemo(() => sort.split(":"), [sort]);

  const [items, setItems] = useState(() =>
    Array.isArray(initialGroups) ? initialGroups : []
  );
  const [nextCursor, setNextCursor] = useState(
    () => initialCursor ?? initialNextCursor ?? null
  );

  // loadMode: 'idle' | 'refresh' | 'append'
  const [loadMode, setLoadMode] = useState("idle");
  const loading = loadMode !== "idle";
  const [hadInitialFetch, setHadInitialFetch] = useState(false);

  const initialHadItemsRef = useRef(
    (Array.isArray(initialGroups) ? initialGroups : []).length > 0
  );
  const firstRefreshDoneRef = useRef(false);

  // race guard / cancellation support
  const seqRef = useRef(0);
  const abortRef = useRef(null);

  const fetchPage = useCallback(
    async ({ append = false, cursor = null, silent = false } = {}) => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      const controller = new AbortController();
      abortRef.current = controller;

      const mySeq = ++seqRef.current;
      if (!silent) setLoadMode(append ? "append" : "refresh");

      try {
        const params = new URLSearchParams({
          q: qDebounced,
          sortBy,
          order,
          limit: "24",
          membersLimit: "6",
        });
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(
          `/api/proxy/user/groups/search?` + params.toString(),
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mySeq !== seqRef.current) return;

        const newItems = Array.isArray(data?.items) ? data.items : [];
        setItems((prev) =>
          append
            ? mergeUniqueById(prev, newItems)
            : mergeUniqueById([], newItems)
        );
        setNextCursor(data?.nextCursor || null);
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error("[groups] search fetch failed:", e);
          if (!append) {
            setItems([]);
            setNextCursor(null);
          }
        }
      } finally {
        if (mySeq === seqRef.current && !silent) setLoadMode("idle");
      }
    },
    [qDebounced, sortBy, order]
  );

  // Mount
  useEffect(() => {
    if (!hadInitialFetch) {
      if (items.length === 0) {
        (async () => {
          await fetchPage({ append: false, silent: false });
          setHadInitialFetch(true);
        })();
      } else {
        setHadInitialFetch(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadInitialFetch]);

  // Fetch on query/sort change
  useEffect(() => {
    if (!hadInitialFetch) return;

    if (!firstRefreshDoneRef.current && initialHadItemsRef.current) {
      firstRefreshDoneRef.current = true;
      fetchPage({ append: false, silent: true });
      return;
    }

    fetchPage({ append: false, silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, sort, hadInitialFetch]);

  // Infinite scroll via IntersectionObserver + auto-kick + manual fallback
  const sentinelRef = useRef(null);

  // 1) IO
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first &&
          first.isIntersecting &&
          loadMode === "idle" &&
          nextCursor
        ) {
          fetchPage({ append: true, cursor: nextCursor, silent: false });
        }
      },
      { root: null, rootMargin: "480px 0px 480px 0px", threshold: 0.01 } // bigger margin
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [nextCursor, loadMode, fetchPage]);

  // 2) Auto-kick if sentinel is already within viewport after layout
  const tryKickMore = useCallback(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor || loadMode !== "idle") return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.top <= vh + 24) {
      fetchPage({ append: true, cursor: nextCursor, silent: false });
    }
  }, [nextCursor, loadMode, fetchPage]);

  useEffect(() => {
    // run after paint
    const t = setTimeout(tryKickMore, 50);
    return () => clearTimeout(t);
  }, [items.length, nextCursor, tryKickMore]);

  const hasGroups = items.length > 0;
  const totalShown = items.length;
  const skeletonCount = Math.max(6, Math.min(9, items.length || 6));

  return (
    <div className="space-y-6 md:pb-10">
      {/* Greeting */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-800">
          {greet}
          {me?.username ? toTitleCase(me.username) : "there"} 👋
        </h1>
        <p className="text-slate-600">Let’s split smarter today.</p>
      </div>

      {/* Notifications */}
      <NotificationsEnable />
      {/* <UserDebtOverview /> */}
      {/* Controls */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-md">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search groups or members…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          {/* Sort + New group */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-900 focus:border-[#84CC16] focus:outline-none"
                title="Sort groups"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <NewGroupButton />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        {hasGroups ? (
          <>
            {loadMode === "refresh" ? (
              <SkeletonGrid count={skeletonCount} />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((g) => (
                  <GroupCard key={g._id} g={g} />
                ))}
              </ul>
            )}

            {/* Sentinel + fallback */}
            {nextCursor && (
              <div ref={sentinelRef} className="mt-6 grid place-items-center">
                {loadMode === "append" ? (
                  <SkeletonGrid count={3} />
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      fetchPage({ append: true, cursor: nextCursor })
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <FiChevronDown className="h-4 w-4" />
                    <span>Load more</span>
                  </button>
                )}
              </div>
            )}

            {!nextCursor && loadMode === "idle" && (
              <p className="mt-6 text-center text-xs text-slate-500">
                Showing {totalShown} result{totalShown === 1 ? "" : "s"}
              </p>
            )}
          </>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-10 text-center">
            <p className="inline-flex items-center gap-2 text-slate-600">
              {loading ? (
                <>
                  <Spinner /> <span>Preparing results…</span>
                </>
              ) : (
                "No groups match your search."
              )}
            </p>
          </div>
        )}
      </div>

      {/* Floating FAB */}
      <NewGroupButton floating />
    </div>
  );
}
