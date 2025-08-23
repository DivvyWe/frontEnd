// app/groups/[groupId]/page.js
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export default async function GroupPage({ params, searchParams }) {
  const { groupId } = params;
  const sort = searchParams?.sort || "new"; // "new" | "old" | "amtAsc" | "amtDesc"

  // Build absolute base URL (SSR-safe)
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  // Forward cookies so the proxy can read `token`
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const common = {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  };

  const [groupRes, summaryRes, expensesRes] = await Promise.all([
    fetch(`${base}/api/proxy/groups/${groupId}`, common).catch(() => null),
    fetch(`${base}/api/proxy/groups/${groupId}/summary`, common).catch(
      () => null
    ),
    fetch(`${base}/api/proxy/expenses/group/${groupId}`, common).catch(
      () => null
    ),
  ]);

  if (
    !groupRes ||
    !summaryRes ||
    !expensesRes ||
    [401, 403].includes(groupRes?.status) ||
    [401, 403].includes(summaryRes?.status) ||
    [401, 403].includes(expensesRes?.status)
  ) {
    redirect("/auth/signin");
  }

  let group = null;
  let settlements = [];
  let expenses = [];
  try {
    const g = await groupRes.json();
    group = g?.group || g || null;
  } catch {}
  try {
    const s = await summaryRes.json();
    settlements = s?.settlements || [];
  } catch {}
  try {
    const e = await expensesRes.json();
    expenses = e?.expenses || [];
  } catch {}

  // Sort expenses
  const sorted = [...expenses];
  sorted.sort((a, b) => {
    if (sort === "old") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === "amtAsc") return (a.amount || 0) - (b.amount || 0);
    if (sort === "amtDesc") return (b.amount || 0) - (a.amount || 0);
    return new Date(b.createdAt) - new Date(a.createdAt); // "new"
  });

  const hasBalances = settlements.length > 0;
  const hasExpenses = sorted.length > 0;

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-slate-900">
            {group?.name || "Group"}
          </h1>
          <p className="text-sm text-slate-500">Group details & activity</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/groups/${groupId}/new-expense`}
            className="rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-semibold text-white hover:bg-[#76b514]"
          >
            Add expense
          </Link>
        </div>
      </div>

      {/* Owe each other */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Owe each other
          </h2>
        </div>

        {hasBalances ? (
          <ul className="divide-y divide-slate-100">
            {settlements.map((s, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700">
                  <span className="font-medium">{s.fromName}</span> →{" "}
                  <span className="font-medium">{s.toName}</span>
                </span>
                <span className="rounded-md bg-slate-50 px-2 py-0.5 text-sm font-semibold text-slate-900">
                  {fmt(s.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-slate-400">All settled</div>
        )}
      </section>

      {/* Expenses */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Expenses</h2>

          {/* Sort dropdown (icon) */}
          <details className="relative">
            <summary
              className="list-none rounded-md p-1.5 hover:bg-slate-100 focus:outline-none"
              aria-label="Sort"
            >
              {/* funnel icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="text-slate-700"
              >
                <path fill="currentColor" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
              </svg>
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
              {[
                { key: "new", label: "Newest" },
                { key: "old", label: "Oldest" },
                { key: "amtDesc", label: "Amount ↓" },
                { key: "amtAsc", label: "Amount ↑" },
              ].map((opt) => (
                <Link
                  key={opt.key}
                  href={`/groups/${groupId}?sort=${opt.key}`}
                  scroll={false}
                  className={`block px-3 py-2 text-sm ${
                    sort === opt.key
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </details>
        </div>

        {hasExpenses ? (
          <ul className="divide-y divide-slate-100">
            {sorted.map((ex) => (
              <li key={ex._id}>
                <Link
                  href={`/expenses/${groupId}/${ex._id}`}
                  className="flex items-center justify-between gap-3 py-3 no-underline"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {ex.description}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(ex.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-slate-900">
                      {fmt(ex.amount)}
                    </div>
                    {/* chevron */}
                    <div className="ml-auto flex justify-end text-slate-400">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path fill="currentColor" d="M9 6l6 6-6 6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-slate-400">No expenses yet.</div>
        )}
      </section>
    </div>
  );
}
