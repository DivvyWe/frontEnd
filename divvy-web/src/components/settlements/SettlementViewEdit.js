// src/components/settlements/SettlementViewEdit.jsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export default function SettlementViewEdit({ me, settlement }) {
  const router = useRouter();

  // Resolve stable ids for logic + navigation
  const groupId = String(settlement?.group?._id || settlement?.group || "");
  const settlementId = String(settlement?._id || "");

  const isPayer = useMemo(
    () =>
      String(me?._id || me?.id) ===
      String(settlement?.from?._id || settlement?.from),
    [me, settlement]
  );
  const isReceiver = useMemo(
    () =>
      String(me?._id || me?.id) ===
      String(settlement?.to?._id || settlement?.to),
    [me, settlement]
  );

  const [amount, setAmount] = useState(
    String((settlement?.amount ?? 0).toFixed?.(2) || settlement?.amount || "")
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  async function onUpdate(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      if (amount !== "" && !Number.isNaN(Number(amount))) {
        fd.append("amount", String(Number(amount)));
      }
      // 🚫 no proof upload for now

      const res = await fetch(`/api/proxy/settlements/${settlementId}`, {
        method: "PUT",
        body: fd,
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.message || "Failed to update settlement");
      router.refresh(); // reflect new amount immediately
    } catch (e) {
      setErr(e.message || "Failed to update");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/proxy/settlements/${settlementId}`, {
        method: "DELETE",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.message || "Failed to delete");

      // ✅ robust redirect: use actual group id if available; else fallback
      if (groupId) {
        router.replace(`/groups/${groupId}`);
      } else {
        router.replace(`/groups`);
      }
      router.refresh();
    } catch (e) {
      setErr(e.message || "Failed to delete");
    } finally {
      setBusy(false);
      setShowDelete(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      {err ? (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {err}
        </div>
      ) : null}

      {/* Head */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-600">
            {settlement?.from?.username || settlement?.from?.email || "Someone"}{" "}
            <span className="text-slate-400">→</span>{" "}
            {settlement?.to?.username || settlement?.to?.email || "Someone"}
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-900">
            {fmt(settlement?.amount)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {new Date(settlement?.createdAt).toLocaleString()}
            {settlement?.approved ? " • Approved" : " • Pending"}
          </div>
        </div>

        {/* Back to group */}
        <button
          type="button"
          onClick={() =>
            groupId ? router.push(`/groups/${groupId}`) : router.push("/groups")
          }
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="text-slate-500"
          >
            <path fill="currentColor" d="M15 6l-6 6 6 6" />
          </svg>
          Back to group
        </button>
      </div>

      {/* Existing proof preview (if present) */}
      {settlement?.proofUrl ? (
        <div className="mb-3">
          <a
            href={settlement.proofUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-slate-600 underline"
          >
            View proof
          </a>
        </div>
      ) : null}

      {/* Edit block (payer only) */}
      {isPayer ? (
        <form onSubmit={onUpdate} className="mt-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={busy}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Server enforces you can’t exceed what you owe.
            </p>
          </div>

          {/* 🚫 Image upload removed */}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              disabled={busy}
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
            >
              Delete
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Update"}
            </button>
          </div>
        </form>
      ) : (
        // Receiver or others: read-only (approval later)
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {isReceiver
            ? "You are the receiver of this payment."
            : "Read-only view."}
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete settlement?"
        description="This will permanently remove the settlement."
        confirmText="Delete"
        danger
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
