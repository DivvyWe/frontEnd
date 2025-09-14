// src/components/SortSelect.js
"use client";

export default function SortSelect({ value = "recent", onChangeValue }) {
  return (
    <select
      id="sort"
      name="sort"
      value={value}
      onChange={(e) => onChangeValue?.(e.target.value)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      aria-label="Sort groups"
    >
      <option value="recent">Recently active</option>
      <option value="oldest">Oldest</option>
      <option value="name_asc">Name A–Z</option>
      <option value="name_desc">Name Z–A</option>
    </select>
  );
}
