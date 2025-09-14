// src/components/ui/AvatarCircle.jsx
export default function AvatarCircle({ name, title }) {
  const initials = getInitials(name);
  return (
    <span
      className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 ring-2 ring-white"
      title={title || name}
    >
      {initials}
    </span>
  );
}

function getInitials(s = "") {
  const str = String(s || "").trim();
  if (!str) return "👤";
  const parts = str.replace(/\s+/g, " ").split(" ");
  const a = (parts[0] || "").charAt(0);
  const b = (parts[1] || "").charAt(0);
  return (a + b || a || "?").toUpperCase();
}
