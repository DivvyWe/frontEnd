// src/components/groups/GroupsGridClient.jsx
"use client";

import { useMemo, useState } from "react";
import GroupListCard from "@/components/groups/GroupListCard";

function SortSelect({ value, onChange }) {
  return (
    <select
      id="sort"
      name="sort"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      aria-label="Sort groups"
    >
      <option value="recent">Recently active</option>
      <option value="oldest">Oldest</option>
      <option value="name_asc">Name A–Z</option>
      <option value="name_desc">Name Z–A</option>
      {/* NEW: sort by amount */}
      <option value="amount_desc">Amount high → low</option>
      <option value="amount_asc">Amount low → high</option>
    </select>
  );
}

export default function GroupsGridClient({ groups, initialSort = "recent" }) {
  const [items, setItems] = useState(groups || []);
  const [sort, setSort] = useState(initialSort);

  const sorted = useMemo(() => {
    const arr = [...items];
    const dateOf = (g) => new Date(g?.updatedAt || g?.createdAt || 0).getTime();
    const net = (g) => Number(g?.totals?.net) || 0;
    const absNet = (g) => Math.abs(net(g));

    if (sort === "name_asc") {
      arr.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        })
      );
    } else if (sort === "name_desc") {
      arr.sort((a, b) =>
        (b.name || "").localeCompare(a.name || "", undefined, {
          sensitivity: "base",
        })
      );
    } else if (sort === "oldest") {
      arr.sort((a, b) => dateOf(a) - dateOf(b));
    } else if (sort === "amount_desc") {
      // Largest balance first (by absolute net)
      arr.sort((a, b) => absNet(b) - absNet(a));
    } else if (sort === "amount_asc") {
      // Smallest balance first (by absolute net)
      arr.sort((a, b) => absNet(a) - absNet(b));
    } else {
      // recent
      arr.sort((a, b) => dateOf(b) - dateOf(a));
    }
    return arr;
  }, [items, sort]);

  function handleDeleted(id) {
    setItems((prev) => prev.filter((g) => g._id !== id));
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-2">
        <label htmlFor="sort" className="text-sm text-slate-600">
          Sort
        </label>
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {sorted?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((g) => (
            <GroupListCard key={g._id} g={g} onDeleted={handleDeleted} />
          ))}
        </ul>
      ) : (
        <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-600">No groups yet.</p>
        </div>
      )}
    </>
  );
}
