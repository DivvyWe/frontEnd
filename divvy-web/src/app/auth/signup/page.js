"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheck,
} from "react-icons/fi";

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEmail = emailOrPhone.includes("@");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) return setError("Passwords do not match");
    if (!agree) return setError("Please agree to the Terms & Privacy");

    setSubmitting(true);
    try {
      const payload = {
        username: username.trim(),
        password,
        email: isEmail ? emailOrPhone.trim() : undefined,
        phone: !isEmail ? emailOrPhone.trim() : undefined,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // robust parse (handles plain text or JSON)
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
              "An account with this email/phone or username already exists. Try signing in."
          );
          return;
        }
        throw new Error(data?.message || "Registration failed");
      }

      // success: cookie is set server-side
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center  py-10 px-4 bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      <div className="w-full max-w-md">
        {/* brand (matches signin) */}
        <div className="mb-6 flex items-center gap-3 justify-center">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#84CC16] text-white font-extrabold">
            :D
          </div>
          <div className="text-xl font-semibold">DivIt</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-lg shadow-lime-100/60 backdrop-blur p-6 sm:p-8">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              It’s free and only takes a minute
            </p>
          </header>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Username
              </label>
              <div className="relative">
                <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="username"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  placeholder="yourname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email or Phone */}
            <div>
              <label
                htmlFor="emailOrPhone"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email or Phone
              </label>
              <div className="relative">
                {isEmail ? (
                  <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                ) : (
                  <FiPhone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                )}
                <input
                  id="emailOrPhone"
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  placeholder={isEmail ? "you@example.com" : "+61412345678"}
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Tip: include <span className="font-mono">@</span> to use email;
                otherwise it’s treated as phone.
              </p>
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
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  type={showPw ? "text" : "password"}
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
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-10 py-2 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30"
                  type={showPw2 ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
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

            {/* Button (disabled until agree) */}
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
              {submitting ? "Creating account…" : "Create account"}
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
          By continuing you agree to our Terms &amp; Privacy.
        </p>
      </div>
    </main>
  );
}
