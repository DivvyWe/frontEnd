import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import ExpenseTopBar from "@/components/expense/ExpenseTopBar";
import ExpenseHeaderCard from "@/components/expense/ExpenseHeaderCard";

export const dynamic = "force-dynamic";
const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export default async function ExpensePage({ params }) {
  const { groupId, expenseId } = params;

  // --- logs ---
  console.log(" Server  [expense/page] params:", { groupId, expenseId });

  // Build absolute base URL
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  // Forward cookies for auth
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const common = {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  };

  const apiUrl = `${base}/api/proxy/expenses/${groupId}/expense/${expenseId}`;
  console.log(" Server  [expense/page] fetching:", apiUrl);

  const res = await fetch(apiUrl, common).catch((e) => {
    console.log(" Server  [expense/page] fetch error:", e?.message || e);
    return null;
  });

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
  } catch (e) {
    console.log(" Server  [expense/page] JSON parse error:", e?.message || e);
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

  // derive status: paid if every split fully covered
  const splits = Array.isArray(expense.splits) ? expense.splits : [];
  const allPaid = splits.length
    ? splits.every((s) => {
        const paid = (s.payments || []).reduce(
          (sum, p) => sum + (p.amount || 0),
          0
        );
        return paid >= (s.amount || 0);
      })
    : false;

  return (
    <div className="mx-auto max-w-screen-lg px-4 sm:px-6 py-4 sm:py-6 space-y-4">
      {/* Top bar (under your existing navbar) */}
      <ExpenseTopBar groupId={groupId} expenseId={expenseId} />

      {/* Content grid: header on left; sidebar reserved for comments later */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <ExpenseHeaderCard
            title={expense.description || "Expense"}
            createdAt={expense.createdAt}
            amount={expense.amount}
            status={allPaid ? "paid" : "pending"}
            splitType={expense.splitType || "equal"}
          />

          {/* PLACEHOLDERS (we'll fill these in next steps) */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-slate-900">Who paid</h2>
            {/* ... your contributors list remains here for now ... */}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-slate-900">Who owes</h2>
            {/* ... your splits list remains here for now ... */}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
            <div className="text-xs text-slate-400">No activity yet.</div>
          </section>

          <div className="flex justify-between pt-2">
            <Link
              href={`/groups/${groupId}`}
              className="text-sm font-medium text-[#84CC16]"
            >
              ← Back to group
            </Link>
            <Link
              href={`/expenses/add?groupId=${groupId}`}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Add expense
            </Link>
          </div>
        </div>

        {/* Sidebar (reserved for Comments panel; sticky on desktop) */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-20 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <h2 className="text-sm font-semibold text-slate-900">Comments</h2>
            <div className="text-xs text-slate-400">Coming next.</div>
          </div>
        </aside>
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
        href={`/groups/${groupId}`}
        className="inline-flex items-center text-sm font-medium text-[#84CC16]"
      >
        ← Back to group
      </Link>
    </div>
  );
}
