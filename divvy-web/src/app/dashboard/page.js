// app/dashboard/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/auth/signin");

  const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!meRes.ok) redirect("/auth/signin");
  const me = await meRes.json();

  const initial = (me?.username?.[0] || "U").toUpperCase();

  return (
    <main className="min-h-screen bg-[radial-gradient(60rem_40rem_at_20%_0%,#dcfce7_0%,transparent_60%),radial-gradient(50rem_30rem_at_100%_100%,#f7fee7_0%,transparent_60%)]">
      {/* header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#84CC16] text-white font-bold">
            D
          </div>
          <h1 className="text-lg font-semibold">DivIt</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-slate-700 font-semibold">
            {initial}
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* content */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        {/* welcome / quick actions */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold">Hi, {me.username}</h2>
              <p className="text-slate-600">Let’s split smarter today 👋</p>
            </div>
            <div className="flex gap-3">
              <a
                href="/groups/new"
                className="rounded-lg bg-[#84CC16] px-4 py-2.5 font-semibold text-white hover:bg-[#76b514] active:scale-[0.99]"
              >
                New group
              </a>
              <a
                href="/expenses/new"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 hover:bg-slate-50 active:scale-[0.99]"
              >
                Add expense
              </a>
            </div>
          </div>
        </div>

        {/* main grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* groups card */}
          <div className="lg:col-span-2 rounded-2xl border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your groups</h3>
              <a
                href="/groups"
                className="text-sm font-medium text-slate-700 hover:text-[#84CC16]"
              >
                View all
              </a>
            </div>

            {/* empty state placeholder – replace with real list later */}
            <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <p className="text-slate-600">
                No groups yet. Create one to start tracking shared expenses.
              </p>
              <a
                href="/groups/new"
                className="mt-4 inline-flex rounded-lg bg-[#84CC16] px-4 py-2.5 font-semibold text-white hover:bg-[#76b514]"
              >
                Create your first group
              </a>
            </div>
          </div>

          {/* recent activity */}
          <div className="rounded-2xl border bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Recent activity</h3>
            <ul className="space-y-4">
              {/* placeholders – wire to /groups/:id/expenses later */}
              <li className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#84CC16]" />
                <div>
                  <p className="text-sm text-slate-800">
                    You added <span className="font-medium">$42.00</span> to{" "}
                    <span className="font-medium">Dinner</span>
                  </p>
                  <p className="text-xs text-slate-500">Just now</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#84CC16]" />
                <div>
                  <p className="text-sm text-slate-800">
                    Marked <span className="font-medium">Taxi</span> as paid
                  </p>
                  <p className="text-xs text-slate-500">Today</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#84CC16]" />
                <div>
                  <p className="text-sm text-slate-800">
                    Invited <span className="font-medium">Alex</span> to{" "}
                    <span className="font-medium">Trip 2025</span>
                  </p>
                  <p className="text-xs text-slate-500">Yesterday</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
