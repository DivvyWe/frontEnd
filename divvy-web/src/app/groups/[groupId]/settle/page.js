// src/app/groups/[groupId]/settle/page.js
import AddSettlementForm from "@/components/settlements/AddSettlementForm";
import Link from "next/link";

export default function SettlePage({ params }) {
  const { groupId } = params;

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
        <AddSettlementForm groupId={groupId} />
      </section>
    </div>
  );
}
