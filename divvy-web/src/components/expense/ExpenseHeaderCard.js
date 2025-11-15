// components/expense/ExpenseHeaderCard.jsx
"use client";

const FALLBACK_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "AUD";

function makeCurrencyFormatter(code) {
  const currency = String(code || FALLBACK_CURRENCY || "AUD")
    .trim()
    .toUpperCase();

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    });
  } catch {
    // Fallback to AUD if something is off
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "AUD",
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
    });
  }
}

export default function ExpenseHeaderCard({ expense, currency }) {
  if (!expense) return null;

  const amount = Number(expense.amount) || 0;
  const createdAt = expense.createdAt ? new Date(expense.createdAt) : null;

  const currencyFmt = makeCurrencyFormatter(currency);

  // Helpers
  const getId = (u) => (typeof u === "object" ? u?._id : u);
  const toTitle = (s) =>
    String(s || "")
      .replace(/[_\-.]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const displayName = (user) => {
    if (!user) return "Unknown";
    if (user.displayName) return toTitle(user.displayName);
    if (user.username) return toTitle(user.username);
    if (user.email) return toTitle(user.email.split("@")[0]);
    return String(getId(user)).slice(-6); // fallback
  };
  const initials = (name) => {
    const parts = String(name).trim().split(/\s+/);
    const a = (parts[0] || "").charAt(0);
    const b = (parts[1] || "").charAt(0);
    return (a + b || a || "?").toUpperCase();
  };

  const contributors = (expense.contributors || [])
    .map((c) => c?.user)
    .filter(Boolean)
    .map((u) => ({ id: String(getId(u)), name: displayName(u) }));

  const participants = (expense.splits || [])
    .map((s) => s?.user)
    .filter(Boolean)
    .map((u) => ({ id: String(getId(u)), name: displayName(u) }));

  // De-dup by id
  const uniq = (arr) =>
    Object.values(arr.reduce((acc, x) => ((acc[x.id] = x), acc), {}));
  const uniqContrib = uniq(contributors);
  const uniqPart = uniq(participants);

  const contribLabel =
    uniqContrib.length === 1 ? "Contributor" : "Contributors";

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      {/* Title + amount inline on all screens */}
      <div className="flex items-start justify-between gap-2 sm:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 truncate">
            {expense.description || "Expense"}
          </h1>
          {createdAt && (
            <div className="text-xs text-slate-600">
              {createdAt.toLocaleString()}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight">
            {currencyFmt.format(amount)}
          </div>
        </div>
      </div>

      {/* Stats + People */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Stat label="Split type" value={expense.splitType || "equal"} />

        <PeopleStat
          label={contribLabel}
          people={uniqContrib}
          initials={initials}
        />

        <PeopleStat
          label="Participants"
          people={uniqPart}
          initials={initials}
        />
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 font-medium text-slate-900">{value ?? "—"}</div>
    </div>
  );
}

function PeopleStat({ label, people, initials }) {
  const maxAvatars = 5;
  const names = (people || []).map((p) => p.name);
  const fullTitle = names.join(", ");
  const shownNames = names.slice(0, 3).join(", ");
  const overflow = Math.max(0, names.length - 3);
  const line =
    names.length <= 3 ? shownNames : `${shownNames}, +${overflow} more`;

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>

      {people?.length ? (
        <div className="mt-1 flex items-center gap-2">
          {/* Overlapping avatars */}
          <div className="flex -space-x-2">
            {people.slice(0, maxAvatars).map((p) => (
              <Avatar key={p.id} name={p.name} initials={initials} />
            ))}
            {people.length > maxAvatars && (
              <More count={people.length - maxAvatars} />
            )}
          </div>
          {/* One-line names (truncated), full list on hover */}
          <div
            className="min-w-0 text-xs font-medium text-slate-900 truncate"
            title={fullTitle}
          >
            {line || "—"}
          </div>
        </div>
      ) : (
        <div className="mt-0.5 text-xs text-slate-500">—</div>
      )}
    </div>
  );
}

function Avatar({ name, initials }) {
  return (
    <span
      className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 ring-2 ring-white"
      title={name}
    >
      {initials(name)}
    </span>
  );
}

function More({ count }) {
  return (
    <span
      className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white"
      title={`+${count} more`}
    >
      +{count}
    </span>
  );
}
