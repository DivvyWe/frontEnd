// src/components/expenses/ExpenseSplitsCustom.js
"use client";

import { useMemo } from "react";

const BRAND = "#84CC16";

/** Convert to integer cents safely */
function toCents(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
function fromCents(c) {
  return (Number(c || 0) / 100).toFixed(2);
}

export default function ExpenseSplitsCustom({
  amount, // number|string total
  participantIds = [], // string[]
  members = [], // [{ _id, username, ... }]
  customAmounts = {}, // { [userId]: number|string }
  onChangeCustomAmounts, // (nextMap) => void
  disabled = false,
}) {
  const byId = useMemo(() => {
    const map = new Map();
    (members || []).forEach((m) => map.set(String(m._id), m));
    return map;
  }, [members]);

  const rows = useMemo(() => {
    return (participantIds || []).map((id) => {
      const raw = customAmounts?.[id] ?? "";
      const cents = toCents(raw);
      return {
        id,
        name: byId.get(String(id))?.username || "Unknown",
        raw,
        cents,
      };
    });
  }, [participantIds, customAmounts, byId]);

  const totalCents = useMemo(() => toCents(amount), [amount]);
  const sumCents = useMemo(() => rows.reduce((s, r) => s + r.cents, 0), [rows]);
  const remainingCents = totalCents - sumCents;
  const ok = remainingCents === 0;

  function updateAmount(id, v) {
    if (!onChangeCustomAmounts) return;
    // Allow empty input while typing
    const next = { ...customAmounts, [id]: v };
    onChangeCustomAmounts(next);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      {/* Header with compact status chip */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Custom split</h3>
        <div
          className={[
            "rounded-full px-2 py-0.5 text-xs ring-1",
            ok
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : remainingCents > 0
              ? "bg-amber-50 text-amber-700 ring-amber-200"
              : "bg-rose-50 text-rose-700 ring-rose-200",
          ].join(" ")}
        >
          {ok
            ? "Total matched"
            : remainingCents > 0
            ? `Allocate $${fromCents(remainingCents)}`
            : `Over by $${fromCents(-remainingCents)}`}
        </div>
      </div>

      {/* Empty state */}
      {participantIds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          Select participants to assign amounts.
        </div>
      ) : (
        <>
          {/* Flat multi-column list (no row boxes), scroll-capped */}
          <div className="max-h-56 overflow-y-auto p-1">
            <div className="grid grid-cols-1 gap-y-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className={[
                    "flex items-center justify-between text-sm py-0.5",
                    disabled ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <div className="truncate text-slate-700 max-w-[10rem]">
                    {r.name}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] text-slate-500">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={r.raw}
                      onChange={(e) => updateAmount(r.id, e.target.value)}
                      disabled={disabled}
                      className="w-20 rounded-md border border-slate-300 px-1.5 py-0.5 text-right text-[13px] focus:border-[var(--brand)] focus:outline-none"
                      style={{ "--brand": BRAND }}
                      aria-label={`Amount for ${r.name}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary row (terse) */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Total:{" "}
              <span className="font-mono">
                ${Number(amount || 0).toFixed(2)}
              </span>
            </span>
            <span>
              Assigned:{" "}
              <span className="font-mono" style={{ color: BRAND }}>
                ${fromCents(sumCents)}
              </span>
            </span>
          </div>
        </>
      )}

      {/* Minimal guidance */}
      <p className="mt-2 text-[11px] text-slate-500">
        Enter exact amounts. Sum must match the total.
      </p>
    </section>
  );
}
