// components/groups/GroupHeader.js
import Link from "next/link";
import { Settings } from "lucide-react";

export default function GroupHeader({
  groupName,
  groupId,
  isMember = false,
  currency, // ✅ NEW PROP
}) {
  return (
    <header className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Row 1: Title + Settings (mobile-only) */}
      <div className="flex w-full items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold text-slate-900">
            {groupName}
          </h1>

          {/* 👇 NEW: Currency display */}
          <p className="text-sm text-slate-500">
            Group details & activity
            {currency ? (
              <span className="ml-2 text-xs text-slate-400">
                • Currency: <span className="font-medium">{currency}</span>
              </span>
            ) : null}
          </p>
        </div>

        {/* ⚙️ Mobile-only settings icon */}
        {isMember && (
          <Link
            href={`/groups/${groupId}?settings=1`}
            prefetch={false}
            aria-label="Open group settings"
            title="Settings"
            className="ml-3 inline-flex h-10 w-10 shrink-0 flex-none items-center justify-center rounded-full border-2 border-slate-400 bg-transparent text-slate-700 hover:border-[#84CC16] hover:text-[#84CC16] transition-all sm:hidden"
          >
            <Settings className="h-5 w-5" strokeWidth={2} />
          </Link>
        )}
      </div>

      {/* Row 2: Buttons (desktop shows circular settings icon) */}
      <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
        <Link
          href={`/expenses/${groupId}/add`}
          className="flex-1 sm:flex-none rounded-lg bg-[#84CC16] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[#76b514] transition-colors"
        >
          Add expense
        </Link>

        <Link
          href={`/groups/${groupId}/settle`}
          className="flex-1 sm:flex-none rounded-md bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          Settle up
        </Link>

        {/* ⚙️ Desktop-only circular settings button */}
        {isMember && (
          <Link
            href={`/groups/${groupId}?settings=1`}
            prefetch={false}
            aria-label="Open group settings"
            title="Settings"
            className="hidden sm:inline-flex h-10 w-10 shrink-0 flex-none items-center justify-center rounded-full border-2 border-slate-400 bg-transparent text-slate-700 hover:border-[#84CC16] hover:text-[#84CC16] transition-all"
          >
            <Settings className="h-5 w-5" strokeWidth={2} />
          </Link>
        )}
      </div>
    </header>
  );
}
