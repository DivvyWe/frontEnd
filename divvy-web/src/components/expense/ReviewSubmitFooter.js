// src/components/expenses/ReviewSubmitFooter.jsx
"use client";

import { FiAlertCircle, FiCheck, FiChevronRight } from "react-icons/fi";

export default function ReviewSubmitFooter({
  // submit lifecycle
  submitting = false,
  onSubmit,
  onCancel,

  // control primary button
  canSubmit = true, // parent decides if form is valid
  submitLabel = "Create expense",

  // banners
  serverError = "", // string or null
  serverSuccess = "", // string or null

  // optional validation summaries to show above CTA
  warnings = [], // array of strings (non-blocking)
  errors = [], // array of strings (blocking, typically sets canSubmit=false)

  // optional: extra nodes (e.g., “By continuing…” note)
  note = null,
}) {
  const hasErrors = Array.isArray(errors) && errors.length > 0;
  const hasWarnings = Array.isArray(warnings) && warnings.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {/* Server banners */}
      {serverError ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="whitespace-pre-line">{serverError}</span>
        </div>
      ) : null}

      {serverSuccess ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">
          <FiCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="whitespace-pre-line">{serverSuccess}</span>
        </div>
      ) : null}

      {/* Validation list */}
      {hasErrors ? (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-100">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <FiAlertCircle className="h-4 w-4" />
            Please fix the following to continue:
          </div>
          <ul className="list-inside list-disc space-y-1">
            {errors.map((e, i) => (
              <li key={`err-${i}`}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasWarnings ? (
        <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-100">
          <div className="mb-1 flex items-center gap-2 font-medium">
            <FiAlertCircle className="h-4 w-4" />
            Check these before submitting:
          </div>
          <ul className="list-inside list-disc space-y-1">
            {warnings.map((w, i) => (
              <li key={`warn-${i}`}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Optional note */}
      {note ? <div className="mb-3 text-xs text-slate-500">{note}</div> : null}

      {/* CTA row */}
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="submit"
          onClick={onSubmit}
          disabled={submitting || !canSubmit}
          className={[
            "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white",
            "bg-[#84CC16] hover:bg-[#76b514]",
            submitting || !canSubmit ? "opacity-60" : "",
          ].join(" ")}
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Saving…
            </>
          ) : (
            <>
              {submitLabel}
              <FiChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
