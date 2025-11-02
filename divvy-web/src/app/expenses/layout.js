// app/(app)/layout.js  OR  app/groups/layout.js (wherever your section lives)
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function log(...args) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
}

async function getMeOrRedirect() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  log("[layout] hasToken:", !!token);
  if (!token) {
    log("[layout] redirect -> /auth/signin (no token)");
    redirect("/auth/signin");
  }

  const base = await getBaseUrl();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const url = `${base}/api/proxy/auth/me`;
  log("[layout] GET", url, "(cookieBytes:", cookieHeader.length, ")");

  let res;
  try {
    res = await fetch(url, {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    });
  } catch (e) {
    log("[layout] /auth/me network error:", e?.message || e);
    redirect("/auth/signin");
  }

  log("[layout] /auth/me status:", res.status);

  if (!res.ok) {
    // Read a small slice for debugging in dev
    let raw = "";
    try {
      raw = await res.text();
    } catch {}
    if (raw) log("[layout] /auth/me body:", raw.slice(0, 300));
    redirect("/auth/signin");
  }

  try {
    const me = await res.json();
    log("[layout] me.id:", me?.id || me?._id || "(unknown)");
    return me;
  } catch (e) {
    log("[layout] JSON parse error:", e?.message || e);
    redirect("/auth/signin");
  }
}

export default async function AppLayout({ children }) {
  const me = await getMeOrRedirect();

  return (
    <main className="relative min-h-screen bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      <AppNav me={me} />
      {/* Page content area */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:pt-10">
        {children}
      </section>

      {/* Bottom nav (fixed on mobile) */}

      {/* Safe-area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </main>
  );
}
