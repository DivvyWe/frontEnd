// app/auth/signin/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function SignInPage() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailOrPhone.includes("@") ? emailOrPhone : undefined,
          phone: !emailOrPhone.includes("@") ? emailOrPhone : undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Login failed");
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      <div className="w-full max-w-md">
        {/* brand */}
        <div className="mb-6 flex items-center gap-3 justify-center">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#84CC16] text-slate-900 font-extrabold">
            :D
          </div>
          <div className="text-xl font-semibold">DivIt</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-lg shadow-lime-100/60 backdrop-blur p-6 sm:p-8">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
          </header>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="emailOrPhone"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email or Phone
              </label>
              <input
                id="emailOrPhone"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                type="text"
                autoComplete="username"
                placeholder="you@example.com or +61412345678"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            <div className="flex items-center justify-end">
              <a
                href="#"
                className="text-sm font-medium text-slate-700 hover:text-[#84CC16]"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="relative w-full rounded-lg bg-[#84CC16] px-3 py-2.5 font-semibold text-white transition hover:bg-[#76b514] active:scale-[0.99] disabled:opacity-60"
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

            <div className="flex items-center gap-3 py-2">
              <div className="h-px w-full bg-slate-200" />
              <span className="text-xs uppercase text-slate-400">or</span>
              <div className="h-px w-full bg-slate-200" />
            </div>

            <button
              type="button"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
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

        <p className="mt-6 text-center text-xs text-slate-400">
          By continuing you agree to our Terms &amp; Privacy.
        </p>
      </div>
    </main>
  );
}
