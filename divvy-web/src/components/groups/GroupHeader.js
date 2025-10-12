// components/groups/GroupHeader.js
import Link from "next/link";
import { Settings } from "lucide-react";

export default function GroupHeader({ groupName, groupId, isMember = false }) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold text-slate-900">
          {groupName}
        </h1>
        <p className="text-sm text-slate-500">Group details & activity</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Add expense */}
        <Link
          href={`/expenses/${groupId}/add`}
          className="rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-semibold text-white hover:bg-[#76b514] transition-colors"
        >
          Add expense
        </Link>

        {/* Settle up */}
        <Link
          href={`/groups/${groupId}/settle`}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          Settle up
        </Link>

        {/* Settings (member-only) */}
        {isMember && (
          <Link
            href={`/groups/${groupId}?settings=1`}
            prefetch={false}
            aria-label="Open group settings"
            title="Settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
        )}
      </div>
    </header>
  );
}
