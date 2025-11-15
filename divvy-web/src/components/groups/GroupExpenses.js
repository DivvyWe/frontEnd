// src/components/groups/GroupExpenses.jsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function formatAmountPlain(amount, currencyCode) {
  const num = Number(amount || 0).toFixed(2);
  const code = String(currencyCode || "AUD").toUpperCase();
  return `${code} ${num}`;
}

export default function GroupExpenses({
  groupId,
  sort,
  expenses = [],
  currency, // 👈 group currency code, e.g. "NPR", "AUD"
  mode = "scroll", // "scroll" | "paginate"
  maxHeight = 360, // px (applies when mode === "scroll")
  pageSize = 8, // visible count per page (when mode === "paginate")
}) {
  const hasExpenses = expenses.length > 0;
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // pagination state (used only in paginate mode)
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const canShowMore = mode === "paginate" && visibleCount < expenses.length;
  const shownExpenses =
    mode === "paginate" ? expenses.slice(0, visibleCount) : expenses;

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const sortOptions = [
    { key: "new", label: "Newest" },
    { key: "old", label: "Oldest" },
    { key: "amtDesc", label: "Amount ↓" },
    { key: "amtAsc", label: "Amount ↑" },
  ];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Expenses</h2>

        {/* Sort dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Sort"
            className={`rounded-md p-1.5 transition hover:bg-slate-100 focus:outline-none ${
              open ? "bg-slate-100" : ""
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="text-slate-700"
            >
              <path fill="currentColor" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
            </svg>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg animate-fadeIn"
            >
              {sortOptions.map((opt) => (
                <Link
                  key={opt.key}
                  href={`/groups/${groupId}?sort=${opt.key}`}
                  scroll={false}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 text-sm transition-colors ${
                    sort === opt.key
                      ? "bg-[#84CC1615] text-[#84CC16] font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expense list container */}
      <div
        className={
          mode === "scroll"
            ? "overflow-y-auto pr-1" // pr-1 to avoid scrollbar overlay
            : ""
        }
        style={mode === "scroll" ? { maxHeight } : undefined}
      >
        {hasExpenses ? (
          <>
            <ul className="divide-y divide-slate-100">
              {shownExpenses.map((ex) => {
                const displayAmount =
                  ex.formattedAmount || formatAmountPlain(ex.amount, currency);
                return (
                  <li key={ex._id}>
                    <Link
                      href={`/expenses/${groupId}/${ex._id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 no-underline transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {ex.description || "Untitled expense"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(ex.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {displayAmount}
                        </div>
                        <div className="ml-auto flex justify-end text-slate-400">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path fill="currentColor" d="M9 6l6 6-6 6" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Show more (paginate mode only) */}
            {canShowMore && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => setVisibleCount((v) => v + pageSize)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Show more
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path
                  fill="currentColor"
                  d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20Zm0 3a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 5Zm1 5v7h-2v-7h2Z"
                />
              </svg>
            </div>
            <div className="mb-1 text-lg font-medium text-slate-800">
              No expenses yet
            </div>
            <p className="text-xs text-slate-500">
              Start by adding your first expense to this group.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
