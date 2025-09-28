// src/components/ChangePasswordModal.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { FiX, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const BRAND = "#84CC16";

// Adjust this to your actual backend route & payload keys if different
async function changePasswordRequest({ currentPassword, newPassword }) {
  const res = await fetch("/api/proxy/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    // try parse JSON error, otherwise show text
    try {
      const j = JSON.parse(text || "{}");
      throw new Error(j?.message || "Failed to change password");
    } catch {
      throw new Error(text || "Failed to change password");
    }
  }
  return text ? JSON.parse(text) : {};
}

export default function ChangePasswordModal() {
  const [open, setOpen] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useRef(null);
  const firstInputRef = useRef(null);

  // Open on custom event from profile page button
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("open-change-password", onOpen);
    return () => window.removeEventListener("open-change-password", onOpen);
  }, []);

  // Focus first input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    } else {
      setError("");
      setOk("");
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setSubmitting(false);
      setShowOld(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [open]);

  // Close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function validate() {
    if (!oldPwd) return "Current password is required.";
    if (!newPwd) return "New password is required.";
    if (newPwd.length < 8) return "New password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(newPwd) || !/[0-9]/.test(newPwd))
      return "New password must include letters and numbers.";
    if (newPwd === oldPwd)
      return "New password must be different from the current one.";
    if (confirmPwd !== newPwd) return "Passwords do not match.";
    return "";
  }

  async function onSubmit(e) {
    e?.preventDefault?.();
    const v = validate();
    if (v) {
      setError(v);
      setOk("");
      return;
    }
    setSubmitting(true);
    setError("");
    setOk("");
    try {
      await changePasswordRequest({
        currentPassword: oldPwd,
        newPassword: newPwd,
      });
      setOk("Password changed successfully.");
      // Optionally auto-close after a short delay
      setTimeout(() => setOpen(false), 800);
    } catch (err) {
      setError(err?.message || "Failed to change password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      aria-labelledby="change-password-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="absolute left-1/2 top-1/2 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/10"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100">
              <FiLock className="h-5 w-5 text-slate-600" />
            </div>
            <h2
              id="change-password-title"
              className="text-lg font-semibold text-slate-900"
            >
              Change password
            </h2>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Close"
            title="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          {/* Current password */}
          <label className="grid gap-1">
            <span className="text-xs font-medium uppercase text-slate-500">
              Current password
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={firstInputRef}
                type={showOld ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-[#84CC16]/20 focus:border-[#84CC16] focus:ring-4"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label={
                  showOld ? "Hide current password" : "Show current password"
                }
                title={showOld ? "Hide password" : "Show password"}
              >
                {showOld ? (
                  <FiEyeOff className="h-5 w-5" />
                ) : (
                  <FiEye className="h-5 w-5" />
                )}
              </button>
            </div>
          </label>

          {/* New password */}
          <label className="grid gap-1">
            <span className="text-xs font-medium uppercase text-slate-500">
              New password
            </span>
            <div className="flex items-center gap-2">
              <input
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-[#84CC16]/20 focus:border-[#84CC16] focus:ring-4"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label={showNew ? "Hide new password" : "Show new password"}
                title={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? (
                  <FiEyeOff className="h-5 w-5" />
                ) : (
                  <FiEye className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Must be at least 8 characters and include letters & numbers.
            </p>
          </label>

          {/* Confirm password */}
          <label className="grid gap-1">
            <span className="text-xs font-medium uppercase text-slate-500">
              Confirm new password
            </span>
            <div className="flex items-center gap-2">
              <input
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-[#84CC16]/20 focus:border-[#84CC16] focus:ring-4"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                aria-label={
                  showConfirm
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                title={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <FiEyeOff className="h-5 w-5" />
                ) : (
                  <FiEye className="h-5 w-5" />
                )}
              </button>
            </div>
          </label>

          {/* Messages */}
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : ok ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {ok}
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: BRAND }}
            >
              {submitting ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
