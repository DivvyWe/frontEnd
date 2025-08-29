// components/groups/GroupExpenses.jsx
import Link from "next/link";

export default function GroupExpenses({ groupId, sort, expenses = [], fmt }) {
  const hasExpenses = expenses.length > 0;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Expenses</h2>

        {/* Sort dropdown */}
        <details className="relative">
          <summary
            className="list-none rounded-md p-1.5 hover:bg-slate-100 focus:outline-none"
            aria-label="Sort"
          >
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
          {expenses.map((ex) => (
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
  );
}
