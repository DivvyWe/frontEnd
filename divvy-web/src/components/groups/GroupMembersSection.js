// src/components/groups/GroupMembersSection.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import GroupMembersRow from "@/components/groups/GroupMembersRow";
import AddMemberModal from "@/components/groups/AddMemberModal";

export default function GroupMembersSection({
  groupId,
  members = [],
  ownerId, // kept for parity; not used here
  canManage = false,
  currentUserId, // kept for parity; not used here
}) {
  const router = useRouter();
  const [openAdd, setOpenAdd] = useState(false);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Members</h2>

        {canManage ? (
          <button
            type="button"
            onClick={() => setOpenAdd(true)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <UserPlus className="h-4 w-4" />
            Add member
          </button>
        ) : null}
      </div>

      {/* Top row (with + icon too) */}
      <GroupMembersRow
        members={members}
        groupId={groupId}
        canManage={canManage}
        label="People in this group"
        maxAvatars={6}
      />

      {/* Shared modal opened from the header button */}
      <AddMemberModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        groupId={groupId}
        onAdded={() => {
          setOpenAdd(false);
          router.refresh();
        }}
      />
    </section>
  );
}
