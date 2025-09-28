"use client";

import { useEffect, useState } from "react";
import { subscribePush } from "@/lib/push";

export default function PushSoftPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = "/api/proxy";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    const perm = Notification?.permission;
    // show only if supported and the user hasn't decided yet
    if (supported && perm === "default") setVisible(true);
  }, []);

  async function enableNow() {
    try {
      setBusy(true);
      const sub = await subscribePush(); // triggers native Allow/Block
      // save to backend
      const res = await fetch(`${base}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
          ua: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to save subscription");
      }
      setVisible(false);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to enable notifications");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Enable desktop notifications?
          </p>
          <p className="text-sm text-slate-600">
            Get alerts when expenses or messages are added—even if this tab is
            in the background.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVisible(false)}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            disabled={busy}
          >
            Not now
          </button>
          <button
            onClick={enableNow}
            className="rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Enabling…" : "Enable"}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        The browser will show a native Allow/Block prompt after you click
        Enable. If you previously blocked it, reset site permissions in your
        browser settings for <code>http://localhost:3000</code>.
      </p>
    </div>
  );
}
