// src/app/expenses/[groupId]/add/page.js
import Link from "next/link";
import AddExpenseForm from "@/components/expenses/AddExpenseForm"; // adjust if your path is singular

export const dynamic = "force-dynamic";

export default function ExpenseAddPage({ params }) {
  const groupId = params?.groupId;

  if (!groupId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
          Invalid group link. Please access this page from a valid group.
        </div>
        <Link
          href="/groups"
          className="inline-block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Go to My Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Add Expense</h1>
      </div>

      <AddExpenseForm groupId={groupId} />
    </div>
  );
}
