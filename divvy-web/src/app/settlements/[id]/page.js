// src/app/settlements/[id]/page.js
import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getJSON(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.message || `Request failed (${res.status})`);
  }
  return res.json();
}

export default async function SettlementPage({ params }) {
  const { id } = params;

  // Build absolute base URL and forward cookies
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base =
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${proto}://${host}`;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // ✅ NOTE: use /by-id/:id
  const [me, data] = await Promise.all([
    getJSON(`${base}/api/proxy/auth/me`, { headers: { Cookie: cookieHeader } }),
    getJSON(`${base}/api/proxy/settlements/by-id/${id}`, {
      headers: { Cookie: cookieHeader },
    }),
  ]);

  const settlement = data?.settlement || data;

  if (!settlement?._id) {
    throw new Error("Settlement not found");
  }

  const { default: SettlementViewEdit } = await import(
    "@/components/settlements/SettlementViewEdit"
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-lg font-semibold text-slate-900">Settlement</h1>
      <SettlementViewEdit me={me} settlement={settlement} />
    </div>
  );
}
