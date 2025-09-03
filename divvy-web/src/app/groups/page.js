// src/app/groups/page.js
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewGroupButton from "@/components/NewGroupButton";

export const dynamic = "force-dynamic";

// money like "40" or "40.50" (no $ symbol for compact rows)
const fmtMoneyPlain = (n) => {
  const x = Number(n) || 0;
  return Number.isInteger(x) ? String(x) : x.toFixed(2);
};

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
  // variant: 'owe' (you pay) -> red, 'owed' (they pay you) -> green
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

function GroupCard({ g }) {
  const youOwe = g?.youOwe || [];
  const owedToYou = g?.owedToYou || [];
  const hasAnyDebt = youOwe.length > 0 || owedToYou.length > 0;

  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Link
        href={`/groups/${g._id}`}
        className="block rounded-xl p-4 transition hover:bg-slate-50 focus:outline-none"
      >
        {/* header */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
            {g.name || "Untitled group"}
          </h3>
          <NetBadge net={g?.totals?.net || 0} />
        </div>

        {/* compact debts OR settled badge */}
        {hasAnyDebt ? (
          <div className="grid gap-1">
            {youOwe.map((row, i) => (
              <DebtRow
                key={`yo-${i}`}
                variant="owe"
                left={`You → ${row.toName}`}
                right={fmtMoneyPlain(row.amount)}
              />
            ))}
            {owedToYou.map((row, i) => (
              <DebtRow
                key={`oy-${i}`}
                variant="owed"
                left={`${row.fromName} → You`}
                right={fmtMoneyPlain(row.amount)}
              />
            ))}
          </div>
        ) : (
          <SettledBadge />
        )}
      </Link>
    </li>
  );
}

export default async function GroupsPage() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const common = {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  };

  const urlUser = `${base}/api/proxy/user/groups`; // new API
  const urlOld = `${base}/api/proxy/groups`; // legacy fallback

  let res = await fetch(urlUser, common).catch(() => null);
  if (!res || res.status === 404)
    res = await fetch(urlOld, common).catch(() => null);

  if (!res) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-800">Your groups</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not reach the server.
        </div>
      </div>
    );
  }

  if (res.status === 401 || res.status === 403) redirect("/auth/signin");

  let raw;
  try {
    raw = await res.json();
  } catch {}

  // New shape
  const created = Array.isArray(raw?.createdGroups) ? raw.createdGroups : [];
  const joined = Array.isArray(raw?.joinedGroups) ? raw.joinedGroups : [];

  // Legacy fallback
  let legacy = [];
  if (Array.isArray(raw?.groups)) legacy = raw.groups;
  else if (Array.isArray(raw?.data?.groups)) legacy = raw.data.groups;

  // Merge + dedupe by _id; prefer objects that already include summaries
  const map = new Map();
  for (const g of [...created, ...joined, ...legacy]) {
    if (!g || !g._id) continue;
    const prev = map.get(g._id);
    map.set(g._id, { ...(prev || {}), ...g });
  }
  const groups = Array.from(map.values()).sort((a, b) => {
    const au = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bu = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bu - au;
  });

  const hasGroups = groups.length > 0;

  return (
    <div className="space-y-6">
      {/* header + action */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Your groups</h1>
          <p className="text-slate-600">
            Create a group to start splitting expenses.
          </p>
        </div>
        <NewGroupButton className="inline-flex items-center justify-center rounded-lg bg-[#84CC16] px-4 py-2.5 font-semibold text-white hover:bg-[#76b514] active:scale-[0.99]" />
      </div>

      {/* groups grid */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        {hasGroups ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <GroupCard key={g._id} g={g} />
            ))}
          </ul>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-10 text-center">
            <p className="text-slate-600">No groups yet.</p>
            <NewGroupButton className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#84CC16] px-4 py-2.5 font-semibold text-white hover:bg-[#76b514]" />
          </div>
        )}
      </div>
    </div>
  );
}
