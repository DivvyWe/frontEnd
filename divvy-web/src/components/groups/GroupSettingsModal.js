// src/components/groups/GroupSettingsModal.jsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  UserPlus,
  Crown,
  Trash2,
  ShieldAlert,
  LogOut,
  Pencil,
  Save,
  Loader2,
  Globe2,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function GroupSettingsModal({
  open,
  onClose,
  group,
  me,
  groupId,
}) {
  const [tab, setTab] = useState("members"); // 'general' | 'members' | 'danger'
  const router = useRouter();

  // Confirm dialog state
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    danger: false,
    busy: false,
    onConfirm: null,
  });
  const openConfirm = (opts) =>
    setConfirm((c) => ({ ...c, open: true, ...opts, busy: false }));
  const handleConfirm = async () => {
    if (!confirm.onConfirm) return;
    try {
      setConfirm((c) => ({ ...c, busy: true }));
      await confirm.onConfirm();
      setConfirm((c) => ({ ...c, open: false, busy: false }));
    } catch (e) {
      setConfirm((c) => ({
        ...c,
        busy: false,
        description: e?.message || "Something went wrong. Please try again.",
      }));
    }
  };

  // Modal keyboard + scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const myId = me?._id || me?.id;
  const ownerId = group?.createdBy?._id || group?.createdBy;
  const id = groupId || group?._id;
  const groupName = group?.name || "this group";

  const isOwner = useMemo(
    () => String(ownerId || "") === String(myId || ""),
    [ownerId, myId]
  );
  const isMember = useMemo(() => {
    const members = group?.members || [];
    return members.some(
      (m) => String(m?._id || m?.id || m) === String(myId || "")
    );
  }, [group?.members, myId]);

  const members = group?.members || [];
  // only show actionable invites; we render view-only
  const invites = (group?.invites || []).filter(
    (i) => !i?.status || i.status === "pending"
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 grid place-items-end sm:place-items-center"
        aria-modal="true"
        role="dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative h-[100dvh] w-full rounded-none bg-white shadow-xl ring-1 ring-black/10 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-3xl sm:rounded-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900">
                Group settings
              </h2>
              <p className="truncate text-xs text-slate-600">{groupName}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs (Invites removed; now merged into Members) */}
          <div className="sticky top-[53px] z-10 border-b border-slate-200 bg-white">
            <div className="no-scrollbar -mb-px flex gap-1 overflow-x-auto px-2 py-2 sm:px-3">
              <Tab id="general" tab={tab} setTab={setTab} label="General" />
              <Tab
                id="members"
                tab={tab}
                setTab={setTab}
                label="Members & invites"
              />
              <Tab id="danger" tab={tab} setTab={setTab} label="Danger zone" />
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[calc(100dvh-140px)] overflow-y-auto p-4 sm:max-h-[calc(85vh-140px)]">
            {tab === "general" && (
              <GeneralSection
                group={group}
                isOwner={isOwner}
                groupId={id}
                onRenamed={() => router.refresh()}
              />
            )}

            {tab === "members" && (
              <MembersSection
                members={members}
                invites={invites}
                isOwner={isOwner}
                isMember={isMember}
                ownerId={ownerId}
                groupId={id}
                groupName={groupName}
                currentUserId={myId}
                confirmAction={openConfirm}
                onChanged={() => router.refresh()}
              />
            )}

            {tab === "danger" && (
              <DangerSection
                isOwner={isOwner}
                members={members}
                ownerId={ownerId}
                groupName={groupName}
                onTransfer={(newOwnerId) =>
                  openConfirm({
                    title: "Transfer ownership?",
                    description:
                      "This will make the selected member the new owner.",
                    confirmText: "Transfer",
                    onConfirm: async () => {
                      const res = await fetch(
                        `/api/proxy/groups/${id}/transfer-ownership`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                          },
                          body: JSON.stringify({ newOwnerId }),
                        }
                      );
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok)
                        throw new Error(
                          j?.message || "Failed to transfer ownership"
                        );
                      router.refresh();
                    },
                  })
                }
                onLeave={async (newOwnerId) => {
                  openConfirm({
                    title: "Leave group?",
                    description: isOwner
                      ? "You are the owner. The selected member will become the new owner and you will leave the group."
                      : "You will lose access to this group's expenses and discussion.",
                    confirmText: "Leave",
                    danger: true,
                    onConfirm: async () => {
                      const body =
                        isOwner && newOwnerId
                          ? JSON.stringify({ newOwnerId })
                          : undefined;
                      const res = await fetch(
                        `/api/proxy/user/groups/${id}/leave`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                          },
                          body,
                        }
                      );
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok)
                        throw new Error(j?.message || "Failed to leave group");
                      router.replace("/groups");
                      router.refresh();
                    },
                  });
                }}
                onDelete={() =>
                  openConfirm({
                    title: "Delete group?",
                    description:
                      "This will permanently delete the group and all its data. This cannot be undone.",
                    confirmText: "Delete",
                    danger: true,
                    onConfirm: async () => {
                      const res = await fetch(`/api/proxy/groups/${id}`, {
                        method: "DELETE",
                        headers: { Accept: "application/json" },
                      });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok)
                        throw new Error(j?.message || "Failed to delete group");
                      router.replace("/groups");
                      router.refresh();
                    },
                  })
                }
              />
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Global Confirm Dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        confirmText={confirm.confirmText}
        cancelText={confirm.cancelText}
        danger={confirm.danger}
        busy={confirm.busy}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={handleConfirm}
      />
    </>
  );
}

