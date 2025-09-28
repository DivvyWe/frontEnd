// src/app/profile/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiEdit2,
  FiCheck,
  FiX,
  FiMail,
  FiPhone,
  FiUser,
  FiLogOut,
} from "react-icons/fi";
import LogoutButton from "@/components/LogoutButton";
import ChangePasswordModal from "@/components/ChangePasswordModal";

const BRAND = "#84CC16";

/* PATCH profile helper — adjust the URL if your backend differs */
async function patchProfile(payload) {
  const res = await fetch("/api/proxy/auth/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update profile");
  }
  return res.json();
}

function FieldRow({
  icon: Icon,
  label,
  name,
  value,
  onSave,
  type = "text",
  placeholder = "",
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const dirty = draft !== (value || "");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="mt-1 rounded-md bg-slate-100 p-2">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase text-slate-500">
          {label}
        </div>

        {!editing ? (
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <div className="truncate text-slate-800">
              {value || <span className="text-slate-400">—</span>}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <FiEdit2 className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <input
              type={type}
              name={name}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-[#84CC16]/20 focus:border-[#84CC16] focus:ring-4"
            />
            <button
              onClick={async () => {
                if (!dirty) return setEditing(false);
                try {
                  await onSave({ [name]: draft });
                  setEditing(false);
                } catch (e) {
                  alert(e.message || "Update failed");
                }
              }}
              disabled={!dirty}
              className={`grid h-9 w-9 place-items-center rounded-lg text-white ${
                dirty ? "hover:opacity-90" : "bg-slate-300 cursor-not-allowed"
              }`}
              style={dirty ? { backgroundColor: BRAND } : {}}
              title="Save"
            >
              <FiCheck className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setDraft(value || "");
                setEditing(false);
              }}
              className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              title="Cancel"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [saving, setSaving] = useState(false);
  const initials = useMemo(
    () => (me?.username?.[0] || "U").toUpperCase(),
    [me]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/proxy/auth/me", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        if (alive) setMe(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleSave(patch) {
    setSaving(true);
    try {
      const updated = await patchProfile(patch);
      setMe((m) => ({ ...(m || {}), ...(updated || patch) }));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="animate-pulse rounded-xl bg-white/60 p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-200" />
            <div className="h-5 w-48 rounded bg-slate-200" />
          </div>
          <div className="grid gap-3">
            <div className="h-16 rounded-xl bg-slate-100" />
            <div className="h-16 rounded-xl bg-slate-100" />
            <div className="h-16 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl">
        {/* Header card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {me?.username || "Your profile"}
                </h1>
                <p className="text-sm text-slate-600">
                  Manage your account & preferences
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const evt = new CustomEvent("open-change-password");
                window.dispatchEvent(evt);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Change password
            </button>
          </div>

          {/* Inline editable fields */}
          <div className="grid gap-3">
            <FieldRow
              icon={FiUser}
              label="Username"
              name="username"
              value={me?.username || ""}
              onSave={handleSave}
              placeholder="Your display name"
            />
            <FieldRow
              icon={FiMail}
              label="Email"
              name="email"
              value={me?.email || ""}
              onSave={handleSave}
              type="email"
              placeholder="name@example.com"
            />
            <FieldRow
              icon={FiPhone}
              label="Phone"
              name="phone"
              value={me?.phone || ""}
              onSave={handleSave}
              type="tel"
              placeholder="+61 ..."
            />
          </div>
        </div>

        {/* Logout card */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sign out</h2>
              <p className="text-sm text-slate-600">
                You’ll need to sign in again to access your groups.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-red-50">
                <FiLogOut className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-slate-900">
                  Logout of this account
                </div>
                <div className="text-slate-600">
                  This will end your current session.
                </div>
              </div>
            </div>
            <div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      {/* 🔐 Change Password Modal (listens to the event and opens) */}
      <ChangePasswordModal />
    </>
  );
}
