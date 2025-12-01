// src/components/expenses/ExpenseSplitMode.js
"use client";

const BRAND = "#84CC16"; // brand color

const MODES = [
  { key: "equal", label: "Equal" },
  { key: "percentage", label: "Percentage" },
  { key: "custom", label: "Custom" },
  // { key: "items", label: "By items" }, // 🆕 item-based splitting
];

export default function ExpenseSplitMode({
  splitMode,
  setSplitMode,
  disabled = false,
}) {
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
      aria-labelledby="split-type-title"
    >
      <h3
        id="split-type-title"
        className="mb-2 text-sm font-medium text-slate-700"
      >
        Split type
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => {
          const active = splitMode === m.key;
          return (
            <label
              key={m.key}
              className={[
                "group relative flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition",
                active
                  ? "border-[var(--brand-color)] bg-[var(--brand-color)] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                disabled ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
              style={{ "--brand-color": BRAND }}
            >
              <input
                type="radio"
                name="split-type"
                value={m.key}
                checked={active}
                onChange={() => setSplitMode(m.key)}
                disabled={disabled}
                className="sr-only"
              />
              <span>{m.label}</span>

              {/* Tiny active dot */}
              {active && (
                <span
                  className="absolute top-1 right-1 h-2 w-2 rounded-full bg-white"
                  aria-hidden="true"
                />
              )}
            </label>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {splitMode === "equal" &&
          "Everyone shares the total evenly. (Members can be updated below.)"}
        {splitMode === "percentage" &&
          "Assign percentages to each member. Must total 100%."}
        {splitMode === "custom" &&
          "Enter exact amounts for each member. Must total the full amount."}
        {splitMode === "items" &&
          "Use the parsed receipt items and choose who each item belongs to. We’ll calculate the split for you."}
      </p>
    </section>
  );
}
