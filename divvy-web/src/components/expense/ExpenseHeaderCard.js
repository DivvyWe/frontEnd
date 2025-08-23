export default function ExpenseHeaderCard({
  title,
  createdAt,
  amount,
  status,
  splitType,
}) {
  const dateStr = createdAt ? new Date(createdAt).toLocaleString() : "";
  const isPaid = status === "paid";

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-semibold text-slate-900">
            {title || "Expense"}
          </h1>
          {dateStr ? (
            <div className="mt-1 text-xs text-slate-500">{dateStr}</div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1
                ${
                  isPaid
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200"
                }`}
            >
              {isPaid ? "Fully paid" : "Payment pending"}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {splitType === "percentage"
                ? "percentage split"
                : splitType === "custom"
                ? "custom split"
                : "equal split"}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div
            aria-label="Total amount"
            className="rounded-lg bg-slate-900 px-3 py-1 text-lg font-bold text-white"
          >
            {`$${(Number(amount) || 0).toFixed(2)}`}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
            TOTAL
          </div>
        </div>
      </div>
    </section>
  );
}
