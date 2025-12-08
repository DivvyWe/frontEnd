"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiPhone,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import Link from "next/link";

import PhoneCountrySelect from "@/components/profile/PhoneCountrySelect";
import OtpInput from "@/components/OtpInput"; // ⭐ OTP UI
import { sendFirebaseSms } from "@/lib/firebaseClient";

import metadata from "libphonenumber-js/metadata.full.json";
import { getCountries, getCountryCallingCode } from "libphonenumber-js/core";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const STRONG_PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

// Convert "0413 561 159" → "+61413561159"
function normalisePhoneE164(localPhone, countryCode) {
  if (!localPhone || !countryCode) return null;
  try {
    const dial = getCountryCallingCode(countryCode, metadata);
    if (!dial) return null;

    const digits = localPhone.replace(/\D/g, "");
    const withoutZero = digits.startsWith("0") ? digits.slice(1) : digits;

    return `+${dial}${withoutZero}`;
  } catch (e) {
    console.error(e);
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

  // ui
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // verification flow
  const [verifyMode, setVerifyMode] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef(null);

  // phone OTP
  const [hasSignupPhone, setHasSignupPhone] = useState(false);
  const [pendingPhoneE164, setPendingPhoneE164] = useState(null);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneMsg, setPhoneMsg] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  // validation helpers
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();
  const validEmail = EMAIL_RE.test(trimmedEmail);
  const strongPwd = STRONG_PWD_RE.test(password);
  const matches = confirm === password && password.length > 0;
  const phoneLooksOkay =
    trimmedPhone.length === 0 || /\d{4,}/.test(trimmedPhone.replace(/\D/g, ""));

  const canSubmit =
    !!fullName.trim() &&
    validEmail &&
    strongPwd &&
    matches &&
    phoneLooksOkay &&
    agree &&
    !submitting;

  // country list
  const countryOptions = useMemo(() => {
    try {
      return getCountries(metadata)
        .map((iso2) => ({
          iso2,
          dialCode: getCountryCallingCode(iso2, metadata),
        }))
        .filter((c) => c.dialCode)
        .sort((a, b) => a.iso2.localeCompare(b.iso2));
    } catch {
      return [{ iso2: "AU", dialCode: "61" }];
    }
  }, []);

  // cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  // Start countdown timer
  function startCooldown(seconds) {
    setCooldown(seconds);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);

    cooldownTimer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // -------- SUBMIT SIGNUP --------
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
        data = JSON.parse(raw || "{}");
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

      // normalise phone for Firebase
      const e164 = trimmedPhone
        ? normalisePhoneE164(trimmedPhone, countryCode)
        : null;

      setPendingPhoneE164(e164);
      setHasSignupPhone(!!e164);

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
      setError(err.message || "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  }

  // -------- RESEND EMAIL --------
  async function onResendEmail() {
    if (!verifyEmail || cooldown > 0) return;

    setResending(true);
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
    } catch (err) {
      setError(err.message || "Resend failed");
    } finally {
      setResending(false);
    }
  }

  // -------- SEND SMS CODE --------
  async function sendSignupPhoneOtp() {
    if (!pendingPhoneE164) {
      setPhoneError("No mobile number found for this signup.");
      return;
    }

    setPhoneLoading(true);
    setPhoneError("");
    setPhoneMsg("");

    try {
      const confirmation = await sendFirebaseSms(pendingPhoneE164);
      setConfirmationResult(confirmation);
      setPhoneOtpSent(true);
      setPhoneMsg(`We’ve sent a 6-digit code to ${pendingPhoneE164}.`);
    } catch (err) {
      console.error(err);
      setPhoneError(
        err?.message || "Failed to send SMS. You can try again below."
      );
    } finally {
      setPhoneLoading(false);
    }
  }

  // -------- VERIFY SMS CODE --------
  async function handleVerifyPhoneOtp() {
    if (!phoneOtp || phoneOtp.length !== 6) {
      setPhoneError("Please enter the 6-digit code.");
      return;
    }
    if (!confirmationResult) {
      setPhoneError("Please send the SMS code first.");
      return;
    }

    try {
      setPhoneLoading(true);
      setPhoneError("");

      const cred = await confirmationResult.confirm(phoneOtp);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/proxy/auth/verify-phone-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, idToken }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message || "Backend failed to save verified phone number"
        );
      }

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

  // AUTO-SEND SMS on verify screen load
  useEffect(() => {
    if (
      verifyMode &&
      hasSignupPhone &&
      pendingPhoneE164 &&
      !phoneOtpSent &&
      !phoneVerified
    ) {
      const timer = setTimeout(() => {
        sendSignupPhoneOtp().catch(() => {});
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    verifyMode,
    hasSignupPhone,
    pendingPhoneE164,
    phoneOtpSent,
    phoneVerified,
  ]);

  // ===================== VERIFY MODE SCREEN =====================
  if (verifyMode) {
    return (
      <main className="min-h-screen grid place-items-center py-10 px-4 bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
        <div className="w-full max-w-md">
          {/* Brand */}
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

            {/* Email resend */}
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

            {/* PHONE VERIFY */}
            {hasSignupPhone && pendingPhoneE164 && (
              <div className="mt-8 rounded-xl border border-emerald-100 bg-white/70 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Verify your mobile number
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  We’ll use your phone so friends can find you by mobile and
                  invite you to groups. This step is optional but recommended.
                </p>

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
                    {/* OTP input – 6 digits, numeric */}
                    {phoneOtpSent && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Verification code
                        </label>
                        <OtpInput
                          length={6}
                          value={phoneOtp}
                          onChange={setPhoneOtp}
                          onComplete={(code) => {
                            setPhoneOtp(code);
                            // you can auto-submit here if you want:
                            // handleVerifyPhoneOtp();
                          }}
                          disabled={phoneLoading}
                        />
                      </div>
                    )}

                    {/* Resend SMS */}
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

                    {/* Verify button */}
                    <button
                      type="button"
                      onClick={handleVerifyPhoneOtp}
                      disabled={phoneLoading || phoneOtp.length !== 6}
                      className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-[0.98] ${
                        phoneLoading || phoneOtp.length !== 6
                          ? "bg-slate-300 cursor-not-allowed"
                          : "bg-[#84CC16] hover:bg-[#76b514]"
                      }`}
                    >
                      {phoneLoading ? "Verifying…" : "Verify phone"}
                    </button>
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

  // ===================== NORMAL SIGNUP SCREEN =====================
  return (
    <main className="min-h-screen grid place-items-center py-10 px-4 bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-2 justify-center">
          <Image
            src="/icons/icon-192.png"
            alt="Divsez"
            width={40}
            height={40}
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

        {/* Signup Form */}
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

          {/* Google Signup */}
          <button
            type="button"
            onClick={() => (window.location.href = "/api/proxy/auth/google")}
            className="mb-4 inline-flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
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

          {/* Signup Form */}
          <form onSubmit={onSubmit} autoComplete="on" className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="fullName"
                  name="name"
                  autoComplete="name"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Mobile
              </label>

              <div className="flex items-center gap-2">
                {/* Country selector */}
                <div className="w-[120px]">
                  <PhoneCountrySelect
                    countryCode={countryCode}
                    setCountryCode={setCountryCode}
                    countryOptions={countryOptions}
                  />
                </div>

                {/* Phone input */}
                <div className="relative flex-1">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="phone"
                    name="tel"
                    type="tel"
                    inputMode="tel"
                    placeholder=""
                    className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>

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
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  placeholder="name@company.com"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
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
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="new-password"
                  type={showPw ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
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
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirm"
                  name="confirm-password"
                  type={showPw2 ? "text" : "password"}
                  placeholder="Re-enter your password"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPw2((v) => !v)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
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

            {/* Submit button */}
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
