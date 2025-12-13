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
  FiChevronDown, // 👈 added
} from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import { sendFirebaseSms, getFirebaseIdToken } from "@/lib/firebaseClient";

// libphonenumber-js metadata + helpers (no hardcoded list)
import metadata from "libphonenumber-js/metadata.full.json";
import { getCountries, getCountryCallingCode } from "libphonenumber-js/core";

// SVG flags
import ReactCountryFlag from "react-country-flag";
import PhoneCountrySelect from "./PhoneCountrySelect";

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

// ISO country → emoji flag (for option text / fallback)
function getFlagEmoji(iso2) {
  if (!iso2) return "🏳️";
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
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
  editable = true,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const dirty = draft !== (value || "");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 w-full">
      <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="rounded-md bg-slate-100 p-2 shrink-0 grid place-items-center">
            <Icon className="h-4 w-4 text-slate-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase text-slate-500 mb-0.5">
              {label}
            </div>

            {!editing ? (
              <div className="text-slate-800 break-words sm:truncate">
                {value || <span className="text-slate-400">—</span>}
              </div>
            ) : (
              <input
                type={type}
                name={name}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-[#84CC16]/20 focus:border-[#84CC16] focus:ring-4"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          {!editing ? (
            editable && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                title="Edit"
              >
                <FiEdit2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Profile ------------------------------ */
export default function ProfileClient({ initialMe }) {
  const [me, setMe] = useState(initialMe);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const initials = useMemo(
    () => (me?.username?.[0] || "U").toUpperCase(),
    [me]
  );

  const hasPhone = !!me?.phone;
  const isPhoneVerified = hasPhone && !!me?.phoneVerified;

  // Build dynamic country list from libphonenumber-js metadata
  const countryOptions = useMemo(() => {
    try {
      const isoList = getCountries(metadata) || [];
      return isoList
        .map((iso2) => {
          let dial = "";
          try {
            dial = getCountryCallingCode(iso2, metadata);
          } catch {
            dial = "";
          }
          return {
            iso2,
            dialCode: dial,
            flag: getFlagEmoji(iso2),
          };
        })
        .filter((c) => c.dialCode)
        .sort((a, b) => a.iso2.localeCompare(b.iso2));
    } catch (e) {
      console.error("Failed to build country options from metadata:", e);
      return [{ iso2: "AU", dialCode: "61", flag: getFlagEmoji("AU") }];
    }
  }, []);

  const [countryCode, setCountryCode] = useState(
    initialMe?.countryCode || "AU"
  );
  const [localNumber, setLocalNumber] = useState("");

  const [smsSent, setSmsSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showPhoneEditor, setShowPhoneEditor] = useState(false);

  // Helper: get dial code from dynamic list
  function getCallingCodeFromList(iso2) {
    const entry = countryOptions.find((c) => c.iso2 === iso2);
    return entry?.dialCode || "";
  }

  // If user already has phone + countryCode, try to prefill local part
  useEffect(() => {
    if (!me?.phone) return;
    if (!me?.phone.startsWith("+")) return;

    const digits = me.phone.slice(1);
    const code = getCallingCodeFromList(countryCode);
    if (code && digits.startsWith(code)) {
      setLocalNumber(digits.slice(code.length));
    }
  }, [me?.phone, countryCode, countryOptions]);

  async function handleSave(patch) {
    const updated = await patchProfile(patch);
    setMe((m) => ({ ...(m || {}), ...(updated || patch) }));
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      // ---------------------------
      // 1. BACKEND LOGOUT
      // ---------------------------
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      }).catch(() => {});

      // ---------------------------
      // 2. PUSH UNSUBSCRIBE + CACHE CLEAR + SW UNREGISTER
      // ---------------------------
      if (typeof window !== "undefined") {
        try {
          // --- A) Unsubscribe from push ---
          if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
              try {
                const sub = await reg.pushManager.getSubscription();
                if (sub) await sub.unsubscribe();
              } catch {
                /* ignore errors */
              }
            }
          }

          // --- B) Clear Cache Storage ---
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          }

          // --- C) Unregister Service Workers (optional but recommended) ---
          if ("serviceWorker" in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((reg) => reg.unregister()));
          }
        } catch {
          /* ignore cleanup errors */
        }
      }

      // ---------------------------
      // 3. CLEAR TOKEN COOKIE
      // ---------------------------
      document.cookie = [
        "token=;",
        "Path=/",
        "Max-Age=0",
        "SameSite=Lax",
        window.location.protocol === "https:" ? "Secure" : null,
      ]
        .filter(Boolean)
        .join("; ");

      // ---------------------------
      // 4. REDIRECT
      // ---------------------------
      router.replace("/auth/signin");
      router.refresh?.();
    } catch (e) {
      console.error(e);
      alert("Could not log out. Please try again.");
      setLoggingOut(false);
    }
  }

  // ---- Phone verification handlers ----
  async function handleSendSms() {
    setPhoneError("");
    setPhoneMsg("");
    setPhoneLoading(true);

    try {
      const trimmedLocal = localNumber.trim();
      if (!trimmedLocal) {
        throw new Error("Please enter your phone number.");
      }

      const dialCode = getCallingCodeFromList(countryCode);
      if (!dialCode) {
        throw new Error("Unsupported country. Please choose a valid option.");
      }

      const rawPhone = `+${dialCode}${trimmedLocal}`;

      const availabilityRes = await fetch(
        `/api/proxy/auth/phone/check-available?phone=${encodeURIComponent(
          rawPhone
        )}&countryCode=${encodeURIComponent(countryCode)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!availabilityRes.ok) {
        const data = await availabilityRes.json().catch(() => ({}));

        if (availabilityRes.status === 409) {
          throw new Error(
            data?.message || "This phone number is already in use."
          );
        }

        if (availabilityRes.status === 400) {
          throw new Error(
            data?.message || "Invalid phone number. Please check and try again."
          );
        }

        throw new Error(data?.message || "Could not validate phone number.");
      }

      const confirmation = await sendFirebaseSms(rawPhone);
      setConfirmationResult(confirmation);
      setSmsSent(true);
      setPhoneMsg("SMS sent. Please enter the code you received.");
    } catch (err) {
      console.error(err);
      setPhoneError(err.message || "Failed to send SMS");
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleVerifyCode() {
    setPhoneError("");
    setPhoneMsg("");
    if (!confirmationResult) {
      setPhoneError("Please request SMS first.");
      return;
    }
    if (!otpCode.trim()) {
      setPhoneError("Please enter the verification code.");
      return;
    }

    setPhoneLoading(true);
    try {
      await confirmationResult.confirm(otpCode.trim());
      const idToken = await getFirebaseIdToken(true);

      const res = await fetch("/api/proxy/auth/phone/firebase-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to verify phone");
      }

      setMe((prev) => ({
        ...(prev || {}),
        phone: data.phone || prev?.phone,
        phoneVerified: !!data.phoneVerified,
        countryCode: data.countryCode || countryCode || prev?.countryCode,
      }));

      setPhoneMsg("Phone verified successfully 🎉");
      setSmsSent(false);
      setConfirmationResult(null);
      setOtpCode("");
      setShowPhoneEditor(false);
    } catch (err) {
      console.error(err);
      setPhoneError(err.message || "Failed to verify phone");
    } finally {
      setPhoneLoading(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-3xl p-4 pb-14 sm:p-0">
        {/* Header card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 overflow-x-hidden">
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

            <button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("open-change-password"))
              }
              aria-label="Change password"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#84CC16]/30"
            >
              <FiLock className="h-4 w-4" />
              <span>Change password</span>
            </button>
          </div>

          {/* Fields */}
          <div className="grid gap-3">
            <FieldRow
              icon={FiUser}
              label="Full Name"
              name="username"
              value={me?.username || ""}
              onSave={handleSave}
              placeholder="Your display name"
              editable={true}
            />
            <FieldRow
              icon={FiMail}
              label="Email"
              name="email"
              value={me?.email || ""}
              onSave={handleSave}
              type="email"
              placeholder="name@example.com"
              editable={false}
            />

            {/* Phone row */}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 w-full">
              <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="rounded-md bg-slate-100 p-2 shrink-0 grid place-items-center">
                    <FiPhone className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium uppercase text-slate-500 mb-0.5">
                      Phone number
                    </div>
                    <div className="text-slate-800 break-words sm:truncate">
                      {hasPhone ? (
                        me.phone
                      ) : (
                        <span className="text-slate-400">
                          Add your phone to enable phone-based invites.
                        </span>
                      )}
                    </div>
                    {!isPhoneVerified && hasPhone && (
                      <p className="mt-1 text-xs text-amber-700">
                        Not verified — you can&apos;t invite others by phone,
                        and they can&apos;t invite you by phone until this
                        number is verified.
                      </p>
                    )}
                    {isPhoneVerified && hasPhone && (
                      <p className="mt-1 text-xs text-emerald-700">
                        Verified — you can invite others and be invited using
                        your phone number.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  {!hasPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhoneEditor(true);
                        setSmsSent(false);
                        setConfirmationResult(null);
                        setOtpCode("");
                        setPhoneMsg("");
                        setPhoneError("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-[#84CC16] hover:bg-[#76b514] active:scale-[0.98]"
                    >
                      <FiPhone className="h-3.5 w-3.5" />
                      <span>Add phone number</span>
                    </button>
                  )}

                  {hasPhone && !isPhoneVerified && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhoneEditor((prev) => !prev);
                        setSmsSent(false);
                        setConfirmationResult(null);
                        setOtpCode("");
                        setPhoneMsg("");
                        setPhoneError("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-[#84CC16] hover:bg-[#76b514] active:scale-[0.98]"
                    >
                      <FiShield className="h-3.5 w-3.5" />
                      <span>Verify phone</span>
                    </button>
                  )}

                  {hasPhone && isPhoneVerified && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <FiCheck className="h-3.5 w-3.5" />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded editor */}
              {showPhoneEditor && !isPhoneVerified && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  {phoneError && (
                    <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {phoneError}
                    </div>
                  )}
                  {phoneMsg && (
                    <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      {phoneMsg}
                    </div>
                  )}

                  <div className="space-y-3 max-w-md">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Phone number
                      </label>
                      <div className="flex gap-2">
                        {/* Country dropdown with flag + custom chevron */}
                        <div className="relative w-40">
                          {/* Flag on the left */}
                          <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 flex items-center">
                            <ReactCountryFlag
                              countryCode={countryCode}
                              svg
                              style={{
                                width: "1.25rem",
                                height: "1.25rem",
                                borderRadius: "999px",
                              }}
                            />
                          </div>

                          <PhoneCountrySelect
                            countryCode={countryCode}
                            setCountryCode={setCountryCode}
                            countryOptions={countryOptions}
                          />
                        </div>

                        {/* Local number input */}
                        <input
                          type="tel"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                          placeholder=""
                          value={localNumber}
                          onChange={(e) =>
                            setLocalNumber(e.target.value.replace(/\D/g, ""))
                          }
                          disabled={phoneLoading}
                        />
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Enter your mobile number without the leading zero. We
                        will store it securely in international format.
                      </p>
                    </div>

                    {!smsSent ? (
                      <button
                        type="button"
                        onClick={handleSendSms}
                        disabled={phoneLoading || !localNumber.trim()}
                        className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-[0.98] ${
                          phoneLoading || !localNumber.trim()
                            ? "bg-slate-300 cursor-not-allowed"
                            : "bg-[#84CC16] hover:bg-[#76b514]"
                        }`}
                      >
                        {phoneLoading
                          ? "Sending SMS…"
                          : "Send verification code"}
                      </button>
                    ) : (
                      <>
                        <div>
                          <label
                            htmlFor="otpCode"
                            className="mb-1 block text-sm font-medium text-slate-700"
                          >
                            Verification code
                          </label>
                          <input
                            id="otpCode"
                            name="otpCode"
                            type="text"
                            inputMode="numeric"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                            placeholder="Enter the 6-digit code"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            disabled={phoneLoading}
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={phoneLoading || !otpCode.trim()}
                            className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-[0.98] ${
                              phoneLoading || !otpCode.trim()
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-[#84CC16] hover:bg-[#76b514]"
                            }`}
                          >
                            {phoneLoading ? "Verifying…" : "Verify code"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPhoneEditor(false);
                              setSmsSent(false);
                              setConfirmationResult(null);
                              setOtpCode("");
                              setPhoneMsg("");
                              setPhoneError("");
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}

                    <div id="firebase-recaptcha-container" className="mt-2" />
                  </div>
                </div>
              )}
            </div>
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
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition hover:text-[#84CC16]"
            >
              <FiMapPin className="h-4 w-4" />
              Acknowledgement
            </Link>
          </div>
        </div>
      </div>

      <ChangePasswordModal />
    </>
  );
}
