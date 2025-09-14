// src/components/group/GroupActions.jsx
"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function GroupActions({ id, name, onDeleted }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // close on outside click + ESC
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e) {
      if (
        menuRef.current?.contains(e.target) ||
        btnRef.current?.contains(e.target)
      )
        return;
      setMenuOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function doDelete() {
    if (busy) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/proxy/groups/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Failed with ${res.status}`);
      }
      onDeleted?.(id);
      setConfirmOpen(false);
    } catch (err) {
      alert(err.message || "Failed to delete group");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        title="More actions"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Open actions</span>
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Group actions"
          className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete group
          </button>
        </div>
      )}

      {/* Confirmation modal */}
      <ConfirmDialog
        open={confirmOpen}
        danger
        busy={busy}
        title="Delete group?"
        description={`“${
          name || "This group"
        }” and its data will be permanently removed. This cannot be undone.`}
        confirmText={busy ? "Deleting…" : "Delete"}
        cancelText="Cancel"
        onCancel={() => !busy && setConfirmOpen(false)}
        onConfirm={doDelete}
      />
    </div>
  );
}
