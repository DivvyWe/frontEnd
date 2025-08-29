// components/groups/GroupSettlements.jsx

export default function GroupSettlements({ settlements = [], fmt }) {
  const has = settlements.length > 0;
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Owe each other</h2>
      </div>

      {has ? (
        <ul className="divide-y divide-slate-100">
          {settlements.map((s, i) => (
            <li key={i} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-700">
                <span className="font-medium">{s.fromName}</span> →{" "}
                <span className="font-medium">{s.toName}</span>
              </span>
              <span className="rounded-md bg-slate-50 px-2 py-0.5 text-sm font-semibold text-slate-900">
                {fmt(s.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-slate-400">All settled</div>
      )}
    </section>
  );
}
