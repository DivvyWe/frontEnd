"use client";

import { useEffect, useState } from "react";

export default function PushAutoRequest() {
  const [needsPrompt, setNeedsPrompt] = useState(false);
  const [busy, setBusy] = useState(true);

  // Attempt automatic permission request on mount (may be blocked by the browser)
  useEffect(() => {
    (async () => {
      try {
        if (!("Notification" in window)) {
          setBusy(false);
          return;
        }
        // Already decided?
        if (Notification.permission === "granted") {
          await showOkNotification();
          setBusy(false);
          return;
        }
        if (Notification.permission === "denied") {
          setNeedsPrompt(true);
          setBusy(false);
          return;
        }

        // permission === "default": attempt auto request (often blocked)
        let perm;
        try {
          perm = await Notification.requestPermission();
        } catch (err) {
          // Some browsers throw if not user-initiated
          console.warn("[push] Auto request blocked:", err);
          perm = "default";
        }

        if (perm === "granted") {
          await showOkNotification();
          setNeedsPrompt(false);
        } else {
          // Either "default" (ignored) or "denied"
          setNeedsPrompt(true);
        }
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const manualEnable = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await showOkNotification();
        setNeedsPrompt(false);
      } else {
        setNeedsPrompt(true);
      }
    } catch (e) {
      console.error("[push] Manual request error:", e);
      setNeedsPrompt(true);
    }
  };

  return (
    <>
      {/* Soft prompt (fallback) */}
      {!busy && needsPrompt && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900">Enable notifications</p>
              <p className="text-sm text-slate-600">
                Get alerts for invites, expenses, and settlements.
              </p>
            </div>
            <button
              onClick={manualEnable}
              className="rounded-lg bg-[#84CC16] px-3 py-2 text-sm font-medium text-white"
            >
              Turn on
            </button>
          </div>
        </div>
      )}
    </>
  );
}

async function showOkNotification() {
  try {
    const reg = window.__swReg || (await navigator.serviceWorker.ready);
    await reg.showNotification("Divsez", {
      body: "Notifications enabled 🎉",
      tag: "enable-ok",
      icon: "/icons/notification-192.png",
      badge: "/icons/badge-72.png",
    });
  } catch (e) {
    console.warn("[push] showNotification failed:", e);
  }
}
