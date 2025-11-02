// src/components/expenses/ExpenseActions.js
"use client";

export default function ExpenseActions({
  submitting = false,
  canSubmit = true, // parent computes validity (amount > 0, splits ok, contributors ok, etc.)
  submitLabel = "Create expense",
  cancelLabel = "Cancel",
  onSubmit, // () => void
  onCancel, // () => void
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
      >
        {cancelLabel}
      </button>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !canSubmit}
        className="inline-flex items-center gap-2 rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-semibold text-white hover:bg-[#76b514] disabled:opacity-60"
      >
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
