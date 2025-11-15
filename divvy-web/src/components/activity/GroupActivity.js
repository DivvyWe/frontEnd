// src/components/activity/GroupActivity.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ---------- formatting ---------- */
const fmtMonthHeader = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const fmtTime = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

// Fallback currency if none provided
const FALLBACK_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "AUD";

function formatCurrencyPlain(amount, currencyCode) {
  const num = Number(amount || 0);
  const code = String(currencyCode || FALLBACK_CURRENCY).toUpperCase();

  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${code} ${formatted}`;
}

const titleCase = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const displayName = (u) => u?.username || u?.email || u?.phone || "Someone";

function monthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return fmtMonthHeader.format(new Date(y, m - 1, 1));
}

function weekdayAndDay(dateStr) {
  const d = new Date(dateStr);
  return {
    wd: d.toLocaleString(undefined, { weekday: "short" }).toUpperCase(),
    day: String(d.getDate()).padStart(2, "0"),
  };
}

/* ---------- compute net ---------- */
function computeViewerNet(expense, viewerId) {
  if (!expense || !viewerId) return null;
  const toId = (x) => x?.toString?.() ?? String(x);
  const vid = String(viewerId);

  const owed = (expense.splits || []).reduce(
    (sum, s) => (toId(s.user) === vid ? sum + Number(s.amount || 0) : sum),
    0
  );
  const paid = (expense.contributors || []).reduce(
    (sum, c) => (toId(c.user) === vid ? sum + Number(c.amount || 0) : sum),
    0
  );
  const net = Number((paid - owed).toFixed(2));
  return Number.isFinite(net) ? net : null;
}

/* ---------- API ---------- */
async function fetchMe() {
  const res = await fetch(`/api/proxy/auth/me`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

async function fetchActivity(groupId, limit, cursor) {
  const qp = new URLSearchParams({ limit: String(limit) });
  if (cursor) qp.set("cursor", cursor);
  const url = `/api/proxy/activity/group/${encodeURIComponent(
    groupId
  )}?${qp.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.message || `Failed to load activity (${res.status})`);
  }
  return res.json();
}

