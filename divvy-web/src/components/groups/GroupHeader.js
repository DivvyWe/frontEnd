// components/groups/GroupHeader.js
import Link from "next/link";

export default function GroupHeader({ groupName, groupId }) {
  return (
    <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold text-slate-900">
          {groupName}
        </h1>
        <p className="text-sm text-slate-500">Group details & activity</p>
      </div>

      <div className="flex items-center gap-2">
        {/* ✅ updated link */}
        <Link
          href={`/expenses/${groupId}/add`}
          className="rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-semibold text-white hover:bg-[#76b514] transition-colors"
        >
          Add expense
        </Link>

        <Link
          href={`/expenses/${groupId}/settle`}
          className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600 transition-colors"
        >
          Settle up
        </Link>
      </div>
    </header>
  );
}
