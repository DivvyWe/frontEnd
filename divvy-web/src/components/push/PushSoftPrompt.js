// src/components/push/PushSoftPrompt.jsx
"use client";

import { useEffect, useState } from "react";

export default function PushSoftPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setShow(Notification.permission === "default");
    }
  }, []);

  const enable = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted" && window.__swReg) {
        // optional local confirmation via SW
        (await navigator.serviceWorker.ready).showNotification("DivIt", {
          body: "Notifications enabled 🎉",
          tag: "enable-ok",
        });
      }
      setShow(false);
    } catch (e) {
      console.error("[push] permission error", e);
    }
  };

  if (!show) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">Enable notifications?</p>
          <p className="text-sm text-slate-600">
            Get alerts for invites, expenses, and settlements.
          </p>
        </div>
        <button
          onClick={enable}
          className="rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-medium text-white"
        >
          Turn on
        </button>
      </div>
    </div>
  );
}
