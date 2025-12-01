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
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import Link from "next/link";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
// At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
const STRONG_PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export default function SignUpPage() {
  const router = useRouter();

  // form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // ui state
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // verification flow
  const [verifyMode, setVerifyMode] = useState(false); // true after successful register
  const [verifyEmail, setVerifyEmail] = useState(""); // frozen email used for register
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const validEmail = EMAIL_RE.test(email.trim());
  const strongPwd = STRONG_PWD_RE.test(password);
  const matches = confirm === password && password.length > 0;

  const canSubmit = useMemo(
    () =>
      !!fullName.trim() &&
      validEmail &&
      strongPwd &&
      matches &&
      agree &&
      !submitting,
    [fullName, validEmail, strongPwd, matches, agree, submitting]
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
    if (!agree) return setError("Please agree to the Terms & Privacy.");

    setSubmitting(true);
    try {
      const payload = {
        username: fullName.trim(),
        email: email.trim(),
        password,
        // optional: could send countryCode/defaultCurrency later
        // countryCode: "AU",
        // defaultCurrency: "AUD",
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
              "An account with this email already exists. Try signing in."
          );
          return;
        }
        throw new Error(data?.message || "Registration failed");
      }

      // ✅ Do NOT auto-login. Ask user to verify email.
      setVerifyEmail(email.trim());
      setVerifyMode(true);
      startCooldown(30); // 30s resend cooldown
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

  async function onResend() {
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

  // Success / verify view
  if (verifyMode) {
    return (
      <main className="min-h-screen grid place-items-center py-10 px-4 bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
        <div className="w-full max-w-md">
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
              Verify your email
            </h1>
            <p className="mt-2 text-sm text-emerald-900/80">
              We’ve sent a verification link to{" "}
              <span className="font-semibold">{verifyEmail}</span>. Please open
              it to activate your account. You can only sign in{" "}
              <strong>after</strong> verification.
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
                onClick={onResend}
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

            <p className="mt-6 text-xs text-emerald-900/70">
              If you accidentally closed the link, you can always come back and
              request another verification email.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Default: signup form
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

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email
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

              {/* Inline password requirements */}
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

            {/* Button */}
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

function Rule({ ok, label }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <FiCheckCircle
        className={`h-4 w-4 ${ok ? "text-emerald-600" : "text-slate-400"}`}
      />
      <span className={ok ? "text-emerald-700" : "text-slate-500"}>
        {label}
      </span>
    </div>
  );
}
