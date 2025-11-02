// src/components/expenses/GroupContextHeader.jsx
"use client";

import Link from "next/link";
import {
  FiUsers,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronRight,
} from "react-icons/fi";

export default function GroupContextHeader({
  // current group
  group = null, // { _id, name }
  isMember = true, // gate UI if needed

  // optional: allow changing group
  allowChange = false,
  groups = [], // [{ _id, name }]
  onChangeGroup, // (groupId) => void

  // members state
  members = [], // [{_id, username, ...}]
  membersLoading = false,
  membersError = "",

  // actions
  onRefreshMembers, // () => void

  // misc
  compact = false,
}) {
  const memberCount = members?.length ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      {/* Top row */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: group badge / selector */}
        <div className="min-w-0">
          {allowChange ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">
                Group
              </label>
              <select
                className="w-56 truncate rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25"
                value={group?._id || ""}
                onChange={(e) => onChangeGroup?.(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {group?._id ? (
                <Link
                  href={`/groups/${group._id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Open
                  <FiChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-800">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#84CC16]" />
                {group?.name || "No group"}
              </span>
              {group?._id ? (
                <Link
                  href={`/groups/${group._id}`}
                  className="text-xs text-slate-600 underline-offset-2 hover:underline"
                >
                  View group
                </Link>
              ) : null}
            </div>
          )}

          {/* Not a member hint */}
          {!isMember ? (
            <div className="mt-1 text-xs text-red-600">
              You’re not a member of this group. You can’t add expenses here.
            </div>
          ) : null}
        </div>

        {/* Right: members summary + refresh */}
        <div className="flex items-center gap-2">
          <div
            className={[
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
              membersLoading
                ? "border-slate-200 bg-slate-50 text-slate-600"
                : "border-slate-200 bg-white text-slate-700",
            ].join(" ")}
            title="Members in group"
          >
            <FiUsers className="h-3.5 w-3.5" />
            <span className="tabular-nums">{memberCount}</span>
            <span className="hidden sm:inline">members</span>
          </div>

          <button
            type="button"
            onClick={onRefreshMembers}
            disabled={membersLoading}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            aria-label="Refresh members"
            title="Refresh members"
          >
            <FiRefreshCw
              className={["h-4 w-4", membersLoading ? "animate-spin" : ""].join(
                " "
              )}
            />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {membersError ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="whitespace-pre-line">{membersError}</span>
        </div>
      ) : null}

      {/* Compact extra row: show a tiny list preview */}
      {!compact && memberCount > 0 ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {members.slice(0, 8).map((m) => (
              <span
                key={m._id}
                className="truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                title={m.username}
              >
                {m.username}
              </span>
            ))}
            {memberCount > 8 ? (
              <span className="text-xs text-slate-500">
                +{memberCount - 8} more
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
