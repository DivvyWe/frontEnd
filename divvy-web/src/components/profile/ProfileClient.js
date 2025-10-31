// src/app/profile/ProfileClient.jsx
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
  FiShield,
  FiFileText,
  FiLock,
  FiMapPin,
} from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import ChangePasswordModal from "@/components/ChangePasswordModal";

const BRAND = "#84CC16";

/* PATCH profile helper */
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

/* ------------------------------ Editable Field ------------------------------ */
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
      <div className="mt-1 rounded-md bg-slate-100 p-2 shrink-0 aspect-square grid place-items-center">
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
              className={`grid h-9 w-9 aspect-square place-items-center rounded-lg text-white ${
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
              className="grid h-9 w-9 aspect-square place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
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

/* ------------------------------ Profile ------------------------------ */
export default function ProfileClient({ initialMe }) {
  const [me, setMe] = useState(initialMe);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const initials = useMemo(
    () => (me?.username?.[0] || "U").toUpperCase(),
    [me]
  );

  async function handleSave(patch) {
    setSaving(true);
    try {
      const updated = await patchProfile(patch);
      setMe((m) => ({ ...(m || {}), ...(updated || patch) }));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      // 1) Try your hidden LogoutButton (if it renders a [data-logout] button)
      const hiddenTrigger = document.querySelector("button[data-logout]");
      if (hiddenTrigger) {
        hiddenTrigger.click();
      }

      // 2) Also call the API directly as a reliable fallback
      //    (adjust endpoint/method if your backend differs)
      await fetch("/api/proxy/auth/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).catch(() => {});

      // 3) Route out (to sign-in or landing)
      router.replace("/auth/signin");
    } catch (e) {
      console.error(e);
      alert("Could not log out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-3xl">
        {/* Header card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          {/* stack on mobile, row on sm+ */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="grid h-14 w-14 aspect-square shrink-0 place-items-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700 select-none leading-none">
                {initials}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900 truncate">
                  {me?.username || "Your profile"}
                </h1>
                <p className="text-sm text-slate-600">
                  Manage your account & preferences
                </p>
              </div>
            </div>

            {/* ✅ Mobile-first Change Password button */}
            <button
              onClick={() => {
                const evt = new CustomEvent("open-change-password");
                window.dispatchEvent(evt);
              }}
              aria-label="Change password"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#84CC16]/30"
            >
              <FiLock className="h-4 w-4" />
              <span>Change password</span>
            </button>
          </div>

          {/* Editable fields */}
          <div className="grid gap-3">
            <FieldRow
              icon={FiUser}
              label="Full Name"
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
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Sign out
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            You’ll need to sign in again to access your groups.
          </p>

          <div className="rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 aspect-square shrink-0 place-items-center rounded-full bg-[#84CC16]/10">
                <FiLogOut className="h-5 w-5 text-[#84CC16]" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-slate-900">
                  Logout of this account
                </div>
                <div className="text-sm text-slate-600">
                  Ends your current session securely.
                </div>
              </div>
            </div>

            {/* Modern Logout Button with spinner */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] ${
                loggingOut
                  ? "bg-[#84CC16]/70 cursor-wait"
                  : "bg-[#84CC16] hover:bg-[#76b514]"
              }`}
            >
              {loggingOut ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      fill="currentColor"
                      className="opacity-75"
                    />
                  </svg>
                  Logging out…
                </>
              ) : (
                <>
                  <FiLogOut className="h-4 w-4" />
                  Logout
                </>
              )}
            </button>

            {/* Hidden backend logout trigger (if your component uses data-logout) */}
            <div className="hidden">
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* Legal & Info card */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Legal & Info
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Review our policies to understand how Divsez protects your data and
            your rights as a user.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/privacy"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#84CC16] transition"
            >
              <FiShield className="h-4 w-4" />
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#84CC16] transition"
            >
              <FiFileText className="h-4 w-4" />
              Terms & Conditions
            </Link>
            <Link
              href="/acknowledgement"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#84CC16] transition"
            >
              <FiMapPin className="h-4 w-4" />
              Acknowledgement
            </Link>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal />
    </>
  );
}
