// src/components/expenses/SplitSummaryPills.jsx
"use client";

import { useMemo } from "react";

/**
 * SplitSummaryPills
 * Shows compact, always-visible status pills for:
 *  - Equal share preview (when splitMode === "equal")
 *  - Percentage total (when splitMode === "percentage")
 *  - Custom total vs amount (when splitMode === "custom")
 *  - Contributors total vs amount (always)
 *
 * You can pass includedCount directly or let it infer from splits.length.
 */
export default function SplitSummaryPills({
  amount = 0,
  splitMode = "equal", // 'equal' | 'percentage' | 'custom'
  splits = [], // [{ user, amount?, percentage? }]
  contributors = [], // [{ user, amount }]
  includedCount, // optional override; defaults to splits.length
  className = "",
}) {
  const count = useMemo(
    () =>
      Number.isFinite(includedCount) ? includedCount : splits?.length || 0,
    [includedCount, splits]
  );

  const totals = useMemo(() => {
    const contrib = contributors.reduce(
      (s, c) => s + (Number(c.amount) || 0),
      0
    );
    const pct = splits.reduce((s, sp) => s + (Number(sp.percentage) || 0), 0);
    const custom = splits.reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
    return {
      contrib: +contrib.toFixed(2),
      pct: +pct.toFixed(2),
      custom: +custom.toFixed(2),
    };
  }, [contributors, splits]);

  const equalShare = useMemo(() => {
    if (splitMode !== "equal" || !amount || count === 0) return 0;
    return +(Number(amount) / count).toFixed(2);
  }, [splitMode, amount, count]);

  const amtFixed = +Number(amount || 0).toFixed(2);

  const pctMismatch = splitMode === "percentage" && totals.pct !== 100;
  const customMismatch = splitMode === "custom" && totals.custom !== amtFixed;
  const contribMismatch = amtFixed > 0 && totals.contrib !== amtFixed;

  const Pill = ({ ok, children }) => (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800",
      ].join(" ")}
    >
      {children}
    </span>
  );

  return (
    <div className={["flex flex-wrap gap-2", className].join(" ")}>
      {splitMode === "equal" && count > 0 ? (
        <Pill ok={true}>
          Equal: ${equalShare} × {count} = ${(equalShare * count).toFixed(2)}
        </Pill>
      ) : null}

      {splitMode === "percentage" ? (
        <Pill ok={!pctMismatch}>
          % total: {totals.pct}% {pctMismatch ? "• should be 100%" : ""}
        </Pill>
      ) : null}

      {splitMode === "custom" ? (
        <Pill ok={!customMismatch}>
          Custom: ${totals.custom.toFixed(2)}
          {amtFixed ? ` of $${amtFixed.toFixed(2)}` : ""}
          {customMismatch ? " • should equal total" : ""}
        </Pill>
      ) : null}

      <Pill ok={!contribMismatch}>
        Paid by: ${totals.contrib.toFixed(2)}
        {amtFixed ? ` of $${amtFixed.toFixed(2)}` : ""}
        {contribMismatch ? " • must equal total" : ""}
      </Pill>
    </div>
  );
}
