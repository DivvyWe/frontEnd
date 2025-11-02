// src/components/expenses/ExpenseParticipants.js
"use client";

import { useMemo, useState, useCallback } from "react";

const BRAND = "#84CC16"; // brand green
const DEFAULT_VISIBLE_COUNT = 8; // compact chips ≈ two rows in most cases

function Chip({ user, checked, onToggle, disabled = false }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle?.(user._id);
      }
    },
    [disabled, onToggle, user?._id]
  );

  return (
    <label
      className={[
        "relative inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium transition",
        "bg-white",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      style={{
        borderColor: checked ? BRAND : "rgb(226 232 240)", // slate-200
        boxShadow: checked ? `0 0 0 1px ${BRAND} inset` : "none",
      }}
      title={user?.username || "User"}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      data-selected={checked ? "true" : "false"}
    >
      {/* Name (single line, auto width) */}
      <span
        className={[
          "truncate",
          checked ? "text-slate-900" : "text-slate-700",
        ].join(" ")}
      >
        {user?.username || "Unknown"}
      </span>

      {/* Right-side inline check when selected */}
      {checked && (
        <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white">
          <svg
            viewBox="0 0 20 20"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ color: BRAND }}
            aria-hidden="true"
          >
            <path d="M5 10l3 3 7-7" />
          </svg>
        </span>
      )}

      {/* Accessible checkbox (visually hidden) */}
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={() => onToggle?.(user._id)}
        disabled={disabled}
        aria-label={`Include ${user?.username || "user"} in split`}
      />
    </label>
  );
}

export default function ExpenseParticipants({
  members = [], // [{ _id, username, email, phone, avatar }]
  selectedIds = [], // string[]
  onChangeSelected, // (ids: string[]) => void
  disabled = false,
}) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!q.trim()) return members;
    const s = q.trim().toLowerCase();
    return members.filter((m) => {
      return (
        m?.username?.toLowerCase().includes(s) ||
        m?.email?.toLowerCase?.().includes(s) ||
        m?.phone?.toLowerCase?.().includes(s)
      );
    });
  }, [q, members]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = useCallback(
    (id) => {
      if (!id) return;
      const next = new Set(selectedSet);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChangeSelected?.(Array.from(next));
    },
    [selectedSet, onChangeSelected]
  );

  const shown = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasMore = filtered.length > DEFAULT_VISIBLE_COUNT;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium text-slate-700">
          Participants
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            {selectedIds.length}/{members.length} selected
          </span>
        </h3>
        {/* Optional: add a small search input here if you want filtering UI */}
        {/* <input ... value={q} onChange={(e)=>setQ(e.target.value)} /> */}
      </div>

      {/* Chips */}
      <div className="mt-3">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No matches.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {shown.map((m) => (
              <Chip
                key={m._id}
                user={m}
                checked={selectedSet.has(m._id)}
                onToggle={toggle}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {/* Expand / Collapse */}
        {hasMore && (
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
              disabled={disabled}
            >
              {expanded
                ? "Show less"
                : `Show ${filtered.length - DEFAULT_VISIBLE_COUNT} more`}
            </button>
          </div>
        )}
      </div>

      {/* minimal helper */}
      <p className="mt-2 text-xs text-slate-500">
        Only selected people will be included in the split below.
      </p>
    </section>
  );
}
