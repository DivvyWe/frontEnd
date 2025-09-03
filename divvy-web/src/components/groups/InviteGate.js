// src/components/groups/InviteGate.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteGate({ groupId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/proxy/user/groups/${groupId}/accept`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || "Failed to accept invite");
      }
      // reload the same route as a full member now
      router.replace(`/groups/${groupId}`);
    } catch (e) {
      setError(e.message || "Failed to accept invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">You're invited</h1>
      <p className="text-slate-600">
        You’ve been invited to join this group. Accept to view expenses,
        members, and the summary.
      </p>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          onClick={accept}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Accepting…" : "Accept invite"}
        </button>
        <button
          onClick={() => router.back()}
          disabled={busy}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
