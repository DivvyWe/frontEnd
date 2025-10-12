"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiLogOut } from "react-icons/fi";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/auth/signin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      data-logout
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white shadow-sm transition-all duration-150 active:scale-[0.98] ${
        loading
          ? "bg-slate-300 cursor-not-allowed"
          : "bg-[#84CC16] hover:bg-[#76b514]"
      }`}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span>Logging out…</span>
        </>
      ) : (
        <>
          <FiLogOut className="h-4 w-4" />
          <span>Logout</span>
        </>
      )}
    </button>
  );
}
