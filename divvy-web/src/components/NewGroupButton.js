"use client";

import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import GroupCreateModal from "./GroupCreateModal";

export default function NewGroupButton({ asLink = false, size = "md" }) {
  const [open, setOpen] = useState(false);

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5",
    lg: "px-5 py-3 text-base",
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-lg bg-[#84CC16] ${sizes[size]} font-semibold text-white hover:bg-[#76b514] active:scale-[0.99]`}
      >
        <FiPlus className="h-5 w-5" />
        New group
      </button>

      <GroupCreateModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => setOpen(false)}
      />
    </>
  );
}
