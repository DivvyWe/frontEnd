// src/components/groups/AddMemberModal.jsx
"use client";

import { useState } from "react";
import { UserPlus, X, Loader2 } from "lucide-react";

export default function AddMemberModal({ open, onClose, groupId, onAdded }) {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit() {
    if (!identifier.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Failed with ${res.status}`);
      }
      onAdded?.();
      setIdentifier("");
      onClose?.();
    } catch (e) {
      setError(e?.message || "Failed to add member");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") onClose?.();
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-title"
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      <div className="relative z-[101] w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/10">
        <div className="mb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-700">
              <UserPlus className="h-4 w-4" />
            </div>
            <h3
              id="add-member-title"
              className="text-base font-semibold text-slate-900"
            >
              Add member
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-slate-600">
          Enter an <span className="font-medium">email</span> to add them to
          this group.
        </p>

        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Email
        </label>
        <input
          type="text"
          inputMode="email"
          autoFocus
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="e.g. alex@example.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        />

        {error ? (
          <div className="mt-2 rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !identifier.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Adding…" : "Add member"}
          </button>
        </div>
      </div>
    </div>
  );
}
