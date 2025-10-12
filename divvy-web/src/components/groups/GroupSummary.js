// components/groups/GroupSummary.jsx
"use client";

/**
 * GroupSummary — two-panel summary (You owe / Owed to you) with a net chip.
 * - Scrolls when items exceed panel height.
 * - Consistent with Divsez UI (rounded, clean, gradient, scroll shadow).
 */

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";
const currencyFmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: CURRENCY,
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 2,
});

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

function normalizeEdgesInput(input) {
  let arr = [];
  if (Array.isArray(input)) {
    arr = input;
  } else if (input && typeof input === "object") {
    const keys = [
      "all",
      "youOwe",
      "owedToYou",
      "othersOweEachOther",
      "settlements",
    ];
    for (const k of keys) {
      if (Array.isArray(input[k])) arr.push(...input[k]);
    }
  }

  return arr
    .map((e) => {
      const from =
        e?.from?._id ||
        e?.from?.id ||
        e?.fromId ||
        e?.debtor ||
        e?.payer ||
        e?.from;
      const to =
        e?.to?._id ||
        e?.to?.id ||
        e?.toId ||
        e?.creditor ||
        e?.receiver ||
        e?.to;
      if (!from || !to) return null;

      const amount = Number(e?.amount ?? e?.total ?? e?.value ?? 0);

      const fromName =
        e?.fromName ||
        e?.debtorName ||
        e?.payerName ||
        e?.fromUser?.username ||
        e?.fromUser?.name ||
        (typeof e?.from === "object"
          ? e.from.username || e.from.name || e.from.email
          : String(from));

      const toName =
        e?.toName ||
        e?.creditorName ||
        e?.receiverName ||
        e?.toUser?.username ||
        e?.toUser?.name ||
        (typeof e?.to === "object"
          ? e.to.username || e.to.name || e.to.email
          : String(to));

      return {
        from: String(from),
        to: String(to),
        amount,
        fromName,
        toName,
      };
    })
    .filter(Boolean);
}

export default function GroupSummary({ currentUserId, settlements = [] }) {
  const idEq = (a, b) => String(a) === String(b);
  const edges = normalizeEdgesInput(settlements);

  const youOwe = edges
    .filter((e) => idEq(e.from, currentUserId))
    .map((e) => ({
      id: String(e.to),
      name: e.toName || String(e.to),
      amountNum: Number(e.amount || 0),
    }));

  const owedToYou = edges
    .filter((e) => idEq(e.to, currentUserId))
    .map((e) => ({
      id: String(e.from),
      name: e.fromName || String(e.from),
      amountNum: Number(e.amount || 0),
    }));

  const totals = {
    owe: youOwe.reduce((s, r) => s + r.amountNum, 0),
    owed: owedToYou.reduce((s, r) => s + r.amountNum, 0),
  };
  const net = +(totals.owed - totals.owe).toFixed(2);

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
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ${netChipClass}`}
          title="Owed to you − You owe"
        >
          Net: {currencyFmt.format(net)}
        </span>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Panel
          title="You owe"
          total={currencyFmt.format(totals.owe)}
          emptyText="Nothing to pay right now."
          items={youOwe}
          pillBg="bg-rose-50"
          pillText="text-rose-700"
        />
        <Panel
          title="Owed to you"
          total={currencyFmt.format(totals.owed)}
          emptyText="No one owes you yet."
          items={owedToYou}
          pillBg="bg-emerald-50"
          pillText="text-emerald-700"
        />
      </div>
    </section>
  );
}

/* ---------- Panels ---------- */
function Panel({
  title,
  total,
  emptyText,
  items,
  pillBg = "bg-slate-50",
  pillText = "text-slate-700",
}) {
  const maxHeight = "max-h-64"; // about 10 items visible before scroll
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-sm font-semibold text-slate-900">{total}</span>
      </div>

      {items.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <div className={`${maxHeight} overflow-y-auto pr-1 scroll-smooth`}>
          <ul className="space-y-2">
            {items.map((it) => (
              <Row key={it.id} item={it} pillBg={pillBg} pillText={pillText} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------- Rows ---------- */
function Row({ item, pillBg, pillText }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg px-1 py-0.5 hover:bg-slate-50 transition">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
          aria-hidden="true"
        >
          {initials(item.name)}
        </div>
        <span className="truncate text-sm text-slate-800">{item.name}</span>
      </div>
      <span
        className={`shrink-0 rounded-md ${pillBg} px-2 py-0.5 text-sm font-semibold ${pillText}`}
      >
        {currencyFmt.format(item.amountNum)}
      </span>
    </li>
  );
}
