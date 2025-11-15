// src/components/people/PeoplePicker.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useRouter } from "next/navigation";

// ✅ Correct proxy path for contacts
const CONTACTS_ENDPOINT = "/api/proxy/contacts/user/contacts";
const SEARCH_ENDPOINT = "/api/proxy/user/search";

const toTitle = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const isEmail = (s = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
const pickLabel = (u) =>
  toTitle(u?.username || u?.alias || u?.email || u?.phone || "User");

export default function PeoplePicker({ onChangeSelected }) {
  const router = useRouter();

  // contacts & selection
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]); // string[]
  const [idToUser, setIdToUser] = useState({}); // { [id]: userObj }

  // search (existing users only)
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [dropdownUser, setDropdownUser] = useState(null);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef(null);
  const lastLookedUpRef = useRef("");

  // Load contacts from /api/contacts
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingContacts(true);
      try {
        const res = await fetch(CONTACTS_ENDPOINT, {
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (res.status === 401) {
          router.replace("/auth/signin");
          return;
        }
        if (!res.ok) throw new Error("Failed to load contacts");
        const j = await res.json();
        const list = Array.isArray(j?.contacts) ? j.contacts : [];
        if (active) setContacts(list);
      } catch {
        if (active) setContacts([]);
      } finally {
        if (active) setLoadingContacts(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  // bubble selection up
  useEffect(() => {
    onChangeSelected?.(selectedIds);
  }, [selectedIds, onChangeSelected]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function upsertMap(u) {
    const id = String(u._id || u.id);
    setIdToUser((m) => (m[id] ? m : { ...m, [id]: u }));
  }

  function removeFromMap(id) {
    setIdToUser((m) => {
      const copy = { ...m };
      delete copy[id];
      return copy;
    });
  }

  function togglePick(userObj) {
    const id = String(userObj._id || userObj.id);
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        removeFromMap(id);
        return prev.filter((x) => x !== id);
      } else {
        upsertMap(userObj);
        return [...prev, id];
      }
    });
  }

  // Backfill map with contact objects for selected ids
  useEffect(() => {
    if (!contacts?.length || !selectedIds.length) return;
    setIdToUser((m) => {
      const next = { ...m };
      for (const id of selectedIds) {
        if (!next[id]) {
          const u = contacts.find((c) => String(c._id || c.id) === String(id));
          if (u) next[id] = u;
        }
      }
      return next;
    });
  }, [contacts, selectedIds]);

  // Exact email lookup (existing users only)
  async function runEmailLookup(email) {
    if (!email || email === lastLookedUpRef.current) return;
    lastLookedUpRef.current = email;

    setSearchError("");
    setDropdownUser(null);

    // if email matches a contact, select immediately
    const contactHit =
      contacts.find(
        (u) => String(u.email || "").toLowerCase() === email.toLowerCase()
      ) || null;
    if (contactHit) {
      togglePick(contactHit);
      setQuery("");
      return;
    }

    try {
      setSearching(true);
      const res = await fetch(
        `${SEARCH_ENDPOINT}?query=${encodeURIComponent(email)}`,
        { cache: "no-store", credentials: "include" }
      );

      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }

      if (res.status === 404) {
        // No invite path now — just inform the user
        setSearchError("No user found for that email.");
        setDropdownUser(null);
      } else if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSearchError(j?.message || "Search failed.");
      } else {
        const user = await res.json();
        setDropdownUser(user); // one-click to select
      }
    } catch {
      setSearchError("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  // Auto-search once a full email is typed
  useEffect(() => {
    const q = query.trim();
    setSearchError("");
    setDropdownUser(null);

    if (!isEmail(q)) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runEmailLookup(q), 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function onBlurTry() {
    const q = query.trim();
    if (isEmail(q)) runEmailLookup(q);
  }

  const labelForId = (id) => {
    const u =
      idToUser[id] ||
      contacts.find((c) => String(c._id || c.id) === String(id));
    return u ? pickLabel(u) : id;
  };

  return (
    <div className="space-y-3">
      {/* Email search (auto after full email) */}
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDropdownUser(null);
            setSearchError("");
          }}
          onBlur={onBlurTry}
          placeholder="Type a full email…"
          className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25"
        />

        {/* Suggestion (existing user) */}
        {dropdownUser ? (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                togglePick(dropdownUser);
                setDropdownUser(null);
                setQuery("");
              }}
              className={`block w-full px-3 py-2 text-left text-sm ${
                selectedSet.has(String(dropdownUser?._id))
                  ? "bg-emerald-50 text-emerald-900"
                  : "hover:bg-slate-50"
              }`}
            >
              {pickLabel(dropdownUser)}
            </button>
          </div>
        ) : null}
      </div>

      {/* Search status */}
      {searching ? (
        <div className="text-xs text-slate-500">Searching…</div>
      ) : searchError ? (
        <div className="text-xs text-rose-600">{searchError}</div>
      ) : null}

      {/* Contacts */}
      {loadingContacts ? (
        <div className="text-xs text-slate-500">Loading contacts…</div>
      ) : contacts.length > 0 ? (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Contacts
          </div>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {contacts.map((u) => {
              const id = String(u._id || u.id);
              const selected = selectedSet.has(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => togglePick(u)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-xs sm:text-sm ${
                      selected
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span className="line-clamp-1">{pickLabel(u)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="text-xs text-slate-500">
          No contacts yet. Add teammates to your contact book and they’ll show
          here.
        </div>
      )}

      {/* Selected user chips */}
      {!!selectedIds.length && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
            >
              {labelForId(id)}
              <button
                type="button"
                onClick={() =>
                  setSelectedIds((prev) => {
                    removeFromMap(id);
                    return prev.filter((x) => x !== id);
                  })
                }
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200"
                aria-label="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
