// src/components/expenses/ExpenseContributors.js
"use client";

import { useEffect, useMemo } from "react";

const BRAND = "#84CC16";

function toCents(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function fromCents(c) {
  return (Number(c || 0) / 100).toFixed(2);
}

export default function ExpenseContributors({
  totalAmount, // number|string
  members = [], // [{ _id, username }]
  contributors = [], // [{ user: string, amount: string|number }]
  onChangeContributors, // (nextArr) => void
  disabled = false,
  currentUserId = null, // 👈 pass current logged-in user ID
}) {
  const memberMap = useMemo(() => {
    const m = new Map();
    (members || []).forEach((u) => m.set(String(u._id), u));
    return m;
  }, [members]);

  // 🔹 1) Default: if empty, set current user with full amount
  useEffect(() => {
    if (!onChangeContributors) return;
    const amt = Number(totalAmount) || 0;
    if (!contributors?.length && currentUserId && amt > 0) {
      onChangeContributors([
        { user: String(currentUserId), amount: String(amt.toFixed(2)) },
      ]);
    }
  }, [contributors?.length, currentUserId, totalAmount, onChangeContributors]);

  // 🔹 2) Keep in sync when totalAmount changes (only while it's still the single default row)
  useEffect(() => {
    if (!onChangeContributors) return;
    const amt = Number(totalAmount) || 0;
    if (
      contributors?.length === 1 &&
      String(contributors[0]?.user) === String(currentUserId) &&
      amt > 0 &&
      toCents(contributors[0]?.amount) !== toCents(amt)
    ) {
      onChangeContributors([
        { user: String(currentUserId), amount: amt.toFixed(2) },
      ]);
    }
  }, [totalAmount, contributors, currentUserId, onChangeContributors]);

  const totalCents = useMemo(() => toCents(totalAmount), [totalAmount]);
  const sumCents = useMemo(
    () => (contributors || []).reduce((s, r) => s + toCents(r.amount), 0),
    [contributors]
  );

  const ok = sumCents === totalCents;
  const diff = totalCents - sumCents;

  function setOne(idx, patch) {
    if (!onChangeContributors) return;
    const next = contributors.slice();
    next[idx] = { ...next[idx], ...patch };
    onChangeContributors(next);
  }

  function addRow() {
    if (!onChangeContributors) return;
    const unused =
      (members || [])
        .map((m) => String(m._id))
        .find(
          (id) => !(contributors || []).some((r) => String(r.user) === id)
        ) ||
      members[0]?._id ||
      "";
    onChangeContributors([
      ...(contributors || []),
      { user: String(unused), amount: "" },
    ]);
  }

  function removeRow(idx) {
    if (!onChangeContributors) return;
    const next = contributors.slice();
    next.splice(idx, 1);
    onChangeContributors(next);
  }

  const chosen = new Set((contributors || []).map((r) => String(r.user)));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          Contributors (who paid)
        </h3>
        <div
          className={[
            "rounded-full px-2 py-0.5 text-xs ring-1",
            ok
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : diff > 0
              ? "bg-amber-50 text-amber-700 ring-amber-200"
              : "bg-rose-50 text-rose-700 ring-rose-200",
          ].join(" ")}
        >
          {ok
            ? "Total matched"
            : diff > 0
            ? `Add $${fromCents(diff)}`
            : `Over by $${fromCents(-diff)}`}
        </div>
      </div>

      {(contributors || []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          No contributors yet. Add who paid and how much.
        </div>
      ) : (
        <>
          <div className="max-h-56 overflow-y-auto p-1">
            <div className="grid grid-cols-1 gap-y-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {contributors.map((row, idx) => {
                const name =
                  memberMap.get(String(row.user))?.username || "Unknown";
                return (
                  <div
                    key={`${row.user}-${idx}`}
                    className={[
                      "flex items-center justify-between text-sm py-0.5",
                      disabled ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    {/* Payer select */}
                    <select
                      value={row.user || ""}
                      onChange={(e) => setOne(idx, { user: e.target.value })}
                      disabled={disabled}
                      className="min-w-0 truncate rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] focus:border-[var(--brand)] focus:outline-none"
                      style={{ "--brand": BRAND, maxWidth: "10rem" }}
                      aria-label="Payer"
                    >
                      {(members || []).map((m) => {
                        const id = String(m._id);
                        const selectedElsewhere =
                          chosen.has(id) && String(row.user) !== id;
                        return (
                          <option
                            key={id}
                            value={id}
                            disabled={selectedElsewhere}
                          >
                            {m.username || "User"}
                          </option>
                        );
                      })}
                    </select>

                    {/* Amount + Remove */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] text-slate-500">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={row.amount ?? ""}
                        onChange={(e) =>
                          setOne(idx, { amount: e.target.value })
                        }
                        disabled={disabled}
                        className="w-20 rounded-md border border-slate-300 px-1.5 py-0.5 text-right text-[13px] focus:border-[var(--brand)] focus:outline-none"
                        style={{ "--brand": BRAND }}
                        aria-label={`Amount paid by ${name}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={disabled}
                        className="ml-1 text-[12px] text-slate-500 underline-offset-2 hover:underline disabled:opacity-60"
                        title="Remove"
                        aria-label={`Remove ${name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Total:{" "}
              <span className="font-mono">
                ${Number(totalAmount || 0).toFixed(2)}
              </span>
            </span>
            <span>
              Contributed:{" "}
              <span className="font-mono" style={{ color: BRAND }}>
                ${fromCents(sumCents)}
              </span>
            </span>
          </div>
        </>
      )}

      {/* Footer actions */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          disabled={
            disabled || (contributors || []).length >= (members || []).length
          }
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Add contributor
        </button>
        <p className="text-[11px] text-slate-500">
          Contributors must sum to total.
        </p>
      </div>
    </section>
  );
}
