// src/components/ui/Pill.jsx
"use client";

export default function Pill({ active, onClick, children }) {
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