/* ---------- component ---------- */
export default function GroupActivity({
  groupId,
  pageSize = 30,
  currency, // 👈 group currency code (e.g. "NPR", "AUD")
}) {
  const [me, setMe] = useState(null);
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!groupId) return;
    let ignore = false;
    setLoading(true);
    setError("");
    Promise.all([fetchMe(), fetchActivity(groupId, pageSize)])
      .then(([meJson, actJson]) => {
        if (ignore) return;
        setMe(meJson || null);
        setRows(actJson?.activity || []);
        setCursor(actJson?.nextCursor || null);
      })
      .catch((e) => !ignore && setError(e.message || "Failed to load activity"))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [groupId, pageSize]);

  async function onLoadMore() {
    if (!cursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const j = await fetchActivity(groupId, pageSize, cursor);
      setRows((prev) => [...prev, ...(j?.activity || [])]);
      setCursor(j?.nextCursor || null);
    } catch (e) {
      setError(e.message || "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  /* filter + group */
  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "payments") return rows.filter((r) => r.type === "payment");
    if (filter === "members")
      return rows.filter((r) =>
        [
          "memberAdded",
          "memberRemoved",
          "inviteAccepted",
          "inviteSent",
        ].includes(r.type)
      );
    return rows.filter((r) =>
      ["expenseCreated", "expenseUpdated", "expenseDeleted"].includes(r.type)
    );
  }, [rows, filter]);

  const byMonth = useMemo(() => {
    const m = new Map();
    for (const item of filtered) {
      const mk = monthKey(item.createdAt);
      if (!m.has(mk)) m.set(mk, []);
      m.get(mk).push(item);
    }
    return m;
  }, [filtered]);

  /* helpers */
  const lineMain = (item) => {
    const who = displayName(item.actor);
    const desc = item.expense?.description
      ? `“${titleCase(item.expense.description)}”`
      : "an expense";
    switch (item.type) {
      case "expenseCreated":
        return `${who} added ${desc}`;
      case "expenseUpdated":
        return `${who} updated ${desc}`;
      case "expenseDeleted":
        return `${who} deleted ${desc}`;
      case "payment": {
        const list =
          (item.participants?.length ? item.participants : item.contributors) ||
          [];
        const firstOther = list.find(
          (u) =>
            (u?._id || u?.id || String(u)) !==
            String(item.actor?._id || item.actor?.id)
        );
        const payee = displayName(firstOther) || "someone";
        const uniqueIds = new Set(
          list
            .map((u) => String(u?._id || u?.id || u))
            .filter((id) => id !== String(item.actor?._id || item.actor?.id))
        );
        const remaining = Math.max(uniqueIds.size - (firstOther ? 1 : 0), 0);
        return remaining > 0
          ? `${who} paid ${payee} and ${remaining} others`
          : `${who} paid ${payee}`;
      }
      case "memberAdded":
        return `${who} added a member`;
      case "memberRemoved":
        return `${who} removed a member`;
      case "inviteAccepted":
        return `${who} joined the group`;
      case "inviteSent":
        return `${who} sent an invite`;
      default:
        return `${who} did something`;
    }
  };

  const lineSub = (item) => {
    if (item.type === "payment") return "";
    const actorName = displayName(item.actor);
    const meId = me?._id || me?.id;
    const isMe =
      me && String(meId) === String(item.actor?._id || item.actor?.id);
    const who = isMe ? "You" : actorName;
    if (["expenseCreated", "expenseUpdated"].includes(item.type)) {
      return `${who} ${
        item.type === "expenseCreated" ? "added" : "updated"
      } this`;
    }
    if (item.type === "expenseDeleted") return "Removed";
    return "";
  };

  function roleMeta(item) {
    const meId = me?._id || me?.id;
    const meStr = String(meId || "");
    const actor = String(item.actor?._id || item.actor?.id || "");

    if (item.type === "payment") {
      const payees = (item.contributors || []).map((u) =>
        String(u?._id || u?.id || u)
      );
      if (actor === meStr)
        return { text: "You paid", bg: "bg-slate-50", color: "text-slate-600" };
      if (payees.includes(meStr))
        return {
          text: "You were paid",
          bg: "bg-slate-50",
          color: "text-slate-600",
        };
      return { text: null };
    }

    if (
      (item.type === "expenseCreated" || item.type === "expenseUpdated") &&
      item.expense &&
      meId
    ) {
      const net = computeViewerNet(item.expense, meId);
      if (typeof net === "number") {
        if (net > 0.009)
          return {
            text: "you lent",
            bg: "bg-emerald-50",
            color: "text-emerald-700",
            amount: formatCurrencyPlain(net, currency),
          };
        if (net < -0.009)
          return {
            text: "you borrowed",
            bg: "bg-amber-50",
            color: "text-amber-700",
            amount: formatCurrencyPlain(Math.abs(net), currency),
          };
      }
    }
    return { text: null };
  }

  /* ---- UI ---- */
  if (loading) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 text-sm text-slate-700">
        Loading activity…
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      </section>
    );
  }

  if (!rows.length) {
    return (
      <section className="rounded-2xl bg-white p-8 mb-14 shadow-sm ring-1 ring-black/5 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-7 w-7"
          >
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20Zm0 3a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 5Zm1 5v7h-2v-7h2Z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">
          No activity yet
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Group actions like adding expenses, members, or payments will appear
          here.
        </p>
      </section>
    );
  }

  /* ----- render list ----- */
  return (
    <section className="rounded-2xl bg-white p-4 mb-14 shadow-sm ring-1 ring-black/5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
      </div>

      {[...byMonth.keys()].map((mk, mi, arr) => {
        const items = byMonth.get(mk) || [];
        return (
          <div key={mk} className="mb-4 last:mb-0">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {monthLabel(mk)}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-1">
              <ul className="space-y-1">
                {items.map((item) => {
                  const { wd, day } = weekdayAndDay(item.createdAt);
                  const main = lineMain(item);
                  const sub = lineSub(item);
                  const meta = roleMeta(item);

                  const expenseId =
                    item.expense?._id || item.expense?.id || item.expense;

                  const settlementId =
                    item.settlement?._id ||
                    item.settlement?.id ||
                    item.payment?._id ||
                    item.payment?.id ||
                    item.settlementId ||
                    item.paymentId ||
                    null;

                  const href =
                    item.type === "payment" && settlementId
                      ? `/settlements/${settlementId}`
                      : expenseId
                      ? `/expenses/${groupId}/${expenseId}`
                      : null;

                  const Row = href ? Link : "div";

                  return (
                    <li key={item._id || settlementId || expenseId}>
                      <Row
                        href={href}
                        className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-xl no-underline hover:bg-slate-50 cursor-pointer"
                      >
                        <div className="text-center leading-tight">
                          <div className="text-[11px] font-semibold text-slate-500">
                            {wd}
                          </div>
                          <div className="text-lg font-semibold text-slate-900">
                            {day}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {main}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                            {sub && <span className="truncate">{sub}</span>}
                            {sub && <span aria-hidden="true">•</span>}
                            <span>
                              {fmtTime.format(new Date(item.createdAt))}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {meta.text && (
                            <div
                              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.color}`}
                            >
                              {meta.text}
                            </div>
                          )}
                          {meta.amount ? (
                            <div
                              className={`${meta.color} mt-1 text-sm font-semibold`}
                            >
                              {meta.amount}
                            </div>
                          ) : item.type === "payment" && item.amount ? (
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {item.formattedAmount ??
                                formatCurrencyPlain(item.amount, currency)}
                            </div>
                          ) : null}
                        </div>
                      </Row>
                    </li>
                  );
                })}
              </ul>

              {mk === arr[arr.length - 1] && cursor && (
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
