// src/components/NewGroupButton.jsx
"use client";

import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import GroupCreateModal from "./GroupCreateModal";

export default function NewGroupButton({ floating = false }) {
  const [open, setOpen] = useState(false);

  const baseBtn =
    "inline-flex items-center justify-center rounded-full bg-[#84CC16] text-white " +
    "hover:bg-[#76b514] active:scale-[0.97] shadow-lg";

  // Floating FAB: bottom-right, avoids safe-area + bottom nav
  const fab =
    "fixed z-40 right-4 md:right-6 " +
    "bottom-[calc(env(safe-area-inset-bottom)+64px)] md:bottom-6 " +
    "h-14 w-14"; // 👈 circle size

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${baseBtn} ${floating ? fab : "h-10 w-10"}`}
        aria-label="New group"
        title="New group"
      >
        <FiPlus className="h-6 w-6" />
      </button>

      <GroupCreateModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => setOpen(false)}
      />
    </>
  );
}
