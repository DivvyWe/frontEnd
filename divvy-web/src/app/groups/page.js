// src/app/groups/page.js
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import GroupsClient from "@/components/groups/GroupsClient";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  // forward cookies to the proxy route so it can forward auth to the API
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const common = {
    method: "GET",
    headers: {
      cookie: cookieHeader,
      "x-proxy-debug": "1",
    },
    cache: "no-store",
  };

  // 1) Auth
  const meRes = await fetch(`${base}/api/proxy/auth/me`, common);
  if (!meRes.ok) redirect("/auth/signin");
  const me = await meRes.json();

  // 2) First page via paginated search (stable sort)
  const qs = new URLSearchParams({
    sortBy: "updatedAt",
    order: "desc",
    limit: "24",
    membersLimit: "6",
  }).toString();

  const firstPageRes = await fetch(
    `${base}/api/proxy/user/groups/search?${qs}`,
    common
  );

  if (!firstPageRes.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-800">Groups</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not reach the server.
        </div>
      </div>
    );
  }

  const firstPage = await firstPageRes.json();
  const initialGroups = Array.isArray(firstPage?.items) ? firstPage.items : [];
  const initialCursor = firstPage?.nextCursor || null;

  return (
    <GroupsClient
      me={me}
      initialGroups={initialGroups}
      initialCursor={initialCursor}
    />
  );
}
