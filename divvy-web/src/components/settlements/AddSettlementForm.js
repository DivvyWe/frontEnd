// src/components/settlements/AddSettlementForm.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const toTitle = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

function CheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.07 7.182a1 1 0 0 1-1.435.017L3.29 9.257a1 1 0 1 1 1.42-1.407l3.17 3.2 6.365-6.463a1 1 0 0 1 1.459-.298z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function YouBadge() {
  return (
    <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
      You
    </span>
  );
}

export default function AddSettlementForm({ groupId }) {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState("");

  // who I owe -> { [userId]: amount }
  const [oweMap, setOweMap] = useState({});

  // form state
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef(false);

  // Load me + members + who I owe
  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!groupId) return;
      setLoadingMembers(true);
      setError("");
      try {
        const [meRes, memRes, owesRes] = await Promise.all([
          fetch(`/api/proxy/auth/me`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
          fetch(`/api/proxy/groups/${groupId}/members`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
          fetch(`/api/proxy/settlements/group/${groupId}/you-owe`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
        ]);

        const meJson = meRes.ok ? await meRes.json().catch(() => null) : null;
        const memJson = memRes.ok
          ? await memRes.json().catch(() => null)
          : null;

        let owe = {};
        if (owesRes.ok) {
          const owesJson = await owesRes.json().catch(() => null);
          for (const row of owesJson?.youOwe || []) {
            const uid = String(row.user);
            const amt = Number(row.amount || 0);
            if (amt > 0.009) owe[uid] = amt;
          }
        } else if (owesRes.status === 403) {
          setError("You’re not a member of this group.");
        }

        if (!ignore) {
          setMe(meJson || null);
          setMembers(memJson?.members || []);
          setOweMap(owe);
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load settle data.");
      } finally {
        if (!ignore) {
          setLoading(false);
          setLoadingMembers(false);
        }
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [groupId]);

  const myId = useMemo(
    () => (me?._id || me?.id ? String(me._id || me.id) : null),
    [me]
  );

  const memberById = (id) =>
    members.find((m) => String(m._id || m.id) === String(id));

  // Only show people you actually owe (sorted by amount desc) — exclude self just in case
  const oweList = useMemo(() => {
    const rows = Object.entries(oweMap)
      .filter(([uid, amt]) => uid !== String(myId) && Number(amt) > 0.009)
      .map(([user, amount]) => ({ user, amount: Number(amount) }));
    rows.sort((a, b) => b.amount - a.amount);
    return rows;
  }, [oweMap, myId]);

  const totalOwe = useMemo(
    () => oweList.reduce((s, r) => s + r.amount, 0),
    [oweList]
  );

  const selectedMax = useMemo(
    () => (toUserId ? Number(oweMap[toUserId] || 0) : 0),
    [toUserId, oweMap]
  );

  const selectedName = useMemo(() => {
    const m = toUserId ? memberById(toUserId) : null;
    return m ? toTitle(m.username || m.email || m.phone || "Member") : "";
  }, [toUserId, members]);

  function onPickUser(id) {
    setToUserId(id);
    const max = Number(oweMap[id] || 0);
    setAmount(max ? String(max.toFixed(2)) : "");
  }

  function clampAmount(input) {
    const v = Number(input);
    if (!Number.isFinite(v)) return "";
    if (v < 0) return "0";
    if (selectedMax && v > selectedMax) return String(selectedMax.toFixed(2));
    // keep at most 2 decimals typed
    const parts = String(input).split(".");
    if (parts[1]?.length > 2) return `${parts[0]}.${parts[1].slice(0, 2)}`;
    return input;
  }

  // If max changes (e.g., someone else settled), clamp or clear selection if now zero
  useEffect(() => {
    if (!toUserId) return;
    const max = Number(oweMap[toUserId] || 0);
    if (max <= 0.009) {
      setToUserId("");
      setAmount("");
      return;
    }
    if (amount !== "") {
      const v = Number(amount);
      if (v > max) setAmount(String(max.toFixed(2)));
    }
  }, [oweMap, toUserId, amount]);

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting || submitRef.current) return;

    setError("");
    if (!groupId) return setError("Missing group.");
    if (!toUserId) return setError("Please choose who you paid.");

    // ensure the selected user is still payable (race conditions)
    const stillMax = Number(oweMap[toUserId] || 0);
    if (stillMax <= 0.009) return setError("This person is already settled.");

    const amtNum = Number(amount);
    if (!amtNum || amtNum <= 0)
      return setError("Enter a valid amount greater than 0.");
    if (amtNum > stillMax + 0.001) {
      return setError(`You can’t pay more than ${fmt(stillMax)}.`);
    }

    try {
      setSubmitting(true);
      submitRef.current = true;

      const fd = new FormData();
      fd.append("groupId", String(groupId));
      fd.append("to", String(toUserId));
      fd.append("amount", String(amtNum));
      // 🔕 No proof upload for now

      const res = await fetch(`/api/proxy/settlements`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || "Failed to create settlement");
      }
      // force fresh summary/activity in server components
      router.replace(`/groups/${groupId}?t=${Date.now()}`);
      router.refresh();
    } catch (e) {
      setSubmitting(false);
      submitRef.current = false;
      setError(e.message || "Failed to create settlement.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  // 🎉 Nothing to pay
  if (oweList.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="mb-2 text-sm font-semibold text-slate-900">You owe</div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          You’re all settled up in this group. 🎉
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>Total owed: {fmt(0)}</span>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={submitting}>
      {error && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {/* Who do you owe? */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            You owe
          </label>
          <span className="text-xs text-slate-600">Total: {fmt(totalOwe)}</span>
        </div>

        {loadingMembers ? (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Loading members…
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {oweList.map((row) => {
              const id = String(row.user);
              const m = memberById(id);
              const name = toTitle(
                m?.username || m?.email || m?.phone || "Member"
              );
              const selected = id === toUserId;
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => onPickUser(id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm shadow-sm ${
                      selected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    } disabled:opacity-60`}
                  >
                    <span className="truncate">
                      {name}
                      {String(m?._id || m?.id) === String(myId) && <YouBadge />}
                    </span>
                    <span className="shrink-0 font-semibold text-emerald-700">
                      {fmt(row.amount)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Amount (only after selecting a person) */}
      {toUserId ? (
        <>
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Paying <span className="font-semibold">{selectedName}</span>. You
              can pay up to{" "}
              <span className="font-semibold">{fmt(selectedMax)}</span>.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={submitting || !selectedMax}
                onClick={() => setAmount(String(selectedMax.toFixed(2)))}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Pay full
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Amount
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                disabled={submitting}
                onChange={(e) => setAmount(clampAmount(e.target.value))}
                placeholder={selectedMax ? selectedMax.toFixed(2) : "0.00"}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none disabled:opacity-60"
                aria-label={`Amount to pay ${selectedName}`}
              />
              {amount && Number(amount) > 0 ? (
                <div className="mt-1 text-[11px] text-slate-500">
                  Remaining after payment:{" "}
                  <span className="font-semibold">
                    {fmt(Math.max(0, selectedMax - Number(amount)))}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-slate-500">
                  The server also validates you can’t pay more than what you
                  owe.
                </div>
              )}
            </div>

            {/* Proof upload removed intentionally */}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => router.back()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting || !toUserId || !amount || Number(amount) <= 0
              }
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Saving…
                </>
              ) : (
                "Add settlement"
              )}
            </button>
          </div>
        </>
      ) : null}
    </form>
  );
}
