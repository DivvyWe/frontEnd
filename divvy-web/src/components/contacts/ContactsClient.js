"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ContactsBucket from "@/components/contacts/ContactsBucket";
import AddContactModal from "@/components/contacts/AddContactModal";

/* ------------------------------ tiny utils ------------------------------ */
const debounce = (fn, ms = 400) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/* ------------------------------------------------------------------------ */
export default function ContactsClient({
  me,
  initialContacts = [],
  initialTotal = 0,
  initialPage = 1,
  initialPages = 1,
  limit = 30,
  initialSort = "recent",
  initialQ = "",
}) {
  /* ------------------------------ base states ------------------------------ */
  const [contacts, setContacts] = useState(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [sort, setSort] = useState(initialSort);
  const [q, setQ] = useState(initialQ);
  const [err, setErr] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPage < initialPages);
  const pageRef = useRef(initialPage);
  const pagesRef = useRef(initialPages);
  const loadingRef = useRef(false);

  // ✅ Added missing state
  const [showAdd, setShowAdd] = useState(false);

  /* ------------------------------ fetch logic ------------------------------ */
  const fetchPage = useCallback(
    async (pageToLoad) => {
      const params = new URLSearchParams({
        q,
        sort,
        page: String(pageToLoad),
        limit: String(limit),
      });

      setErr("");
      setIsLoading(true);
      loadingRef.current = true;
      try {
        const res = await fetch(`/api/proxy/contacts/user/contacts?${params}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || "Failed to load contacts");
        }
        const j = await res.json();

        if (pageToLoad === 1) {
          setContacts(Array.isArray(j?.contacts) ? j.contacts : []);
        } else {
          setContacts((prev) =>
            prev.concat(Array.isArray(j?.contacts) ? j.contacts : [])
          );
        }

        setTotal(j?.total ?? 0);
        pageRef.current = j?.page ?? pageToLoad;
        pagesRef.current = j?.pages ?? 1;
        setHasMore((j?.page ?? 1) < (j?.pages ?? 1));
      } catch (e) {
        setErr(e?.message || "Failed to load contacts");
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [q, sort, limit]
  );

  /* --------------------- refetch on filter change --------------------- */
  useEffect(() => {
    pageRef.current = 1;
    pagesRef.current = 1;
    setHasMore(false);
    fetchPage(1);
  }, [q, sort, fetchPage]);

  /* ------------------------- infinite scroll -------------------------- */
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (ent.isIntersecting && !loadingRef.current && hasMore) {
          fetchPage(pageRef.current + 1);
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, fetchPage]);

  /* ---------------------------- actions ---------------------------- */
  async function addContact(target, { alias, pinned } = {}) {
    if (!target?._id) return;
    setErr("");
    // optimistic add to top
    setContacts((prev) => [
      {
        ...target,
        alias: alias || undefined,
        pinned: !!pinned,
        lastInteractedAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    const res = await fetch("/api/proxy/contacts/user/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contactUserId: target._id, alias, pinned }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.message || "Failed to add contact");
    }
    await fetchPage(1);
  }

  async function removeContact(id) {
    const prev = contacts;
    setContacts((list) => list.filter((c) => String(c._id) !== String(id)));
    const res = await fetch(`/api/proxy/contacts/user/contacts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.message || "Failed to remove contact");
      setContacts(prev);
    } else {
      await fetchPage(1);
    }
  }

  async function togglePin(c) {
    await addContact(c, { alias: c.alias, pinned: !c.pinned });
  }

  const onSearchChange = useMemo(() => debounce((v) => setQ(v), 300), []);

  /* ---------------------------- render ---------------------------- */
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Contacts</h1>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 min-w-[110px] rounded-lg border border-slate-200 bg-white pl-2 pr-8 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-lime-400 appearance-none"
              title="Sort"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="pinned">Pinned</option>
            </select>
            <svg
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* Add contact button */}
          <button
            onClick={() => setShowAdd(true)}
            className="h-9 rounded-lg bg-lime-500 px-3 text-sm font-medium text-white hover:bg-lime-600"
          >
            Add contact
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          placeholder="Search in your contacts…"
          className="w-full h-10 md:h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm md:text-base outline-none focus:ring-2 focus:ring-lime-400"
          onChange={(e) => onSearchChange(e.target.value)}
          defaultValue={q}
        />
      </div>

      {/* Error */}
      {!!err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* Contact list */}
      <ContactsBucket
        title={`Your contacts (${total})`}
        items={contacts}
        onTogglePin={togglePin}
        onRemove={removeContact}
        loading={contacts.length === 0 && isLoading}
      />

      {/* Infinite scroll loader */}
      <div ref={sentinelRef} className="h-8" />
      {isLoading && contacts.length > 0 && (
        <div className="flex justify-center pb-6">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-slate-300 border-t-transparent" />
        </div>
      )}

      {/* Add Contact Modal */}
      {showAdd && (
        <AddContactModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onAdd={(user) => addContact(user, { pinned: false })}
        />
      )}
    </div>
  );
}
