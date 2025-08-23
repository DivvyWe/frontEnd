import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";

export const dynamic = "force-dynamic";

export default async function GroupsLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  console.log("[groups/layout] hasToken:", !!token);
  if (!token) {
    console.log("[groups/layout] redirect -> /auth/signin (no token)");
    redirect("/auth/signin");
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  console.log(
    "[groups/layout] fetching:",
    `${base}/api/proxy/auth/me`,
    "cookieBytes:",
    cookieHeader.length
  );

  const meRes = await fetch(`${base}/api/proxy/auth/me`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });

  console.log("[groups/layout] /auth/me status:", meRes.status);
  if (!meRes.ok) {
    const raw = await meRes.text();
    console.log("[groups/layout] /auth/me body:", raw.slice(0, 300));
    console.log("[groups/layout] redirect -> /auth/signin (meRes not ok)");
    redirect("/auth/signin");
  }

  const me = await meRes.json();
  console.log("[groups/layout] me:", me);

  return (
    <main className="min-h-screen bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      <AppNav me={me} />
      <section className="mx-auto max-w-6xl px-4 py-6 pb-24 md:py-10 md:pb-10">
        {children}
      </section>
    </main>
  );
}
