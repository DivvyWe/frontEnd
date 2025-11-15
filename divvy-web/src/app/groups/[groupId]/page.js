// src/app/groups/[groupId]/page.js
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

import GroupHeader from "@/components/groups/GroupHeader";
import GroupSummary from "@/components/groups/GroupSummary";
import GroupExpenses from "@/components/groups/GroupExpenses";
import InviteGate from "@/components/groups/InviteGate";
import GroupSettingsMount from "@/components/groups/GroupSettingsMount";
import GroupActivity from "@/components/activity/GroupActivity";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params, searchParams }) {
  // ✅ must await both per Next 15
  const { groupId } = await params;
  const sp = await searchParams;
  const sort = sp?.sort || "new";
  const showSettings = String(sp?.settings || "") === "1";

  // Build absolute base URL (SSR-safe)
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  // Locale (currency will now come from groupDoc)
  const acceptLang = h.get("accept-language") || "en-US";
  const locale = acceptLang.split(",")[0]?.trim() || "en-US";

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

  // ✅ parse JSON safely
  const groupJson = groupRes.ok
    ? await groupRes.json().catch(() => null)
    : null;
  const groupDoc = groupJson?.group || groupJson || null;
  const summary = (await summaryRes.json().catch(() => ({}))) || {};
  const expensesPayload = (await expensesRes.json().catch(() => ({}))) || {};

  // ✅ compute currency from multiple possible sources, normalised
  const rawCurrency =
    (typeof groupDoc?.currency === "string" && groupDoc.currency) ||
    (typeof summary?.currency === "string" && summary.currency) ||
    (typeof expensesPayload?.currency === "string" &&
      expensesPayload.currency) ||
    process.env.NEXT_PUBLIC_CURRENCY ||
    "AUD";

  const groupCurrency = String(rawCurrency).trim().toUpperCase() || "AUD";

  let currencyFmt;
  try {
    currencyFmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: groupCurrency,
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    });
  } catch {
    // Fallback if groupCurrency is invalid
    currencyFmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "AUD",
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    });
  }

  // Members
  let members = [];
  if (membersRes?.ok) {
    try {
      const m = await membersRes.json();
      members = m?.members || (Array.isArray(m) ? m : []);
    } catch {
      // ignore
    }
  }
  if (!members?.length && Array.isArray(groupDoc?.members))
    members = groupDoc.members;

  // Settle data
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

  // Expenses + pre-format
  const expenses = expensesPayload?.expenses || [];
  const withFormatted = expenses.map((e) => {
    const amountNum = Number(e.amount) || 0;
    return {
      ...e,
      amount: amountNum,
      formattedAmount: currencyFmt.format(amountNum),
    };
  });

  // Sort
  const sorted = [...withFormatted].sort((a, b) => {
    if (sort === "old") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === "amtAsc") return (a.amount || 0) - (b.amount || 0);
    if (sort === "amtDesc") return (b.amount || 0) - (a.amount || 0);
    return new Date(b.createdAt) - new Date(a.createdAt); // "new"
  });

  const isMember =
    Array.isArray(members) &&
    members.some((m) => String(m?._id || m?.id) === String(myId));

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header row with right-floating + button */}
      <div className="flex items-center gap-3">
        <GroupHeader
          groupName={groupDoc?.name || "Group"}
          groupId={groupId}
          isMember={isMember}
          currency={groupCurrency}
        />
      </div>

      <GroupSummary
        currentUserId={myId}
        settlements={settlements}
        currency={groupCurrency}
      />

      <GroupExpenses
        groupId={groupId}
        sort={sort}
        expenses={sorted}
        currency={groupCurrency}
      />

      <GroupSettingsMount
        open={showSettings}
        group={{ ...groupDoc, members }}
        me={me}
        groupId={groupId}
      />

      <GroupActivity
        groupId={groupId}
        currency={groupCurrency} // 👈 now Activity uses NPR / AUD /  etc
      />
    </div>
  );
}
