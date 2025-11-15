// src/app/groups/[groupId]/settle/page.js
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import AddSettlementForm from "@/components/settlements/AddSettlementForm";

export const dynamic = "force-dynamic";

export default async function SettlePage({ params }) {
  // In Next 15, params is a Promise
  const { groupId } = await params;

  if (!groupId) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Missing group ID.
        </div>
        <Link
          href="/groups"
          className="inline-flex items-center text-sm font-medium text-[#84CC16]"
        >
          ← Back to groups
        </Link>
      </div>
    );
  }

  // Build absolute base URL (SSR-safe)
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  // Forward cookies so proxy can read token
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const common = {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  };

  // Fetch group to get currency
  let groupRes = null;
  try {
    groupRes = await fetch(`${base}/api/proxy/groups/${groupId}`, common);
  } catch {
    groupRes = null;
  }

  if (!groupRes) {
    // Network / proxy error – fallback to sign in (same behaviour as group page)
    redirect("/auth/signin");
  }

  if ([401, 403].includes(groupRes.status)) {
    redirect("/auth/signin");
  }

  // 404 = group gone / no access – show soft error but still render a page
  if (groupRes.status === 404) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Group not found or you don’t have access.
        </div>
        <Link
          href="/groups"
          className="inline-flex items-center text-sm font-medium text-[#84CC16]"
        >
          ← Back to groups
        </Link>
      </div>
    );
  }

  let groupDoc = null;
  try {
    const groupJson = await groupRes.json();
    groupDoc = groupJson?.group || groupJson || null;
  } catch {
    groupDoc = null;
  }

  const rawCurrency =
    (typeof groupDoc?.currency === "string" && groupDoc.currency) ||
    process.env.NEXT_PUBLIC_CURRENCY ||
    "AUD";

  const groupCurrency = String(rawCurrency).trim().toUpperCase() || "AUD";

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/groups/${groupId}`}
          aria-label="Back to group"
          className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </Link>
        <div className="text-sm font-semibold text-slate-900">Settle up</div>
        <div />
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <AddSettlementForm groupId={groupId} currency={groupCurrency} />
      </section>
    </div>
  );
}
