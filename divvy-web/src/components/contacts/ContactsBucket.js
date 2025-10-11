// src/components/contacts/ContactsBucket.jsx
import React from "react";
import { FiBookmark, FiTrash2 } from "react-icons/fi";
import AvatarCircle from "@/components/ui/AvatarCircle";

const cls = (...a) => a.filter(Boolean).join(" ");
const nameOf = (u) =>
  u?.alias ||
  u?.username ||
  (u?.email ? u.email.split("@")[0] : "") ||
  (u?.phone || "").replace("+", "＋") ||
  "Someone";

export default function ContactsBucket({
  title,
  items,
  onTogglePin,
  onRemove,
  loading = false,
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-700">{title}</div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No contacts yet.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => (
            <li
              key={c._id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <AvatarCircle
                  name={nameOf(c)}
                  title={c.email || c.phone || "—"}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{nameOf(c)}</div>
                    {c.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-lime-100 px-2 py-0.5 text-[11px] font-medium text-lime-700">
                        <FiBookmark className="-ml-0.5" /> pinned
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {c.email || c.phone || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTogglePin?.(c)}
                  className={cls(
                    "rounded-lg border px-2.5 py-1.5 text-sm hover:bg-slate-50",
                    c.pinned
                      ? "border-lime-300 text-lime-700"
                      : "text-slate-600"
                  )}
                  title={c.pinned ? "Unpin" : "Pin"}
                >
                  <FiBookmark />
                </button>
                <button
                  onClick={() => onRemove?.(c._id)}
                  className="rounded-lg border px-2.5 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                  title="Remove"
                >
                  <FiTrash2 />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
