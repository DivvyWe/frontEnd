// src/components/expenses/AddExpenseForm.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const toTitle = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

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

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
        active
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function YouBadge() {
  return (
    <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
      You
    </span>
  );
}

export default function AddExpenseForm({ groupId }) {
  const router = useRouter();

  // Basics
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const amtNum = Number(amount) || 0;

  // Me
  const [myId, setMyId] = useState(null);

  // Members / participants
  const [members, setMembers] = useState([]);
  const [participants, setParticipants] = useState([]); // [userId]

  // Split modes
  const [splitMode, setSplitMode] = useState("equal"); // equal | percentage | custom
  const [splitPct, setSplitPct] = useState({}); // { [userId]: % }
  const [splitAmt, setSplitAmt] = useState({}); // { [userId]: amount }

  // Contributors: “single” (default you) or manual “custom”
  const [contributorMode, setContributorMode] = useState("single"); // "single" | "custom"
  const [singlePayer, setSinglePayer] = useState(""); // one user id
  const [contributors, setContributors] = useState([{ user: "", amount: "" }]); // custom rows

  // Loading / errors
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState("");

  // Load me + members, default participants = all, default single payer = me
  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!groupId) return;
      setLoadingMembers(true);
      setError("");
      try {
        const [meRes, memRes] = await Promise.all([
          fetch(`/api/proxy/auth/me`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
          fetch(`/api/proxy/groups/${groupId}/members`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
        ]);
        if (!memRes.ok) throw new Error("Failed to load members");

        const me = meRes.ok ? await meRes.json().catch(() => null) : null;
        const memJson = await memRes.json();
        const ms = memJson?.members || [];
        if (ignore) return;

        setMembers(ms);
        const allIds = ms.map((m) => String(m._id || m.id));
        setParticipants(allIds); // default: all selected

        const meId = me?._id || me?.id || null;
        setMyId(meId);
        if (meId && allIds.includes(String(meId))) {
          setSinglePayer(String(meId)); // default payer = you
          setContributors([
            { user: String(meId), amount: amtNum ? String(amtNum) : "" },
          ]); // custom row prefilled
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load members.");
      } finally {
        if (!ignore) {
          setLoadingMembers(false);
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [groupId]);

  // If custom mode has exactly one row (you) and total amount changes, auto-fill amount
  useEffect(() => {
    if (contributorMode !== "custom") return;
    if (!myId) return;
    setContributors((prev) => {
      if (prev.length !== 1) return prev;
      const row = prev[0];
      const isYou = String(row.user || "") === String(myId);
      const needsAmount =
        (!row.amount || Number(row.amount) === 0) && amtNum > 0;
      if (isYou && needsAmount)
        return [{ user: String(myId), amount: String(amtNum) }];
      return prev;
    });
  }, [contributorMode, myId, amtNum]);

  // Toggle participant
  function toggleParticipant(id) {
    const sid = String(id);
    setParticipants((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    );
  }

  // Custom contributors helpers
  function setContributorField(idx, key, value) {
    setContributors((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }
  function addContributor() {
    setContributors((prev) => [
      ...prev,
      { user: myId ? String(myId) : "", amount: "" },
    ]);
  }
  function removeContributor(i) {
    setContributors((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ---------- SPLITS ----------
  const equalSplits = useMemo(() => {
    const ids = participants.filter(Boolean);
    if (!amtNum || amtNum <= 0 || !ids.length) return [];
    const base = Math.floor((amtNum / ids.length) * 100) / 100;
    let remainder = Math.round((amtNum - base * ids.length) * 100); // cents
    return ids.map((id) => {
      const extra = remainder > 0 ? 0.01 : 0;
      if (remainder > 0) remainder -= 1;
      return { user: id, amount: +(base + extra).toFixed(2) };
    });
  }, [amtNum, participants]);

  const pctSplits = useMemo(() => {
    if (splitMode !== "percentage") return [];
    const ids = participants.filter(Boolean);
    if (!amtNum || amtNum <= 0 || !ids.length) return [];
    return ids.map((id) => {
      const p = Number(splitPct[id]) || 0;
      return { user: id, amount: +(amtNum * (p / 100)).toFixed(2) };
    });
  }, [splitMode, amtNum, participants, splitPct]);

  const customSplits = useMemo(() => {
    if (splitMode !== "custom") return [];
    const ids = participants.filter(Boolean);
    return ids.map((id) => ({
      user: id,
      amount: +(Number(splitAmt[id]) || 0).toFixed(2),
    }));
  }, [splitMode, participants, splitAmt]);

  const activeSplits = useMemo(() => {
    if (splitMode === "equal") return equalSplits;
    if (splitMode === "percentage") return pctSplits;
    return customSplits;
  }, [splitMode, equalSplits, pctSplits, customSplits]);

  const splitTotal = useMemo(
    () => activeSplits.reduce((s, x) => s + (x.amount || 0), 0),
    [activeSplits]
  );

  const splitPctTotal = useMemo(() => {
    if (splitMode !== "percentage") return 0;
    return participants.reduce((s, id) => s + (Number(splitPct[id]) || 0), 0);
  }, [splitMode, participants, splitPct]);

  // ---------- CONTRIBUTORS (single | custom) ----------
  const activeContributors = useMemo(() => {
    if (!amtNum || amtNum <= 0) return [];
    if (contributorMode === "single") {
      if (!singlePayer) return [];
      return [{ user: singlePayer, amount: +amtNum.toFixed(2) }];
    }
    // custom
    return contributors
      .filter((c) => c.user && Number(c.amount) > 0)
      .map((c) => ({
        user: c.user,
        amount: +(Number(c.amount) || 0).toFixed(2),
      }));
  }, [contributorMode, singlePayer, contributors, amtNum]);

  const contributorsTotal = useMemo(
    () => activeContributors.reduce((s, c) => s + (c.amount || 0), 0),
    [activeContributors]
  );

  // ---------- SUBMIT ----------
  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!description.trim()) return setError("Please enter a description.");
    if (!amtNum || amtNum <= 0) return setError("Please enter a valid amount.");
    if (!participants.length)
      return setError("At least one participant is required.");

    // Split validation
    if (splitMode === "percentage" && Math.abs(splitPctTotal - 100) > 0.01) {
      return setError(
        `Split percentages must total 100% (currently ${splitPctTotal.toFixed(
          2
        )}%).`
      );
    }
    if (splitMode === "custom" && Math.abs(splitTotal - amtNum) > 0.01) {
      return setError(
        `Custom split totals ${fmt(splitTotal)}; must equal ${fmt(amtNum)}.`
      );
    }
    if (Math.abs(splitTotal - amtNum) > 0.01) {
      return setError(
        `Split rounding mismatch (total ${fmt(
          splitTotal
        )}). Adjust amount or inputs.`
      );
    }

    // Contributors validation
    if (contributorMode === "single" && !singlePayer) {
      return setError("Please select who paid.");
    }
    if (Math.abs(contributorsTotal - amtNum) > 0.01) {
      return setError(
        `Contributors total (${fmt(
          contributorsTotal
        )}) must equal amount (${fmt(amtNum)}).`
      );
    }

    const payload = {
      description: description.trim(),
      amount: amtNum,
      groupId: String(groupId).trim(),
      splitType: splitMode, // equal | percentage | custom
      participants: participants.map(String), // ✅ include participants as IDs
      splits: activeSplits, // still send explicit splits
      contributors: activeContributors, // who paid
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
      router.replace(`/groups/${groupId}`);
    } catch (e) {
      setError(e.message || "Failed to create expense.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Basics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
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
        </div>
      </div>

      {/* MODE SWITCHERS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Split
            </h3>
            <span className="text-[11px] text-slate-500">
              How to divide the cost
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill
              active={splitMode === "equal"}
              onClick={() => setSplitMode("equal")}
            >
              Equal
            </Pill>
            <Pill
              active={splitMode === "percentage"}
              onClick={() => setSplitMode("percentage")}
            >
              Percentage
            </Pill>
            <Pill
              active={splitMode === "custom"}
              onClick={() => setSplitMode("custom")}
            >
              Custom
            </Pill>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Contributors
            </h3>
            <span className="text-[11px] text-slate-500">Who paid</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill
              active={contributorMode === "single"}
              onClick={() => setContributorMode("single")}
            >
              Single
            </Pill>
            <Pill
              active={contributorMode === "custom"}
              onClick={() => setContributorMode("custom")}
            >
              Custom
            </Pill>
          </div>
        </div>
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

        {loadingMembers ? (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Loading members…
          </div>
        ) : !members.length ? (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            No members found in this group.
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {members.map((m) => {
                const id = String(m._id || m.id);
                const isYou = myId && String(myId) === id;
                const name = toTitle(
                  m.username || m.email || m.phone || "Member"
                );
                const selected = participants.includes(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggleParticipant(id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm shadow-sm flex items-center justify-between ${
                        selected
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span className="line-clamp-1">
                        {name}
                        {isYou && <YouBadge />}
                      </span>
                      {selected && (
                        <CheckIcon className="h-4 w-4 text-emerald-700" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Split detail inputs for percentage/custom */}
            {splitMode !== "equal" && participants.length > 0 && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs font-medium text-slate-700">
                  {splitMode === "percentage"
                    ? "Enter percentage per participant (total 100%)"
                    : "Enter custom amount per participant (must total amount)"}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {participants.map((id) => {
                    const user = members.find(
                      (m) => String(m._id || m.id) === id
                    );
                    const isYou = myId && String(myId) === id;
                    const name = toTitle(
                      user?.username || user?.email || user?.phone || "Member"
                    );
                    const val =
                      splitMode === "percentage"
                        ? splitPct[id] ?? ""
                        : splitAmt[id] ?? "";
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <div className="w-1/2 truncate text-xs text-slate-700">
                          {name}
                          {isYou && <YouBadge />}
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={val}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (splitMode === "percentage") {
                              setSplitPct((s) => ({ ...s, [id]: v }));
                            } else {
                              setSplitAmt((s) => ({ ...s, [id]: v }));
                            }
                          }}
                          placeholder={
                            splitMode === "percentage" ? "Percent" : "Amount"
                          }
                          className="w-1/2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-600">
                  {splitMode === "percentage" ? (
                    <>
                      Total:{" "}
                      <span className="font-semibold">
                        {splitPctTotal.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <>
                      Total:{" "}
                      <span className="font-semibold">{fmt(splitTotal)}</span> /{" "}
                      {fmt(amtNum)}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Equal split preview */}
            {splitMode === "equal" && participants.length > 0 && !!amtNum && (
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Equal split among {participants.length}:{" "}
                <span className="font-medium">
                  {fmt(amtNum / participants.length)}
                </span>{" "}
                each (rounded). Total ={" "}
                <span className="font-medium">{fmt(splitTotal)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Contributors */}
      <div className="space-y-2">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Contributors
          </label>
          <span className="text-xs text-slate-500">
            Must total {fmt(amtNum || 0)}
          </span>
        </div>

        {/* SINGLE: pick exactly one payer (default YOU) */}
        {contributorMode === "single" ? (
          <>
            {!members.length ? (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                No members found.
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                {members.map((m) => {
                  const id = String(m._id || m.id);
                  const isYou = myId && String(myId) === id;
                  const name = toTitle(
                    m.username || m.email || m.phone || "Member"
                  );
                  const selected = String(singlePayer || "") === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setSinglePayer(id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm shadow-sm flex items-center justify-between ${
                          selected
                            ? "border-sky-300 bg-sky-50 text-sky-900"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <span className="line-clamp-1">
                          {name}
                          {isYou && <YouBadge />}
                        </span>
                        {selected && (
                          <CheckIcon className="h-4 w-4 text-sky-700" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Preview */}
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Contributors total:{" "}
              <span className="font-semibold">{fmt(contributorsTotal)}</span>
              {singlePayer && amtNum > 0 && " (100%)"}
            </div>
          </>
        ) : (
          // CUSTOM: manual rows (first row prefilled as You)
          <>
            {!members.length ? (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Load members to select contributors.
              </div>
            ) : (
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
                          {toTitle(
                            m.username || m.email || m.phone || "Member"
                          )}
                          {myId && String(myId) === String(m._id || m.id)
                            ? " (You)"
                            : ""}
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
            )}

            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="text-slate-600">
                Contributors total:{" "}
                <span
                  className={`font-semibold ${
                    Math.abs(contributorsTotal - amtNum) < 0.001
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {fmt(contributorsTotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={addContributor}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                + Add contributor
              </button>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
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
  );
}
