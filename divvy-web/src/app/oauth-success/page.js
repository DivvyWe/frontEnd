"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function OAuthSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [msg, setMsg] = useState("Finalising sign-in…");

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");

    // 1) Handle error or missing token
    if (error) {
      router.replace(`/auth/signin?error=${encodeURIComponent(error)}`);
      return;
    }
    if (!token) {
      router.replace(`/auth/signin?error=Missing%20token`);
      return;
    }

    // 2) Store JWT in a cookie for the app (30 days)
    //    Secure flag only in production to avoid dev http issues
    const isProd =
      typeof window !== "undefined" && window.location.protocol === "https:";
    const cookie = [
      `token=${token}`,
      "Path=/",
      `Max-Age=${60 * 60 * 24 * 30}`, // 30 days
      "HttpOnly", // <-- remove if you need to read token in client JS; keep for security if server-only usage
      "SameSite=Lax",
      isProd ? "Secure" : null,
    ]
      .filter(Boolean)
      .join("; ");

    // Note: 'HttpOnly' cookies cannot be set from JS.
    // If you need HttpOnly, set the cookie server-side (via a small API route).
    // For client-side, drop HttpOnly:
    const clientCookie = [
      `token=${token}`,
      "Path=/",
      `Max-Age=${60 * 60 * 24 * 30}`,
      "SameSite=Lax",
      isProd ? "Secure" : null,
    ]
      .filter(Boolean)
      .join("; ");

    try {
      // Prefer a readable cookie in the browser for your existing client-side checks:
      document.cookie = clientCookie;
    } catch {
      // Fallback: store in localStorage if cookies blocked
      localStorage.setItem("token", token);
    }

    // 3) (Optional) verify by calling /api/auth/me via the proxy
    //    We set the Authorization header once here so it works immediately,
    //    even before the cookie is picked up by the proxy on the next page load.
    (async () => {
      try {
        setMsg("Checking your session…");
        const res = await fetch("/api/proxy/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Auth check failed");
      } catch {
        // Even if the check fails, proceed; the cookie should work on next navigation
      }
      router.replace("/groups");
    })();
  }, [params, router]);

  return (
    <main className="min-h-screen grid place-items-center">
      <div className="text-center text-slate-600">
        <div className="animate-pulse text-lg">{msg}</div>
      </div>
    </main>
  );
}
