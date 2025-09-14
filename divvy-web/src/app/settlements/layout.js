import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";

export const dynamic = "force-dynamic";

export default async function SettlementsLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  console.log("[settlements/layout] hasToken:", !!token);
  if (!token) {
    console.log("[settlements/layout] redirect -> /auth/signin (no token)");
    redirect("/auth/signin");
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");

  // Prefer the same env var you used in the settlement page, with fallback
  const base =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${proto}://${host}`;

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  console.log(
    "[settlements/layout] fetching:",
    `${base}/api/proxy/auth/me`,
    "cookieBytes:",
    cookieHeader.length
  );

  const meRes = await fetch(`${base}/api/proxy/auth/me`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });

  console.log("[settlements/layout] /auth/me status:", meRes.status);
  if (!meRes.ok) {
    const raw = await meRes.text().catch(() => "");
    console.log("[settlements/layout] /auth/me body:", raw.slice(0, 300));
    console.log("[settlements/layout] redirect -> /auth/signin (meRes not ok)");
    redirect("/auth/signin");
  }

  const me = await meRes.json().catch(() => null);
  console.log("[settlements/layout] me:", me);

  return (
    <main className="min-h-screen bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      <AppNav me={me} />
      <section className="mx-auto max-w-6xl px-4 py-6 pb-24 md:py-10 md:pb-10">
        {children}
      </section>
    </main>
  );
}
