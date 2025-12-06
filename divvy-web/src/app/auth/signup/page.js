"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiPhone,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import Link from "next/link";

import PhoneCountrySelect from "@/components/profile/PhoneCountrySelect";
import { sendFirebaseSms } from "@/lib/firebaseClient";

import metadata from "libphonenumber-js/metadata.full.json";
import { getCountries, getCountryCallingCode } from "libphonenumber-js/core";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const STRONG_PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

// Convert local phone ("0413 561 159") → "+61xxxxxxxxx"
function normalisePhoneE164(localPhone, countryCode) {
  if (!localPhone || !countryCode) return null;
  try {
    const dial = getCountryCallingCode(countryCode, metadata);
    if (!dial) return null;

    const digits = localPhone.replace(/\D/g, "");
    if (!digits) return null;

    const withoutZero = digits.startsWith("0") ? digits.slice(1) : digits;
    return `+${dial}${withoutZero}`;
  } catch (e) {
    console.error("Failed to normalise phone", e);
    return null;
  }
}

export default function SignUpPage() {
  const router = useRouter();

  // form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("AU");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // ui state
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // verification flow (email + phone)
  const [verifyMode, setVerifyMode] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef(null);

  // phone verification (Firebase SMS)
  const [hasSignupPhone, setHasSignupPhone] = useState(false);
  const [pendingPhoneE164, setPendingPhoneE164] = useState(null);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneMsg, setPhoneMsg] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // country options
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
          return { iso2, dialCode: dial };
        })
        .filter((c) => c.dialCode)
        .sort((a, b) => a.iso2.localeCompare(b.iso2));
    } catch (e) {
      console.error("Failed to build country options from metadata:", e);
      return [{ iso2: "AU", dialCode: "61" }];
    }
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();
  const validEmail = EMAIL_RE.test(trimmedEmail);
  const strongPwd = STRONG_PWD_RE.test(password);
  const matches = confirm === password && password.length > 0;

  const phoneLooksOkay =
    trimmedPhone.length === 0 || /\d{4,}/.test(trimmedPhone.replace(/\D/g, ""));

  const canSubmit = useMemo(
    () =>
      !!fullName.trim() &&
      validEmail &&
      strongPwd &&
      matches &&
      phoneLooksOkay &&
      agree &&
      !submitting,
    [
      fullName,
      validEmail,
      strongPwd,
      matches,
      phoneLooksOkay,
      agree,
      submitting,
    ]
  );

  function handleGoogleSignup() {
    const oauthUrl = "/api/proxy/auth/google";
    window.location.assign(oauthUrl);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!validEmail) return setError("Please enter a valid email address.");
    if (!strongPwd)
      return setError(
        "Password must be 8+ chars and include uppercase, lowercase, number, and special character."
      );
    if (!matches) return setError("Passwords do not match.");
    if (!phoneLooksOkay)
      return setError(
        "Invalid phone number. Use a full mobile number or leave it blank."
      );
    if (!agree) return setError("Please agree to the Terms & Privacy.");

    setSubmitting(true);
    try {
      const payload = {
        username: fullName.trim(),
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined, // backend stores local format
        countryCode,
        password,
      };

      const res = await fetch("/api/proxy/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }

      if (!res.ok) {
        if (res.status === 409) {
          setError(
            data?.message ||
              "An account with this email or phone already exists. Try signing in."
          );
          return;
        }
        if (res.status === 400 && data?.message) {
          setError(data.message);
          return;
        }
        throw new Error(data?.message || "Registration failed");
      }

      // Prepare phone for Firebase SMS
      let e164 = null;
      if (trimmedPhone) {
        e164 = normalisePhoneE164(trimmedPhone, countryCode);
      }

      setPendingPhoneE164(e164);
      setHasSignupPhone(!!e164);

      // show verify screen
      setVerifyEmail(trimmedEmail);
      setVerifyMode(true);
      startCooldown(30);

      // reset phone verify state
      setPhoneError("");
      setPhoneMsg("");
      setPhoneOtp("");
      setPhoneVerified(false);
      setPhoneOtpSent(false);
      setConfirmationResult(null);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  function startCooldown(seconds) {
    setCooldown(seconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function onResendEmail() {
    if (!verifyEmail || resending || cooldown > 0) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Could not resend verification email");
      }
      startCooldown(30);
    } catch (e) {
      setError(e.message || "Could not resend verification email");
    } finally {
      setResending(false);
    }
  }

  // ===== PHONE OTP (Firebase SMS) =====

  async function sendSignupPhoneOtp() {
    if (!pendingPhoneE164) {
      setPhoneError("No mobile number found for this signup.");
      return;
    }
    setPhoneError("");
    setPhoneMsg("");
    setPhoneLoading(true);
    try {
      const confirmation = await sendFirebaseSms(pendingPhoneE164);
      setConfirmationResult(confirmation);
      setPhoneOtpSent(true);
      setPhoneMsg(
        `We’ve sent a 6-digit code to ${pendingPhoneE164}. Enter it below to verify your phone.`
      );
    } catch (err) {
      console.error(err);
      setPhoneError(
        err?.message || "Failed to send SMS. You can try again below."
      );
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleVerifyPhoneOtp() {
    if (!phoneOtp.trim()) {
      setPhoneError("Please enter the 6-digit code.");
      return;
    }
    if (!confirmationResult) {
      setPhoneError("Please send the SMS code first.");
      return;
    }

    setPhoneError("");
    setPhoneMsg("");
    setPhoneLoading(true);
    try {
      await confirmationResult.confirm(phoneOtp.trim());
      setPhoneVerified(true);
      setPhoneMsg("Phone verified successfully 🎉");
      setPhoneOtp("");
    } catch (err) {
      console.error(err);
      setPhoneError(err?.message || "Failed to verify phone");
    } finally {
      setPhoneLoading(false);
    }
  }

  // 🔥 AUTO-SEND SMS RIGHT AFTER "CREATE ACCOUNT" (once verify screen + reCAPTCHA are rendered)
  useEffect(() => {
    if (
      !verifyMode ||
      !hasSignupPhone ||
      !pendingPhoneE164 ||
      phoneOtpSent ||
      phoneVerified
    ) {
      return;
    }

    // Small delay to ensure #firebase-recaptcha-container is in the DOM
    const timer = setTimeout(() => {
      sendSignupPhoneOtp().catch(() => {
        // errors are already handled inside sendSignupPhoneOtp
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [
    verifyMode,
    hasSignupPhone,
    pendingPhoneE164,
    phoneOtpSent,
    phoneVerified,
  ]);

  // ================= VERIFY VIEW =================
  if (verifyMode) {
    return (
      <main className="min-h-screen grid place-items-center py-10 px-4 bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
        <div className="w-full max-w-md">
          {/* brand */}
          <div className="mb-6 flex items-center gap-2 justify-center">
            <Image
              src="/icons/icon-192.png"
              alt="Divsez logo"
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-xl"
            />
            <span className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tracking-tight text-[#84CC16]">
                Divsez
              </span>
              <span className="text-[8px] font-medium text-slate-400 uppercase tracking-wide">
                Beta
              </span>
            </span>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 shadow-lg shadow-emerald-100/60 backdrop-blur p-6 sm:p-8">
            <h1 className="text-xl font-semibold text-emerald-900">
              Verify your account
            </h1>
            <p className="mt-2 text-sm text-emerald-900/80">
              We’ve sent a verification link to{" "}
              <span className="font-semibold">{verifyEmail}</span>. Please open
              it to activate your account.
              {hasSignupPhone && pendingPhoneE164 && (
                <>
                  {" "}
                  We’re also sending a 6-digit SMS code to{" "}
                  <span className="font-semibold">{pendingPhoneE164}</span> so
                  you can verify your phone here.
                </>
              )}
            </p>

            <div className="mt-4 space-y-2 text-sm text-emerald-900/80">
              <p>Didn’t get the email?</p>
              <ul className="list-disc pl-5">
                <li>Check your spam or junk folder.</li>
                <li>
                  Ensure <span className="font-mono">noreply@divsez.com</span>{" "}
                  is allowed.
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={resending || cooldown > 0}
                onClick={onResendEmail}
                className={`inline-flex items-center justify-center rounded-lg px-3 py-2.5 font-semibold transition active:scale-[0.99] ${
                  resending || cooldown > 0
                    ? "bg-slate-300 text-white cursor-not-allowed"
                    : "bg-[#84CC16] text-white hover:bg-[#76b514]"
                }`}
              >
                {resending
                  ? "Resending…"
                  : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend verification email"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/auth/signin")}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to Sign in
              </button>
            </div>

            {/* PHONE VERIFY SECTION */}
            {hasSignupPhone && pendingPhoneE164 && (
              <div className="mt-8 rounded-xl border border-emerald-100 bg-white/70 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Verify your mobile number
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  We’ll use your phone so friends can find you by mobile and
                  invite you to groups. This step is optional but recommended.
                </p>

                {/* reCAPTCHA container for this page */}
                {/* <div id="firebase-recaptcha-container" className="mt-3" /> */}

                {phoneError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {phoneError}
                  </div>
                )}
                {phoneMsg && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    {phoneMsg}
                  </div>
                )}

                {!phoneVerified ? (
                  <div className="mt-4 space-y-3">
                    {!phoneOtpSent && !phoneError && (
                      <p className="text-xs text-slate-500">
                        Sending SMS with your verification code…
                      </p>
                    )}

                    {/* Resend button */}
                    {phoneOtpSent && (
                      <button
                        type="button"
                        onClick={sendSignupPhoneOtp}
                        disabled={phoneLoading}
                        className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm active:scale-[0.98] ${
                          phoneLoading
                            ? "bg-slate-300 text-white cursor-not-allowed"
                            : "bg-[#84CC16] text-white hover:bg-[#76b514]"
                        }`}
                      >
                        {phoneLoading ? "Sending SMS…" : "Resend SMS code"}
                      </button>
                    )}

                    {/* OTP input */}
                    {phoneOtpSent && (
                      <>
                        <div>
                          <label
                            htmlFor="phoneOtp"
                            className="mb-1 block text-xs font-medium text-slate-700"
                          >
                            Verification code
                          </label>
                          <input
                            id="phoneOtp"
                            name="phoneOtp"
                            type="text"
                            inputMode="numeric"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                            placeholder="Enter the 6-digit code"
                            value={phoneOtp}
                            onChange={(e) => setPhoneOtp(e.target.value)}
                            disabled={phoneLoading}
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleVerifyPhoneOtp}
                            disabled={phoneLoading || !phoneOtp.trim()}
                            className={`inline-flex flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-[0.98] ${
                              phoneLoading || !phoneOtp.trim()
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-[#84CC16] hover:bg-[#76b514]"
                            }`}
                          >
                            {phoneLoading ? "Verifying…" : "Verify phone"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-medium text-emerald-700">
                    Phone verified successfully 🎉 You’ll be able to use
                    phone-based invites once you sign in.
                  </p>
                )}
              </div>
            )}

            <p className="mt-6 text-xs text-emerald-900/70">
              You can still sign in once your email is verified, even if you
              skip phone verification now. You’ll be able to manage your phone
              from your profile later.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ================= SIGNUP FORM =================
  return (
    <main className="min-h-screen grid place-items-center py-10 px-4 bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      <div className="w-full max-w-md">
        {/* brand */}
        <div className="mb-6 flex items-center gap-2 justify-center">
          <Image
            src="/icons/icon-192.png"
            alt="Divsez logo"
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-xl"
          />
          <span className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold tracking-tight text-[#84CC16]">
              Divsez
            </span>
            <span className="text-[8px] font-medium text-slate-400 uppercase tracking-wide">
              Beta
            </span>
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-lg shadow-lime-100/60 backdrop-blur p-6 sm:p-8">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Join Divsez and simplify your shared expenses
            </p>
          </header>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Google sign up */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="mb-4 inline-flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition"
            aria-label="Continue with Google"
          >
            <FcGoogle className="text-xl" />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
                or
              </span>
            </div>
          </div>

          {/* Email sign up form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label
                htmlFor="fullName"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>
              <div className="relative">
                <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="fullName"
                  name="fullName"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Country + Phone (optional) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mobile (optional)
              </label>

              <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,2.1fr)] gap-2">
                <PhoneCountrySelect
                  countryCode={countryCode}
                  setCountryCode={setCountryCode}
                  countryOptions={countryOptions}
                />

                <div className="relative">
                  <FiPhone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="phone"
                    name="phone"
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g. 0413 561 159"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Use your local mobile format (e.g.{" "}
                <span className="font-mono">0413…</span> in Australia). After
                signup, we’ll automatically send a 6-digit SMS code so you can
                verify your phone.
              </p>

              {!phoneLooksOkay && trimmedPhone.length > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  Invalid phone number. Use a full mobile number or clear it.
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email (for login)
              </label>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  type="email"
                  inputMode="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {!validEmail && email.length > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  Enter a valid email address.
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  type={showPw ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {password.length > 0 && (
                <p
                  className={`mt-1 text-xs ${
                    STRONG_PWD_RE.test(password)
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {!STRONG_PWD_RE.test(password)
                    ? [
                        password.length < 8 && "at least 8 characters",
                        !/[A-Z]/.test(password) && "an uppercase letter",
                        !/[a-z]/.test(password) && "a lowercase letter",
                        !/\d/.test(password) && "a number",
                        !/[^\w\s]/.test(password) && "a special character",
                      ]
                        .filter(Boolean)
                        .reduce(
                          (msg, item, i, arr) =>
                            msg +
                            (i === 0
                              ? "Password must include "
                              : i === arr.length - 1
                              ? ` and ${item}`
                              : `, ${item}`),
                          ""
                        )
                    : "Password meets all requirements."}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirm"
                  name="confirm"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  type={showPw2 ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
                  onClick={() => setShowPw2((v) => !v)}
                  aria-label={showPw2 ? "Hide password" : "Show password"}
                >
                  {showPw2 ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {confirm.length > 0 && (
                <p
                  className={`mt-1 text-xs font-medium ${
                    matches ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {matches ? "Password matched." : "Passwords do not match."}
                </p>
              )}
            </div>

            {/* Terms */}
            <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#84CC16]"
              />
              <span className="inline-flex items-center gap-1">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-slate-900 hover:text-[#84CC16]"
                >
                  Terms
                </Link>{" "}
                &{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-slate-900 hover:text-[#84CC16]"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
              className={`mt-2 w-full rounded-lg px-3 py-2.5 font-semibold transition active:scale-[0.99] ${
                !canSubmit
                  ? "bg-slate-300 text-white cursor-not-allowed"
                  : "bg-[#84CC16] text-white hover:bg-[#76b514]"
              }`}
            >
              {submitting ? "Creating your account…" : "Create account"}
            </button>

            <p className="text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="font-semibold text-slate-900 hover:text-[#84CC16]"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-[#84CC16] hover:underline hover:text-[#76b514] transition"
          >
            Terms
          </Link>{" "}
          &{" "}
          <Link
            href="/privacy"
            className="font-medium text-[#84CC16] hover:underline hover:text-[#76b514] transition"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
