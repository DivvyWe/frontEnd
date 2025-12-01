// src/components/expenses/ExpenseSplitsItems.js
"use client";

import { useMemo } from "react";

const BRAND = "#84CC16";

function toCents(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function fromCents(c) {
  return (Number(c || 0) / 100).toFixed(2);
}

/**
 * Item-based split UI
 *
 * Props:
 *  - amount: total expense amount (number|string)
 *  - items: [
 *      { id: string, name: string, price: number, assignedTo: [userId, ...] }
 *    ]
 *  - onChangeItems(nextItems)
 *  - participantIds: [userId, ...]
 *  - members: [{ _id, username, ... }]
 *  - disabled: boolean
 */
export default function ExpenseSplitsItems({
  amount,
  items = [],
  onChangeItems,
  participantIds = [],
  members = [],
  disabled = false,
}) {
  const memberMap = useMemo(() => {
    const map = new Map();
    (members || []).forEach((m) => {
      map.set(String(m._id), m);
    });
    return map;
  }, [members]);

  const totalItemsCents = useMemo(
    () => (items || []).reduce((sum, it) => sum + toCents(it.price), 0),
    [items]
  );

  const amountCents = useMemo(() => toCents(amount), [amount]);
  const diff = amountCents - totalItemsCents;
  const okTotal = Math.abs(diff) <= 1; // allow 1 cent wiggle

  const hasParticipants = (participantIds || []).length > 0;

  function toggleAssignee(itemId, userId) {
    if (!onChangeItems) return;
    const next = (items || []).map((it) => {
      if (it.id !== itemId) return it;
      const current = new Set((it.assignedTo || []).map(String));
      const key = String(userId);
      if (current.has(key)) current.delete(key);
      else current.add(key);
      return { ...it, assignedTo: Array.from(current) };
    });
    onChangeItems(next);
  }

  function handlePriceChange(itemId, value) {
    if (!onChangeItems) return;
    const next = (items || []).map((it) => {
      if (it.id !== itemId) return it;
      const n = Number(value);
      return {
        ...it,
        price: Number.isFinite(n) ? n : 0,
      };
    });
    onChangeItems(next);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Item-based split</h3>

        <div
          className={[
            "rounded-full px-2 py-0.5 text-xs ring-1",
            !items?.length
              ? "bg-slate-50 text-slate-500 ring-slate-200"
              : okTotal
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : diff > 0
              ? "bg-amber-50 text-amber-700 ring-amber-200"
              : "bg-rose-50 text-rose-700 ring-rose-200",
          ].join(" ")}
        >
          {!items?.length
            ? "No items parsed"
            : okTotal
            ? "Items total matched"
            : diff > 0
            ? `Items short by ${fromCents(diff)}`
            : `Items exceed by ${fromCents(-diff)}`}
        </div>
      </div>

      {/* Empty states */}
      {!items?.length ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          Upload a receipt that supports item-level reading, then choose who
          each item belongs to.
        </div>
      ) : !hasParticipants ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          Select participants first, then assign items to them.
        </div>
      ) : (
        <>
          {/* Items list */}
          <div className="max-h-72 overflow-y-auto p-1">
            <div className="space-y-2">
              {items.map((it) => {
                const assignedSet = new Set(
                  (it.assignedTo || []).map((id) => String(id))
                );
                return (
                  <div
                    key={it.id}
                    className={[
                      "rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2",
                      disabled ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-800">
                          {it.name || "Item"}
                        </p>
                      </div>
                      {/* Editable price input (no $ sign) */}
                      <div className="w-24 flex-none">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            it.price === undefined || it.price === null
                              ? ""
                              : String(it.price)
                          }
                          onChange={(e) =>
                            handlePriceChange(it.id, e.target.value)
                          }
                          disabled={disabled}
                          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-xs font-mono text-slate-800 shadow-sm focus:border-[var(--brand)] focus:outline-none"
                          style={{ "--brand": BRAND }}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {participantIds.map((pid) => {
                        const user = memberMap.get(String(pid));
                        const name = user?.username || "User";
                        const selected = assignedSet.has(String(pid));
                        return (
                          <button
                            key={pid}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleAssignee(it.id, pid)}
                            className={[
                              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition",
                              selected
                                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                            ].join(" ")}
                            style={{ "--brand": BRAND }}
                          >
                            <span className="max-w-[7rem] truncate">
                              {name}
                            </span>
                            {selected && (
                              <span className="inline-block h-3 w-3 rounded-full bg-white">
                                <svg
                                  viewBox="0 0 20 20"
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                >
                                  <path d="M5 10l3 3 7-7" />
                                </svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Expense total:{" "}
              <span className="font-mono">
                {Number(amount || 0).toFixed(2)}
              </span>
            </span>
            <span>
              Items sum:{" "}
              <span className="font-mono" style={{ color: BRAND }}>
                {fromCents(totalItemsCents)}
              </span>
            </span>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            Each item is split evenly between the selected people. You can tweak
            item amounts above if the receipt parsing wasn&apos;t perfect.
          </p>
        </>
      )}
    </section>
  );
}
