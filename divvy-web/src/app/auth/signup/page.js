"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  function handleGoogleSignup() {
    const oauthUrl = "/api/proxy/auth/google";
    window.location.assign(oauthUrl);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!EMAIL_RE.test(email.trim())) {
      return setError("Please enter a valid email address");
    }
    if (password !== confirm) return setError("Passwords do not match");
    if (!agree) return setError("Please agree to the Terms & Privacy");

    setSubmitting(true);
    try {
      const payload = {
        username: fullName.trim(),
        email: email.trim(),
        password,
      };

      const res = await fetch("/api/auth/register", {
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

      // Optional: you can route to a "Check your email" page if verifying email first
      router.replace("/groups");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

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
          <div className="text-xl font-semibold text-[#84CC16]">Divsez</div>
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
            </div>

            {/* Confirm */}
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
                <a
                  href="#"
                  className="font-medium text-slate-900 hover:text-[#84CC16]"
                >
                  Terms & Privacy
                </a>
              </span>
            </label>

            {/* Button */}
            <button
              type="submit"
              disabled={!agree || submitting}
              aria-disabled={!agree || submitting}
              className={`mt-2 w-full rounded-lg px-3 py-2.5 font-semibold transition active:scale-[0.99]
                ${
                  !agree || submitting
                    ? "bg-slate-300 text-white cursor-not-allowed"
                    : "bg-[#84CC16] text-white hover:bg-[#76b514]"
                }`}
            >
              {submitting ? "Creating your account…" : "Create account"}
            </button>

            <p className="text-center text-sm text-slate-600">
              Already have an account?{" "}
              <a
                href="/auth/signin"
                className="font-semibold text-slate-900 hover:text-[#84CC16]"
              >
                Sign in
              </a>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          By continuing, you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </main>
  );
}
