// src/components/expenses/ExpenseSplitsPercentage.js
"use client";

import { useEffect, useMemo } from "react";

const BRAND = "#84CC16";

/** Clamp to 0–100 and to at most one decimal place */
function cleanPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const fixed = Math.round(n * 10) / 10;
  return Math.min(100, Math.max(0, fixed));
}

export default function ExpenseSplitsPercentage({
  amount,
  participantIds = [],
  members = [],
  percentages = {},
  onChangePercentages,
  disabled = false,
}) {
  const byId = useMemo(() => {
    const map = new Map();
    members.forEach((m) => map.set(String(m._id), m));
    return map;
  }, [members]);

  // Ensure each participant has a key in percentages
  useEffect(() => {
    if (!onChangePercentages) return;
    const next = { ...percentages };
    let changed = false;
    for (const id of participantIds) {
      if (!(id in next)) {
        next[id] = 0;
        changed = true;
      }
    }
    for (const id of Object.keys(next)) {
      if (!participantIds.includes(id)) {
        delete next[id];
        changed = true;
      }
    }
    if (changed) onChangePercentages(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantIds.join(","), onChangePercentages]);

  const list = useMemo(() => {
    const total = Number(amount) || 0;
    return participantIds.map((id) => {
      const pct = Number(percentages?.[id] ?? 0);
      const share = ((pct / 100) * total).toFixed(2);
      const name = byId.get(String(id))?.username || "Unknown";
      return { id, name, pct, share };
    });
  }, [amount, participantIds, percentages, byId]);

  const sumPct = useMemo(
    () => list.reduce((s, r) => s + (Number(r.pct) || 0), 0),
    [list]
  );
  const sumShown = useMemo(
    () => list.reduce((s, r) => s + Number(r.share || 0), 0).toFixed(2),
    [list]
  );

  const pctOk = Math.abs(sumPct - 100) < 1e-9;

  function updatePct(id, v) {
    if (!onChangePercentages) return;
    const next = { ...percentages, [id]: cleanPct(v) };
    onChangePercentages(next);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Percentage split</h3>
        <div
          className={[
            "rounded-full px-2 py-0.5 text-xs ring-1",
            pctOk
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-700 ring-amber-200",
          ].join(" ")}
        >
          {sumPct.toFixed(1)}% {pctOk ? "" : "· must be 100%"}
        </div>
      </div>

      {participantIds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          Select participants to assign percentages.
        </div>
      ) : (
        <>
          {/* Flat multi-column list (no card boxes) */}
          <div className="max-h-56 overflow-y-auto p-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
              {list.map((r) => (
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
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.1"
                      value={r.pct}
                      onChange={(e) => updatePct(r.id, e.target.value)}
                      disabled={disabled}
                      className="w-14 rounded-md border border-slate-300 px-1.5 py-0.5 text-right text-[13px] focus:border-[var(--brand)] focus:outline-none"
                      style={{ "--brand": BRAND }}
                      aria-label={`Percentage for ${r.name}`}
                    />
                    <span className="text-[13px] text-slate-500">%</span>
                    <span
                      className="ml-1 font-mono text-[12px] font-medium"
                      style={{ color: BRAND }}
                    >
                      {r.share}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              <span className="font-mono">{sumShown}</span> of{" "}
              <span className="font-mono">
                {Number(amount || 0).toFixed(2)}
              </span>
            </span>
            {!pctOk && <span className="text-amber-700">Adjust to 100%.</span>}
          </div>
        </>
      )}
    </section>
  );
}
