"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function Spinner({ className = "h-4 w-4" }) {
  return (
    <span
      className={`${className} inline-block animate-spin rounded-full border-2 border-slate-300 border-t-slate-600`}
    />
  );
}

export default function InvitesTray({ className = "" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]); // [{groupId, groupName, invitedBy, invitedAt, status}]
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null); // groupId while accepting/rejecting

  async function loadInvites() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/user/groups/invites", {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }
      if (!res.ok) throw new Error("Failed to load invites");
      const j = await res.json();
      setInvites(Array.isArray(j?.invites) ? j.invites : []);
    } catch (e) {
      setError(e.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvites();
  }, []);

  async function accept(groupId) {
    setActing(groupId);
    setError("");
    try {
      const res = await fetch(`/api/proxy/user/groups/${groupId}/accept`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to accept invite");
      // Remove from local list and go to group
      setInvites((prev) => prev.filter((i) => i.groupId !== groupId));
      router.push(`/groups/${groupId}`);
    } catch (e) {
      setError(e.message || "Failed to accept invite");
    } finally {
      setActing(null);
    }
  }

  async function reject(groupId) {
    setActing(groupId);
    setError("");
    try {
      const res = await fetch(`/api/proxy/user/groups/${groupId}/reject`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to reject invite");
      setInvites((prev) => prev.filter((i) => i.groupId !== groupId));
    } catch (e) {
      setError(e.message || "Failed to reject invite");
    } finally {
      setActing(null);
    }
  }

  const count = invites.length;

  return (
    <div className={`relative ${className}`}>
      {/* Bell / Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Invites
        <span
          className={`ml-1 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs ${
            count > 0
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              Pending invites
            </div>
            <button
              className="text-xs text-slate-500 hover:underline"
              onClick={loadInvites}
              title="Refresh"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Spinner /> Loading…
            </div>
          ) : error ? (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : count === 0 ? (
            <div className="text-sm text-slate-500">No pending invites.</div>
          ) : (
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li
                  key={inv.groupId}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {inv.groupName || "Group"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Invited by {inv.invitedBy || "someone"}
                      </div>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => accept(inv.groupId)}
                        disabled={acting === inv.groupId}
                        className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {acting === inv.groupId ? "…" : "Accept"}
                      </button>
                      <button
                        onClick={() => reject(inv.groupId)}
                        disabled={acting === inv.groupId}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
