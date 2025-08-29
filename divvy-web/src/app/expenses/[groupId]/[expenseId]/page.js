// app/expenses/[groupId]/[expenseId]/page.js
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import ExpenseTopBar from "@/components/expense/ExpenseTopBar";
import ExpenseHeaderCard from "@/components/expense/ExpenseHeaderCard";
import ExpenseMessages from "@/components/expense/ExpenseMessages";

export const dynamic = "force-dynamic";
const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

// helpers for names/avatars
const getId = (u) => (typeof u === "object" ? u?._id : u);
const toTitle = (s) =>
  String(s || "")
    .replace(/[_\-.]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
const displayName = (user) => {
  if (!user) return "Unknown";
  if (user.displayName) return toTitle(user.displayName);
  if (user.username) return toTitle(user.username);
  if (user.email) return toTitle(user.email.split("@")[0]);
  return String(getId(user)).slice(-6);
};
const initials = (name) => {
  const parts = String(name).trim().split(/\s+/);
  const a = (parts[0] || "").charAt(0);
  const b = (parts[1] || "").charAt(0);
  return (a + b || a || "?").toUpperCase();
};
function Avatar({ name, title }) {
  return (
    <span
      className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 ring-2 ring-white"
      title={title || name}
    >
      {initials(name)}
    </span>
  );
}

export default async function ExpensePage(props) {
  // In this Next version, params is a Promise
  const { groupId, expenseId } = await props.params;

  if (!groupId || !expenseId) {
    return (
      <ErrorBlock
        groupId={groupId || ""}
        title="Invalid URL"
        sub="Missing group or expense ID in the route."
      />
    );
  }

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

  // Fetch expense
  const apiUrl = `${base}/api/proxy/expenses/${groupId}/expense/${expenseId}`;
  let res;
  try {
    res = await fetch(apiUrl, common);
  } catch {
    res = null;
  }

  if (!res)
    return (
      <ErrorBlock
        groupId={groupId}
        title="Network error"
        sub="Couldn’t reach the server."
      />
    );

  if ([401, 403].includes(res.status)) redirect("/auth/signin");
  if (res.status === 404)
    return (
      <ErrorBlock
        groupId={groupId}
        title="Expense not found"
        sub="This expense may have been deleted or the URL is incorrect."
      />
    );

  let expense = null;
  try {
    const data = await res.json();
    expense = data?.expense || data || null;
  } catch {
    expense = null;
  }

  if (!expense || !expense._id) {
    return (
      <ErrorBlock
        groupId={groupId}
        title="Couldn’t load this expense"
        sub="We couldn’t parse the server response."
      />
    );
  }

  const splits = Array.isArray(expense.splits) ? expense.splits : [];
  const allPaid = false; // per-expense payments aren’t tracked; keep pending

  return (
    <div className="mx-auto max-w-screen-lg px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      <ExpenseTopBar groupId={groupId} expenseId={expenseId} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Main column now full width */}
        <div className="lg:col-span-12 space-y-4">
          <ExpenseHeaderCard
            expense={expense}
            status={allPaid ? "paid" : "pending"}
          />

          {/* Who paid */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-slate-900">Who paid</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {(expense.contributors || []).map((c) => {
                const name = displayName(c.user);
                return (
                  <li
                    key={c._id || `${getId(c.user)}-${c.amount}`}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={name} />
                      <span className="text-slate-700 truncate">{name}</span>
                    </div>
                    <span className="font-medium shrink-0">
                      {fmt(c.amount)}
                    </span>
                  </li>
                );
              })}
              {!expense.contributors?.length && (
                <li className="text-xs text-slate-500 italic">
                  No contributors.
                </li>
              )}
            </ul>
          </section>

          {/* Who owes (no per-expense payment progress) */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-slate-900">Who owes</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {splits.map((s) => {
                const name = displayName(s.user);
                return (
                  <li
                    key={s._id || `${getId(s.user)}-${s.amount}`}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={name} />
                      <span className="text-slate-700 truncate">{name}</span>
                    </div>
                    <span className="font-medium shrink-0">
                      Owes {fmt(s.amount)}
                    </span>
                  </li>
                );
              })}
              {!splits.length && (
                <li className="text-xs text-slate-500 italic">No splits.</li>
              )}
            </ul>
          </section>

          {/* Messages */}
          <ExpenseMessages expenseId={expenseId} />

          <div className="flex justify-between pt-2">
            <Link
              href={`/groups/${groupId}`}
              className="text-sm font-medium text-[#84CC16]"
            >
              ← Back to group
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBlock({ groupId, title, sub }) {
  return (
    <div className="mx-auto max-w-screen-sm px-4 sm:px-6 py-6 space-y-4">
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        <div className="font-semibold">{title}</div>
        {sub ? <div className="mt-1 text-rose-700/90">{sub}</div> : null}
      </div>
      <Link
        href={groupId ? `/groups/${groupId}` : "/groups"}
        className="inline-flex items-center text-sm font-medium text-[#84CC16]"
      >
        ← Back to group
      </Link>
    </div>
  );
}
