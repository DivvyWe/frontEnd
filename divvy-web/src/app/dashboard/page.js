// src/app/dashboard/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import NewGroupButton from "@/components/NewGroupButton";
import { FiUsers, FiInbox, FiList } from "react-icons/fi";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/auth/signin");

  const headers = { Authorization: `Bearer ${token}` };

  const [meRes, groupsRes, invitesRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/me`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/user/groups`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/groups/invites`, {
      headers,
      cache: "no-store",
    }).catch(() => null),
  ]);

  if (!meRes.ok) redirect("/auth/signin");

  const me = await meRes.json();
  const groups = groupsRes.ok ? await groupsRes.json() : [];
  const invites = invitesRes && invitesRes.ok ? await invitesRes.json() : [];

  const groupsCount = Array.isArray(groups) ? groups.length : 0;
  const invitesCount = Array.isArray(invites) ? invites.length : 0;

  return (
    <div className="space-y-6">
      {/* Welcome + primary actions */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Hi, {me.username}
            </h1>
            <p className="text-slate-600">Let’s split smarter today 👋</p>
          </div>
          <div className="flex gap-3">
            {/* Modal-based create (mobile-friendly) */}
            <NewGroupButton />
            <Link
              href="/expenses/new"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 active:scale-[0.99]"
            >
              <FiList className="h-5 w-5" />
              Add expense
            </Link>
          </div>
        </div>
      </section>

      {/* Summary tiles (kept concise) */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Groups</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#84CC16]/15">
              <FiUsers className="h-5 w-5 text-[#84CC16]" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {groupsCount}
          </p>
          <Link
            href="/groups"
            className="mt-2 inline-block text-sm font-medium text-slate-700 hover:text-[#84CC16]"
          >
            View groups →
          </Link>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Pending invites</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#84CC16]/15">
              <FiInbox className="h-5 w-5 text-[#84CC16]" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {invitesCount}
          </p>
          <Link
            href="/groups/invites"
            className="mt-2 inline-block text-sm font-medium text-slate-700 hover:text-[#84CC16]"
          >
            Review invites →
          </Link>
        </div>
      </section>

      {/* Main grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Groups */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Your groups
            </h2>
            <Link
              href="/groups"
              className="text-sm font-medium text-slate-700 hover:text-[#84CC16]"
            >
              View all
            </Link>
          </div>

          {groupsCount > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {groups.slice(0, 6).map((g) => {
                const membersCount = Array.isArray(g.members)
                  ? g.members.length
                  : undefined;
                return (
                  <li
                    key={g._id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
                  >
                    <Link
                      href={`/groups/${g._id}`}
                      className="block no-underline"
                    >
                      <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
                        {g.name || "Untitled group"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {typeof membersCount === "number"
                          ? `${membersCount} member${
                              membersCount === 1 ? "" : "s"
                            }`
                          : "—"}
                      </p>
                      <span className="mt-3 inline-flex text-sm font-medium text-[#84CC16]">
                        Open →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <p className="text-slate-600">
                No groups yet. Create one to start tracking shared expenses.
              </p>
              <div className="mt-4">
                <NewGroupButton />
              </div>
            </div>
          )}
        </div>

        {/* Recent activity (light placeholder) */}
        <aside className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Recent activity
          </h2>
          <p className="text-sm text-slate-600">
            Your latest expenses will appear here once you start adding them.
          </p>
          <Link
            href="/expenses/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <FiList className="h-4 w-4" />
            Add your first expense
          </Link>
        </aside>
      </section>
    </div>
  );
}
