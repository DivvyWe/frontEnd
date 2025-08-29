// components/groups/GroupMembers.jsx
// Compact member card with initials avatar and small owner chip
function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

export default function GroupMemberCard({ name, avatar, isOwner }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
      {/* Avatar */}
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt={name}
          className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ring-1 ring-black/5">
          {initials(name)}
        </div>
      )}

      {/* Name + role */}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">
          {name}
        </div>
        {isOwner && (
          <span className="mt-0.5 inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
            Owner
          </span>
        )}
      </div>
    </div>
  );
}
