// src/components/expenses/SplitModeSelector.jsx
"use client";

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
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

export default function SplitModeSelector({
  splitMode,
  setSplitMode,
  submitting,
}) {
  return (
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
        <Pill
          active={splitMode === "equal"}
          onClick={() => !submitting && setSplitMode("equal")}
        >
          Equal
        </Pill>
        <Pill
          active={splitMode === "percentage"}
          onClick={() => !submitting && setSplitMode("percentage")}
        >
          Percentage
        </Pill>
        <Pill
          active={splitMode === "custom"}
          onClick={() => !submitting && setSplitMode("custom")}
        >
          Custom
        </Pill>
      </div>
    </div>
  );
}
