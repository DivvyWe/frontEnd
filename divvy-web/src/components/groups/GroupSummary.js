// components/groups/GroupSummary.jsx
// Redesigned two-panel summary with net-status chip and initial avatars.

const defaultFmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

export default function GroupSummary({
  currentUserId,
  settlements = [],
  fmt = defaultFmt,
}) {
  const youOwe = (settlements || []).filter(
    (s) => String(s.from) === String(currentUserId)
  );
  const owedToYou = (settlements || []).filter(
    (s) => String(s.to) === String(currentUserId)
  );

  const youOweTotal = youOwe.reduce((sum, s) => sum + (s.amount || 0), 0);
  const youAreOwedTotal = owedToYou.reduce(
    (sum, s) => sum + (s.amount || 0),
    0
  );
  const net = youAreOwedTotal - youOweTotal; // >0 means you're net positive

  const netLabel =
    net === 0
      ? "All settled"
      : net > 0
      ? `Net +${fmt(net)} to receive`
      : `Net ${fmt(Math.abs(net))} to pay`;

  const netChipClass =
    net === 0
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : net > 0
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : "bg-rose-100 text-rose-800 ring-rose-200";

  return (
    <section className="rounded-2xl bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm ring-1 ring-black/5">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">Your summary</h2>
        <span
          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${netChipClass}`}
          aria-label="Net position"
        >
          {netLabel}
        </span>
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* You owe */}
        <div className="rounded-xl border border-rose-100 bg-white/60 p-3 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              You owe
            </h3>
            <div className="text-xs font-medium text-rose-800">
              {fmt(youOweTotal)}
            </div>
          </div>

          {youOwe.length ? (
            <ul className="divide-y divide-rose-100/70">
              {youOwe.map((s, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-800 text-xs font-semibold">
                      {initials(s.toName)}
                    </div>
                    <span className="truncate text-sm text-slate-800">
                      {s.toName}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md bg-rose-50 px-2 py-0.5 text-sm font-semibold text-rose-800">
                    {fmt(s.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700/80">
              Nothing to pay.
            </div>
          )}
        </div>

        {/* Owed to you */}
        <div className="rounded-xl border border-emerald-100 bg-white/60 p-3 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Owed to you
            </h3>
            <div className="text-xs font-medium text-emerald-800">
              {fmt(youAreOwedTotal)}
            </div>
          </div>

          {owedToYou.length ? (
            <ul className="divide-y divide-emerald-100/70">
              {owedToYou.map((s, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                      {initials(s.fromName)}
                    </div>
                    <span className="truncate text-sm text-slate-800">
                      {s.fromName}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-sm font-semibold text-emerald-800">
                    {fmt(s.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700/80">
              No one owes you.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
