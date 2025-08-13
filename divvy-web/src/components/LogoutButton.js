"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      className="rounded-lg bg-[#84CC16] px-3 py-2 font-semibold text-slate-900 hover:bg-[#76b514] disabled:opacity-60"
    >
      {loading ? "Logging out…" : "Logout"}
    </button>
  );
}
