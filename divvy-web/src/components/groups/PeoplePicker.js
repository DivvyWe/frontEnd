// src/components/groups/PeoplePicker.js
"use client";
import { useEffect, useState } from "react";

const toTitle = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

export default function PeoplePicker({ value = [], onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState("");

  // Load suggestions once
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/proxy/user/people/quick-pick", {
          cache: "no-store",
        });
        const j = res.ok ? await res.json() : { suggestions: [] };
        if (!ignore) setSuggestions(j.suggestions || []);
      } catch {}
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const selectedSet = new Set(value.map(String));
  const toggle = (u) => {
    const id = String(u._id || u.id);
    if (selectedSet.has(id)) onChange(value.filter((x) => String(x) !== id));
    else onChange([...value, id]);
  };

  const runSearch = async (q) => {
    setError("");
    setSearchResult(null);
    if (!q || q.length < 3) return;
    try {
      const res = await fetch(
        `/api/proxy/user/search?query=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );
      if (res.status === 404) {
        setSearchResult(null);
        return;
      }
      const j = await res.json();
      setSearchResult(j);
    } catch (e) {
      setError("Search failed");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-slate-700">Add people</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => runSearch(search.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch(search.trim());
          }}
          placeholder="Search by email or phone"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
        {searchResult && (
          <button
            type="button"
            onClick={() => toggle(searchResult)}
            className={`mt-2 w-full rounded-md border px-3 py-2 text-left text-sm ${
              selectedSet.has(String(searchResult._id))
                ? "border-emerald-300 bg-emerald-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            {toTitle(
              searchResult.username ||
                searchResult.email ||
                searchResult.phone ||
                "User"
            )}
          </button>
        )}
      </div>

      {!!suggestions.length && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Suggested
          </div>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {suggestions.map((u) => {
              const id = String(u._id || u.id);
              const selected = selectedSet.has(id);
              const label = toTitle(u.username || u.email || u.phone || "User");
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => toggle(u)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
