// src/app/acknowledgement/layout.jsx
import { cookies, headers } from "next/headers";
import AppNav from "@/components/AppNav";

export const dynamic = "force-dynamic";

export default async function AcknowledgementLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  console.log("[acknowledgement/layout] hasToken:", !!token);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${proto}://${host}`;

  let me = null;
  if (token) {
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    try {
      const meRes = await fetch(`${base}/api/proxy/auth/me`, {
        headers: { Cookie: cookieHeader, Accept: "application/json" },
        cache: "no-store",
      });
      if (meRes.ok) me = await meRes.json().catch(() => null);
    } catch (e) {
      console.log(
        "[acknowledgement/layout] /auth/me fetch error:",
        e?.message || e
      );
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(60rem_40rem_at_20%_0%,#ecfccb_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      <AppNav me={me} />
      <section className="mx-auto max-w-3xl px-6 py-10 md:py-12">
        {children}
      </section>
    </main>
  );
}
