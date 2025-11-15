// src/components/expenses/ExpenseSplitsEqual.js
"use client";

import { useMemo, useState } from "react";

const BRAND = "#84CC16";
const DEFAULT_VISIBLE_COUNT = 8;

function splitEvenlyWithPennies(total, n) {
  const cents = Math.round(Number(total || 0) * 100);
  if (n <= 0) return [];
  const base = Math.floor(cents / n);
  let remainder = cents - base * n;
  const result = new Array(n).fill(base);
  for (let i = 0; i < n && remainder > 0; i++) {
    result[i] += 1;
    remainder--;
  }
  return result.map((c) => (c / 100).toFixed(2));
}

export default function ExpenseSplitsEqual({
  amount,
  participantIds = [],
  members = [],
  disabled = false,
}) {
  const [expanded, setExpanded] = useState(false);

  const byId = useMemo(() => {
    const map = new Map();
    members.forEach((m) => map.set(String(m._id), m));
    return map;
  }, [members]);

  const rows = useMemo(() => {
    const ids = participantIds || [];
    const shares = splitEvenlyWithPennies(amount, ids.length);
    return ids.map((id, i) => ({
      id,
      name: byId.get(String(id))?.username || "Unknown",
      share: shares[i] || "0.00",
    }));
  }, [amount, participantIds, byId]);

  const totalShown = useMemo(
    () => rows.reduce((s, r) => s + Number(r.share), 0).toFixed(2),
    [rows]
  );

  const shown = expanded ? rows : rows.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasMore = rows.length > DEFAULT_VISIBLE_COUNT;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Equal split</h3>
        <div className="text-xs text-slate-500">
          Total:{" "}
          <span className="font-semibold">
            {Number(amount || 0).toFixed(2)}
          </span>{" "}
          • Distributed: <span className="font-mono">{totalShown}</span>
        </div>
      </div>

      {/* Empty state */}
      {participantIds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          Select participants to see their shares.
        </div>
      ) : (
        <>
          {/* Compact chip list */}
          <div
            className={[
              "flex flex-wrap gap-2",
              disabled ? "opacity-60" : "",
            ].join(" ")}
          >
            {shown.map((r) => (
              <div
                key={r.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                title={`${r.name}: ${r.share}`}
              >
                <span className="max-w-[9rem] truncate text-slate-700">
                  {r.name}
                </span>

                {/* tiny divider dot */}
                <span
                  className="h-1 w-1 rounded-full bg-slate-300"
                  aria-hidden="true"
                />

                {/* amount + tiny check in-line (brand colored) */}
                <span
                  className="inline-flex items-center gap-1 font-mono font-medium"
                  style={{ color: BRAND }}
                >
                  {r.share}
                  <svg
                    viewBox="0 0 20 20"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path d="M5 10l3 3 7-7" />
                  </svg>
                </span>
              </div>
            ))}
          </div>

          {/* Show more / less */}
          {hasMore && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
                disabled={disabled}
              >
                {expanded
                  ? "Show less"
                  : `Show ${rows.length - DEFAULT_VISIBLE_COUNT} more`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
