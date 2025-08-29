// src/app/expenses/[groupId]/add/page.js
import Link from "next/link";
import AddExpenseForm from "@/components/expense/AddExpenseForm";

export const dynamic = "force-dynamic";

export default async function ExpenseAddPage({ params }) {
  const { groupId } = params || {};

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Add Expense</h1>
        <Link
          href={`/groups/${groupId}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to group
        </Link>
      </div>

      <AddExpenseForm groupId={groupId} />
    </div>
  );
}
