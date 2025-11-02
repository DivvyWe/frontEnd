// src/app/contacts/layout.js
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------ helpers ------------------------------ */
async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  return (env || `${proto}://${host}`).replace(/\/+$/, "");
}

async function getMeOrRedirect() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    redirect("/auth/signin");
  }

  const base = await getBaseUrl();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const url = `${base}/api/proxy/auth/me`;
  const res = await fetch(url, {
    headers: {
      Cookie: cookieHeader,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) redirect("/auth/signin");
  return res.json();
}

/* --------------------------------- layout -------------------------------- */
export default async function ContactsLayout({ children }) {
  const me = await getMeOrRedirect();

  return (
    <main className="min-h-screen bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      {/* AppNav handles its own sticky top bar */}
      <AppNav me={me} active="contacts" />

      {/* Page content with bottom padding for fixed mobile tabs */}
      <section className="mx-auto max-w-6xl px-4 py-6 pb-6 md:py-10 md:pb-10">
        {children}
      </section>
    </main>
  );
}
