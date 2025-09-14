// src/app/expenses/[groupId]/[expenseId]/edit/page.js
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import ExpenseTopBar from "@/components/expense/ExpenseTopBar";
import AddExpenseForm from "@/components/expense/AddExpenseForm";

function getBaseUrl() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) throw new Error("Missing host header");
  return `${proto}://${host}`;
}

async function getExpense(groupId, expenseId) {
  const base = getBaseUrl();
  const url = `${base}/api/proxy/expenses/${groupId}/expense/${expenseId}`;

  // Forward cookies for auth
  const cookieHeader = cookies().toString(); // includes your session/jwt cookie(s)

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      // critical: pass cookies through to the API route
      Cookie: cookieHeader,
    },
  });

  if (!res.ok) {
    // If API returned HTML (error page), avoid JSON parse crash
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json().catch(() => ({}));
      const msg = j?.message || `Failed to fetch expense (HTTP ${res.status})`;
      throw new Error(msg);
    } else {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to fetch expense (HTTP ${res.status})`);
    }
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error("Expected JSON but got non-JSON response");
  }

  const json = await res.json().catch(() => null);
  return json?.expense || json;
}

export default async function EditExpensePage({ params }) {
  const { groupId, expenseId } = params || {};
  if (!groupId || !expenseId) notFound();

  let expense;
  try {
    expense = await getExpense(groupId, expenseId);
  } catch (e) {
    console.error("Edit expense fetch error:", e);
    notFound();
  }

  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <ExpenseTopBar groupId={groupId} expenseId={expenseId} />
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Edit expense</h1>
        <p className="text-sm text-slate-600">
          Update the description, amount, split, and contributors.
        </p>
      </header>
      <AddExpenseForm
        groupId={groupId}
        mode="edit"
        expenseId={expenseId}
        initialData={expense}
      />
    </div>
  );
}
