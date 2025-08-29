// app/groups/[groupId]/new-expense/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

function titleCase(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function NewExpensePage({ params }) {
  const router = useRouter();
  const { groupId } = params;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType] = useState("equal"); // equal for now (MVP)
  const [participants, setParticipants] = useState([]); // array of user ids
  const [contributors, setContributors] = useState([{ user: "", amount: "" }]);

  // Load members for this group
  useEffect(() => {
    let ignore = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        // Use your proxy like the rest of the app
        const res = await fetch(`/api/proxy/groups/${groupId}/members`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to load members");
        const json = await res.json();
        const ms = json?.members || [];
        if (!ignore) {
          setMembers(ms);
          // Default: everyone included as participant initially
          setParticipants(ms.map((m) => String(m._id || m.id)));
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load members.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [groupId]);

  // Compute equal splits for selected participants (client-side)
  const computedSplits = useMemo(() => {
    const amt = Number(amount);
    const ids = participants.filter(Boolean);
    if (!amt || amt <= 0 || !ids.length) return [];
    // even split with rounding fix
    const base = Math.floor((amt / ids.length) * 100) / 100;
    let remainder = Math.round((amt - base * ids.length) * 100); // in cents
    const splits = ids.map((id) => {
      const extraCent = remainder > 0 ? 0.01 : 0;
      if (remainder > 0) remainder -= 1;
      return { user: id, amount: +(base + extraCent).toFixed(2) };
    });
    return splits;
  }, [amount, participants]);

  const computedSplitTotal = useMemo(
    () => computedSplits.reduce((s, x) => s + (x.amount || 0), 0),
    [computedSplits]
  );

  const contributorsTotal = useMemo(
    () =>
      contributors.reduce(
        (s, c) => s + (Number(c.amount) > 0 ? Number(c.amount) : 0),
        0
      ),
    [contributors]
  );

  function setContributorField(idx, key, value) {
    setContributors((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  function addContributor() {
    setContributors((prev) => [...prev, { user: "", amount: "" }]);
  }

  function removeContributor(i) {
    setContributors((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleParticipant(id) {
    setParticipants((prev) => {
      const sid = String(id);
      return prev.includes(sid)
        ? prev.filter((x) => x !== sid)
        : [...prev, sid];
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    // Basic validations
    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (!participants.length) {
      setError("Select at least one participant.");
      return;
    }
    // contributors: sum must equal amount (backend requirement)
    if (Math.abs(contributorsTotal - amt) > 0.001) {
      setError(
        `Contributors total (${fmt(
          contributorsTotal
        )}) must equal expense amount (${fmt(amt)}).`
      );
      return;
    }
    // splits total should align with amount (safety)
    if (Math.abs(computedSplitTotal - amt) > 0.01) {
      setError(
        `Internal split rounding mismatch (got ${fmt(
          computedSplitTotal
        )}). Please adjust amount.`
      );
      return;
    }

    // Prepare payload—backend ignores participants, so we send computed splits
    const payload = {
      description: description.trim(),
      amount: amt,
      groupId,
      splitType, // "equal"
      splits: computedSplits,
      contributors: contributors
        .filter((c) => c.user && Number(c.amount) > 0)
        .map((c) => ({ user: c.user, amount: Number(c.amount) })),
    };

    try {
      const res = await fetch(`/api/proxy/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || "Failed to create expense");
      }

      // Go back to group page
      router.replace(`/groups/${groupId}`);
    } catch (e) {
      setError(e.message || "Failed to create expense.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Add expense</h1>
      </div>

      {/* Status / validation */}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {/* Members loading */}
      {loading ? (
        <div className="text-sm text-slate-500">Loading members…</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner at Ichi"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="120.00"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Split type: <span className="font-medium">Equal</span>
            </p>
          </div>

          {/* Participants */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Participants
              </label>
              <span className="text-xs text-slate-500">
                {participants.length} selected
              </span>
            </div>

            <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {members.map((m) => {
                const id = String(m._id || m.id);
                const name = titleCase(
                  m.username || m.email || m.phone || "Member"
                );
                const selected = participants.includes(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggleParticipant(id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm shadow-sm ${
                        selected
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span className="line-clamp-1">{name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Preview of computed equal splits */}
            {!!participants.length && !!Number(amount) && (
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Equal split among {participants.length}:{" "}
                <span className="font-medium">
                  {fmt(Number(amount) / participants.length)}
                </span>{" "}
                each (rounded). Total ={" "}
                <span className="font-medium">{fmt(computedSplitTotal)}</span>
              </div>
            )}
          </div>

          {/* Contributors */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Contributors (who paid)
              </label>
              <span className="text-xs text-slate-500">
                Must total {fmt(Number(amount) || 0)}
              </span>
            </div>

            <div className="space-y-2">
              {contributors.map((row, idx) => (
                <div
                  key={idx}
                  className="flex gap-2 rounded-lg border border-slate-200 bg-white p-2"
                >
                  <select
                    className="w-1/2 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                    value={row.user}
                    onChange={(e) =>
                      setContributorField(idx, "user", e.target.value)
                    }
                  >
                    <option value="">Select member…</option>
                    {members.map((m) => (
                      <option key={m._id || m.id} value={m._id || m.id}>
                        {titleCase(
                          m.username || m.email || m.phone || "Member"
                        )}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-1/2 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) =>
                      setContributorField(idx, "amount", e.target.value)
                    }
                  />

                  <button
                    type="button"
                    onClick={() => removeContributor(idx)}
                    className="rounded-md border border-slate-200 px-2 text-sm text-slate-600 hover:bg-slate-50"
                    aria-label="Remove"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={addContributor}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                + Add contributor
              </button>
              <div className="text-slate-600">
                Contributors total:{" "}
                <span
                  className={`font-semibold ${
                    Math.abs(contributorsTotal - Number(amount)) < 0.001
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {fmt(contributorsTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create expense
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
