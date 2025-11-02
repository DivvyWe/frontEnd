// src/components/expenses/ParticipantsSection.jsx
"use client";

import { useMemo } from "react";
import { FiAlertCircle, FiUser } from "react-icons/fi";

function Row({ children }) {
  return (
    <div className="grid grid-cols-12 items-center gap-3 rounded-lg border border-slate-200 bg-white p-2">
      {children}
    </div>
  );
}

function AvatarName({ name }) {
  return (
    <div className="col-span-5 flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600">
        <FiUser className="h-4 w-4" />
      </div>
      <div className="truncate text-sm font-medium text-slate-800">{name}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  disabled,
  min = 0,
  step = "0.01",
  suffix,
}) {
  return (
    <div className="col-span-3">
      <div className="flex items-center rounded-lg border border-slate-300 px-2">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) =>
            onChange?.(e.target.value === "" ? "" : +e.target.value)
          }
          disabled={disabled}
          className="w-full bg-transparent py-2 text-sm outline-none"
        />
        {suffix ? (
          <span className="ml-1 text-xs text-slate-500">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, disabled }) {
  return (
    <div className="col-span-1 flex items-center justify-center">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[#84CC16]"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * ParticipantsSection
 *
 * Controlled component. Parent owns state.
 */
export default function ParticipantsSection({
  // data
  members = [], // [{_id, username, ...}]
  amount = 0,

  // split state
  splitMode = "equal", // 'equal' | 'percentage' | 'custom'
  splits = [], // [{ user, amount?, percentage? }]
  setSplits,

  // contributors state
  contributors = [], // [{ user, amount }]
  setContributors,

  // ui state
  submitting = false,
}) {
  // Quick lookup maps
  const splitMap = useMemo(() => {
    const m = new Map();
    splits?.forEach((s) => m.set(String(s.user), s));
    return m;
  }, [splits]);

  const contribMap = useMemo(() => {
    const m = new Map();
    contributors?.forEach((c) => m.set(String(c.user), c));
    return m;
  }, [contributors]);

  const includedCount = useMemo(
    () => members.filter((m) => splitMap.has(String(m._id))).length,
    [members, splitMap]
  );

  // Totals & validations
  const totals = useMemo(() => {
    const totalContrib = contributors.reduce(
      (sum, c) => sum + (Number(c.amount) || 0),
      0
    );
    const totalPct = splits.reduce(
      (sum, s) => sum + (Number(s.percentage) || 0),
      0
    );
    const totalCustom = splits.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0
    );

    return {
      contrib: +totalContrib.toFixed(2),
      pct: +totalPct.toFixed(2),
      custom: +totalCustom.toFixed(2),
    };
  }, [contributors, splits]);

  const contribMismatch =
    amount > 0 && totals.contrib !== +Number(amount).toFixed(2);
  const pctMismatch = splitMode === "percentage" && totals.pct !== 100;
  const customMismatch =
    splitMode === "custom" && totals.custom !== +Number(amount).toFixed(2);

  // Helpers: immutable updates
  const upsertSplit = (userId, patch) => {
    const id = String(userId);
    const next = [...splits];
    const idx = next.findIndex((s) => String(s.user) === id);
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...patch };
    } else {
      next.push({ user: id, ...patch });
    }
    setSplits(next);
  };

  const removeSplit = (userId) => {
    const id = String(userId);
    setSplits(splits.filter((s) => String(s.user) !== id));
  };

  const upsertContrib = (userId, amountVal) => {
    const id = String(userId);
    const next = [...contributors];
    const idx = next.findIndex((c) => String(c.user) === id);
    if (idx >= 0) {
      next[idx] = { ...next[idx], amount: amountVal };
    } else {
      next.push({ user: id, amount: amountVal || 0 });
    }
    setContributors(next);
  };

  const removeContrib = (userId) => {
    const id = String(userId);
    setContributors(contributors.filter((c) => String(c.user) !== id));
  };

  // Equal-mode auto share (display only; save a snapshot so parent can send exact amounts if needed)
  const equalShare = useMemo(() => {
    if (splitMode !== "equal" || !amount || includedCount === 0) return 0;
    // Keep two-decimals display; parent can compute final exact split server-side if desired
    return +(Number(amount) / includedCount).toFixed(2);
  }, [splitMode, amount, includedCount]);

  return (
    <div className="space-y-4">
      {/* Participants */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Participants
          </h3>
          <span className="text-[11px] text-slate-500">
            {includedCount}/{members.length} selected
          </span>
        </div>

        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-3 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            <div className="col-span-1">In</div>
            <div className="col-span-5">Person</div>
            <div className="col-span-3">
              {splitMode === "percentage" ? "% Share" : "Share Amount"}
            </div>
            <div className="col-span-3">Paid</div>
          </div>

          {members.map((m) => {
            const id = String(m._id);
            const s = splitMap.get(id);
            const c = contribMap.get(id);
            const included = !!s;

            const shareAmount =
              splitMode === "equal"
                ? equalShare
                : splitMode === "percentage"
                ? undefined
                : Number(s?.amount) || "";

            const sharePct =
              splitMode === "percentage"
                ? Number(s?.percentage) || ""
                : undefined;

            return (
              <Row key={id}>
                {/* include */}
                <Checkbox
                  checked={included}
                  disabled={submitting}
                  onChange={(checked) => {
                    if (checked) {
                      if (splitMode === "percentage") {
                        upsertSplit(id, { percentage: 0 });
                      } else if (splitMode === "custom") {
                        upsertSplit(id, { amount: 0 });
                      } else {
                        // equal mode: minimal marker; amount is implied by equalShare
                        upsertSplit(id, { amount: 0 });
                      }
                    } else {
                      removeSplit(id);
                    }
                  }}
                />

                {/* name */}
                <AvatarName name={m.username || "Unnamed"} />

                {/* share editor */}
                {splitMode === "percentage" ? (
                  <NumberInput
                    value={sharePct}
                    onChange={(v) =>
                      upsertSplit(id, { percentage: v === "" ? "" : +v })
                    }
                    disabled={!included || submitting}
                    min={0}
                    step="1"
                    suffix="%"
                  />
                ) : (
                  <NumberInput
                    value={shareAmount}
                    onChange={(v) =>
                      upsertSplit(id, { amount: v === "" ? "" : +v })
                    }
                    disabled={!included || submitting || splitMode === "equal"}
                    min={0}
                    step="0.01"
                    suffix={splitMode === "equal" ? "(auto)" : undefined}
                  />
                )}

                {/* contributor editor */}
                <NumberInput
                  value={Number(c?.amount) || ""}
                  onChange={(v) =>
                    v === "" || v === 0
                      ? removeContrib(id)
                      : upsertContrib(id, +v)
                  }
                  disabled={submitting}
                  min={0}
                  step="0.01"
                  suffix="$"
                />
              </Row>
            );
          })}
        </div>

        {/* Hints */}
        <div className="mt-3 grid gap-2 text-xs">
          {splitMode === "equal" && includedCount > 0 ? (
            <div className="rounded-md bg-slate-50 px-2 py-1.5 text-slate-600">
              Equal share preview: ${equalShare} × {includedCount} = $
              {(equalShare * includedCount).toFixed(2)}
            </div>
          ) : null}

          {splitMode === "percentage" ? (
            <div
              className={[
                "rounded-md px-2 py-1.5",
                pctMismatch
                  ? "bg-amber-50 text-amber-800"
                  : "bg-slate-50 text-slate-600",
              ].join(" ")}
            >
              % total: {totals.pct}% {pctMismatch ? "(should be 100%)" : ""}
            </div>
          ) : null}

          {splitMode === "custom" ? (
            <div
              className={[
                "rounded-md px-2 py-1.5",
                customMismatch
                  ? "bg-amber-50 text-amber-800"
                  : "bg-slate-50 text-slate-600",
              ].join(" ")}
            >
              Custom total: ${totals.custom.toFixed(2)}{" "}
              {amount ? `of $${Number(amount).toFixed(2)}` : ""}
              {customMismatch ? " (should equal total amount)" : ""}
            </div>
          ) : null}

          <div
            className={[
              "rounded-md px-2 py-1.5",
              contribMismatch
                ? "bg-red-50 text-red-700"
                : "bg-slate-50 text-slate-600",
            ].join(" ")}
          >
            Contributors total: ${totals.contrib.toFixed(2)}{" "}
            {amount ? `of $${Number(amount).toFixed(2)}` : ""}
            {contribMismatch ? (
              <span className="ml-1 inline-flex items-center gap-1">
                <FiAlertCircle className="h-3.5 w-3.5" />
                must equal total
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
