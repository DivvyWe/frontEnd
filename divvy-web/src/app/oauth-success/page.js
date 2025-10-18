// app/oauth-success/page.js
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic"; // don't prerender this OAuth hop
export const revalidate = 0;

function OAuthSuccessInner() {
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

    // 2) Store JWT in a readable cookie (30 days).
    //    Note: HttpOnly cannot be set from JS — keep this client-visible.
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

    // 3) Optional: verify immediately, then go to /groups
    (async () => {
      try {
        setMsg("Checking your session…");
        await fetch("/api/proxy/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      } catch {
        // ignore; cookie will be used on next nav
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

export default function OAuthSuccessPage() {
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
      <OAuthSuccessInner />
    </Suspense>
  );
}
