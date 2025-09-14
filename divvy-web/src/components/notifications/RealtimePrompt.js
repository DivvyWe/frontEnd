// src/components/notifications/RealtimePrompt.jsx
"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socketClient";

export default function RealtimePrompt() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEnabled(localStorage.getItem("rt_enabled") === "true");
  }, []);

  async function enable() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      // who am I?
      const meRes = await fetch("/api/proxy/auth/me", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!meRes.ok) throw new Error("Not signed in");
      const me = await meRes.json();

      const s = getSocket();
      if (!s.connected) s.connect();

      // join my private room for notifications
      s.emit("auth:join", { userId: me._id || me.id });

      // optional: listen once (you can move this to a global listener)
      s.off("notification:new");
      s.on("notification:new", () => {
        // do nothing here; Bell component will also listen.
        // This is just to prove connection works.
      });

      localStorage.setItem("rt_enabled", "true");
      setEnabled(true);
    } catch (e) {
      setError(e.message || "Failed to enable realtime updates");
    } finally {
      setBusy(false);
    }
  }

  function disable() {
    try {
      const s = getSocket();
      s.emit("auth:leave", {}); // optional
      s.disconnect();
    } catch {}
    localStorage.removeItem("rt_enabled");
    setEnabled(false);
  }

  if (enabled) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        Realtime updates enabled.{" "}
        <button onClick={disable} className="underline underline-offset-2">
          Disable
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
      See new notifications instantly while this tab is open.
      <div className="mt-1.5 flex gap-2">
        <button
          onClick={enable}
          disabled={busy}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable realtime updates"}
        </button>
        {error ? <span className="text-rose-600">{error}</span> : null}
      </div>
    </div>
  );
}
