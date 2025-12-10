// src/components/people/PeoplePicker.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useRouter } from "next/navigation";

// ✅ Correct proxy paths
const CONTACTS_ENDPOINT = "/api/proxy/contacts/user/contacts";
const SEARCH_ENDPOINT = "/api/proxy/user/search";
const INVITES_ENDPOINT = "/api/proxy/invites"; // ⭐ NEW: contact invite

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

  // ⭐ NEW: invite via link when user not found
  const [inviteSharing, setInviteSharing] = useState(false);
  const [lastInviteLabel, setLastInviteLabel] = useState("");

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

  // ⭐ NEW: generate & share a CONTACT invite link
  async function generateAndShareContactInvite(labelHint = "") {
    setInviteSharing(true);
    try {
      const res = await fetch(INVITES_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          context: "contact",
        }),
      });

      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.inviteUrl) {
        console.warn("Failed to generate contact invite link:", data?.message);
        alert("Could not generate invite link. Please try again.");
        return;
      }

      const inviteUrl = data.inviteUrl;
      const label = labelHint?.trim();
      const shareText = label
        ? `I tried to add you (${label}) on Divsez.\n\nJoin using this link so we can split expenses easily:\n\n${inviteUrl}`
        : `Join me on Divsez so we can split and track expenses together:\n\n${inviteUrl}`;

      // 🧩 Prefer Web Share API (mobile: WhatsApp, SMS, Messenger, etc.)
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "Join me on Divsez",
            text: shareText,
            url: inviteUrl,
          });
          return;
        } catch (err) {
          console.warn("navigator.share failed (cancelled or error):", err);
          // fall through to clipboard
        }
      }

      // 💾 Fallback: copy link to clipboard
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          alert(
            "Invite link copied to your clipboard.\n\nPaste it into WhatsApp, SMS, Messenger, etc. to invite them to Divsez."
          );
          return;
        } catch (err) {
          console.warn("Clipboard write failed:", err);
        }
      }

      // Last fallback: just show the link
      alert(`Share this invite link with your friend:\n\n${inviteUrl}`);
    } finally {
      setInviteSharing(false);
    }
  }

  // ---------- Unified lookup: email OR phone ----------
  async function runLookup(raw) {
    if (!raw || raw === lastLookedUpRef.current) return;
    lastLookedUpRef.current = raw;

    setSearchError("");
    setDropdownUser(null);
    setLastInviteLabel(""); // reset

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
        setLastInviteLabel(trimmed); // ⭐ remember what we searched for
      } else if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setSearchError(j?.message || "Search failed.");
        setLastInviteLabel("");
      } else {
        const user = await res.json();
        setDropdownUser(user); // one-click to select
        setLastInviteLabel("");
      }
    } catch {
      setSearchError("Search failed.");
      setLastInviteLabel("");
    } finally {
      setSearching(false);
    }
  }

  // Auto-search once a full email OR phone-like string is typed
  useEffect(() => {
    const q = query.trim();
    setSearchError("");
    setDropdownUser(null);
    setLastInviteLabel("");

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
            setQuery(e.value?.target ?? e.target.value);
            setDropdownUser(null);
            setSearchError("");
            setLastInviteLabel("");
          }}
          onBlur={onBlurTry}
          placeholder="Type an email or mobile number…"
          className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25"
        />
        <p className="mt-1 text-xs text-slate-500">
          For mobile numbers, please use international format (e.g.{" "}
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

      {/* Search status + invite option */}
      {searching ? (
        <div className="text-xs text-slate-500">Searching…</div>
      ) : (
        <>
          {searchError && (
            <div className="text-xs text-rose-600">{searchError}</div>
          )}

          {searchError && lastInviteLabel && (
            <div className="mt-1">
              <button
                type="button"
                disabled={inviteSharing}
                onClick={() => generateAndShareContactInvite(lastInviteLabel)}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
              >
                {inviteSharing ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-700" />
                    Sending invite link…
                  </>
                ) : (
                  <>
                    <span>Click here to send invite link.</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

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
