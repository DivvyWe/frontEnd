// src/components/expenses/useFormGuards.js
"use client";

import { useEffect } from "react";

/**
 * useFormGuards
 * - Keyboard shortcuts: Cmd/Ctrl+Enter (submit), Esc (cancel)
 * - beforeunload guard if form is dirty (prevents accidental tab close/refresh)
 *
 * @param {object} opts
 *  - isDirty: boolean -> whether the form has unsaved changes
 *  - submitting: boolean -> disables actions while submitting
 *  - canSubmit: boolean -> allow submit shortcut only when valid
 *  - onSubmit: () => void
 *  - onCancel: () => void
 *  - enabled: boolean (default true)
 */
export default function useFormGuards({
  isDirty = false,
  submitting = false,
  canSubmit = true,
  onSubmit,
  onCancel,
  enabled = true,
} = {}) {
  // Keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e) {
      if (submitting) return;

      // Submit on Cmd/Ctrl + Enter
      const isSubmitCombo =
        (e.metaKey || e.ctrlKey) && (e.key === "Enter" || e.code === "Enter");
      if (isSubmitCombo) {
        if (typeof onSubmit === "function" && canSubmit) {
          e.preventDefault();
          onSubmit();
        }
        return;
      }

      // Cancel on Esc
      if (e.key === "Escape" || e.code === "Escape") {
        if (typeof onCancel === "function") {
          e.preventDefault();
          onCancel();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, submitting, canSubmit, onSubmit, onCancel]);

  // beforeunload guard (tab close/refresh)
  useEffect(() => {
    if (!enabled) return;

    function handleBeforeUnload(e) {
      if (!isDirty || submitting) return;
      e.preventDefault();
      // Chrome requires returnValue to be set.
      e.returnValue = "";
      return "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, isDirty, submitting]);
}
