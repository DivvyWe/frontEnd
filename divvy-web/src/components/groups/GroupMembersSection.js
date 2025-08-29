// components/groups/GroupMembersSection.jsx
import GroupMemberCard from "./GroupMembers";

function toTitle(name = "") {
  return String(name)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function GroupMembersSection({
  groupId,
  members = [],
  ownerId,
  canManage = false,
  currentUserId, // ⬅️ add this
}) {
  // Hide current user
  const others = (members || []).filter(
    (m) => String(m._id || m.id) !== String(currentUserId || "")
  );

  // Sort by name (title-cased)
  const sorted = [...others].sort((a, b) =>
    toTitle(a?.username || "").localeCompare(toTitle(b?.username || ""))
  );

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Members</h2>
        {canManage && (
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            // onClick={...} // wire later
          >
            Manage
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="text-xs text-slate-500">No other members yet.</div>
      ) : (
        <ul
          className="
            grid gap-3
            grid-cols-2
            md:grid-cols-3
            xl:grid-cols-4
          "
        >
          {sorted.map((m) => (
            <li key={m._id || m.id}>
              <GroupMemberCard
                name={toTitle(m.username || m.email || m.phone || "Member")}
                avatar={m.avatar}
                isOwner={String(m._id || m.id) === String(ownerId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
