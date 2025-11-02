// src/components/ChangePasswordModal.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiX, FiLock, FiEye, FiEyeOff, FiCheckCircle } from "react-icons/fi";

const BRAND = "#84CC16";
const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

async function changePasswordRequest({ currentPassword, newPassword }) {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    try {
      const j = text ? JSON.parse(text) : {};
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

  // Open on event
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-change-password", onOpen);
    return () => window.removeEventListener("open-change-password", onOpen);
  }, []);

  // Reset/focus
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
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Live validity
  const meetsLength = newPwd.length >= 8;
  const hasUpper = /[A-Z]/.test(newPwd);
  const hasLower = /[a-z]/.test(newPwd);
  const hasNumber = /\d/.test(newPwd);
  const hasSpecial = /[^\w\s]/.test(newPwd);
  const matchesConfirm = confirmPwd === newPwd && newPwd.length > 0;
  const differentFromOld = newPwd && oldPwd && newPwd !== oldPwd;
  const meetsStrong = strongPwd.test(newPwd);

  const canSubmit = useMemo(
    () =>
      !!oldPwd &&
      meetsStrong &&
      matchesConfirm &&
      differentFromOld &&
      !submitting,
    [oldPwd, meetsStrong, matchesConfirm, differentFromOld, submitting]
  );

  function validate() {
    if (!oldPwd) return "Current password is required.";
    if (!newPwd) return "New password is required.";
    if (!meetsStrong)
      return "Password must be 8+ chars and include uppercase, lowercase, number, and special character.";
    if (!differentFromOld)
      return "New password must be different from the current one.";
    if (!matchesConfirm) return "Passwords do not match.";
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
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      const msg = err?.message || "Failed to change password.";
      if (/unauthorized|expired|403|401/i.test(msg)) {
        window.location.href = "/login";
        return;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const Rule = ({ ok, label }) => (
    <div className="flex items-center gap-2 text-xs">
      <FiCheckCircle
        className={`h-4 w-4 ${ok ? "text-emerald-600" : "text-slate-400"}`}
      />
      <span className={ok ? "text-emerald-700" : "text-slate-500"}>
        {label}
      </span>
    </div>
  );

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
          </label>

          {/* Confirm */}
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

          {/* Live rules */}
          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-slate-200 p-3">
            <Rule ok={meetsLength} label="At least 8 characters" />
            <Rule ok={hasUpper} label="Contains an uppercase letter" />
            <Rule ok={hasLower} label="Contains a lowercase letter" />
            <Rule ok={hasNumber} label="Contains a number" />
            <Rule ok={hasSpecial} label="Contains a special character" />
            <Rule ok={matchesConfirm} label="Confirm matches" />
            <Rule
              ok={differentFromOld}
              label="Different from current password"
            />
          </div>

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
              disabled={!canSubmit}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`}
              style={{ backgroundColor: BRAND }}
              title={
                !canSubmit ? "Meet all criteria to continue" : "Change password"
              }
            >
              {submitting ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
