"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const STRONG_PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export default function ResetPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token")?.trim();

  const [status, setStatus] = useState("idle"); // idle | ready | error
  const [message, setMessage] = useState("");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing or invalid reset token.");
    } else {
      setStatus("ready");
    }
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOkMsg("");

    if (!STRONG_PWD_RE.test(pw)) {
      setErr(
        "Password must be 8+ chars and include uppercase, lowercase, number, and special character."
      );
      return;
    }
    if (pw !== pw2) {
      setErr("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/proxy/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Reset failed.");

      setOkMsg(data?.message || "Your password has been reset.");
      // Optional: route to sign in after a short delay
      // setTimeout(() => router.replace("/auth/signin"), 1200);
    } catch (e) {
      setErr(e.message || "Reset failed.");
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
          {status === "error" ? (
            <>
              <h1 className="text-2xl font-semibold text-red-800">
                Invalid reset link
              </h1>
              <p className="mt-2 text-sm text-red-900/80">
                {message || "The reset link is missing or invalid."}
              </p>
              <div className="mt-6">
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex items-center justify-center rounded-lg px-3 py-2.5 font-semibold bg-[#84CC16] text-white hover:bg-[#76b514] transition"
                >
                  Request a new link
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">Set a new password</h1>
              <p className="mt-1 text-sm text-slate-600">
                Choose a strong password you haven’t used before.
              </p>

              {err && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              )}
              {okMsg && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {okMsg}
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-5 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  New password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  required
                />
                <p className="text-xs text-slate-500">
                  Must include upper & lower case letters, a number, a special
                  character, and be at least 8 characters long.
                </p>

                <label className="block text-sm font-medium text-slate-700">
                  Confirm new password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
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
                  {submitting ? "Updating…" : "Update password"}
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
            </>
          )}
        </div>
      </div>
    </main>
  );
}
