// app/oauth-success/OAuthSuccessClient.js
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const [msg, setMsg] = useState("Finalising sign-in…");

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      router.replace(`/auth/signin?error=${encodeURIComponent(error)}`);
      return;
    }
    if (!token) {
      router.replace(`/auth/signin?error=Missing%20token`);
      return;
    }

    // Store JWT in a readable cookie (30 days). HttpOnly must be set server-side.
    const isProd =
      typeof window !== "undefined" && window.location.protocol === "https:";
    document.cookie = [
      `token=${token}`,
      "Path=/",
      `Max-Age=${60 * 60 * 24 * 30}`,
      "SameSite=Lax",
      isProd ? "Secure" : null,
    ]
      .filter(Boolean)
      .join("; ");

    (async () => {
      try {
        setMsg("Checking your session…");
        await fetch("/api/proxy/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      } catch {
        /* ignore; cookie works on next nav */
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

export default function OAuthSuccessClient() {
  // Next 15: useSearchParams() must be under Suspense
  return (
    <Suspense
      fallback={
        <main className="min-h-screen grid place-items-center">
          <div className="text-center text-slate-600">
            <div className="animate-pulse text-lg">Loading…</div>
          </div>
        </main>
      }
    >
      <Inner />
    </Suspense>
  );
}
