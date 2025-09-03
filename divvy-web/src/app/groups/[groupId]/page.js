// src/app/groups/[groupId]/page.js
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import GroupHeader from "@/components/groups/GroupHeader";
import GroupSummary from "@/components/groups/GroupSummary";
import GroupMembersSection from "@/components/groups/GroupMembersSection";
import GroupSettlements from "@/components/groups/GroupSettlements";
import GroupExpenses from "@/components/groups/GroupExpenses";
import InviteGate from "@/components/groups/InviteGate";

export const dynamic = "force-dynamic";

const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;

export default async function GroupPage({ params, searchParams }) {
  const { groupId } = params;
  const sort = searchParams?.sort || "new";

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

  // Always check auth first
  const meRes = await fetch(`${base}/api/proxy/auth/me`, common).catch(
    () => null
  );
  if (!meRes || [401, 403].includes(meRes.status)) {
    // Not logged in -> signin
    redirect("/auth/signin");
  }
  const me = meRes?.ok ? await meRes.json().catch(() => null) : null;
  const myId = me?._id || me?.id || null;

  // Try the protected group resources
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

  // 🚪 Long-term fix: if authenticated but not a member yet, show InviteGate (no redirect)
  if (anyForbidden) {
    return (
      <div className="space-y-6">
        <InviteGate groupId={groupId} />
      </div>
    );
  }

  // If server/network trouble
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

  // await group json (deferred above so we can try/catch cleanly)
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

  const settlements = summary?.settlements || [];
  const expenses = expensesPayload?.expenses || [];

  // Permissions
  const ownerId =
    groupDoc?.createdBy?._id ||
    groupDoc?.owner?._id ||
    groupDoc?.createdBy ||
    groupDoc?.owner ||
    null;
  const canManageMembers = ownerId && myId && String(ownerId) === String(myId);

  // ✅ Fix totals: use `from` / `to` from API, not `fromId` / `toId`
  const youOweTotal = (settlements || [])
    .filter((s) => String(s.from) === String(myId || ""))
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const youAreOwedTotal = (settlements || [])
    .filter((s) => String(s.to) === String(myId || ""))
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // Sort
  const sorted = [...expenses].sort((a, b) => {
    if (sort === "old") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === "amtAsc") return (a.amount || 0) - (b.amount || 0);
    if (sort === "amtDesc") return (b.amount || 0) - (a.amount || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="space-y-6 overflow-x-hidden">
      <GroupHeader groupName={groupDoc?.name || "Group"} groupId={groupId} />

      <GroupSummary currentUserId={myId} settlements={settlements} fmt={fmt} />

      <GroupMembersSection
        groupId={groupId}
        members={members}
        ownerId={ownerId}
        canManage={canManageMembers}
        currentUserId={myId}
      />

      <GroupSettlements settlements={settlements} fmt={fmt} />

      <GroupExpenses
        groupId={groupId}
        sort={sort}
        expenses={sorted}
        fmt={fmt}
      />
    </div>
  );
}
