"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());

/** Try proxy first, then fall back to NEXT_PUBLIC_API_BASE */
async function smartGET(pathWithQuery) {
  // 1) Proxy (preferred)
  let res = await fetch(`/api/proxy${pathWithQuery}`, { method: "GET" });
  if (res.status !== 404) return res; // success or other error from backend

  // 2) Fallback to direct backend (requires NEXT_PUBLIC_API_BASE)
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) return res; // still 404; no fallback configured
  const url = `${base.replace(/\/+$/, "")}${pathWithQuery}`;
  return fetch(url, { method: "GET" });
}

async function smartPOST(path, body) {
  // 1) Proxy (preferred)
  let res = await fetch(`/api/proxy${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (res.status !== 404) return res;

  // 2) Fallback to direct backend (requires NEXT_PUBLIC_API_BASE)
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) return res;
  const url = `${base.replace(/\/+$/, "")}${path}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token")?.trim();

  const [status, setStatus] = useState("idle"); // idle | loading | success | expired | error
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(""); // for resend
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus("error");
        setMessage("Missing verification token.");
        return;
      }
      setStatus("loading");
      setMessage("");

      try {
        // ✅ Use proxy first, then fallback to NEXT_PUBLIC_API_BASE
        const res = await smartGET(
          `/auth/verify-email?token=${encodeURIComponent(token)}`
        );

        const raw = await res.text();
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          data = { message: raw || "" };
        }

        if (res.ok) {
          setStatus("success");
          setMessage(data?.message || "Email verified successfully.");
        } else if (res.status === 400) {
          setStatus("expired");
          setMessage(
            data?.message || "This verification link is invalid or has expired."
          );
        } else {
          setStatus("error");
          setMessage(data?.message || "Email verification failed.");
        }
      } catch (e) {
        setStatus("error");
        setMessage(e?.message || "Network error verifying your email.");
      }
    })();
  }, [token]);

  async function onResend(e) {
    e.preventDefault();
    setResendMsg("");
    const v = String(email || "")
      .trim()
      .toLowerCase();
    if (!isEmail(v)) {
      setResendMsg("Enter a valid email address.");
      return;
    }
    setResending(true);
    try {
      // ✅ Proxy first; fallback to backend base
      const res = await smartPOST("/auth/resend-verification", { email: v });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message || "Could not resend email.");
      setResendMsg(j?.message || "A new verification email has been sent.");
    } catch (err) {
      setResendMsg(err.message || "Could not resend email.");
    } finally {
      setResending(false);
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
          {status === "loading" && (
            <>
              <h1 className="text-xl font-semibold">Verifying your email…</h1>
              <p className="mt-2 text-sm text-slate-600">
                Please wait while we confirm your verification link.
              </p>
              <div className="mt-6 h-2 w-full rounded bg-slate-100 overflow-hidden">
                <div className="h-full w-1/2 animate-pulse bg-[#84CC16]" />
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <h1 className="text-xl font-semibold text-emerald-800">
                Email verified 🎉
              </h1>
              <p className="mt-2 text-sm text-emerald-900/80">
                {message ||
                  "Your email has been verified. You can sign in now."}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center rounded-lg px-3 py-2.5 font-semibold bg-[#84CC16] text-white hover:bg-[#76b514] transition"
                >
                  Go to Sign in
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back to Home
                </Link>
              </div>
            </>
          )}

          {status === "expired" && (
            <>
              <h1 className="text-xl font-semibold text-amber-800">
                Link invalid or expired
              </h1>
              <p className="mt-2 text-sm text-amber-900/80">
                {message || "This verification link is invalid or has expired."}
              </p>

              <form onSubmit={onResend} className="mt-5 space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Enter your email to resend the verification link
                </label>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  required
                />
                <button
                  type="submit"
                  disabled={resending}
                  className={`w-full rounded-lg px-3 py-2.5 font-semibold transition active:scale-[0.99] ${
                    resending
                      ? "bg-slate-300 text-white cursor-not-allowed"
                      : "bg-[#84CC16] text-white hover:bg-[#76b514]"
                  }`}
                >
                  {resending ? "Resending…" : "Resend verification email"}
                </button>
                {resendMsg && (
                  <p className="text-sm mt-1 text-slate-700">{resendMsg}</p>
                )}
              </form>

              <p className="mt-6 text-xs text-slate-500">
                Tip: Check spam/junk and allow{" "}
                <span className="font-mono">noreply@divsez.com</span>.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="text-xl font-semibold text-red-800">
                Verification failed
              </h1>
              <p className="mt-2 text-sm text-red-900/80">
                {message || "We couldn’t verify your email with this link."}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center rounded-lg px-3 py-2.5 font-semibold bg-[#84CC16] text-white hover:bg-[#76b514] transition"
                >
                  Go to Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Create account
                </Link>
              </div>
            </>
          )}

          {status === "idle" && (
            <>
              <h1 className="text-xl font-semibold">Preparing…</h1>
              <p className="mt-2 text-sm text-slate-600">
                Loading verification flow.
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Need help?{" "}
          <Link
            href="/support"
            className="font-medium text-[#84CC16] hover:underline hover:text-[#76b514] transition"
          >
            Contact support
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
