"use client";

import { useEffect, useState } from "react";
import { FiArrowUpRight, FiArrowDownLeft } from "react-icons/fi";

const fmtMoney = (n) => {
  const x = Number(n) || 0;
  return x.toFixed(2);
};

function Pill({ label, value, tone = "neutral" }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium";
  const cls =
    tone === "negative"
      ? "bg-red-50 text-red-700"
      : tone === "positive"
      ? "bg-green-50 text-green-700"
      : "bg-slate-50 text-slate-600";
  return (
    <span className={`${base} ${cls}`}>
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function Spinner({ size = 16 }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border border-slate-300 border-t-[#84CC16]"
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, size / 9),
      }}
      aria-label="Loading"
      role="status"
    />
  );
}

export default function UserDebtOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/proxy/users/overall-summary", {
          cache: "no-store",
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || `HTTP ${res.status}`);
        }

        const j = await res.json();
        if (cancelled) return;
        setData(j || {});
      } catch (e) {
        if (!cancelled) {
          console.error("[overview] fetch failed", e);
          setError(e?.message || "Failed to load summary");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">
            Calculating your overall balance…
          </p>
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-red-100">
        <p className="text-sm text-red-700">
          Couldn&apos;t load your overview: {error}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const owes = Array.isArray(data.owes) ? data.owes : [];
  const owedBy = Array.isArray(data.owedBy) ? data.owedBy : [];
  const totalOwes = Number(data.totalOwes || 0);
  const totalOwedBy = Number(data.totalOwedBy || 0);

  const allClear = owes.length === 0 && owedBy.length === 0;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Overall across all groups
          </p>
          <p className="text-sm text-slate-700">
            Quick snapshot of who you owe and who owes you.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill
            label="You owe"
            value={`$${fmtMoney(totalOwes)}`}
            tone={totalOwes > 0 ? "negative" : "neutral"}
          />
          <Pill
            label="You’re owed"
            value={`$${fmtMoney(totalOwedBy)}`}
            tone={totalOwedBy > 0 ? "positive" : "neutral"}
          />
        </div>
      </div>

      {allClear ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          You&apos;re all settled across every group. 🎉
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* You owe */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                <FiArrowUpRight className="h-3.5 w-3.5" />
                <span>You owe</span>
              </div>
              <span className="text-xs text-slate-500">
                {owes.length} person{owes.length === 1 ? "" : "s"}
              </span>
            </div>

            {owes.length === 0 ? (
              <p className="text-xs text-slate-500">No one to pay right now.</p>
            ) : (
              <ul className="space-y-1.5">
                {owes.map((row) => (
                  <li
                    key={row.to || row.name}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-xs"
                  >
                    <span className="font-medium text-slate-800">
                      {row.name || "Unknown"}
                    </span>
                    <span className="text-red-600">
                      -${fmtMoney(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* You’re owed */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                <FiArrowDownLeft className="h-3.5 w-3.5" />
                <span>You’re owed</span>
              </div>
              <span className="text-xs text-slate-500">
                {owedBy.length} person{owedBy.length === 1 ? "" : "s"}
              </span>
            </div>

            {owedBy.length === 0 ? (
              <p className="text-xs text-slate-500">
                No one owes you at the moment.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {owedBy.map((row) => (
                  <li
                    key={row.from || row.name}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-xs"
                  >
                    <span className="font-medium text-slate-800">
                      {row.name || "Unknown"}
                    </span>
                    <span className="text-green-700">
                      +${fmtMoney(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
