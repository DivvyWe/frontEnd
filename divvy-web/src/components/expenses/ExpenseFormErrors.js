// src/components/expenses/ExpenseFormErrors.js
"use client";

import { FiAlertTriangle, FiX } from "react-icons/fi";

/**
 * A compact form error banner.
 * Accepts either a string message or an array of strings.
 */
export default function ExpenseFormErrors({
  error, // string | string[] | null | undefined
  onClose, // () => void (optional)
  className = "",
}) {
  if (!error || (Array.isArray(error) && error.length === 0)) return null;

  const messages = Array.isArray(error) ? error : [error];

  return (
    <div
      className={[
        "flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800",
        className,
      ].join(" ")}
      role="alert"
      aria-live="assertive"
    >
      <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {messages.length === 1 ? (
          <span className="block">{messages[0]}</span>
        ) : (
          <ul className="list-inside list-disc space-y-0.5">
            {messages.map((m, i) => (
              <li key={i} className="break-words">
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss error"
          className="grid h-6 w-6 place-items-center rounded-md text-rose-700 hover:bg-rose-100"
        >
          <FiX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
