// src/components/people/PeoplePicker.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useRouter } from "next/navigation";

// ✅ Correct proxy paths
const CONTACTS_ENDPOINT = "/api/proxy/contacts/user/contacts";
const SEARCH_ENDPOINT = "/api/proxy/user/search";

const toTitle = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const isEmail = (s = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());

const isPhoneLike = (s = "") => {
  const digits = String(s).replace(/\D/g, "");
  return digits.length >= 6; // treat 6+ digits as "phone-ish"
};

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

  // ---------- Unified lookup: email OR phone ----------
  async function runLookup(raw) {
    if (!raw || raw === lastLookedUpRef.current) return;
    lastLookedUpRef.current = raw;

    setSearchError("");
    setDropdownUser(null);

    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    const digits = trimmed.replace(/\D/g, "");

    // If email/phone already in contacts, auto-select
    const contactHit =
      contacts.find((u) => {
        const ue = String(u.email || "").toLowerCase();
        const upDigits = String(u.phone || "").replace(/\D/g, "");

        if (isEmail(trimmed) && ue && ue === lower) return true;

        // Exact-ish phone match: same digits (or endsWith for local vs +61)
        if (digits && digits.length >= 8 && upDigits) {
          return (
            upDigits === digits ||
            upDigits.endsWith(digits) ||
            digits.endsWith(upDigits)
          );
        }

        return false;
      }) || null;

    if (contactHit) {
      togglePick(contactHit);
      setQuery("");
      return;
    }

    try {
      setSearching(true);
      const res = await fetch(
        `${SEARCH_ENDPOINT}?query=${encodeURIComponent(trimmed)}`,
        { cache: "no-store", credentials: "include" }
      );

      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }

      if (res.status === 404) {
        setSearchError("No user found for that email or phone.");
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

  // Auto-search once a full email OR phone-like string is typed
  useEffect(() => {
    const q = query.trim();
    setSearchError("");
    setDropdownUser(null);

    if (!q) return;

    const shouldSearch =
      isEmail(q) || isPhoneLike(q) || (q.startsWith("+") && q.length >= 7);

    if (!shouldSearch) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runLookup(q), 350);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function onBlurTry() {
    const q = query.trim();
    if (!q) return;

    if (isEmail(q) || isPhoneLike(q) || q.startsWith("+")) {
      runLookup(q);
    }
  }

  const labelForId = (id) => {
    const u =
      idToUser[id] ||
      contacts.find((c) => String(c._id || c.id) === String(id));
    return u ? pickLabel(u) : id;
  };

  return (
    <div className="space-y-3">
      {/* Email / Phone search */}
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
          placeholder="Type an email or mobile number…"
          className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25"
        />
        <p className="mt-1 text-xs text-slate-500">
          For mobile numbers,pleas use international format (e.g.{" "}
          <span className="font-mono">+61…</span>).
        </p>
        {/* Suggestion (existing user from /user/search) */}
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
