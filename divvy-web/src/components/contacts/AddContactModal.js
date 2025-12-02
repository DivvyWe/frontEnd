// src/components/contacts/AddContactModal.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiX, FiPlus, FiSearch, FiAlertCircle } from "react-icons/fi";
import AvatarCircle from "@/components/ui/AvatarCircle";

/* ------------------------------ helpers ------------------------------ */
const debounce = (fn, ms = 400) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const nameOf = (u) =>
  u?.alias ||
  u?.username ||
  (u?.email ? u.email.split("@")[0] : "") ||
  (u?.phone || "").replace("+", "＋") ||
  "Someone";

/* ------------------------------ component ------------------------------ */
export default function AddContactModal({ open, onClose, onAdd }) {
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  // track what type we last searched with: "email" | "phone" | null
  const [lastKind, setLastKind] = useState(null);

  const abortRef = useRef(null);
  const inputRef = useRef(null);

  const doSearch = useMemo(
    () =>
      debounce(async (text) => {
        const raw = text ?? "";
        const query = raw.trim();

        setErr("");
        setResult(null);

        if (!query) {
          setSearching(false);
          setLastKind(null);
          return;
        }

        const noSpaces = query.replace(/\s+/g, "");

        // Decide if this is email or phone
        const isEmail = noSpaces.includes("@");
        const phonePattern = /^[+0-9]{5,}$/;
        const isPhone = !isEmail && phonePattern.test(noSpaces);

        if (!isEmail && !isPhone) {
          setSearching(false);
          setLastKind(null);
          return;
        }

        setLastKind(isEmail ? "email" : "phone");

        // cancel previous
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setSearching(true);
        try {
          const params = new URLSearchParams(
            isEmail ? { email: noSpaces } : { phone: noSpaces }
          );
          const url =
            "/api/proxy/contacts/user/search-candidate?" + params.toString();

          const res = await fetch(url, {
            cache: "no-store",
            signal: abortRef.current.signal,
          });

          if (res.status === 404) {
            setResult({ none: true });
          } else if (res.status === 409) {
            const j = await res.json().catch(() => ({}));
            setErr(j?.message || "Already in your contacts");
          } else if (res.status === 400) {
            const j = await res.json().catch(() => ({}));
            setErr(
              j?.message ||
                (isEmail
                  ? "Invalid email"
                  : "Invalid phone number. Only verified phone numbers can be used.")
            );
          } else if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setErr(j?.message || "Search failed");
          } else {
            const user = await res.json();
            setResult(user);
          }
        } catch (e) {
          if (e?.name !== "AbortError") {
            setErr("Search failed");
          }
        } finally {
          setSearching(false);
        }
      }, 500),
    []
  );

  /* ------------------------------ lifecycle ------------------------------ */
  useEffect(() => {
    if (open) {
      setErr("");
      setResult(null);
      setSearching(false);
      setLastKind(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQ("");
      setErr("");
      setResult(null);
      setSearching(false);
      setLastKind(null);
      if (abortRef.current) abortRef.current.abort();
    }
  }, [open]);

  // ESC + Enter behaviour
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Enter" && !searching) {
        doSearch(q);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, q, searching, doSearch, onClose]);

  if (!open) return null;
  const showNoUser = result?.none && !searching && !err;
  const isPhoneMode = lastKind === "phone";

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay (outside click closes) */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />

      {/* Centered panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/10 md:p-6"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#84CC16]/15 text-[#1f2937]">
                <FiPlus className="h-4 w-4 text-[#84CC16]" />
              </div>
              <h2 className="text/base font-semibold text-slate-800">
                Add contact
              </h2>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Error banner */}
          {!!err && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              <FiAlertCircle className="h-4 w-4" />
              <span>{err}</span>
            </div>
          )}

          {/* Body */}
          <div className="space-y-5">
            {/* Search input row */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Search by email or phone
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    ref={inputRef}
                    value={q}
                    onChange={(e) => {
                      const v = e.target.value;
                      setQ(v);
                      doSearch(v);
                    }}
                    placeholder="someone@example.com or +61413561159 or 0413..."
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25"
                  />
                </div>
                <button
                  onClick={() => doSearch(q)}
                  disabled={searching}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-semibold text-white hover:bg-[#76b514] disabled:opacity-60"
                  title="Search"
                >
                  {searching ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      Searching…
                    </>
                  ) : (
                    <>
                      <FiSearch className="h-4 w-4" />
                      Search
                    </>
                  )}
                </button>
              </div>

              {/* Hint + Open contacts — only in phone mode */}
              {isPhoneMode && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Using a{" "}
                    <span className="font-medium">verified phone number</span>.
                    For mobiles like <code>0413…</code> we&apos;ll detect the
                    correct country automatically.
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      // if you are already on /contacts this just closes modal;
                      // if you trigger modal somewhere else it navigates there
                      if (window.location.pathname === "/contacts") {
                        onClose?.();
                      } else {
                        window.location.href = "/contacts";
                      }
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Open contacts list
                  </button>
                </div>
              )}

              {/* Generic hint when idle */}
              {!q && !isPhoneMode && (
                <div className="mt-2 text-xs text-slate-500">
                  You can add people using their{" "}
                  <span className="font-medium">email</span> or their{" "}
                  <span className="font-medium">verified phone number</span>.
                </div>
              )}
            </div>

            {/* No user message */}
            {showNoUser && (
              <div className="text-sm text-slate-500">
                No user found with that email or verified phone number.
              </div>
            )}

            {/* Result card */}
            {result && !result.none && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <AvatarCircle
                    name={nameOf(result)}
                    title={result.email || result.phone || "—"}
                  />
                  <div>
                    <div className="font-medium text-slate-800">
                      {nameOf(result)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {result.email || result.phone || "—"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onAdd?.(result);
                    onClose?.();
                  }}
                  className="rounded-lg bg-[#84CC16] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#76b514]"
                >
                  Add
                </button>
              </div>
            )}

            {/* Idle hint when everything is empty */}
            {!q && !result && !searching && !err && (
              <div className="text-xs text-slate-500">
                Tip: Paste an email or phone and press <b>Enter</b>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
