// src/components/GroupCreateModal.js
"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiX,
  FiPlus,
  FiAlertCircle,
  FiGlobe,
  FiUserPlus,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import PeoplePicker from "@/components/people/PeoplePicker";

export default function GroupCreateModal({ open, onClose, onCreated }) {
  const router = useRouter();
  const nameRef = useRef(null);

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]); // string[]

  // 💰 currency state
  const [currencies, setCurrencies] = useState([]);
  const [currency, setCurrency] = useState("AUD");
  const [currencyLoading, setCurrencyLoading] = useState(false);

  // 💰 new UI state for list picker
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState("");

  const CREATE_ENDPOINT = "/api/proxy/user/groups"; // POST /user/groups
  const CURRENCIES_ENDPOINT = "/api/proxy/groups/currencies"; // GET /groups/currencies

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 50);
      setError("");
      setSelectedIds([]);
    } else {
      setName("");
      setSubmitting(false);
      setSelectedIds([]);
      setError("");
      setCurrencies([]);
      setCurrency("AUD");
      setCurrencyLoading(false);
    }

    // whenever modal opens or closes, reset currency dropdown state
    setCurrencyDropdownOpen(false);
    setCurrencyQuery("");
  }, [open]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // 💰 Load currencies + pick default from location/locale
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    async function loadCurrencies() {
      setCurrencyLoading(true);
      try {
        const res = await fetch(CURRENCIES_ENDPOINT, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch currencies (${res.status})`);
        }

        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.currencies) ? data.currencies : [];

        if (cancelled) return;

        setCurrencies(list);

        // Guess default currency from browser locale
        let guessed = "AUD";

        try {
          if (typeof navigator !== "undefined") {
            const locale = navigator.language || navigator.languages?.[0] || "";
            const parts = locale.split("-"); // e.g. "en-AU"
            const region = (parts[1] || "").toUpperCase();

            const regionToCurrency = {
              AU: "AUD",
              US: "USD",
              GB: "GBP",
              IN: "INR",
              NZ: "NZD",
              CA: "CAD",
              SG: "SGD",
              EU: "EUR",
            };

            const maybe = regionToCurrency[region];
            if (maybe && list.some((c) => c.code === maybe)) {
              guessed = maybe;
            }
          }
        } catch {
          // ignore and keep AUD
        }

        setCurrency((prev) => prev || guessed || "AUD");
      } catch (e) {
        console.warn("Failed to load currencies, defaulting to AUD:", e);
        if (!cancelled) {
          setCurrencies([]);
          setCurrency((prev) => prev || "AUD");
        }
      } finally {
        if (!cancelled) setCurrencyLoading(false);
      }
    }

    loadCurrencies();

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a group name.");
      nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1) Create the group (send selected IDs + currency)
      const payload = {
        name: name.trim(),
        memberIds: selectedIds,
        currency, // 💰 send chosen currency
      };

      const res = await fetch(CREATE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }
      const group = data?.group || data;
      const groupId = group?._id;
      if (!res.ok || !groupId) {
        setError(data?.message || "Failed to create group.");
        return;
      }

      onCreated?.(group);
      onClose?.();
      router.push(`/groups/${groupId}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const hasCurrencyList = currencies && currencies.length > 0;

  const filteredCurrencies = hasCurrencyList
    ? currencies.filter((c) => {
        if (!currencyQuery.trim()) return true;
        const q = currencyQuery.toLowerCase();
        return (
          c.code.toLowerCase().includes(q) ||
          (c.name || "").toLowerCase().includes(q)
        );
      })
    : [];

  const selectedCurrencyObj =
    hasCurrencyList && currencies.find((c) => c.code === currency);

  const selectedLabel = selectedCurrencyObj
    ? `${selectedCurrencyObj.code} — ${selectedCurrencyObj.name}`
    : `${currency || "AUD"} — Group currency`;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
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
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#84CC16]/15 text-[#1f2937]">
                <FiPlus className="h-4 w-4 text-[#84CC16]" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">
                New group
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

          {/* Error */}
          {error ? (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              <FiAlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Group name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Group name
              </label>
              <input
                ref={nameRef}
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25"
                placeholder="Roommates, Trip to Bali, Dinner club…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
              />
              <div
                className={`mt-1 text-xs ${
                  name.length >= 60 ? "text-red-600" : "text-slate-500"
                }`}
              >
                {name.length}/60 characters
                {name.length >= 60 && " – Maximum limit reached"}
              </div>
            </div>

            {/* 💰 Currency selector (list picker) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Currency
              </label>

              <div className="relative">
                <button
                  type="button"
                  disabled={currencyLoading && !hasCurrencyList}
                  onClick={() => {
                    if (!currencyLoading || hasCurrencyList) {
                      setCurrencyDropdownOpen((o) => !o);
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-800 outline-none transition focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/25 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <FiGlobe className="h-4 w-4" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {selectedLabel}
                      </span>
                      <span className="truncate text-xs text-slate-500">
                        {currencyLoading && !hasCurrencyList
                          ? "Detecting your local currency…"
                          : "Tap to change the group currency."}
                      </span>
                    </span>
                  </span>
                  <span className="ml-3 flex items-center gap-2">
                    {currencyLoading && (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                    )}
                    <span
                      className={`h-4 w-4 transform text-slate-400 transition ${
                        currencyDropdownOpen ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      ▾
                    </span>
                  </span>
                </button>

                {/* Dropdown list */}
                {currencyDropdownOpen && (
                  <div className="absolute left-0 right-0 z-20 mt-1 origin-top rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 max-h-[60vh] overflow-hidden md:max-h-72">
                    {/* Search (only if many currencies) */}
                    {hasCurrencyList && currencies.length > 6 && (
                      <div className="border-b border-slate-100 px-3 py-2">
                        <input
                          type="text"
                          value={currencyQuery}
                          onChange={(e) => setCurrencyQuery(e.target.value)}
                          placeholder="Search code or name…"
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#84CC16] focus:ring-1 focus:ring-[#84CC16]/30"
                        />
                      </div>
                    )}

                    <div className="max-h-[55vh] overflow-y-auto md:max-h-60">
                      {/* Loading state (initial load, no data yet) */}
                      {currencyLoading && !hasCurrencyList && (
                        <div className="px-3 py-3 text-sm text-slate-500">
                          Loading currencies…
                        </div>
                      )}

                      {/* List from backend */}
                      {!currencyLoading &&
                        hasCurrencyList &&
                        filteredCurrencies.length > 0 && (
                          <div role="listbox" aria-label="Select currency">
                            {filteredCurrencies.map((c) => {
                              const isSelected = c.code === currency;
                              return (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setCurrency(c.code);
                                    setCurrencyDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm outline-none transition hover:bg-slate-50 ${
                                    isSelected
                                      ? "bg-[#84CC16]/5 text-slate-900"
                                      : "text-slate-700"
                                  }`}
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span className="font-semibold">
                                      {c.code}
                                    </span>
                                    <span className="truncate text-xs text-slate-500">
                                      {c.name}
                                    </span>
                                  </span>
                                  {isSelected && (
                                    <span
                                      className="ml-2 h-1.5 w-1.5 rounded-full bg-[#84CC16]"
                                      aria-hidden="true"
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                      {/* No matches after search */}
                      {!currencyLoading &&
                        hasCurrencyList &&
                        filteredCurrencies.length === 0 && (
                          <div className="px-3 py-3 text-sm text-slate-500">
                            No currencies match “{currencyQuery}”.
                          </div>
                        )}

                      {/* Backend failed / empty list fallback */}
                      {!currencyLoading && !hasCurrencyList && (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrency("AUD");
                            setCurrencyDropdownOpen(false);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="font-semibold">AUD</span>
                            <span className="truncate text-xs text-slate-500">
                              Australian Dollar (fallback)
                            </span>
                          </span>
                          <span className="ml-2 h-1.5 w-1.5 rounded-full bg-[#84CC16]" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 👥 Group members card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 md:px-4 md:py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#84CC16]/10 text-[#84CC16]">
                    <FiUserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Add group members
                    </p>
                    <p className="text-xs text-slate-500">
                      Choose people to include in this group. You can invite
                      more later.
                    </p>
                  </div>
                </div>

                {/* Selected count pill */}
                <div className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
                  {selectedIds?.length ? (
                    <span>{selectedIds.length} selected</span>
                  ) : (
                    <span>Optional</span>
                  )}
                </div>
              </div>

              {/* IDs-only picker */}
              <div className="mt-2 rounded-lg bg-white px-2 py-2 shadow-sm ring-1 ring-slate-200/70">
                <PeoplePicker onChangeSelected={(ids) => setSelectedIds(ids)} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-semibold text-white hover:bg-[#76b514] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Creating…
                  </>
                ) : (
                  <>
                    <FiPlus className="h-4 w-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