function Tab({ id, tab, setTab, label }) {
  const active = tab === id;
  return (
    <button
      onClick={() => setTab(id)}
      className={`relative rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

/* ——— Sections ——— */

function GeneralSection({ group, isOwner, groupId, onRenamed }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group?.name || "");
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() && name.trim() !== (group?.name || "");

  // 💰 Currency state
  const [currency, setCurrency] = useState(group?.currency || "AUD");
  const [originalCurrency, setOriginalCurrency] = useState(
    group?.currency || "AUD"
  );
  const [currencies, setCurrencies] = useState([]);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);

  const CURRENCIES_ENDPOINT = "/api/proxy/groups/currencies";

  // keep local state in sync with group prop
  useEffect(() => {
    setName(group?.name || "");
    const cur = group?.currency || "AUD";
    setCurrency(cur);
    setOriginalCurrency(cur);
  }, [group?.name, group?.currency]);

  // fetch currencies
  useEffect(() => {
    let cancelled = false;

    async function loadCurrencies() {
      setCurrencyLoading(true);
      try {
        const res = await fetch(CURRENCIES_ENDPOINT, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch currencies");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        const list = Array.isArray(data?.currencies) ? data.currencies : [];
        setCurrencies(list);

        // if group has no currency yet, pick a sensible default (AUD or locale-based)
        if (!group?.currency) {
          let guessed = "AUD";
          try {
            if (typeof navigator !== "undefined") {
              const locale =
                navigator.language || navigator.languages?.[0] || "";
              const parts = locale.split("-");
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
            // ignore
          }
          setCurrency((prev) => prev || guessed || "AUD");
          setOriginalCurrency((prev) => prev || guessed || "AUD");
        }
      } catch (e) {
        console.warn("Failed to load currencies in settings:", e);
        if (!cancelled) {
          setCurrencies([]);
          // fallback: keep whatever currency is already set
        }
      } finally {
        if (!cancelled) setCurrencyLoading(false);
      }
    }

    loadCurrencies();
    return () => {
      cancelled = true;
    };
  }, [groupId, group?.currency]);

  const hasCurrencyList = currencies && currencies.length > 0;
  const currencyDirty = currency && currency !== originalCurrency;

  // ✅ Update name via PUT /api/proxy/groups/:groupId
  const save = async () => {
    if (!dirty || !isOwner) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/proxy/groups/${groupId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Rename failed");
      setEditing(false);
      onRenamed?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ✅ Update currency via same PUT /api/proxy/groups/:groupId
  const saveCurrency = async () => {
    if (!currencyDirty || !isOwner) return;
    setSavingCurrency(true);
    try {
      const res = await fetch(`/api/proxy/groups/${groupId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ currency }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Failed to update currency");
      setOriginalCurrency(currency);
      onRenamed?.(); // so parent can refresh group data
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCurrency(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">General</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Group name */}
        <Field label="Group name">
          <div className="flex items-center gap-2">
            <input
              disabled={!isOwner || !editing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                isOwner && editing
                  ? "border-slate-300 bg-white text-slate-800"
                  : "border-slate-300 bg-slate-50 text-slate-700"
              }`}
            />
            {isOwner && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                title="Edit name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {isOwner && editing && (
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={save}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                title="Save name"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
            )}
          </div>
          {!isOwner && (
            <p className="mt-1 text-xs text-slate-500">
              Only the owner can rename the group.
            </p>
          )}
        </Field>

        {/* Created at */}
        <Field label="Created at">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {group?.createdAt
              ? new Date(group.createdAt).toLocaleString()
              : "—"}
          </div>
        </Field>

        {/* Currency */}
        <Field label="Currency">
          <div className="flex items-center gap-2">
            <CurrencyDropdown
              currencies={hasCurrencyList ? currencies : []}
              value={currency}
              onChange={setCurrency}
              disabled={!isOwner || currencyLoading}
              loading={currencyLoading}
            />

            {isOwner && (
              <button
                type="button"
                disabled={!currencyDirty || savingCurrency}
                onClick={saveCurrency}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {savingCurrency ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            This sets the base currency for expenses in this group.
          </p>
          {!isOwner && (
            <p className="mt-1 text-xs text-slate-500">
              Only the owner can change the currency.
            </p>
          )}
        </Field>
      </div>
    </div>
  );
}

/* Searchable dropdown: type to filter, shows small list (~2 items high) then scroll */
function CurrencyDropdown({
  currencies = [],
  value,
  onChange,
  disabled,
  loading,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  const selected = currencies.find((c) => c.code === value);
  const label = loading
    ? "Loading…"
    : selected
    ? `${selected.code} — ${selected.name}`
    : value
    ? `${value} — Group currency`
    : "Select currency";

  const filtered = currencies.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      (c.name || "").toLowerCase().includes(q)
    );
  });

  // 🔒 Close when clicking outside
  useEffect(() => {
    if (!open) return;

    const handleClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = (code) => {
    onChange?.(code);
    setOpen(false); // close dropdown
    setQuery(""); // reset search
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    setOpen((o) => !o);
    // optional: reset query each time you open
    if (!open) setQuery("");
  };

  return (
    <div className="relative w-full" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleTriggerClick}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
      >
        {label}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code or name…"
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-900"
            />
          </div>

          {/* Options: ~2 items high, scroll for the rest */}
          <div className="max-h-24 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-3 text-sm text-slate-500">No matches</div>
            )}

            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                // ⬇️ stop bubbling so the trigger button above doesn't re-toggle
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(c.code);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                  c.code === value
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700"
                }`}
              >
                <span>
                  <span className="font-medium">{c.code}</span>{" "}
                  <span className="text-xs text-slate-500">{c.name}</span>
                </span>
                {c.code === value && (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MembersSection({
  members = [],
  invites = [],
  isOwner,
  isMember,
  ownerId,
  groupId,
  groupName,
  currentUserId,
  confirmAction,
  onChanged,
}) {
  // 🔁 local state to update immediately on add/remove/transfer
  const [list, setList] = useState(members);
  const [pending, setPending] = useState(invites);
  const [currentOwnerId, setCurrentOwnerId] = useState(ownerId);

  // keep in sync if parent props change (e.g., modal reopened)
  useEffect(() => setList(members), [members]);
  useEffect(() => setPending(invites), [invites]);
  useEffect(() => setCurrentOwnerId(ownerId), [ownerId]);

  const emailOf = (m) => m?.email || m?.primaryEmail || m?.contact?.email || "";

  // ✅ called by AddMemberForm after successful POST
  const handleAdded = ({ invited, member, inviteStatus, identifier, user }) => {
    if (invited) {
      const email = (user?.email || identifier || "").trim();
      const name =
        user?.username || (email ? email.split("@")[0] : "Invited user");

      setPending((prev) => {
        const exists = prev.some(
          (inv) =>
            (inv?.user?.email || inv?.email || "").toLowerCase() ===
            email.toLowerCase()
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            user: user || null,
            email,
            status: inviteStatus || "pending",
          },
        ];
      });
    } else if (member) {
      setList((prev) => {
        const exists = prev.some(
          (m) =>
            String(m?._id || m?.id || m) === String(member._id || member.id)
        );
        if (exists) return prev;
        return [...prev, member];
      });
    }
    onChanged?.(); // optional background refresh
  };

  const removeMember = (memberId, memberName) => {
    if (!isOwner) return;
    confirmAction({
      title: "Remove member?",
      description: `Remove ${memberName || "this user"} from “${groupName}”?`,
      confirmText: "Remove",
      danger: true,
      onConfirm: async () => {
        const res = await fetch(
          `/api/proxy/groups/${groupId}/members/${memberId}`,
          { method: "DELETE", headers: { Accept: "application/json" } }
        );
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.message || "Failed to remove member");
        setList((prev) =>
          prev.filter((m) => String(m?._id || m?.id || m) !== String(memberId))
        );
        onChanged?.();
      },
    });
  };

  const makeOwner = (newOwnerId, memberName) => {
    if (!isOwner) return;
    confirmAction({
      title: "Make owner?",
      description: `Make ${
        memberName || "this user"
      } the owner of “${groupName}”?`,
      confirmText: "Make owner",
      onConfirm: async () => {
        const res = await fetch(
          `/api/proxy/groups/${groupId}/transfer-ownership`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ newOwnerId }),
          }
        );
        const j = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(j?.message || "Failed to transfer ownership");
        setCurrentOwnerId(newOwnerId);
        onChanged?.();
      },
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-slate-900">
        Members & invites
      </h3>

      {/* Invite (allowed for ANY member) */}
      <AddMemberForm
        groupId={groupId}
        canInvite={isMember}
        onSuccess={handleAdded}
      />

      {/* Members list (shows email) */}
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
        {list.map((m) => {
          const id = m?._id || m?.id || m;
          const name = m?.username || m?.name || emailOf(m) || id;
          const email = emailOf(m);
          const isYou = String(id) === String(currentUserId);
          const isRowOwner = String(id) === String(currentOwnerId);

          return (
            <li
              key={id}
              className="flex items-center justify-between gap-2 p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">
                  {name}{" "}
                  {isYou && (
                    <span className="text-xs text-slate-500">(you)</span>
                  )}
                </div>
                {email ? (
                  <div className="truncate text-xs text-slate-600">{email}</div>
                ) : null}
                <div className="text-xs text-slate-500">
                  {isRowOwner ? "Owner" : "Member"}
                </div>
              </div>

              {isOwner && !isRowOwner && !isYou && (
                <div className="flex items-center gap-1">
                  <IconButton
                    title="Remove member"
                    variant="danger"
                    onClick={() => removeMember(id, name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    title="Make owner"
                    onClick={() => makeOwner(id, name)}
                  >
                    <Crown className="h-4 w-4" />
                  </IconButton>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Pending invites (view-only; updated immediately on invite) */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-900">
          Pending invites
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-600">No pending invites.</p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
            {pending.map((inv, i) => {
              const email = inv?.user?.email || inv?.email || "";
              const name =
                inv?.user?.username ||
                (email ? email.split("@")[0] : "Invited user");
              return (
                <li
                  key={email || i}
                  className="flex items-center justify-between gap-2 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {name}
                    </div>
                    {email ? (
                      <div className="truncate text-xs text-slate-600">
                        {email}
                      </div>
                    ) : null}
                    <div className="text-xs text-slate-500">
                      {inv?.status || "pending"}
                    </div>
                  </div>
                  {/* No actions for now (no cancel/resend API) */}
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs text-slate-500">
          Invites are view-only for now and will show as “pending” until
          accepted.
        </p>
      </div>
    </div>
  );
}

function DangerSection({
  isOwner,
  members = [],
  ownerId,
  groupName,
  onTransfer,
  onLeave,
  onDelete,
}) {
  const [newOwnerId, setNewOwnerId] = useState("");

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <ShieldAlert className="h-4 w-4" /> Danger zone
      </h3>

      <DangerRow
        title="Transfer ownership"
        description="Give ownership to another member."
        btn="Transfer to selected"
        disabled={!isOwner || !newOwnerId}
        onClick={() => isOwner && newOwnerId && onTransfer?.(newOwnerId)}
      >
        {isOwner && (
          <OwnerSelect
            members={members}
            ownerId={ownerId}
            value={newOwnerId}
            onChange={setNewOwnerId}
            placeholder="Select a new owner"
          />
        )}
      </DangerRow>

      <DangerRow
        title={isOwner ? "Leave group (requires new owner)" : "Leave group"}
        description={
          isOwner
            ? `Pick a new owner above, then leave “${groupName}.”`
            : "You will lose access to this group's expenses and discussion."
        }
        btn={
          <span className="inline-flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Leave
          </span>
        }
        disabled={isOwner && !newOwnerId}
        onClick={() => onLeave?.(isOwner ? newOwnerId : undefined)}
      />

      <DangerRow
        title="Delete group"
        description="Permanently delete this group and its data. This cannot be undone."
        btn="Delete"
        disabled={!isOwner}
        variant="danger"
        onClick={onDelete}
      />
    </div>
  );
}

/* ——— Helpers ——— */

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {children}
    </label>
  );
}

function IconButton({
  children,
  title,
  disabled,
  variant = "neutral",
  onClick,
}) {
  const base =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition";
  const theme =
    variant === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100";
  const disabledCls =
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`${base} ${theme} ${disabledCls}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DangerRow({
  title,
  description,
  btn,
  disabled,
  variant = "warn",
  onClick,
  children,
}) {
  const style =
    variant === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div className={`space-y-2 rounded-xl border p-3 ${style}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs opacity-80">{description}</div>
        </div>
        <button
          disabled={disabled}
          onClick={onClick}
          className={`w-full rounded-md px-3 py-2 text-sm font-medium sm:w-auto ${
            disabled
              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          {btn}
        </button>
      </div>
      {children}
    </div>
  );
}

function OwnerSelect({
  members,
  ownerId,
  value,
  onChange,
  placeholder = "Select",
}) {
  const candidates = (members || []).filter(
    (m) => String(m?._id || m?.id || m) !== String(ownerId)
  );
  const emailOf = (m) => m?.email || m?.primaryEmail || m?.contact?.email || "";
  return (
    <div className="mt-1">
      <select
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {candidates.map((m) => {
          const id = m?._id || m?.id || m;
          const name = m?.username || m?.name || emailOf(m) || id;
          const email = emailOf(m);
          return (
            <option key={id} value={id}>
              {email ? `${name} (${email})` : name}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/* Invite form (optimistic update via onSuccess) */
function AddMemberForm({ groupId, canInvite, compact = false, onSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  // lookup UI state
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupUser, setLookupUser] = useState(null);
  const [lookupCheckedValue, setLookupCheckedValue] = useState("");

  // ⭐ NEW: invite sharing state
  const [inviteSharing, setInviteSharing] = useState(false);

  const isCompleteEmail = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

  // "International-ish" phone: starts with +, has at least 7 digits
  const looksLikeIntlPhone = (v) => {
    const s = (v || "").trim();
    if (!s.startsWith("+")) return false;
    const digits = s.replace(/\D/g, "");
    return digits.length >= 7;
  };

  const displayName = (u) =>
    u?.displayName ||
    u?.username ||
    (u?.email ? u.email.split("@")[0] : "") ||
    u?._id ||
    "";

  // ⭐ helper to share group invite link (for non-existing users)
  async function shareGroupInviteLink(inviteUrl, identifierLabel) {
    if (!inviteUrl) return;

    setInviteSharing(true);
    try {
      const label = (identifierLabel || "").trim();
      const baseLine =
        "Join my group on Divsez so we can split and track expenses easily.";
      const shareText = label
        ? `I tried to add you (${label}) to my group on Divsez.\n\n${baseLine}\n\n${inviteUrl}`
        : `${baseLine}\n\n${inviteUrl}`;

      // Prefer native share sheet on mobile
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "Join my group on Divsez",
            text: shareText,
            url: inviteUrl,
          });
          return;
        } catch (err) {
          // user cancelled or error → fall through to clipboard
          // console.warn("navigator.share failed:", err);
        }
      }

      // Fallback: copy invite link to clipboard
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          alert(
            "Invite link copied to your clipboard.\n\nPaste it into WhatsApp, SMS, Messenger, etc. to invite them to this group."
          );
          return;
        } catch (err) {
          // console.warn("clipboard failed:", err);
        }
      }

      // Final fallback: plain alert with URL
      alert(`Share this invite link with them:\n\n${inviteUrl}`);
    } finally {
      setInviteSharing(false);
    }
  }

  // Debounced lookup when identifier looks like email or +phone
  useEffect(() => {
    setLookupUser(null);
    setLookupCheckedValue("");

    const value = identifier.trim();
    const shouldLookup = isCompleteEmail(value) || looksLikeIntlPhone(value);
    if (!shouldLookup) {
      setLookupLoading(false);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setLookupLoading(true);
        const q = encodeURIComponent(value);

        // backend expects ?query=
        const res = await fetch(`/api/proxy/user/search?query=${q}`, {
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        // Normalize possible API shapes
        let pool = [];
        if (Array.isArray(data)) pool = data;
        else if (Array.isArray(data?.users)) pool = data.users;
        else if (Array.isArray(data?.results)) pool = data.results;
        else if (Array.isArray(data?.data)) pool = data.data;
        else if (data?.user && typeof data.user === "object")
          pool = [data.user];
        else if (
          data &&
          typeof data === "object" &&
          (data.email || data._id || data.username || data.phone)
        ) {
          pool = [data]; // single user object
        }

        // Prefer exact match on email or phone if present
        const lower = value.toLowerCase();
        const exact =
          pool.find((u) => {
            const email = (u?.email || "").toLowerCase();
            const phone = (u?.phone || "").toLowerCase();
            return email === lower || phone === lower;
          }) || null;

        setLookupUser(exact);
        setLookupCheckedValue(value);
      } catch {
        // soft-fail: just don't show a match
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [identifier]);

  const disabled =
    !canInvite || submitting || inviteSharing || !identifier.trim();
  const showLookup =
    isCompleteEmail(identifier.trim()) || looksLikeIntlPhone(identifier.trim());

  const onSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    setMsg("");
    try {
      const value = identifier.trim();
      const res = await fetch(`/api/proxy/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ identifier: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to add member");

      // ✅ Optimistic update callback to parent
      onSuccess?.({
        invited: !!json?.invited,
        member: json?.member || null,
        inviteStatus: json?.inviteStatus,
        identifier: value,
        user: lookupUser || null,
      });

      if (json?.invited) {
        // New behaviour: we expect backend to HAVE NOT sent SMS/email.
        // If inviteUrl exists, trigger share flow.
        if (json?.inviteUrl) {
          setMsg("Invite link ready. Share it with them.");
          // fire-and-forget, UI already shows success
          shareGroupInviteLink(json.inviteUrl, value);
        } else {
          // Fallback if backend not yet updated to send inviteUrl
          setMsg("Invite created. Please share the link from your invites.");
        }
      } else {
        setMsg("Member added.");
      }

      setIdentifier("");
      setLookupUser(null);
      setLookupCheckedValue("");
    } catch (err) {
      setMsg(err.message || "Invite failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-xl border border-slate-200 ${
        compact ? "p-2" : "p-3"
      } bg-slate-50`}
    >
      {!compact && (
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
          <UserPlus className="h-4 w-4" /> Add member
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            setMsg("");
          }}
          placeholder="Email, mobile (+61…), or username"
          disabled={!canInvite || submitting || inviteSharing}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={disabled}
          className={`rounded-md px-3 py-2 text-sm font-medium sm:w-auto ${
            disabled
              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          {submitting || inviteSharing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Invite"
          )}
        </button>
      </div>

      {/* 📌 Helper note (same idea as PeoplePicker) */}
      <p className="mt-1 text-xs text-slate-500">
        For mobile numbers, please use full international format (e.g.{" "}
        <span className="font-mono">+61…</span>).
      </p>

      {/* Inline helper messages (email / phone lookup) */}
      {showLookup && (
        <div className="mt-1 text-xs text-slate-600">
          {lookupLoading ? (
            "Looking up user…"
          ) : lookupUser ? (
            <>
              User:{" "}
              <span className="font-medium">
                {displayName(lookupUser)}
                {lookupUser.email ? ` (${lookupUser.email})` : ""}
              </span>
            </>
          ) : lookupCheckedValue ? (
            <>
              No account for{" "}
              <span className="font-medium">{lookupCheckedValue}</span> — an
              invite link will be generated for you to share.
            </>
          ) : null}
        </div>
      )}

      {msg && <div className="mt-1 text-xs text-slate-600">{msg}</div>}
      {!canInvite && (
        <div className="mt-1 text-xs text-slate-500">
          Only group members can invite others.
        </div>
      )}
    </form>
  );
}
