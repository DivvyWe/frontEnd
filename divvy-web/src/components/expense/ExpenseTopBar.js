import Link from "next/link";

export default function ExpenseTopBar({ groupId }) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/groups/${groupId}`}
        aria-label="Back to group"
        className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M15 18l-6-6 6-6" />
        </svg>
        <span className="text-sm font-medium">Back</span>
      </Link>

      <details className="relative">
        <summary
          aria-label="Actions"
          className="list-none rounded-md p-1.5 hover:bg-slate-100 cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="text-slate-700"
          >
            <path
              fill="currentColor"
              d="M12 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z"
            />
          </svg>
        </summary>
        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <button className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
            Edit expense
          </button>
          <button className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">
            Delete
          </button>
        </div>
      </details>
    </div>
  );
}
