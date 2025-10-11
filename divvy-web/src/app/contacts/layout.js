// src/app/contacts/layout.js
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------ small utils ------------------------------ */
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
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  // strip trailing slash if present
  return (env || `${proto}://${host}`).replace(/\/+$/, "");
}

async function getMeOrRedirect() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  log("[contacts/layout] hasToken:", !!token);
  if (!token) {
    log("[contacts/layout] redirect -> /auth/signin (no token)");
    redirect("/auth/signin");
  }

  const base = await getBaseUrl();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const url = `${base}/api/proxy/auth/me`;
  log("[contacts/layout] GET", url, "(cookieBytes:", cookieHeader.length, ")");

  let res;
  try {
    res = await fetch(url, {
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json",
        "x-proxy-debug": "1",
      },
      cache: "no-store",
    });
  } catch (e) {
    log("[contacts/layout] /auth/me network error:", e?.message || e);
    redirect("/auth/signin");
  }

  log("[contacts/layout] /auth/me status:", res.status);

  if (!res.ok) {
    let raw = "";
    try {
      raw = await res.text();
    } catch {}
    if (raw) log("[contacts/layout] /auth/me body:", raw.slice(0, 300));
    redirect("/auth/signin");
  }

  try {
    const me = await res.json();
    log("[contacts/layout] me.id:", me?.id || me?._id || "(unknown)");
    return me;
  } catch (e) {
    log("[contacts/layout] JSON parse error:", e?.message || e);
    redirect("/auth/signin");
  }
}

/* --------------------------------- layout -------------------------------- */
export default async function ContactsLayout({ children }) {
  const me = await getMeOrRedirect();

  return (
    <main className="min-h-screen bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      {/* Top nav */}
      <div className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <AppNav me={me} active="contacts" />
      </div>

      {/* Page container */}
      <section className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
        {children}
      </section>

      {/* Mobile safe-area padding */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </main>
  );
}
