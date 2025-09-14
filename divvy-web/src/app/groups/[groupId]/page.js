// src/app/groups/[groupId]/page.js
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";

import GroupHeader from "@/components/groups/GroupHeader";
import GroupSummary from "@/components/groups/GroupSummary";
import GroupExpenses from "@/components/groups/GroupExpenses";
import InviteGate from "@/components/groups/InviteGate";
import GroupSettingsMount from "@/components/groups/GroupSettingsMount";
import GroupActivity from "@/components/activity/GroupActivity";
export const dynamic = "force-dynamic";

const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export default async function GroupPage({ params, searchParams }) {
  // ✅ Await params/searchParams access (Next warning)
  const { groupId } = await params;
  const sp = await searchParams;
  const sort = sp?.sort || "new";
  const showSettings = String(sp?.settings || "") === "1";

  // Build absolute base URL (SSR-safe)
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  // Forward cookies so the proxy can read `token`
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const common = {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  };

  // Auth
  const meRes = await fetch(`${base}/api/proxy/auth/me`, common).catch(
    () => null
  );
  if (!meRes || [401, 403].includes(meRes.status)) redirect("/auth/signin");
  const me = meRes?.ok ? await meRes.json().catch(() => null) : null;
  const myId = me?._id || me?.id || null;

  // Data
  const [groupRes, summaryRes, expensesRes, membersRes] = await Promise.all([
    fetch(`${base}/api/proxy/groups/${groupId}`, common).catch(() => null),
    fetch(`${base}/api/proxy/groups/${groupId}/summary`, common).catch(
      () => null
    ),
    fetch(`${base}/api/proxy/expenses/group/${groupId}`, common).catch(
      () => null
    ),
    fetch(`${base}/api/proxy/groups/${groupId}/members`, common).catch(
      () => null
    ),
  ]);

  const anyForbidden = [groupRes, summaryRes, expensesRes].some(
    (r) => r && [401, 403].includes(r.status)
  );
  if (anyForbidden) {
    return (
      <div className="space-y-6">
        <InviteGate groupId={groupId} />
      </div>
    );
  }

  if (!groupRes || !summaryRes || !expensesRes) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load this group.
        </div>
      </div>
    );
  }

  // Parse
  const group = (() => {
    try {
      const g = groupRes && groupRes.ok ? groupRes.json() : null;
      return g;
    } catch {
      return null;
    }
  })();
  const summary = (await summaryRes.json().catch(() => ({}))) || {};
  const expensesPayload = (await expensesRes.json().catch(() => ({}))) || {};

  const gRaw = group && (await group.catch?.(() => null));
  const groupDoc = gRaw?.group || gRaw || null;

  let members = [];
  if (membersRes?.ok) {
    try {
      const m = await membersRes.json();
      members = m?.members || (Array.isArray(m) ? m : []);
    } catch {}
  }
  if (!members?.length && Array.isArray(groupDoc?.members))
    members = groupDoc.members;

  // ✅ Robust settlements extraction
  const settlements = Array.isArray(summary?.settlements)
    ? summary.settlements
    : Array.isArray(summary?.all)
    ? summary.all
    : [
        ...(Array.isArray(summary?.youOwe) ? summary.youOwe : []),
        ...(Array.isArray(summary?.owedToYou) ? summary.owedToYou : []),
        ...(Array.isArray(summary?.othersOweEachOther)
          ? summary.othersOweEachOther
          : []),
      ];

  const expenses = expensesPayload?.expenses || [];

  const isMember =
    Array.isArray(members) &&
    members.some((m) => String(m?._id || m?.id) === String(myId));

  const sorted = [...expenses].sort((a, b) => {
    if (sort === "old") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === "amtAsc") return (a.amount || 0) - (b.amount || 0);
    if (sort === "amtDesc") return (b.amount || 0) - (a.amount || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <GroupHeader groupName={groupDoc?.name || "Group"} groupId={groupId} />
        {isMember && (
          <Link
            href={`/groups/${groupId}?settings=1`}
            prefetch={false}
            aria-label="Open group settings"
            title="Settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            <Settings className="h-5 w-5" />
          </Link>
        )}
      </div>

      <GroupSummary currentUserId={myId} settlements={settlements} />

      <GroupExpenses
        groupId={groupId}
        sort={sort}
        expenses={sorted}
        fmt={fmt}
      />

      <GroupSettingsMount
        open={showSettings}
        group={{ ...groupDoc, members }}
        me={me}
        groupId={groupId}
      />

      <GroupActivity groupId={params.groupId} />
    </div>
  );
}
