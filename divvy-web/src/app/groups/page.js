// src/app/groups/page.js
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewGroupButton from "@/components/NewGroupButton";

export const dynamic = "force-dynamic";

const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// helper

function GroupCard({ g }) {
  const hasAnyDebt =
    (g?.youOwe?.length || 0) > 0 || (g?.owedToYou?.length || 0) > 0;

  const net = Number(g?.totals?.net || 0);
  const netClass =
    net > 0
      ? "bg-green-100 text-green-700"
      : net < 0
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-500";

  return (
    <li
      key={g._id}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <Link
        href={`/groups/${g._id}`}
        className="block rounded-xl p-4 transition hover:bg-slate-50 focus:outline-none"
      >
        {/* Header (name + net) */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
            {g.name || "Untitled group"}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${netClass}`}
            title="Net = Owed to you − You owe"
          >
            {net > 0 ? `+${net.toFixed(2)}` : net.toFixed(2)}
          </span>
        </div>

        {/* Debts list (only if needed) */}
        {hasAnyDebt ? (
          <div className="mt-3 space-y-2">
            {/* Others → You */}
            {g?.owedToYou?.length ? (
              <ul className="space-y-1">
                {g.owedToYou.map((row, i) => (
                  <li
                    key={`oy-${i}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700">
                      <span className="font-medium">{row.fromName}</span> → You
                    </span>
                    <span className="rounded-md bg-green-50 px-2 py-0.5 text-green-700">
                      {fmt(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* You → Others */}
            {g?.youOwe?.length ? (
              <ul className="space-y-1">
                {g.youOwe.map((row, i) => (
                  <li
                    key={`yo-${i}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700">
                      You → <span className="font-medium">{row.toName}</span>
                    </span>
                    <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-700">
                      {fmt(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-400">All settled</div>
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

  const urlUser = `${base}/api/proxy/user/groups`;
  const urlOld = `${base}/api/proxy/groups`;

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

  let groups = [];
  if (Array.isArray(raw)) groups = raw;
  else if (raw?.groups && Array.isArray(raw.groups)) groups = raw.groups;
  else if (raw?.data?.groups && Array.isArray(raw.data.groups))
    groups = raw.data.groups;

  const hasGroups = Array.isArray(groups) && groups.length > 0;

  return (
    <div className="space-y-6">
      {/* header + actions */}
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
