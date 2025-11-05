// app/auth/signin/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiMail, FiLock } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const isValid = email.trim() && password.trim();

  function handleGoogleSignIn() {
    // Go through Next proxy → backend /api/auth/google
    window.location.assign("/api/proxy/auth/google");
  }

  // Helper: delete any existing token cookie variants
  function deleteOldTokenCookies() {
    // delete host-only (no Domain) cookie
    document.cookie = [
      "token=",
      "Path=/",
      "Max-Age=0",
      // SameSite not required for deletion, but harmless
      "SameSite=Lax",
    ].join("; ");

    // delete parent-domain cookie (if present)
    document.cookie = [
      "token=",
      "Domain=.divsez.com",
      "Path=/",
      "Max-Age=0",
      "SameSite=None",
      "Secure",
    ].join("; ");
  }

  // Helper: set the new cross-subdomain cookie
  function setTokenCookie(token) {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const isHttps =
      typeof window !== "undefined" && window.location.protocol === "https:";
    const onDivsezDomain = /\.divsez\.com$/i.test(host);

    // In production on *.divsez.com → share across subdomains
    if (isHttps && onDivsezDomain) {
      document.cookie = [
        `token=${token}`,
        "Domain=.divsez.com",
        "Path=/",
        "Max-Age=31536000", // 1 year
        "SameSite=None", // required for cross-site
        "Secure", // required with SameSite=None
      ].join("; ");
      return;
    }

    // Fallback for local/dev (no Domain, no SameSite=None)
    document.cookie = [
      `token=${token}`,
      "Path=/",
      "Max-Age=31536000",
      isHttps ? "Secure" : null,
      "SameSite=Lax",
    ]
      .filter(Boolean)
      .join("; ");
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      // Use proxy so we never hardcode backend URL
      const res = await fetch("/api/proxy/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }

      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      }

      const token = data?.token;
      if (!token) {
        throw new Error("No token returned from server");
      }

      // 🔄 Clean up any old token cookies (host-only / wrong attrs)
      deleteOldTokenCookies();

      // ✅ Set cross-subdomain cookie for app + api
      setTokenCookie(token);

      // Optional: quick verify so user sees groups immediately
      // (kept as-is; not strictly required)
      try {
        await fetch("/api/proxy/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      } catch {
        /* ignore */
      }

      router.replace("/groups");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
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
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to manage and track your expenses
            </p>
          </header>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
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
                  type="email"
                  autoComplete="username"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
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
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <FiEyeOff className="h-5 w-5" />
                  ) : (
                    <FiEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-end">
              <a
                href="/auth/forgot-password"
                className="text-sm font-medium text-slate-700 hover:text-[#84CC16]"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!isValid || submitting}
              className={`relative w-full rounded-lg px-3 py-2.5 font-semibold text-white transition active:scale-[0.99]
                ${
                  !isValid || submitting
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-[#84CC16] hover:bg-[#76b514]"
                }`}
            >
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px w-full bg-slate-200" />
              <span className="text-xs uppercase text-slate-400">or</span>
              <div className="h-px w-full bg-slate-200" />
            </div>

            {/* Google login button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="inline-flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-700 hover:bg-slate-50 transition active:scale-[0.99]"
              aria-label="Continue with Google"
            >
              <FcGoogle className="text-xl" />
              Continue with Google
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don’t have an account?{" "}
            <a
              href="/auth/signup"
              className="font-semibold text-slate-900 hover:text-[#84CC16]"
            >
              Sign up
            </a>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-[#84CC16] hover:underline hover:text-[#76b514] transition"
          >
            Terms
          </Link>{" "}
          &amp;{" "}
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
