// src/components/expenses/ExpenseTopBar.js
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function ExpenseTopBar({ groupId, expenseId, currency }) {
  const router = useRouter();
  const detailsRef = useRef(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  function onEdit() {
    closeMenu();
    router.push(`/expenses/${groupId}/${expenseId}/edit`);
  }

  function onDeleteClick() {
    closeMenu();
    setConfirmOpen(true);
  }

  async function onConfirmDelete() {
    if (!expenseId || deleting) return;
    try {
      setDeleting(true);
      const res = await fetch(
        `/api/proxy/expenses/${encodeURIComponent(expenseId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || "Failed to delete expense");
      }
      setConfirmOpen(false);
      router.replace(`/groups/${groupId}`);
    } catch (e) {
      setDeleting(false);
      alert(e.message || "Failed to delete expense. Please try again.");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        {/* BACK BUTTON + currency */}
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

        {/* ACTION MENU */}
        <details ref={detailsRef} className="relative">
          <summary
            aria-label="Actions"
            className="list-none cursor-pointer rounded-md p-1.5 hover:bg-slate-100"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="text-slate-700"
            >
              <path
                fill="currentColor"
                d="M12 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z"
              />
            </svg>
          </summary>

          <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={onEdit}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              Edit expense
            </button>
            <button
              type="button"
              onClick={onDeleteClick}
              className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        </details>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete expense?"
        description="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        busy={deleting}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
