"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    const v = email.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) {
      setErr("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/proxy/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "We couldn't start the reset flow.");
      }

      setMsg(
        data?.message ||
          "If this email exists, we’ve sent a reset link. Please check your inbox."
      );
    } catch (e) {
      setErr(e.message || "Something went wrong.");
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
          <h1 className="text-2xl font-semibold">Forgot your password?</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter your account email and we’ll send you a reset link.
          </p>

          {err && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
          {msg && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {msg}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
              required
            />

            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-lg px-3 py-2.5 font-semibold transition active:scale-[0.99] ${
                submitting
                  ? "bg-slate-300 text-white cursor-not-allowed"
                  : "bg-[#84CC16] text-white hover:bg-[#76b514]"
              }`}
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>

            <div className="text-center text-sm">
              <Link
                href="/auth/signin"
                className="font-medium text-slate-700 hover:text-[#84CC16]"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Didn’t receive an email? Check spam/junk and allow{" "}
          <span className="font-mono">noreply@divsez.com</span>.
        </p>
      </div>
    </main>
  );
}
