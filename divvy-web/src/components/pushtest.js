"use client";

import { useEffect, useState } from "react";
import { subscribePush } from "@/lib/push";

export default function PushTest({ className = "" }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState(
    typeof window !== "undefined" ? Notification.permission : "default"
  );
  const base = "/api/proxy";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
  }, []);

  async function onEnable() {
    try {
      const sub = await subscribePush(); // shows native prompt
      // Save to backend
      const res = await fetch(`${base}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // send auth cookie if you use one
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
          ua: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Save failed: ${res.status} ${txt}`);
      }
      setPermission(Notification.permission);
      alert("Notifications enabled ✅");
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to enable notifications");
    }
  }

  async function onSendTest() {
    try {
      const res = await fetch(`${base}/push/test`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Test push failed");
      alert("Test push sent! Check your system notifications ✅");
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to send test push");
    }
  }

  if (!supported) {
    return (
      <div className={`rounded-lg border border-slate-200 p-4 ${className}`}>
        <p className="text-sm text-slate-600">
          Push is not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Notification permission</p>
          <p className="text-base font-medium text-slate-900">{permission}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEnable}
            className="rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-medium text-white hover:opacity-95"
          >
            Enable notifications
          </button>
          <button
            onClick={onSendTest}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:opacity-95"
          >
            Send test
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Tip: Desktop shows the native prompt only after clicking{" "}
        <em>Enable notifications</em>. If you previously clicked “Block”, reset
        site permissions in your browser’s site settings for{" "}
      </p>
    </div>
  );
}
