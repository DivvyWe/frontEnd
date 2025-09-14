// src/components/groups/GroupMembersRow.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AvatarCircle from "@/components/ui/AvatarCircle";
import AddMemberModal from "@/components/groups/AddMemberModal";

const toTitle = (s) =>
  String(s || "")
    .replace(/[_\-.]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const getId = (u) => (typeof u === "object" ? u?._id : u);
const displayName = (user) => {
  if (!user) return "Unknown";
  if (user.displayName) return toTitle(user.displayName);
  if (user.username) return toTitle(user.username);
  if (user.name) return toTitle(user.name);
  if (user.email) return toTitle(user.email.split("@")[0]);
  return String(getId(user)).slice(-6);
};

export default function GroupMembersRow({
  members = [],
  label = "Members",
  groupId,
  canManage = false,
  maxAvatars = 5,
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const objs = (Array.isArray(members) ? members : []).filter(
    (m) => m && typeof m === "object"
  );

  const names = objs.map((m) => displayName(m));
  const fullTitle = names.join(", ");
  const shownNames = names.slice(0, 3).join(", ");
  const overflow = Math.max(0, names.length - 3);
  const line =
    names.length <= 3 ? shownNames : `${shownNames}, +${overflow} more`;

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 flex items-center gap-2">
        {/* avatars */}
        <div className="flex -space-x-2">
          {objs.slice(0, maxAvatars).map((m) => {
            const key = m._id || m.id || m.email || m.username;
            const name = displayName(m);
            return <AvatarCircle key={key} name={name} title={name} />;
          })}
          {objs.length > maxAvatars && (
            <span
              className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white"
              title={`+${objs.length - maxAvatars} more`}
            >
              +{objs.length - maxAvatars}
            </span>
          )}
        </div>

        {/* visible + button (requires groupId & canManage) */}
        {canManage && groupId ? (
          <button
            type="button"
            title="Add member"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAddOpen(true);
            }}
            className="ml-1 grid h-6 w-6 place-items-center rounded-full border border-dashed border-slate-300 bg-white text-slate-600 ring-2 ring-white hover:border-slate-400 hover:text-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {/* names line */}
        <div
          className="min-w-0 truncate text-xs font-medium text-slate-900"
          title={fullTitle}
        >
          {objs.length ? line : "—"}
        </div>
      </div>

      {/* shared modal */}
      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        groupId={groupId}
        onAdded={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
