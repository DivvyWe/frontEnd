// src/components/expenses/ExpenseModeSwitcher.js
"use client";

const MODES = {
  split: [
    { key: "equal", label: "Equal" },
    { key: "percentage", label: "Percentage" },
    { key: "custom", label: "Custom" },
  ],
  contributors: [
    { key: "equal", label: "Equal" }, // we'll convert to amounts at submit
    { key: "percentage", label: "Percentage" }, // also converted to amounts
    { key: "custom", label: "Custom" }, // direct amounts
  ],
};

function Pill({ active, children, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
        active
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function ExpenseModeSwitcher({
  splitMode,
  onChangeSplitMode,
  contributorMode,
  onChangeContributorMode,
  className = "",
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      {/* Split mode */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Split
          </h3>
          <span className="text-[11px] text-slate-500">
            How to divide the cost
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {MODES.split.map((m) => (
            <Pill
              key={m.key}
              active={splitMode === m.key}
              onClick={() => onChangeSplitMode?.(m.key)}
              ariaLabel={`Split mode: ${m.label}`}
            >
              {m.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Contributor mode */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Contributors
          </h3>
          <span className="text-[11px] text-slate-500">Who paid (and how)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {MODES.contributors.map((m) => (
            <Pill
              key={m.key}
              active={contributorMode === m.key}
              onClick={() => onChangeContributorMode?.(m.key)}
              ariaLabel={`Contributor mode: ${m.label}`}
            >
              {m.label}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}
