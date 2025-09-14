// src/components/groups/GroupListCard.jsx
import Link from "next/link";
import GroupActions from "@/components/groups/GroupActions";
// import GroupMembersRow from "@/components/groups/GroupMembersRow";

const fmtMoneyPlain = (n) => {
  const x = Number(n) || 0;
  return Number.isInteger(x) ? String(x) : x.toFixed(2);
};

const titleCase = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

function NetBadge({ net = 0 }) {
  const n = Number(net) || 0;
  const cls =
    n > 0
      ? "bg-green-100 text-green-700"
      : n < 0
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-500";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
      title="Net = Owed to you − You owe"
    >
      {n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2)}
    </span>
  );
}

function SettledBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
      All settled
    </span>
  );
}

function DebtRow({ left, right, variant }) {
  const cls =
    variant === "owe" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700";
  return (
    <div
      className={`flex items-center justify-between rounded-md px-2 py-1 text-sm ${cls}`}
    >
      <span className="font-medium">{left}</span>
      <span>{right}</span>
    </div>
  );
}

export default function GroupListCard({ g, onDeleted }) {
  const youOwe = g?.youOwe || [];
  const owedToYou = g?.owedToYou || [];
  const hasAnyDebt = youOwe.length > 0 || owedToYou.length > 0;

  return (
    <li className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* More / Delete menu */}
      <div className="absolute right-2 top-2 z-10">
        <GroupActions id={g._id} name={g?.name} onDeleted={onDeleted} />
      </div>

      <Link
        href={`/groups/${g._id}`}
        className="block rounded-2xl p-4 transition hover:bg-slate-50 focus:outline-none"
      >
        {/* header */}
        <div className="mb-3 flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {g.name ? titleCase(g.name) : "Untitled Group"}
            </h3>
            {g.updatedAt && (
              <div className="text-xs text-slate-600">
                Updated {new Date(g.updatedAt).toLocaleString()}
              </div>
            )}
          </div>
          <NetBadge net={g?.totals?.net || 0} />
        </div>

        {/* members row if you want it */}
        {/* <GroupMembersRow members={g?.members || []} label="Members" /> */}

        {/* debts / settled */}
        <div className="mt-3">
          {hasAnyDebt ? (
            <div className="grid gap-1">
              {/* You owe: YOU are debtor → show CREDITOR (toName) */}
              {youOwe.map((row, i) => (
                <DebtRow
                  key={`yo-${i}`}
                  variant="owe"
                  left={`You → ${row.toName || row.to || "Member"}`}
                  right={fmtMoneyPlain(row.amount)}
                />
              ))}

              {/* Owed to you: YOU are creditor → show DEBTOR (fromName) */}
              {owedToYou.map((row, i) => (
                <DebtRow
                  key={`oy-${i}`}
                  variant="owed"
                  left={`${row.fromName || row.from || "Member"} → You`}
                  right={fmtMoneyPlain(row.amount)}
                />
              ))}
            </div>
          ) : (
            <SettledBadge />
          )}
        </div>
      </Link>
    </li>
  );
}
