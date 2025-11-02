// src/components/people/PeopleMiniPicker.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiUser, FiX, FiAlertCircle, FiSearch } from "react-icons/fi";

const SEARCH_ENDPOINT = "/api/proxy/user/search"; // GET ?query=

export default function PeopleMiniPicker({
  // optional: restrict to members list
  members = [], // [{ _id, username, email, phone }]
  limitToMembers = true,

  // prevent duplicates
  selectedIds = [], // array of string userIds already selected

  // callback when a user is chosen
  onAddUser, // (userObj) => void

  // ui
  submitting = false,
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // single user object
  const [error, setError] = useState("");

  const controllerRef = useRef(null);
  const canSearch = q.trim().length >= 3;

  const selectedSet = useMemo(
    () => new Set(selectedIds.map(String)),
    [selectedIds]
  );

  const isMember = (userId) =>
    members.some((m) => String(m._id) === String(userId));

  async function doSearch(query) {
    if (!canSearch) {
      setResult(null);
      setError("");
      return;
    }
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const url = `${SEARCH_ENDPOINT}?query=${encodeURIComponent(
        query.trim()
      )}`;
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        signal: controllerRef.current.signal,
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setError("You are signed out. Please sign in again.");
        return;
      }
      if (!res.ok) {
        setError(data?.message || "Search failed");
        return;
      }
      // Controller returns a single user or 404
      setResult(data || null);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError("Search failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // debounce
  useEffect(() => {
    setError("");
    setResult(null);
    if (!canSearch) return;
    const t = setTimeout(() => doSearch(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const disabled = submitting;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Add people
        </h3>
        <span className="text-[11px] text-slate-500">
          Search by email or phone
        </span>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 px-2 focus-within:border-[#84CC16] focus-within:ring-2 focus-within:ring-[#84CC16]/25">
          <FiSearch className="h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="e.g. jane@example.com or +61412345678"
            className="w-full bg-transparent py-2 text-sm outline-none"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={disabled}
          />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setResult(null);
                setError("");
              }}
              className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="Clear"
            >
              <FiX className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => doSearch(q)}
          disabled={disabled || !canSearch || loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          title="Search"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          ) : (
            "Search"
          )}
        </button>
      </div>

      {/* Error */}
      {error ? (
        <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          <FiAlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Result card */}
      <div className="mt-3">
        {result ? (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200">
                <FiUser className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">
                  {result.username || "Unnamed"}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {result.email || result.phone || "No contact"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedSet.has(String(result._id)) ? (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-100">
                  Already added
                </span>
              ) : limitToMembers && !isMember(result._id) ? (
                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800 ring-1 ring-amber-100">
                  Not in this group
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddUser?.(result)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 rounded-md bg-[#84CC16] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#76b514] disabled:opacity-60"
                  title="Add to participants"
                >
                  <FiPlus className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {canSearch
              ? loading
                ? "Searching…"
                : "No result yet. Edit your query and press Search."
              : "Type at least 3 characters to search."}
          </div>
        )}
      </div>
    </div>
  );
}
